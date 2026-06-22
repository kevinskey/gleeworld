// RecordingLiveActivityPlugin (Android)
//
// iOS uses ActivityKit to show "Recording: Bass · 0:42" on the lock
// screen + Dynamic Island. Android has no direct equivalent — the
// closest mainstream pattern is a foreground service running with an
// ongoing media-style notification that updates the elapsed time.
//
// The notification:
//   * sticks at the top of the shade until end() is called
//   * uses MediaStyle so it gets the larger media-controls treatment on
//     lock screen
//   * uses a chronometer to count up automatically (no per-second
//     update calls from JS)
//   * has a Stop action that broadcasts back to JS via the same
//     pluginCall.notifyListeners API the JS side already listens for
//
// The JS bridge schema mirrors the iOS plugin exactly so the existing
// src/plugins/recordingLiveActivity.ts works unchanged.

package org.gleeworld.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "RecordingLiveActivity")
class RecordingLiveActivityPlugin : Plugin() {

    companion object {
        const val CHANNEL_ID = "gw_recording_live"
        const val NOTIFICATION_ID = 4242
        const val ACTION_STOP = "org.gleeworld.app.RECORDING_STOP"
    }

    private var stopReceiver: BroadcastReceiver? = null

    @PluginMethod
    fun isSupported(call: PluginCall) {
        val result = JSObject().apply { put("supported", true) }
        call.resolve(result)
    }

    @PluginMethod
    fun start(call: PluginCall) {
        val ctx = context
        val projectTitle = call.getString("projectTitle") ?: "Project"
        val partLabel = call.getString("partLabel") ?: "Vocal"
        ensureChannel(ctx)

        val intent = Intent(ctx, RecordingForegroundService::class.java).apply {
            action = RecordingForegroundService.ACTION_START
            putExtra("projectTitle", projectTitle)
            putExtra("partLabel", partLabel)
            putExtra("startedAt", System.currentTimeMillis())
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent)
        } else {
            ctx.startService(intent)
        }

        // Listen for the Stop action so we can forward it to JS.
        if (stopReceiver == null) {
            stopReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, i: Intent?) {
                    notifyListeners("recordingStopRequested", JSObject())
                }
            }
            val filter = IntentFilter(ACTION_STOP)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ctx.registerReceiver(stopReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                ctx.registerReceiver(stopReceiver, filter)
            }
        }

        val result = JSObject().apply {
            put("started", true)
            put("id", "rec-${System.currentTimeMillis()}")
        }
        call.resolve(result)
    }

    @PluginMethod
    fun update(call: PluginCall) {
        val ctx = context
        val partLabel = call.getString("partLabel") ?: "Vocal"
        val isPaused = call.getBoolean("isPaused") ?: false
        val startedAt = call.getDouble("startedAtUnixSeconds")
            ?: (System.currentTimeMillis() / 1000.0)

        val intent = Intent(ctx, RecordingForegroundService::class.java).apply {
            action = RecordingForegroundService.ACTION_UPDATE
            putExtra("partLabel", partLabel)
            putExtra("isPaused", isPaused)
            putExtra("startedAt", (startedAt * 1000).toLong())
        }
        ctx.startService(intent)

        val result = JSObject().apply { put("updated", true) }
        call.resolve(result)
    }

    @PluginMethod
    fun end(call: PluginCall) {
        val ctx = context
        val intent = Intent(ctx, RecordingForegroundService::class.java).apply {
            action = RecordingForegroundService.ACTION_STOP
        }
        ctx.startService(intent)
        stopReceiver?.let {
            try { ctx.unregisterReceiver(it) } catch (_: Exception) { /* never registered */ }
        }
        stopReceiver = null

        val result = JSObject().apply { put("ended", true) }
        call.resolve(result)
    }

    private fun ensureChannel(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Recording",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shows while a Part Tracks recording is in progress."
            setShowBadge(false)
            setSound(null, null)
            enableVibration(false)
        }
        mgr.createNotificationChannel(channel)
    }
}

// Foreground service that owns the persistent notification. Starting
// inside a service lets the OS keep the notification alive even when
// the WKWebView pauses (locked screen / app backgrounded).
class RecordingForegroundService : Service() {

    companion object {
        const val ACTION_START = "org.gleeworld.app.RECORDING_FG_START"
        const val ACTION_UPDATE = "org.gleeworld.app.RECORDING_FG_UPDATE"
        const val ACTION_STOP = "org.gleeworld.app.RECORDING_FG_STOP"
    }

    private var projectTitle: String = "Project"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                projectTitle = intent.getStringExtra("projectTitle") ?: "Project"
                val partLabel = intent.getStringExtra("partLabel") ?: "Vocal"
                val startedAt = intent.getLongExtra("startedAt", System.currentTimeMillis())
                startForeground(
                    RecordingLiveActivityPlugin.NOTIFICATION_ID,
                    buildNotification(partLabel, startedAt, isPaused = false),
                )
            }
            ACTION_UPDATE -> {
                val partLabel = intent.getStringExtra("partLabel") ?: "Vocal"
                val isPaused = intent.getBooleanExtra("isPaused", false)
                val startedAt = intent.getLongExtra("startedAt", System.currentTimeMillis())
                val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                mgr.notify(
                    RecordingLiveActivityPlugin.NOTIFICATION_ID,
                    buildNotification(partLabel, startedAt, isPaused),
                )
            }
            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(partLabel: String, startedAt: Long, isPaused: Boolean): Notification {
        val stopBroadcast = Intent(RecordingLiveActivityPlugin.ACTION_STOP).setPackage(packageName)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val stopPending = PendingIntent.getBroadcast(this, 1, stopBroadcast, flags)

        return NotificationCompat.Builder(this, RecordingLiveActivityPlugin.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Recording: $partLabel")
            .setContentText(projectTitle)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setWhen(startedAt)
            .setUsesChronometer(!isPaused)
            .setChronometerCountDown(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .addAction(
                android.R.drawable.ic_media_pause,
                if (isPaused) "Resume" else "Stop",
                stopPending,
            )
            .setStyle(MediaStyle().setShowActionsInCompactView(0))
            .build()
    }
}
