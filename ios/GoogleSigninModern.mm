#import "GoogleSigninModern.h"
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <React/RCTBridge.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <ReactCommon/RCTTurboModule.h>
#import <react/renderer/graphics/Float.h>
#include <memory>
#endif

#if __has_include(<GoogleSignIn/GoogleSignIn.h>)
#import <GoogleSignIn/GoogleSignIn.h>
#define HAS_GOOGLE_SIGNIN 1
#else
#define HAS_GOOGLE_SIGNIN 0
#endif

// Define logging macros if React Native logging isn't available
#ifndef RCTLogInfo
#define RCTLogInfo(...) NSLog(__VA_ARGS__)
#endif
#ifndef RCTLogWarn
#define RCTLogWarn(...) NSLog(__VA_ARGS__)
#endif
#ifndef RCTLogError
#define RCTLogError(...) NSLog(__VA_ARGS__)
#endif

@interface GoogleSigninModern ()
@property (nonatomic, copy) NSString *webClientId;
@property (nonatomic, copy) void (^pendingResolve)(id result);
@property (nonatomic, copy) void (^pendingReject)(NSString *code, NSString *message, NSError *error);
@property (nonatomic, assign) BOOL signInInProgress;
@end

@implementation GoogleSigninModern

RCT_EXPORT_MODULE()

// Error codes (matching Android implementation)
static NSString * const ERROR_NOT_CONFIGURED = @"NOT_CONFIGURED";
static NSString * const ERROR_SIGN_IN_IN_PROGRESS = @"SIGN_IN_IN_PROGRESS";
static NSString * const ERROR_NO_GOOGLE_ACCOUNTS = @"NO_GOOGLE_ACCOUNTS";
static NSString * const ERROR_SIGN_IN_ERROR = @"SIGN_IN_ERROR";
static NSString * const ERROR_CONFIGURE_ERROR = @"CONFIGURE_ERROR";
static NSString * const ERROR_SIGN_OUT_ERROR = @"SIGN_OUT_ERROR";
static NSString * const ERROR_SIGN_OUT_REQUESTED = @"SIGN_OUT_REQUESTED";
static NSString * const ERROR_MODULE_DESTROYED = @"MODULE_DESTROYED";
static NSString * const ERROR_USER_CANCELLED = @"USER_CANCELLED";
static NSString * const ERROR_NO_USER = @"NO_USER";
static NSString * const ERROR_TOKEN_REFRESH_ERROR = @"TOKEN_REFRESH_ERROR";

- (instancetype)init {
    if (self = [super init]) {
        _signInInProgress = NO;
    }
    return self;
}

RCT_EXPORT_METHOD(configure:(NSString *)webClientId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    @try {
        // Validate webClientId format
        if (!webClientId || webClientId.length == 0) {
            reject(ERROR_CONFIGURE_ERROR, @"webClientId cannot be blank", nil);
            return;
        }
        
        if (![webClientId hasSuffix:@".apps.googleusercontent.com"]) {
            RCTLogWarn(@"webClientId doesn't match expected format: *.apps.googleusercontent.com");
        }
        
#if HAS_GOOGLE_SIGNIN
        // Configure Google Sign-In
        GIDConfiguration *config = [[GIDConfiguration alloc] initWithClientID:webClientId];
        [GIDSignIn sharedInstance].configuration = config;
        
        self.webClientId = webClientId;
        
        RCTLogInfo(@"Google Sign-In configured successfully");
        resolve(nil);
#else
        reject(ERROR_CONFIGURE_ERROR, @"Google Sign-In SDK not found. Please install GoogleSignIn pod.", nil);
#endif
    }
    @catch (NSException *exception) {
        RCTLogError(@"Failed to configure Google Sign-In: %@", exception.reason);
        reject(ERROR_CONFIGURE_ERROR, [NSString stringWithFormat:@"Failed to configure Google Sign-In: %@", exception.reason], nil);
    }
}

RCT_EXPORT_METHOD(isPlayServicesAvailable:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // On iOS, Google Sign-In doesn't require Play Services
    // Always return true as the GoogleSignIn SDK handles availability
    resolve(@YES);
}

RCT_EXPORT_METHOD(signIn:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    @try {
        RCTLogInfo(@"Sign-in request initiated");
        
        if (!self.webClientId) {
            reject(ERROR_NOT_CONFIGURED, @"Google Sign-In not configured. Call configure() first.", nil);
            return;
        }
        
        if (self.signInInProgress) {
            RCTLogWarn(@"Sign-in already in progress, rejecting new request");
            reject(ERROR_SIGN_IN_IN_PROGRESS, @"Sign-in already in progress", nil);
            return;
        }
        
        // Store promise callbacks
        self.pendingResolve = resolve;
        self.pendingReject = reject;
        self.signInInProgress = YES;
        
#if HAS_GOOGLE_SIGNIN
        // Get the root view controller
        UIViewController *rootViewController = RCTKeyWindow().rootViewController;
        while (rootViewController.presentedViewController) {
            rootViewController = rootViewController.presentedViewController;
        }
        
        RCTLogInfo(@"Starting Google Sign-In flow");
        
        // Start sign-in flow
        [[GIDSignIn sharedInstance] signInWithPresentingViewController:rootViewController
                                                            completion:^(GIDSignInResult *result, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [self handleSignInResult:result error:error];
            });
        }];
#else
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:@"Google Sign-In SDK not available"];
#endif
        
    }
    @catch (NSException *exception) {
        RCTLogError(@"Exception in signIn: %@", exception.reason);
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR 
                                   message:[NSString stringWithFormat:@"Sign-in failed: %@", exception.reason]];
    }
}

RCT_EXPORT_METHOD(signInSilently:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    @try {
        RCTLogInfo(@"Silent sign-in request initiated");
        
        if (!self.webClientId) {
            reject(ERROR_NOT_CONFIGURED, @"Google Sign-In not configured. Call configure() first.", nil);
            return;
        }
        
        if (self.signInInProgress) {
            RCTLogWarn(@"Sign-in already in progress, rejecting silent sign-in request");
            reject(ERROR_SIGN_IN_IN_PROGRESS, @"Sign-in already in progress", nil);
            return;
        }
        
        // Store promise callbacks
        self.pendingResolve = resolve;
        self.pendingReject = reject;
        self.signInInProgress = YES;
        
#if HAS_GOOGLE_SIGNIN
        RCTLogInfo(@"Attempting to restore previous Google Sign-In");
        
        // Attempt to restore previous sign-in silently
        [[GIDSignIn sharedInstance] restorePreviousSignInWithCompletion:^(GIDGoogleUser *user, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [self handleSilentSignInResult:user error:error];
            });
        }];
#else
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:@"Google Sign-In SDK not available"];
#endif
        
    }
    @catch (NSException *exception) {
        RCTLogError(@"Exception in signInSilently: %@", exception.reason);
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR 
                                   message:[NSString stringWithFormat:@"Silent sign-in failed: %@", exception.reason]];
    }
}

#if HAS_GOOGLE_SIGNIN
- (void)handleSignInResult:(GIDSignInResult *)result error:(NSError *)error {
    self.signInInProgress = NO;
    
    if (error) {
        RCTLogError(@"Google Sign-In error: %@", error.localizedDescription);
        
        // Handle specific error cases
        if (error.code == kGIDSignInErrorCodeCanceled) {
            [self clearPendingPromiseWithError:ERROR_USER_CANCELLED message:@"User cancelled the sign-in"];
        } else if (error.code == kGIDSignInErrorCodeHasNoAuthInKeychain) {
            [self handleNoAccountsError];
        } else {
            NSString *errorMessage = [NSString stringWithFormat:@"Sign-in failed: %@", error.localizedDescription];
            [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:errorMessage];
        }
        return;
    }
    
    if (!result || !result.user) {
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:@"No user data received"];
        return;
    }
    
    // Create response matching Android format
    GIDGoogleUser *user = result.user;
    GIDProfileData *profile = user.profile;
    
    NSDictionary *userDict = @{
        @"id": profile.email ?: @"",
        @"name": profile.name ?: @"",
        @"email": profile.email ?: @"",
        @"photo": profile.hasImage ? [profile imageURLWithDimension:120].absoluteString : [NSNull null]
    };
    
    NSDictionary *response = @{
        @"idToken": user.idToken.tokenString ?: @"",
        @"user": userDict
    };
    
    RCTLogInfo(@"Google Sign-In successful");
    if (self.pendingResolve) {
        self.pendingResolve(response);
    }
    [self clearPendingPromise];
}

- (void)handleSilentSignInResult:(GIDGoogleUser *)user error:(NSError *)error {
    self.signInInProgress = NO;
    
    if (error) {
        RCTLogInfo(@"Silent sign-in failed: %@", error.localizedDescription);
        
        // For silent sign-in, we don't show error dialogs, just return the error
        if (error.code == kGIDSignInErrorCodeHasNoAuthInKeychain) {
            [self clearPendingPromiseWithError:@"SIGN_IN_REQUIRED" message:@"The user has never signed in before, or they have since signed out."];
        } else {
            NSString *errorMessage = [NSString stringWithFormat:@"Silent sign-in failed: %@", error.localizedDescription];
            [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:errorMessage];
        }
        return;
    }
    
    if (!user) {
        [self clearPendingPromiseWithError:ERROR_SIGN_IN_ERROR message:@"No user data received"];
        return;
    }
    
    // Create response matching Android format
    GIDProfileData *profile = user.profile;
    
    NSDictionary *userDict = @{
        @"id": profile.email ?: @"",
        @"name": profile.name ?: @"",
        @"email": profile.email ?: @"",
        @"photo": profile.hasImage ? [profile imageURLWithDimension:120].absoluteString : [NSNull null]
    };
    
    NSDictionary *response = @{
        @"idToken": user.idToken.tokenString ?: @"",
        @"user": userDict
    };
    
    RCTLogInfo(@"Silent sign-in successful");
    if (self.pendingResolve) {
        self.pendingResolve(response);
    }
    [self clearPendingPromise];
}
#endif

- (void)handleNoAccountsError {
    RCTLogInfo(@"No Google accounts available - opening account settings");
    
    // On iOS, we can't directly add Google accounts like Android
    // Simply inform the user to add Google account manually
    [self clearPendingPromiseWithError:ERROR_NO_GOOGLE_ACCOUNTS 
                               message:@"Please add a Google account in Settings > Mail > Accounts and try again."];
}

- (void)signOut:(void (^)(id result))resolve
       rejecter:(void (^)(NSString *code, NSString *message, NSError *error))reject {
    @try {
        RCTLogInfo(@"Sign-out requested");
        
        // If there's a pending sign-in, reject it first
        if (self.pendingReject) {
            self.pendingReject(ERROR_SIGN_OUT_REQUESTED, @"Sign-out was requested", nil);
        }
        
#if HAS_GOOGLE_SIGNIN
        // Sign out from Google
        [[GIDSignIn sharedInstance] signOut];
#endif
        
        // Clear stored state
        [self clearAllState];
        
        RCTLogInfo(@"Sign-out completed successfully");
        resolve(nil);
    }
    @catch (NSException *exception) {
        RCTLogError(@"Error during sign-out: %@", exception.reason);
        reject(ERROR_SIGN_OUT_ERROR, [NSString stringWithFormat:@"Sign-out failed: %@", exception.reason], nil);
    }
}

- (void)isSignedIn:(void (^)(id result))resolve
          rejecter:(void (^)(NSString *code, NSString *message, NSError *error))reject {
    // With modern Google Sign-In, apps should manage their own auth state
    // Return false to encourage proper state management
    RCTLogInfo(@"isSignedIn called - returning false (app should manage auth state)");
    resolve(@NO);
}

RCT_EXPORT_METHOD(getTokens:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    @try {
        RCTLogInfo(@"Token refresh request initiated");
        
#if HAS_GOOGLE_SIGNIN
        GIDGoogleUser *currentUser = [GIDSignIn sharedInstance].currentUser;
        if (!currentUser) {
            RCTLogWarn(@"No current user found for token refresh");
            reject(ERROR_NO_USER, @"No user signed in. Please sign in first.", nil);
            return;
        }
        
        RCTLogInfo(@"Refreshing tokens for current user");
        [currentUser refreshTokensIfNeededWithCompletion:^(GIDGoogleUser *user, NSError *error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (error) {
                    RCTLogError(@"Token refresh failed: %@", error.localizedDescription);
                    NSString *errorMessage = [NSString stringWithFormat:@"Token refresh failed: %@", error.localizedDescription];
                    reject(ERROR_TOKEN_REFRESH_ERROR, errorMessage, error);
                    return;
                }
                
                if (!user || !user.idToken || !user.accessToken) {
                    RCTLogError(@"Token refresh returned invalid user or tokens");
                    reject(ERROR_TOKEN_REFRESH_ERROR, @"Token refresh returned invalid tokens", nil);
                    return;
                }
                
                NSDictionary *tokens = @{
                    @"idToken": user.idToken.tokenString ?: @"",
                    @"accessToken": user.accessToken.tokenString ?: @""
                };
                
                RCTLogInfo(@"Token refresh successful");
                resolve(tokens);
            });
        }];
#else
        reject(ERROR_TOKEN_REFRESH_ERROR, @"Google Sign-In SDK not available", nil);
#endif
        
    }
    @catch (NSException *exception) {
        RCTLogError(@"Exception in getTokens: %@", exception.reason);
        reject(ERROR_TOKEN_REFRESH_ERROR, 
               [NSString stringWithFormat:@"Token refresh failed: %@", exception.reason], 
               nil);
    }
}

#pragma mark - Helper Methods

- (void)clearPendingPromiseWithError:(NSString *)errorCode message:(NSString *)message {
    if (self.pendingReject) {
        self.pendingReject(errorCode, message, nil);
    }
    [self clearPendingPromise];
}

- (void)clearPendingPromise {
    self.pendingResolve = nil;
    self.pendingReject = nil;
    self.signInInProgress = NO;
}

- (void)clearAllState {
    [self clearPendingPromise];
    self.webClientId = nil;
}

#pragma mark - Module Lifecycle

- (void)invalidate {
    RCTLogInfo(@"Module invalidated - cleaning up resources");
    if (self.pendingReject) {
        self.pendingReject(ERROR_MODULE_DESTROYED, @"Module was destroyed", nil);
    }
    [self clearAllState];
}

#pragma mark - TurboModule

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeGoogleSigninModernSpecJSI>(params);
}
#endif

@end
