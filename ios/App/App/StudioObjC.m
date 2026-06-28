#import "StudioObjC.h"

@implementation StudioObjC

+ (nullable NSError *)catchExceptions:(NS_NOESCAPE void (^)(void))block {
    @try {
        block();
        return nil;
    } @catch (NSException *ex) {
        NSString *reason = ex.reason ?: ex.name ?: @"unknown NSException";
        return [NSError errorWithDomain:@"StudioObjC"
                                   code:0
                               userInfo:@{
                                   NSLocalizedDescriptionKey: reason,
                                   @"name": ex.name ?: @"",
                               }];
    }
}

@end
