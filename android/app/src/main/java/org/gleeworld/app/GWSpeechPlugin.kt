// GWSpeechPlugin (Android)
//
// Android parity for the iOS GWSpeech plugin (SFSpeechRecognizer). The
// Android WebView has no Web Speech recognition API, so the Assistant's
// mic is dead without a native bridge — same gap WKWebView has on iOS.
//
// Contract (must mirror ios/App/App/GWSpeechPlugin.swift exactly, the JS
// facade in src/lib/assistant/speech.ts depends on it):
//   - partial transcripts stream as speechResult{isFinal:false}
//   - exactly ONE speechResult{isFinal:true} per session, then exactly
//     ONE speechEnd — on engine-final, silence, error, or explicit stop()
//   - Android's recognizer ends on silence natively (its own ~1-2s
//     window), so no silence timer is needed here.
//
// SpeechRecognizer must be created and driven on the main thread.

package org.gleeworld.app

import android.Manifest
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "GWSpeech",
    permissions = [Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone")],
)
class GWSpeechPlugin : Plugin() {
    private var recognizer: SpeechRecognizer? = null
    private var lastPartial: String = ""
    private var finalSent = false
    private var endSent = false

    @PluginMethod
    fun start(call: PluginCall) {
        if (getPermissionState("microphone") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "micPermissionCallback")
            return
        }
        beginRecognition(call)
    }

    @PermissionCallback
    private fun micPermissionCallback(call: PluginCall) {
        if (getPermissionState("microphone") == com.getcapacitor.PermissionState.GRANTED) {
            beginRecognition(call)
        } else {
            call.reject("Microphone permission was declined.")
        }
    }

    private fun beginRecognition(call: PluginCall) {
        val ctx = context
        activity.runOnUiThread {
            if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
                call.reject("Speech recognition is not available on this device.")
                return@runOnUiThread
            }
            // A start while another session runs restarts cleanly (mirrors
            // the iOS plugin, where mic-tap barges in on a stale session).
            recognizer?.destroy()
            lastPartial = ""
            finalSent = false
            endSent = false

            val r = SpeechRecognizer.createSpeechRecognizer(ctx)
            recognizer = r
            r.setRecognitionListener(object : RecognitionListener {
                override fun onPartialResults(partialResults: Bundle?) {
                    val text = firstResult(partialResults) ?: return
                    if (text.isBlank()) return
                    lastPartial = text
                    emitResult(text, isFinal = false)
                }

                override fun onResults(results: Bundle?) {
                    finalize(firstResult(results) ?: lastPartial)
                }

                override fun onError(error: Int) {
                    // Timeout / no-match after some speech: finalize what we
                    // heard. With no speech at all, just end the session —
                    // the JS facade treats a bare speechEnd as a quiet miss.
                    when (error) {
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
                        SpeechRecognizer.ERROR_NO_MATCH,
                        -> finalize(lastPartial)
                        else -> emitEnd()
                    }
                }

                override fun onEndOfSpeech() {}
                override fun onBeginningOfSpeech() {}
                override fun onReadyForSpeech(params: Bundle?) {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }
            r.startListening(intent)
            call.resolve()
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        activity.runOnUiThread {
            // stopListening() lets the engine deliver onResults; if nothing
            // ever comes back (already-idle recognizer), the error path has
            // usually fired already and the guards keep events single-shot.
            recognizer?.stopListening()
            call.resolve()
        }
    }

    private fun firstResult(bundle: Bundle?): String? =
        bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()

    private fun finalize(text: String) {
        if (!finalSent && text.isNotBlank()) {
            finalSent = true
            emitResult(text, isFinal = true)
        }
        emitEnd()
    }

    private fun emitResult(transcript: String, isFinal: Boolean) {
        val data = JSObject()
        data.put("transcript", transcript)
        data.put("isFinal", isFinal)
        notifyListeners("speechResult", data)
    }

    private fun emitEnd() {
        if (endSent) return
        endSent = true
        notifyListeners("speechEnd", JSObject())
        recognizer?.destroy()
        recognizer = null
    }
}
