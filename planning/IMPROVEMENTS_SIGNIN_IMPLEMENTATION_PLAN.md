# React Native Google Sign-In Modern - Library Improvements

## Overview

This document outlines the comprehensive plan to upgrade our `react-native-google-signin-modern` library with critical missing features and modern API improvements. Our Android implementation already uses AndroidX Credential Manager (which includes One-Tap functionality), but we need to enhance our API with additional features and improve the overall structure.

## Project Management

All improvements are tracked in the unified GitHub project: **[React Native Google Sign-In Modern - Library Improvements](https://github.com/users/sebastian-greco/projects/4)**

This project contains two main phases organized as epics with proper roadmap timeline management.

## Current State Analysis

### ✅ What We Already Have
- **Android**: AndroidX Credential Manager with One-Tap functionality
- **iOS**: Google Sign-In SDK with traditional flow
- **Modern Architecture**: Using latest Google Ident``ity Services
- **Basic Flow Management**: INTERACTIVE, SILENT, TOKEN_REFRESH flows on Android

### ❌ What We're Missing
- **Improved API Pattern**: `signIn()` → `createAccount()` → `presentExplicitSignIn()` cascade
- **Response Type System**: Using Promise<UserData> instead of response types
- **Complete Method Coverage**: Missing several key methods
- **iOS Flow Sophistication**: iOS doesn't match Android's flow management

## Implementation Phases

This roadmap is organized into two main phases, each with their own epic and sub-tasks:

### 📋 **Phase 0: Critical Security & Core Features** (Epic #1)
**Priority**: 🚨 CRITICAL - Blocks production usage
**Target Timeline**: 3-4 weeks
**Sub-Issues**: #2, #3, #4, #5

### 📋 **Phase 1: Response Type System Implementation** (Epic #11) 
**Priority**: High - API Structure Improvements
**Target Timeline**: 3-4 weeks (can start in parallel with Phase 0)
**Sub-Issues**: #6, #7, #8, #9, #10

--- Phase 0: CRITICAL - OAuth Scopes Support (MISSING!)

**Current Gap**: Your library has **zero scopes support** - this is a major limitation!

### 0.1 Add Scopes to Android Implementation

**File**: `GoogleSigninModernModule.kt`

```kotlin
// Add configuration storage for scopes
private var configuredScopes: List<String> = listOf("openid", "email", "profile")
private var offlineAccess: Boolean = false

override fun configure(webClientId: String, scopes: List<String>?, offlineAccess: Boolean?, promise: Promise) {
    this.webClientId = webClientId
    this.configuredScopes = scopes ?: listOf("openid", "email", "profile")
    this.offlineAccess = offlineAccess ?: false
    // ... rest of configuration
}

// Update credential request with scopes
private fun performCredentialRequest(filterByAuthorizedAccounts: Boolean, flowType: SignInFlowType) {
    val googleIdOption = GetGoogleIdOption.Builder()
        .setServerClientId(webClientId!!)
        .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
        .setRequestVerifiedPhoneNumber(false) // Add based on scopes
        .build()
        
    // For additional scopes beyond basic profile, use Authorization API
    if (configuredScopes.size > 3 || offlineAccess) {
        performAuthorizationRequest(flowType)
        return
    }
    
    // Standard flow for basic scopes only
    // ... existing implementation
}

// Add Authorization API for advanced scopes
private fun performAuthorizationRequest(flowType: SignInFlowType) {
    val authorizationRequest = AuthorizationRequest.Builder()
        .setRequestedScopes(configuredScopes)
        .setRequestServerAuthCode(offlineAccess)
        .build()
        
    // Use Google's Authorization API
    // This is COMPLETELY MISSING from your current implementation
}
```

### 0.2 Add Scopes to iOS Implementation

**File**: `GoogleSigninModern.mm`

```objc
// Add scope configuration
@property (nonatomic, strong) NSArray<NSString *> *configuredScopes;
@property (nonatomic, assign) BOOL offlineAccess;

RCT_EXPORT_METHOD(configure:(NSString *)webClientId
                  scopes:(NSArray<NSString *> *)scopes
                  offlineAccess:(BOOL)offlineAccess
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
#if HAS_GOOGLE_SIGNIN
    GIDConfiguration *config = [[GIDConfiguration alloc] initWithClientID:webClientId];
    
    // Configure additional scopes
    if (scopes && scopes.count > 0) {
        // Google Sign-In SDK handles scopes through addScopes method after sign-in
        self.configuredScopes = scopes;
    }
    
    self.offlineAccess = offlineAccess;
    [GIDSignIn sharedInstance].configuration = config;
    
    resolve(nil);
#endif
}

// Update sign-in to request scopes
- (void)handleSignInResult:(GIDSignInResult *)result error:(NSError *)error {
    if (error || !result) {
        [self handleError:error];
        return;
    }
    
    GIDGoogleUser *user = result.user;
    
    // If additional scopes needed, request them
    if (self.configuredScopes.count > 0) {
        [user addScopes:self.configuredScopes
  presentingViewController:[self findPresentingViewController]
                completion:^(GIDSignInResult *scopeResult, NSError *scopeError) {
            // Handle scope authorization result
            [self handleScopeAuthorizationResult:scopeResult error:scopeError originalUser:user];
        }];
    } else {
        [self completeSignInWithUser:user];
    }
}
```

### 0.3 Add requestAuthorization() Method (COMPLETELY MISSING)

**Android**:
```kotlin
override fun requestAuthorization(scopes: List<String>, offlineAccess: Boolean, promise: Promise) {
    val authorizationRequest = AuthorizationRequest.Builder()
        .setRequestedScopes(scopes)
        .setRequestServerAuthCode(offlineAccess)
        .build()
        
    val currentActivity = reactApplicationContext.currentActivity
    if (currentActivity == null) {
        promise.reject("NO_ACTIVITY", "No current activity")
        return
    }
    
    // This API is MISSING from your implementation!
    AuthorizeApi.authorize(currentActivity, authorizationRequest)
        .addOnSuccessListener { authorizationResult ->
            val response = Arguments.createMap().apply {
                putString("accessToken", authorizationResult.accessToken)
                putString("serverAuthCode", authorizationResult.serverAuthCode)
                putArray("scopes", Arguments.fromArray(authorizationResult.scopes.toTypedArray()))
            }
            promise.resolve(response)
        }
        .addOnFailureListener { exception ->
            promise.reject("AUTHORIZATION_ERROR", exception.message, exception)
        }
}
```

**iOS**:
```objc
RCT_EXPORT_METHOD(requestAuthorization:(NSArray<NSString *> *)scopes
                  offlineAccess:(BOOL)offlineAccess
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
#if HAS_GOOGLE_SIGNIN
    GIDGoogleUser *currentUser = [GIDSignIn sharedInstance].currentUser;
    if (!currentUser) {
        reject(@"NO_USER", @"No user signed in", nil);
        return;
    }
    
    [currentUser addScopes:scopes
     presentingViewController:[self findPresentingViewController]
                   completion:^(GIDSignInResult *result, NSError *error) {
        if (error) {
            reject(@"AUTHORIZATION_ERROR", error.localizedDescription, error);
            return;
        }
        
        NSDictionary *response = @{
            @"accessToken": result.user.accessToken.tokenString,
            @"scopes": result.user.grantedScopes ?: @[],
            @"serverAuthCode": result.serverAuthCode ?: [NSNull null]
        };
        resolve(response);
    }];
#endif
}
```

## Phase 0.5: CRITICAL - Custom Nonce Security Support (MISSING!)

**Security Gap**: Your library has **no nonce support** - this is a critical security vulnerability and compatibility issue!

### Why Custom Nonce is Critical:

1. **Security**: Prevents replay attacks and session hijacking
2. **Backend Integration**: Required by Supabase, Firebase Auth, and other providers
3. **Enterprise Compliance**: Many enterprise security policies require nonce validation
4. **OAuth Best Practices**: Recommended by OAuth 2.0 security guidelines

### 0.5.1 Add Nonce Support to TypeScript API

**File**: `src/index.tsx`

```typescript
// Add nonce parameter to all sign-in methods
export interface OneTapSignInParams {
  loginHint?: string;
  scopes?: string[];
  nonce?: string;  // CRITICAL ADDITION - Custom nonce for security
}

export interface OneTapCreateAccountParams {
  loginHint?: string;
  scopes?: string[];
  nonce?: string;  // CRITICAL ADDITION
}

export interface OneTapExplicitSignInParams {
  loginHint?: string;
  scopes?: string[];
  nonce?: string;  // CRITICAL ADDITION
}

// Enhanced response with nonce validation info
export interface UserDataWithScopes {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  scopes: string[];
  accessToken: string;
  serverAuthCode?: string;
  // CRITICAL ADDITION:
  idToken: string;  // Contains the nonce claim for validation
  nonce?: string;   // Echo back the nonce used
}

// Utility function for nonce generation
export const getUrlSafeNonce = (byteLength: number = 32): string => {
  // Implementation for generating URL-safe nonces
  // Compatible with expo-crypto and react-native-get-random-values
};
```

### 0.5.2 Add Nonce Support to Android Implementation

**File**: `GoogleSigninModernModule.kt`

```kotlin
// Update sign-in methods to accept nonce parameter
override fun signIn(loginHint: String?, nonce: String?, promise: Promise) {
    try {
        // Validate nonce if provided
        val validatedNonce = validateNonce(nonce)
        
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId!!)
            .setFilterByAuthorizedAccounts(true)
            .apply {
                // CRITICAL: Add nonce to credential request
                if (validatedNonce != null) {
                    setNonce(validatedNonce)
                }
            }
            .build()
            
        performCredentialRequestWithNonce(googleIdOption, validatedNonce, promise)
        
    } catch (e: Exception) {
        promise.reject("NONCE_ERROR", "Invalid nonce: ${e.message}", e)
    }
}

override fun createAccount(loginHint: String?, nonce: String?, promise: Promise) {
    try {
        val validatedNonce = validateNonce(nonce)
        
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId!!)
            .setFilterByAuthorizedAccounts(false)  // Show all accounts
            .apply {
                if (validatedNonce != null) {
                    setNonce(validatedNonce)
                }
            }
            .build()
            
        performCredentialRequestWithNonce(googleIdOption, validatedNonce, promise)
        
    } catch (e: Exception) {
        promise.reject("NONCE_ERROR", "Invalid nonce: ${e.message}", e)
    }
}

private fun validateNonce(nonce: String?): String? {
    if (nonce == null) return null
    
    // Validate nonce format and security requirements
    if (nonce.length < 32) {
        throw IllegalArgumentException("Nonce must be at least 32 characters long")
    }
    
    // Ensure URL-safe base64 format
    if (!nonce.matches(Regex("[A-Za-z0-9_-]+"))) {
        throw IllegalArgumentException("Nonce must be URL-safe base64 encoded")
    }
    
    return nonce
}

private fun performCredentialRequestWithNonce(
    googleIdOption: GetGoogleIdOption, 
    nonce: String?, 
    promise: Promise
) {
    // Enhanced credential request with nonce validation
    // Include nonce in response for verification
}

private fun createSignInResponse(credential: GoogleIdTokenCredential, nonce: String?): WritableMap {
    // Parse and validate ID token contains correct nonce
    val idTokenPayload = parseIdToken(credential.idToken)
    
    // Verify nonce claim matches what we sent
    if (nonce != null) {
        val tokenNonce = idTokenPayload.getString("nonce")
        if (tokenNonce != nonce) {
            throw SecurityException("Nonce mismatch: token nonce doesn't match request nonce")
        }
    }
    
    return Arguments.createMap().apply {
        putString("idToken", credential.idToken)
        putString("nonce", nonce)  // Echo back the nonce
        putMap("user", createUserData(credential))
    }
}
```

### 0.5.3 Add Nonce Support to iOS Implementation

**File**: `GoogleSigninModern.mm`

```objc
// Add nonce storage
@property (nonatomic, copy) NSString *currentNonce;

RCT_EXPORT_METHOD(signIn:(NSString *)loginHint
                  nonce:(NSString *)nonce
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(self.serialQueue, ^{
        NSError *validationError = [self validateNonce:nonce];
        if (validationError) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"NONCE_ERROR", validationError.localizedDescription, validationError);
            });
            return;
        }
        
        // Store nonce for later validation
        self.currentNonce = nonce;
        
        // Proceed with sign-in
        [self performSignInWithNonce:nonce resolve:resolve reject:reject];
    });
}

RCT_EXPORT_METHOD(createAccount:(NSString *)loginHint
                  nonce:(NSString *)nonce
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(self.serialQueue, ^{
        NSError *validationError = [self validateNonce:nonce];
        if (validationError) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"NONCE_ERROR", validationError.localizedDescription, validationError);
            });
            return;
        }
        
        self.currentNonce = nonce;
        [self performCreateAccountWithNonce:nonce resolve:resolve reject:reject];
    });
}

- (NSError *)validateNonce:(NSString *)nonce {
    if (!nonce) return nil;  // Nonce is optional
    
    if (nonce.length < 32) {
        return [NSError errorWithDomain:@"GoogleSigninModernError" 
                                   code:1001 
                               userInfo:@{NSLocalizedDescriptionKey: @"Nonce must be at least 32 characters long"}];
    }
    
    // Validate URL-safe base64 format
    NSCharacterSet *allowedChars = [NSCharacterSet characterSetWithCharactersInString:@"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"];
    NSCharacterSet *nonceChars = [NSCharacterSet characterSetWithCharactersInString:nonce];
    
    if (![allowedChars isSupersetOfSet:nonceChars]) {
        return [NSError errorWithDomain:@"GoogleSigninModernError" 
                                   code:1002 
                               userInfo:@{NSLocalizedDescriptionKey: @"Nonce must be URL-safe base64 encoded"}];
    }
    
    return nil;
}

- (void)performSignInWithNonce:(NSString *)nonce 
                       resolve:(RCTPromiseResolveBlock)resolve 
                        reject:(RCTPromiseRejectBlock)reject {
#if HAS_GOOGLE_SIGNIN
    // Configure nonce in GIDConfiguration if supported
    GIDConfiguration *config = [GIDSignIn sharedInstance].configuration;
    // Note: Google Sign-In iOS SDK doesn't directly support nonce in configuration
    // We need to validate the nonce in the ID token after sign-in
    
    UIViewController *presentingViewController = [self findPresentingViewController];
    if (!presentingViewController) {
        reject(@"SIGN_IN_ERROR", @"No presenting view controller available", nil);
        return;
    }
    
    [[GIDSignIn sharedInstance] signInWithPresentingViewController:presentingViewController
                                                        completion:^(GIDSignInResult *result, NSError *error) {
        dispatch_async(self.serialQueue, ^{
            [self handleSignInResultWithNonce:result error:error nonce:nonce resolve:resolve reject:reject];
        });
    }];
#endif
}

- (void)handleSignInResultWithNonce:(GIDSignInResult *)result 
                              error:(NSError *)error 
                              nonce:(NSString *)nonce 
                            resolve:(RCTPromiseResolveBlock)resolve 
                             reject:(RCTPromiseRejectBlock)reject {
    
    if (error) {
        [self handleError:error reject:reject];
        return;
    }
    
    if (!result || !result.user) {
        reject(@"SIGN_IN_ERROR", @"No user data received", nil);
        return;
    }
    
    // Validate nonce in ID token
    if (nonce) {
        NSError *nonceValidationError = [self validateNonceInIdToken:result.user.idToken.tokenString 
                                                        expectedNonce:nonce];
        if (nonceValidationError) {
            reject(@"NONCE_VALIDATION_ERROR", nonceValidationError.localizedDescription, nonceValidationError);
            return;
        }
    }
    
    // Create response with nonce
    NSDictionary *response = [self createSignInResponseWithUser:result.user nonce:nonce];
    dispatch_async(dispatch_get_main_queue(), ^{
        resolve(response);
    });
}

- (NSError *)validateNonceInIdToken:(NSString *)idTokenString expectedNonce:(NSString *)expectedNonce {
    // Parse JWT and extract nonce claim
    NSArray *parts = [idTokenString componentsSeparatedByString:@"."];
    if (parts.count != 3) {
        return [NSError errorWithDomain:@"GoogleSigninModernError" 
                                   code:1003 
                               userInfo:@{NSLocalizedDescriptionKey: @"Invalid ID token format"}];
    }
    
    // Decode payload (base64 URL decode)
    NSString *payload = parts[1];
    NSData *decodedData = [self base64URLDecode:payload];
    if (!decodedData) {
        return [NSError errorWithDomain:@"GoogleSigninModernError" 
                                   code:1004 
                               userInfo:@{NSLocalizedDescriptionKey: @"Failed to decode ID token payload"}];
    }
    
    NSError *jsonError;
    NSDictionary *claims = [NSJSONSerialization JSONObjectWithData:decodedData options:0 error:&jsonError];
    if (jsonError) {
        return jsonError;
    }
    
    // Verify nonce claim
    NSString *tokenNonce = claims[@"nonce"];
    if (![tokenNonce isEqualToString:expectedNonce]) {
        return [NSError errorWithDomain:@"GoogleSigninModernError" 
                                   code:1005 
                               userInfo:@{NSLocalizedDescriptionKey: @"Nonce mismatch: token nonce doesn't match request nonce"}];
    }
    
    return nil;
}

- (NSData *)base64URLDecode:(NSString *)base64URLString {
    // Convert URL-safe base64 to standard base64
    NSMutableString *base64String = [base64URLString mutableCopy];
    [base64String replaceOccurrencesOfString:@"-" withString:@"+" options:0 range:NSMakeRange(0, base64String.length)];
    [base64String replaceOccurrencesOfString:@"_" withString:@"/" options:0 range:NSMakeRange(0, base64String.length)];
    
    // Add padding if necessary
    while (base64String.length % 4) {
        [base64String appendString:@"="];
    }
    
    return [[NSData alloc] initWithBase64EncodedString:base64String options:0];
}

- (NSDictionary *)createSignInResponseWithUser:(GIDGoogleUser *)user nonce:(NSString *)nonce {
    // Include nonce in response for verification
    NSMutableDictionary *response = [[self createSignInResponse:user] mutableCopy];
    if (nonce) {
        response[@"nonce"] = nonce;
    }
    return response;
}
```

### 0.5.4 Usage Examples with Nonce

```typescript
// Basic usage with custom nonce
import { getUrlSafeNonce, GoogleOneTapSignIn } from 'react-native-google-signin-modern';

const signInWithNonce = async () => {
  const nonce = getUrlSafeNonce(); // Generate secure nonce
  
  const response = await GoogleOneTapSignIn.signIn({ nonce });
  
  if (isSuccessResponse(response)) {
    // Nonce is validated and included in response
    console.log('Sign-in successful with nonce:', response.data.nonce);
    console.log('ID Token (contains nonce claim):', response.data.idToken);
  }
};

// Usage with Supabase
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

const signInWithSupabase = async () => {
  const rawNonce = getUrlSafeNonce();
  const nonceDigest = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  
  // Use nonceDigest with Google Sign-In
  const response = await GoogleOneTapSignIn.signIn({ nonce: nonceDigest });
  
  if (isSuccessResponse(response)) {
    // Use rawNonce with Supabase
    await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
      nonce: rawNonce  // Supabase validates this against the digest in ID token
    });
  }
};
```

## Phase 1: Response Type System Implementation

### 1.1 Update TypeScript Definitions

**File**: `src/index.tsx`

```typescript
// UPDATED - Enhanced Response Types with Scopes
export type OneTapResponse = 
  | { type: 'success'; data: UserDataWithScopes }
  | { type: 'noSavedCredentialFound' }
  | { type: 'cancelled' };

export type OneTapExplicitSignInResponse = 
  | { type: 'success'; data: UserDataWithScopes }
  | { type: 'cancelled' };

export type AuthorizationResponse = {
  accessToken: string;
  serverAuthCode?: string;
  scopes: string[];
};

// UPDATED - Enhanced Configuration with Scopes
export interface OneTapConfigureParams {
  webClientId: string | 'autoDetect';
  iosClientId?: string;
  scopes?: string[];  // CRITICAL ADDITION
  offlineAccess?: boolean;  // CRITICAL ADDITION
  hostedDomain?: string;
}

export interface UserDataWithScopes {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  // CRITICAL ADDITIONS:
  scopes: string[];  // What scopes this user has granted
  accessToken: string;  // Access token with scopes
  serverAuthCode?: string;  // For backend integration
}

export interface OneTapSignInParams {
  loginHint?: string;
  scopes?: string[];  // Request specific scopes for this sign-in
}

export interface OneTapCreateAccountParams {
  loginHint?: string;
  scopes?: string[];  // Request specific scopes for account creation
}

export interface OneTapExplicitSignInParams {
  loginHint?: string;
  scopes?: string[];  // Request specific scopes for explicit sign-in
}

export interface RequestAuthorizationParams {
  scopes: string[];  // CRITICAL - Request additional scopes
  offlineAccess?: boolean;  // CRITICAL - Request server auth code
}
```

### 1.2 Add Utility Helper Functions

```typescript
// Utility Functions
export const isSuccessResponse = (response: OneTapResponse): response is { type: 'success'; data: UserData } =>
  response.type === 'success';

export const isNoSavedCredentialFoundResponse = (response: OneTapResponse): response is { type: 'noSavedCredentialFound' } =>
  response.type === 'noSavedCredentialFound';

export const isCancelledResponse = (response: OneTapResponse): response is { type: 'cancelled' } =>
  response.type === 'cancelled';

export const isErrorWithCode = (error: any): error is { code: string; message: string } =>
  typeof error === 'object' && error !== null && typeof error.code === 'string';
```

## Phase 2: Core Method Implementation

### 2.1 Update signIn() Method

**Current Behavior**: Returns Promise<UserData>
**New Behavior**: Returns Promise<OneTapResponse>

**Android Changes** (`GoogleSigninModernModule.kt`):
```kotlin
override fun signIn(promise: Promise) {
    // First try authorized accounts (One-Tap)
    performCredentialRequest(
        filterByAuthorizedAccounts = true, 
        flowType = SignInFlowType.INTERACTIVE,
        responseCallback = { response ->
            when (response) {
                is CredentialResult.Success -> promise.resolve(createSuccessResponse(response.data))
                is CredentialResult.NoCredential -> promise.resolve(createNoSavedCredentialResponse())
                is CredentialResult.Cancelled -> promise.resolve(createCancelledResponse())
            }
        }
    )
}
```

**iOS Changes** (`GoogleSigninModern.mm`):
```objc
RCT_EXPORT_METHOD(signIn:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // Try silent sign-in first (equivalent to One-Tap)
    [self performSilentSignInWithCompletion:^(OneTapResponse *response) {
        if (response.type == OneTapResponseTypeSuccess) {
            resolve(@{@"type": @"success", @"data": response.data});
        } else {
            resolve(@{@"type": @"noSavedCredentialFound"});
        }
    }];
}
```

### 2.2 Add createAccount() Method

**Purpose**: Called when signIn() returns 'noSavedCredentialFound'

**Android**:
```kotlin
override fun createAccount(promise: Promise) {
    // Show account selection UI (filter by all accounts)
    performCredentialRequest(
        filterByAuthorizedAccounts = false,
        flowType = SignInFlowType.CREATE_ACCOUNT,
        responseCallback = { response ->
            promise.resolve(transformToOneTapResponse(response))
        }
    )
}
```

**iOS**:
```objc
RCT_EXPORT_METHOD(createAccount:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // Present interactive sign-in UI
    [self performInteractiveSignInWithCompletion:^(OneTapResponse *response) {
        resolve([self transformToOneTapResponse:response]);
    }];
}
```

### 2.3 Add presentExplicitSignIn() Method

**Purpose**: Fallback for rate limiting or no Google accounts on device

**Android**:
```kotlin
override fun presentExplicitSignIn(promise: Promise) {
    // Force explicit sign-in dialog
    // Handle rate limiting case
    performExplicitSignIn(promise)
}
```

**iOS**:
```objc
RCT_EXPORT_METHOD(presentExplicitSignIn:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    // Same as createAccount on iOS
    [self performInteractiveSignInWithCompletion:^(OneTapResponse *response) {
        resolve([self transformToOneTapResponse:response]);
    }];
}
```

## Phase 3: Enhanced Configuration and Authorization

### 3.1 Update configure() Method

```typescript
// Enhanced configuration
export interface OneTapConfigureParams {
  webClientId: string | 'autoDetect';
  iosClientId?: string;
  scopes?: string[];
  offlineAccess?: boolean;
  hostedDomain?: string;
}
```

**Android**:
```kotlin
override fun configure(params: OneTapConfigureParams, promise: Promise) {
    // Auto-detect webClientId from google-services.json if "autoDetect"
    val resolvedWebClientId = if (params.webClientId == "autoDetect") {
        autoDetectWebClientId()
    } else {
        params.webClientId
    }
    
    // Store configuration including scopes
    this.configuration = Configuration(
        webClientId = resolvedWebClientId,
        scopes = params.scopes ?: emptyList(),
        offlineAccess = params.offlineAccess ?: false,
        hostedDomain = params.hostedDomain
    )
    
    promise.resolve(null)
}
```

### 3.2 Add requestAuthorization() Method

**Purpose**: Request additional scopes and server auth codes

**Android**:
```kotlin
override fun requestAuthorization(params: RequestAuthorizationParams, promise: Promise) {
    val authorizationRequest = AuthorizationRequest.Builder()
        .setRequestedScopes(params.scopes)
        .setOfflineAccess(params.offlineAccess)
        .build()
        
    // Use Authorization API
    performAuthorizationRequest(authorizationRequest, promise)
}
```

**iOS**:
```objc
RCT_EXPORT_METHOD(requestAuthorization:(NSDictionary *)params
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    NSArray *scopes = params[@"scopes"];
    BOOL offlineAccess = [params[@"offlineAccess"] boolValue];
    
    // Use addScopes on iOS
    [[GIDSignIn sharedInstance].currentUser addScopes:scopes
                              presentingViewController:[self findPresentingViewController]
                                            completion:^(GIDSignInResult *result, NSError *error) {
        // Handle response
    }];
}
```

## Phase 4: Additional Methods

### 4.1 Add revokeAccess() Method

```typescript
revokeAccess(emailOrUniqueId: string): Promise<null>
```

### 4.2 Add clearCachedAccessToken() Method

```typescript
clearCachedAccessToken(accessTokenString: string): Promise<null>
```

### 4.3 Update checkPlayServices() Method

```typescript
checkPlayServices(showErrorResolutionDialog?: boolean): Promise<PlayServicesInfo>
```

## Phase 5: Error Handling and Status Codes

### 5.1 Add Universal Status Codes

```typescript
export const statusCodes = {
  ONE_TAP_START_FAILED: 'ONE_TAP_START_FAILED',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
} as const;
```

### 5.2 Enhance Error Context

```typescript
export interface GoogleSignInError extends Error {
  code: string;
  userInfo?: Record<string, any>;
}
```

## Phase 6: iOS Flow Sophistication

### 6.1 Implement Flow Type Management on iOS

```objc
typedef NS_ENUM(NSInteger, GSMSignInFlowType) {
    GSMSignInFlowTypeInteractive,
    GSMSignInFlowTypeSilent,
    GSMSignInFlowTypeCreateAccount,
    GSMSignInFlowTypeExplicit
};
```

### 6.2 Unified iOS Implementation

```objc
- (void)performSignInWithFlowType:(GSMSignInFlowType)flowType
                           params:(NSDictionary *)params
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
    // Unified sign-in logic matching Android patterns
}
```

## Implementation Priority

### CRITICAL (Missing Core Features)
1. 🚨 **OAuth Scopes Support** - Currently completely missing!
2. 🚨 **Server Auth Code Support** - Essential for backend integration
3. 🚨 **Custom Nonce Security Support** - Critical for replay attack prevention and auth providers
4. 🚨 **requestAuthorization() Method** - Core Universal Sign-in feature

### High Priority (Improved API Structure)
4. ⏳ Response type system implementation
5. ⏳ Update signIn() method to return OneTapResponse
6. ⏳ Add createAccount() method
7. ⏳ Add presentExplicitSignIn() method
8. ⏳ Add utility helper functions

### Medium Priority (Enhanced Features)
9. ⏳ Enhanced configure() method with auto-detection
10. ⏳ Add revokeAccess() method
11. ⏳ Update checkPlayServices() method

### Low Priority (Completeness)
12. ⏳ Add clearCachedAccessToken() method
13. ⏳ iOS flow sophistication improvements
14. ⏳ Enhanced error handling and status codes

## Migration Guide for Users

### Before (Current API)
```typescript
try {
  const user = await GoogleSignIn.signIn();
  console.log(user);
} catch (error) {
  // Handle error
}
```

### After (Improved API)
```typescript
const response = await GoogleOneTapSignIn.signIn();
if (isSuccessResponse(response)) {
  console.log(response.data);
} else if (isNoSavedCredentialFoundResponse(response)) {
  const createResponse = await GoogleOneTapSignIn.createAccount();
  if (isSuccessResponse(createResponse)) {
    console.log(createResponse.data);
  }
}
```

## Testing Strategy

1. **Unit Tests**: Test response type transformations
2. **Integration Tests**: Test full sign-in flows
3. **Platform Tests**: Ensure Android/iOS parity
4. **Edge Cases**: Rate limiting, no accounts, network errors

## Timeline Estimate

### **Phase 0** (Critical Security & Core Features) - 3-4 weeks
- **Week 1-2**: OAuth Scopes Support (#2) + Custom Nonce Security (#4)
- **Week 2-3**: Server Auth Code Support (#3) + requestAuthorization() Method (#5)
- **Week 3-4**: Testing, integration, and documentation

### **Phase 1** (Response Type System) - 3-4 weeks (parallel with Phase 0)
- **Week 1**: TypeScript Definitions (#6) + Utility Functions (#7)
- **Week 2-3**: Core Methods Implementation (#8, #9, #10)
- **Week 3-4**: Testing, platform parity, and documentation

### **Total Timeline**: 6-8 weeks with parallel execution

## Project Benefits

### **Immediate Impact** (Phase 0)
- ✅ **Production Ready**: OAuth scopes enable real-world app usage
- ✅ **Security Compliant**: Custom nonce prevents replay attacks
- ✅ **Backend Integration**: Server auth codes enable server-side API access
- ✅ **Enterprise Ready**: Complete authorization capabilities

### **Developer Experience** (Phase 1)  
- ✅ **Type Safety**: Comprehensive TypeScript support with utilities
- ✅ **Clear Error Handling**: Structured responses instead of exceptions
- ✅ **Modern Patterns**: Improved cascade flow with fallback mechanisms
- ✅ **Better UX**: Clear user feedback and graceful error recovery

## Success Criteria

1. ✅ Full API compatibility with modern Google Sign-In patterns
2. ✅ Maintained Android One-Tap functionality 
3. ✅ Enhanced iOS flow management
4. ✅ Comprehensive TypeScript definitions
5. ✅ Backward compatibility during transition period
6. ✅ Complete test coverage
7. ✅ Updated documentation and examples

---

**Next Steps**: Begin with Phase 1 (Response Type System) implementation and update TypeScript definitions.