// AudioSessionConfigPlugin (Android)
//
// Android parity for the iOS plugin of the same name. The iOS version
// flips AVAudioSession into a low-DSP recording mode for clean vocal
// capture; on Android we can't quite turn off the OS's audio processing
// the same way, but we can:
//
//   1. Request transient audio focus with USAGE_MEDIA so backing tracks
//      (Apple Music JS / YouTube / Spotify web) keep playing during a
//      take instead of being ducked or paused.
//   2. Suggest a 48 kHz sample rate + mono input and 256-frame I/O
//      buffer via AudioRecord's preferred config (the actual values the
//      hardware will give us back are reported in the resolve payload
//      so the JS layer can adapt).
//   3. Detect headphones / Bluetooth output so JS can auto-enable
//      music mode (no echo concern with headphones on).
//
// The bridge schema matches the iOS plugin so the JS side
// (src/plugins/audioSessionConfig.ts) can keep calling the same methods
// regardless of platform.

package org.gleeworld.app

import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.AudioRecord
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AudioSessionConfig")
class AudioSessionConfigPlugin : Plugin() {

    private var focusRequest: AudioFocusRequest? = null
    private val preferredSampleRate = 48_000
    private val preferredChannelCount = 1
    private val preferredBufferFrames = 256

    private fun audioManager(): AudioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    @PluginMethod
    fun configureForMusicRecording(call: PluginCall) {
        val am = audioManager()

        try {
            // Request audio focus so the system doesn't duck or pause
            // backing-track audio. GAIN_TRANSIENT_MAY_DUCK lets other
            // apps duck under us but keep playing — singers can still
            // hear the backing while they're recording.
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(attrs)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener { /* no-op — JS owns playback state */ }
                    .build()
                am.requestAudioFocus(req)
                focusRequest = req
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    { /* no-op */ },
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
                )
            }

            // Best-guess what the input will look like once Web Audio's
            // MediaRecorder opens it. We can't pre-configure the actual
            // browser-managed AudioRecord, but reporting our preferences
            // lets the JS layer log what it expects.
            val minBuffer = AudioRecord.getMinBufferSize(
                preferredSampleRate,
                android.media.AudioFormat.CHANNEL_IN_MONO,
                android.media.AudioFormat.ENCODING_PCM_16BIT,
            )
            val bufferDuration = preferredBufferFrames.toDouble() / preferredSampleRate.toDouble()

            val result = JSObject().apply {
                put("sampleRate", preferredSampleRate)
                put("inputNumberOfChannels", preferredChannelCount)
                put("ioBufferDuration", bufferDuration)
                put("category", "playAndRecord")
                put("mode", "videoRecording")
                put("route", describeRoute())
                put("minRecordBufferBytes", minBuffer)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("AudioFocus configure failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun restoreDefault(call: PluginCall) {
        val am = audioManager()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest?.let { am.abandonAudioFocusRequest(it) }
                focusRequest = null
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus { /* no-op */ }
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("AudioFocus restore failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod
    fun getCurrentRoute(call: PluginCall) {
        val result = JSObject().apply {
            put("route", describeRoute())
            put("sampleRate", audioManager().getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)?.toIntOrNull() ?: preferredSampleRate)
        }
        call.resolve(result)
    }

    /** Inspect AudioManager's device list to mirror the iOS hasHeadphones
     *  / port detection. Falls back to AudioManager.isWiredHeadsetOn
     *  pre-API-23 (Android 6) for older builds. */
    private fun describeRoute(): JSObject {
        val am = audioManager()
        val inputs = mutableListOf<JSObject>()
        val outputs = mutableListOf<JSObject>()
        var hasHeadphones = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val ins = am.getDevices(AudioManager.GET_DEVICES_INPUTS)
            val outs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            for (d in ins) {
                inputs.add(deviceToJson(d))
            }
            for (d in outs) {
                outputs.add(deviceToJson(d))
                if (isHeadphoneType(d.type)) hasHeadphones = true
            }
        } else {
            @Suppress("DEPRECATION")
            hasHeadphones = am.isWiredHeadsetOn || am.isBluetoothA2dpOn
        }

        return JSObject().apply {
            put("inputs", inputs.toTypedArray().let { arr ->
                org.json.JSONArray().apply { arr.forEach { put(it) } }
            })
            put("outputs", outputs.toTypedArray().let { arr ->
                org.json.JSONArray().apply { arr.forEach { put(it) } }
            })
            put("hasHeadphones", hasHeadphones)
        }
    }

    private fun deviceToJson(d: AudioDeviceInfo): JSObject = JSObject().apply {
        put("portName", d.productName?.toString() ?: typeLabel(d.type))
        put("portType", typeLabel(d.type))
    }

    private fun isHeadphoneType(type: Int): Boolean = when (type) {
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
        AudioDeviceInfo.TYPE_WIRED_HEADSET,
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
        AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
        AudioDeviceInfo.TYPE_USB_HEADSET,
        AudioDeviceInfo.TYPE_HEARING_AID -> true
        else -> false
    }

    private fun typeLabel(type: Int): String = when (type) {
        AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
        AudioDeviceInfo.TYPE_BUILTIN_MIC -> "builtinMic"
        AudioDeviceInfo.TYPE_WIRED_HEADSET -> "headset"
        AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "headphones"
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetoothA2DP"
        AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "bluetoothHFP"
        AudioDeviceInfo.TYPE_USB_DEVICE, AudioDeviceInfo.TYPE_USB_HEADSET -> "usb"
        AudioDeviceInfo.TYPE_HDMI -> "hdmi"
        AudioDeviceInfo.TYPE_HEARING_AID -> "hearingAid"
        AudioDeviceInfo.TYPE_TELEPHONY -> "telephony"
        else -> "other"
    }
}
