package org.gleeworld.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the Kotlin plugins that mirror our iOS native plugins.
        // Discovery via @CapacitorPlugin annotations would normally pick
        // them up, but we register explicitly so a refactor that removes
        // the annotation doesn't silently drop them from the JS bridge.
        registerPlugin(AudioSessionConfigPlugin.class);
        registerPlugin(RecordingLiveActivityPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
