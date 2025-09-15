#import "GoogleSigninModern.h"
#import <GoogleSignIn/GoogleSignIn.h>

@implementation GoogleSigninModern

RCT_EXPORT_MODULE()

- (NSDictionary *)constantsToExport {
    return @{};
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

#pragma mark - Configuration

RCT_EXPORT_METHOD(configure:(NSString *)webClientId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    if (!webClientId || webClientId.length == 0) {
        reject(@"INVALID_CONFIG", @"Web Client ID is required", nil);
        return;
    }
    
    // Configure Google Sign-In with the Web Client ID
    if ([GIDSignIn sharedInstance].configuration == nil) {
        GIDConfiguration *config = [[GIDConfiguration alloc] initWithClientID:webClientId];
        [GIDSignIn sharedInstance].configuration = config;
    }
    
    resolve(nil);
}

#pragma mark - Play Services Availability (iOS always returns true)

RCT_EXPORT_METHOD(isPlayServicesAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // iOS doesn't have Play Services concept, so always return true
    resolve(@YES);
}

#pragma mark - Sign In

RCT_EXPORT_METHOD(signIn:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    if ([GIDSignIn sharedInstance].configuration == nil) {
        reject(@"NOT_CONFIGURED", @"Google Sign-In not configured. Call configure() first.", nil);
        return;
    }
    
    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController *presentingViewController = [self getPresentingViewController];
        
        if (!presentingViewController) {
            reject(@"NO_PRESENTING_CONTROLLER", @"Could not find a presenting view controller", nil);
            return;
        }
        
        [[GIDSignIn sharedInstance] signInWithPresentingViewController:presentingViewController completion:^(GIDSignInResult * _Nullable result, NSError * _Nullable error) {
            if (error) {
                NSString *errorCode = [NSString stringWithFormat:@"%ld", (long)error.code];
                reject(errorCode, error.localizedDescription, error);
                return;
            }
            
            if (!result || !result.user) {
                reject(@"SIGN_IN_FAILED", @"Sign in failed: no user data", nil);
                return;
            }
            
            GIDGoogleUser *user = result.user;
            GIDProfileData *profile = user.profile;
            
            // Get ID token
            NSString *idToken = user.idToken.tokenString;
            if (!idToken) {
                reject(@"NO_ID_TOKEN", @"Failed to get ID token", nil);
                return;
            }
            
            // Build user data
            NSDictionary *userData = @{
                @"id": user.userID ?: @"",
                @"name": profile.name ?: [NSNull null],
                @"email": profile.email ?: @"",
                @"photo": profile.hasImage ? [profile imageURLWithDimension:120].absoluteString ?: [NSNull null] : [NSNull null]
            };
            
            // Build result
            NSDictionary *signInResult = @{
                @"idToken": idToken,
                @"user": userData
            };
            
            resolve(signInResult);
        }];
    });
}

#pragma mark - Sign Out

RCT_EXPORT_METHOD(signOut:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    [[GIDSignIn sharedInstance] signOut];
    resolve(nil);
}

#pragma mark - Check Sign-In Status

RCT_EXPORT_METHOD(isSignedIn:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    BOOL isSignedIn = [GIDSignIn sharedInstance].currentUser != nil;
    resolve(@(isSignedIn));
}

#pragma mark - Helper Methods

- (UIViewController *)getPresentingViewController {
    UIViewController *controller = RCTPresentedViewController();
    if (controller) {
        return controller;
    }
    
    // Fallback to root view controller using modern API
    UIScene *activeScene = nil;
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
        if (scene.activationState == UISceneActivationStateForegroundActive) {
            activeScene = scene;
            break;
        }
    }
    
    if (@available(iOS 13.0, *)) {
        UIWindowScene *windowScene = (UIWindowScene *)activeScene;
        for (UIWindow *window in windowScene.windows) {
            if (window.isKeyWindow) {
                return window.rootViewController;
            }
        }
    }
    
    // Final fallback for older iOS versions - using delegate pattern for iOS 15+
    id<UIApplicationDelegate> delegate = [UIApplication sharedApplication].delegate;
    if ([delegate respondsToSelector:@selector(window)]) {
        UIWindow *window = [delegate performSelector:@selector(window)];
        if (window) {
            return window.rootViewController;
        }
    }
    
    // Last resort fallback
    return [UIApplication sharedApplication].keyWindow.rootViewController;
}

@end
