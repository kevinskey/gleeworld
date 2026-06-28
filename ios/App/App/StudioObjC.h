// Tiny Obj-C bridge for Swift code that needs to catch NSException.
// AVAudioEngine raises raw NSExceptions on internal-state mismatches
// (mismatched formats, missing nodes, deactivated session, etc.) that
// Swift's `try` cannot catch. Wrapping the offending call in
// `StudioObjC.tryBlock { … }` converts the NSException into a
// throwable Swift NSError so the app keeps running.

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface StudioObjC : NSObject

/// Run `block` under @try/@catch. Returns nil on success, or an NSError
/// describing the NSException that was raised.
+ (nullable NSError *)catchExceptions:(NS_NOESCAPE void (^)(void))block;

@end

NS_ASSUME_NONNULL_END
