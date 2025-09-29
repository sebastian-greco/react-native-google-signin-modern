#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <GoogleSigninModernSpec/GoogleSigninModernSpec.h>

@interface GoogleSigninModern : NSObject <NativeGoogleSigninModernSpec>
#else
@interface GoogleSigninModern : NSObject <RCTBridgeModule>
#endif

@end
