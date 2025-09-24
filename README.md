# react-native-google-signin-modern

A modern React Native Google Sign-In library built with AndroidX Credential Manager and Google Identity Services APIs. Designed as a contemporary alternative to legacy Google Sign-In libraries, providing better performance, security, and developer experience.

## ✨ Features

- 🚀 **Modern APIs**: Uses AndroidX Credential Manager and Google Identity Services
- 🔒 **Enhanced Security**: Built-in credential validation and secure token handling  
- 📱 **Seamless UX**: Automatic account management with guided user flows
- 🎯 **TypeScript Support**: Full TypeScript definitions included
- ⚡ **Lightweight**: Minimal dependencies and optimized bundle size
- 🔄 **Auto Recovery**: Intelligent error handling with automatic account setup

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

## API Reference

### Methods

#### `configure(config: GoogleSignInConfig): Promise<void>`
Configure the Google Sign-In with your web client ID.

```typescript
interface GoogleSignInConfig {
  webClientId: string; // Your OAuth 2.0 Web Client ID
}
```

#### `signIn(): Promise<GoogleSignInResult>`
Initiate the Google Sign-In flow.

```typescript
interface GoogleSignInResult {
  user: {
    id: string;        // Google account email
    name: string;      // Display name
    email: string;     // Email address  
    photo?: string;    // Profile picture URL
  };
  idToken: string;     // JWT token for backend verification
}
```

#### `signOut(): Promise<void>`
Sign out the current user and clear authentication state.

#### `isPlayServicesAvailable(): Promise<boolean>`
Check if Google Play Services are available on the device.

#### `isSignedIn(): Promise<boolean>`
Returns `false` - apps should manage their own authentication state.

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
    case 'NO_ACTIVITY':
      // No current activity available
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
