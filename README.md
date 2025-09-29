# react-native-google-signin-modern

A modern React Native Google Sign-In library built with AndroidX Credential Manager and Google Identity Services APIs. Designed as a contemporary alternative to legacy Google Sign-In libraries, providing better performance, security, and developer experience.

## ✨ Features

- 🚀 **Modern APIs**: Uses AndroidX Credential Manager and Google Identity Services
- 🔒 **Enhanced Security**: Built-in credential validation and secure token handling  
- 🛡️ **Custom Nonce Support**: Prevents replay attacks and enables backend integration
- 📱 **Seamless UX**: Automatic account management with guided user flows
- 🎯 **TypeScript Support**: Full TypeScript definitions included
- ⚡ **Lightweight**: Minimal dependencies and optimized bundle size
- 🔄 **Auto Recovery**: Intelligent error handling with automatic account setup
- 🏢 **Enterprise Ready**: Supabase, Firebase Auth, Auth0, and enterprise compatibility

## Installation

```sh
npm install react-native-google-signin-modern
# or
yarn add react-native-google-signin-modern
```

### Android Setup

1. **Add to your `android/app/build.gradle`:**
```gradle
dependencies {
  implementation 'androidx.credentials:credentials:1.6.0-beta01'
  implementation 'com.google.android.libraries.identity.googleid:googleid:1.1.1'
}
```

2. **Get your Web Client ID from Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select your project
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID for "Web application"
   - Copy the Client ID (it should end with `.googleusercontent.com`)

## Usage

### Basic Setup

```typescript
import GoogleSignIn from 'react-native-google-signin-modern';

// Configure the library (call this once, preferably in App.tsx)
await GoogleSignIn.configure({
  webClientId: 'your-web-client-id.googleusercontent.com'
});
```

### Sign In

```typescript
try {
  const result = await GoogleSignIn.signIn();
  console.log('User signed in:', result.user);
  console.log('ID Token:', result.idToken);
  
  // Use the result
  const { user, idToken } = result;
  // user contains: { id, name, email, photo }
} catch (error) {
  if (error.code === 'NO_GOOGLE_ACCOUNTS') {
    // User has no Google accounts - library automatically opens Add Account screen
    alert('Please add a Google account and try again.');
  } else {
    console.error('Sign in error:', error);
  }
}
```

### Silent Sign In

```typescript
try {
  // Try to sign in silently (no UI shown)
  const result = await GoogleSignIn.signInSilently();
  console.log('User signed in silently:', result.user);
  // User was already authenticated
} catch (error) {
  if (error.code === 'SIGN_IN_REQUIRED') {
    // No previous sign-in found, show sign-in UI
    const result = await GoogleSignIn.signIn();
  } else {
    console.error('Silent sign in error:', error);
  }
}
```

### Token Management

```typescript
try {
  // Get fresh tokens for API calls
  const tokens = await GoogleSignIn.getTokens();
  console.log('ID Token:', tokens.idToken);
  console.log('Access Token:', tokens.accessToken);
  
  // Use tokens for authenticated API requests
  const response = await fetch('https://api.example.com/user', {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`
    }
  });
} catch (error) {
  if (error.code === 'NO_USER') {
    // User needs to sign in first
    const result = await GoogleSignIn.signIn();
  } else {
    console.error('Token refresh error:', error);
  }
}
```

### Sign Out

```typescript
try {
  await GoogleSignIn.signOut();
  console.log('User signed out successfully');
} catch (error) {
  console.error('Sign out error:', error);
}
```

### Check Configuration

```typescript
// Check if Play Services are available
const isAvailable = await GoogleSignIn.isPlayServicesAvailable();

// Check if user is currently signed in (returns false - app should manage auth state)
const isSignedIn = await GoogleSignIn.isSignedIn();
```

## 🔒 Security: Custom Nonce Support

### Overview

This library supports custom nonces for enhanced security, which are **critical** for:
- **Preventing replay attacks** - Ensures each authentication request is unique
- **Backend integration** - Required by Supabase, Firebase Auth, Auth0, and enterprise systems
- **Security compliance** - Meets enterprise security policies and standards

### Basic Nonce Usage

```typescript
import GoogleSignIn, { getUrlSafeNonce } from 'react-native-google-signin-modern';

// Generate a secure URL-safe nonce
const nonce = getUrlSafeNonce(); // Default: 32 bytes, URL-safe base64

// Sign in with nonce
const result = await GoogleSignIn.signIn({ nonce });
console.log('Nonce used:', result.nonce);
console.log('ID Token (contains nonce claim):', result.idToken);

// Silent sign in with nonce
const silentResult = await GoogleSignIn.signInSilently({ nonce });
```

### Advanced Nonce Configuration

```typescript
// Generate custom length nonce (16-128 bytes)
const shortNonce = getUrlSafeNonce(16);   // Minimum for security
const longNonce = getUrlSafeNonce(64);    // Enterprise security

// The nonce is automatically validated in the ID token
try {
  const result = await GoogleSignIn.signIn({ nonce: longNonce });
  // Nonce claim in ID token matches the request nonce
} catch (error) {
  if (error.code === 'NONCE_VALIDATION_ERROR') {
    console.error('Nonce validation failed - possible security issue');
  }
}
```

### Backend Integration Examples

#### Supabase Integration
```typescript
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

const supabaseSignIn = async () => {
  // Generate raw nonce
  const rawNonce = getUrlSafeNonce();
  
  // Hash the nonce for Google (required by Supabase pattern)
  const hashedNonce = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  
  // Sign in with hashed nonce
  const result = await GoogleSignIn.signIn({ nonce: hashedNonce });
  
  if (result) {
    // Use raw nonce with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: result.idToken,
      nonce: rawNonce  // Supabase validates this against hashed nonce in ID token
    });
  }
};
```

#### Firebase Auth Integration
```typescript
const firebaseSignIn = async () => {
  const nonce = getUrlSafeNonce();
  
  const result = await GoogleSignIn.signIn({ nonce });
  
  if (result) {
    // Firebase automatically validates the nonce in the ID token
    const credential = GoogleAuthProvider.credential(result.idToken);
    await signInWithCredential(auth, credential);
  }
};
```

#### Auth0 Integration
```typescript
const auth0SignIn = async () => {
  const nonce = getUrlSafeNonce();
  
  const result = await GoogleSignIn.signIn({ nonce });
  
  if (result) {
    // Auth0 requires nonce for security compliance
    await auth0.webAuth.authorize({
      connection: 'google-oauth2',
      id_token: result.idToken,
      nonce: result.nonce
    });
  }
};
```

### Security Best Practices

1. **Always use nonces for production** - They prevent replay attacks
2. **Generate fresh nonces** - Never reuse nonces across sessions
3. **Validate on backend** - Always verify nonce claims in ID tokens
4. **Use sufficient length** - Minimum 32 characters (default)
5. **Handle validation errors** - Treat nonce mismatches as security issues

```typescript
// ✅ Good: Generate fresh nonce for each sign-in
const signIn = async () => {
  const nonce = getUrlSafeNonce(); // Fresh nonce
  return await GoogleSignIn.signIn({ nonce });
};

// ❌ Bad: Reusing nonces (security vulnerability)
const STATIC_NONCE = getUrlSafeNonce(); // DON'T DO THIS
const signIn = async () => {
  return await GoogleSignIn.signIn({ nonce: STATIC_NONCE });
};
```

### Error Handling

```typescript
try {
  const result = await GoogleSignIn.signIn({ nonce: getUrlSafeNonce() });
} catch (error) {
  switch (error.code) {
    case 'NONCE_ERROR':
      console.error('Invalid nonce format:', error.message);
      break;
    case 'NONCE_VALIDATION_ERROR':
      console.error('Nonce validation failed:', error.message);
      // This indicates a potential security issue
      break;
    default:
      console.error('Sign in error:', error);
  }
}
```

## API Reference

### Methods

#### `configure(config: GoogleSignInConfig): Promise<void>`
Configure the Google Sign-In with your web client ID.

```typescript
interface GoogleSignInConfig {
  webClientId: string; // Your OAuth 2.0 Web Client ID
}
```

#### `signIn(options?: GoogleSignInOptions): Promise<GoogleSignInResult>`
Initiate the Google Sign-In flow.

```typescript
interface GoogleSignInOptions {
  nonce?: string; // Custom nonce for security (recommended)
}

interface GoogleSignInResult {
  user: {
    id: string;        // Google account email
    name: string;      // Display name
    email: string;     // Email address  
    photo?: string;    // Profile picture URL
  };
  idToken: string;     // JWT token for backend verification
  nonce?: string;      // Echo of the nonce used (if provided)
}
```

#### `signInSilently(options?: GoogleSignInOptions): Promise<GoogleSignInResult>`
Attempt to sign in without showing UI. Useful for checking if user is already authenticated when app starts.

```typescript
// Same GoogleSignInOptions as signIn()
interface GoogleSignInOptions {
  nonce?: string; // Custom nonce for security (optional)
}
```

Returns the same `GoogleSignInResult` as `signIn()` if successful, or throws `SIGN_IN_REQUIRED` error if user needs to sign in interactively.

#### `getTokens(): Promise<GoogleSignInTokens>`
Get fresh authentication tokens for the currently signed-in user.

```typescript
interface GoogleSignInTokens {
  idToken: string;     // JWT token for backend verification
  accessToken: string; // OAuth access token for Google APIs
}
```

#### `signOut(): Promise<void>`
Sign out the current user and clear authentication state.

#### `isPlayServicesAvailable(): Promise<boolean>`
Check if Google Play Services are available on the device.

#### `isSignedIn(): Promise<boolean>`
Returns `false` - apps should manage their own authentication state.

### Security Utilities

#### `getUrlSafeNonce(byteLength?: number): string`
Generate a cryptographically secure URL-safe nonce for Google Sign-In.

```typescript
// Generate default 32-byte nonce (recommended)
const nonce = getUrlSafeNonce();

// Generate custom length nonce (16-128 bytes)
const shortNonce = getUrlSafeNonce(16);  // Minimum for security
const longNonce = getUrlSafeNonce(64);   // Enterprise security

// Throws error for invalid lengths
getUrlSafeNonce(8);   // Error: too short
getUrlSafeNonce(200); // Error: too long
```

**Parameters:**
- `byteLength` (optional): Number of random bytes (default: 32, range: 16-128)

**Returns:** URL-safe base64 encoded nonce string

**Security Requirements:**
- Minimum 16 bytes for basic security
- Default 32 bytes recommended for most use cases  
- Maximum 128 bytes to prevent excessive token size

## Error Handling

The library provides specific error codes for different scenarios:

```typescript
try {
  await GoogleSignIn.signIn();
} catch (error) {
  switch (error.code) {
    case 'NO_GOOGLE_ACCOUNTS':
      // No Google accounts on device - Add Account screen opened automatically
      break;
    case 'NOT_CONFIGURED':
      // Library not configured - call configure() first
      break;
    case 'SIGN_IN_IN_PROGRESS':
      // Another sign-in is already in progress
      break;
    case 'SIGN_IN_REQUIRED':
      // Silent sign-in failed - user needs to sign in interactively
      break;
    case 'NO_USER':
      // getTokens() called but no user is signed in
      break;
    case 'TOKEN_REFRESH_ERROR':
      // Failed to refresh authentication tokens
      break;
    case 'USER_CANCELLED':
      // User cancelled the sign-in dialog
      break;
    case 'NO_ACTIVITY':
      // No current activity available (Android only)
      break;
    case 'NONCE_ERROR':
      // Invalid nonce format or length
      break;
    case 'NONCE_VALIDATION_ERROR':
      // Nonce validation failed - potential security issue
      break;
    default:
      // Other sign-in errors
      break;
  }
}
```

## Automatic Account Management

When no Google accounts are available on the device, the library automatically:
1. Opens the system Add Account screen
2. Filters to show only Google account options
3. Returns a user-friendly error message

This provides a seamless user experience without requiring manual intervention.

## Best Practices

### App Startup Flow
```typescript
// Recommended app startup authentication flow
async function initializeAuth() {
  try {
    // First, try silent sign-in
    const user = await GoogleSignIn.signInSilently();
    console.log('User already signed in:', user);
    return user;
  } catch (error) {
    if (error.code === 'SIGN_IN_REQUIRED') {
      // User needs to sign in - show sign-in button
      console.log('User needs to sign in');
      return null;
    } else {
      console.error('Silent sign-in error:', error);
      return null;
    }
  }
}
```

### Token Refresh for API Calls
```typescript
// Refresh tokens before making authenticated API requests
async function makeAuthenticatedRequest(url: string) {
  try {
    const tokens = await GoogleSignIn.getTokens();
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (error.code === 'NO_USER') {
      // Redirect to sign-in
      throw new Error('User not signed in');
    }
    throw error;
  }
}
```

### Method Usage Guide
- **`signInSilently()`**: Use on app startup to check existing authentication
- **`signIn()`**: Use when user explicitly wants to sign in (button press)  
- **`getTokens()`**: Use before making authenticated API requests
- **`signOut()`**: Use when user explicitly wants to sign out

## Backend Integration

Use the `idToken` from the sign-in result to verify the user on your backend:

```javascript
// Backend verification example (Node.js)
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
}
```

## Troubleshooting

### Common Issues

1. **"Not configured" error**: Make sure to call `configure()` with a valid web client ID
2. **Sign-in fails**: Verify your web client ID is correct and from Google Cloud Console
3. **No accounts available**: The library handles this automatically by opening account settings

### Requirements

- React Native 0.60+
- Android API level 21+
- AndroidX Credential Manager
- Google Play Services

## Migration from Legacy Libraries

This library uses modern Android APIs and provides a cleaner interface compared to legacy Google Sign-In libraries. Key differences:

- Uses AndroidX Credential Manager instead of deprecated Google Sign-In SDK
- Simplified configuration (only web client ID required)
- Better error handling and user experience
- Automatic account management

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
