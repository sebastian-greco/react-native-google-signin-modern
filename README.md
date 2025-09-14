# react-native-google-signin-modern

Modern Google Sign-In for React Native using AndroidX Credential Manager and Google Identity Services.

**🚀 Why this library?**
- ✅ **Free & Open Source** - No monetization or paid features
- ✅ **Modern APIs** - Uses latest AndroidX Credential Manager and Google Identity Services
- ✅ **Clean Architecture** - Built with React Native's modern native module patterns
- ✅ **Type Safe** - Full TypeScript support
- ✅ **Lightweight** - Minimal dependencies, maximum efficiency

This library replaces the need for `@react-native-google-signin/google-signin` which has introduced monetization and paid features for basic Android functionality.

## 🔧 Installation

```sh
npm install react-native-google-signin-modern
```

### Android Setup

1. **Google Cloud Console Setup:**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Sign-In API
   - Create OAuth 2.0 Client IDs:
     - **Android Application** - Use your app's package name and SHA-1 fingerprint
     - **Web Application** - For server-side token verification

2. **Get your SHA-1 fingerprint:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
   ```

3. **Configuration:**
   No additional Android configuration needed! The library uses AndroidX Credential Manager which handles Google Sign-In automatically.

### iOS Setup
iOS support coming soon! Currently Android-only.

## 📱 Usage

```typescript
import GoogleSignIn, { GoogleSignInResult } from 'react-native-google-signin-modern';

// Configure with your Web Client ID from Google Cloud Console
await GoogleSignIn.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
});

// Check if Google Play Services are available
const isAvailable = await GoogleSignIn.isPlayServicesAvailable();

// Sign in
try {
  const result: GoogleSignInResult = await GoogleSignIn.signIn();
  console.log('Signed in user:', result.user);
  console.log('ID Token:', result.idToken); // Use this for backend authentication
} catch (error) {
  console.error('Sign in failed:', error);
}

// Sign out
await GoogleSignIn.signOut();

// Check sign-in status
const isSignedIn = await GoogleSignIn.isSignedIn();
```

## 🔑 Supabase Integration

If you're using Supabase, configure your Google provider in the Supabase dashboard:

1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Add your **Web Client ID** and **Web Client Secret** from Google Cloud Console
4. Use the `idToken` from the sign-in result with Supabase:

```typescript
import { supabase } from './supabase-client';

const result = await GoogleSignIn.signIn();
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: result.idToken,
});
```

const result = multiply(3, 7);
```


## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
