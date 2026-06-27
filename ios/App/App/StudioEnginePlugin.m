// StudioEnginePlugin ObjC registration shim.
//
// Capacitor 7 only auto-discovers plugins shipped as separate CocoaPods.
// For plugins compiled into the app target (like ours), the bridge looks
// for classes registered via the legacy CAP_PLUGIN macro at +load time
// — which is what these C-callable functions install in the Objective-C
// runtime when the binary loads.
//
// Without this file the JS-side registerPlugin('StudioEngine') resolves
// to a proxy that rejects every call with "plugin is not implemented on
// ios". The Swift class StudioEnginePlugin is referenced here by name
// only (it conforms to @objc(StudioEnginePlugin) on the Swift side).

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(StudioEnginePlugin, "StudioEngine",
    CAP_PLUGIN_METHOD(start,        CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopEngine,   CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(loadSession,  CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(play,         CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(pause,        CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stop,         CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(seek,         CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateStrip,  CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateTempo,  CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(recordStart,  CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(recordStop,   CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(mixdown,      CAPPluginReturnPromise);
)
