# iOS Setup Guide for react-native-google-signin-modern

## Prerequisites

1. **Google Cloud Console Setup**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Google Sign-In API
   - Create credentials (OAuth 2.0 client IDs) for:
     - Web application (for your backend)
     - iOS application

2. **Get your iOS Client ID**
   - In Google Cloud Console, go to "Credentials"
   - Create an OAuth 2.0 client ID for iOS
   - Enter your app's bundle identifier
   - Download the `GoogleService-Info.plist` file

## Installation Steps

### 1. Add GoogleService-Info.plist

1. Download `GoogleService-Info.plist` from Google Cloud Console
2. Add it to your iOS project root (next to `Info.plist`)
3. Make sure it's added to your target in Xcode

### 2. Install Dependencies

The library automatically includes the Google Sign-In iOS SDK via CocoaPods:

```bash
cd ios && pod install
```

### 3. Configure URL Schemes

Add your app's URL scheme to `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>GoogleSignIn</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <!-- Replace with your REVERSED_CLIENT_ID from GoogleService-Info.plist -->
            <string>YOUR_REVERSED_CLIENT_ID</string>
        </array>
    </dict>
</array>
```

**Important**: The `REVERSED_CLIENT_ID` is found in your `GoogleService-Info.plist` file.

### 4. Update AppDelegate

If you're using a React Native project with the new architecture, your AppDelegate should already be updated. For older projects, ensure your AppDelegate handles URL schemes:

#### Swift AppDelegate

```swift
import GoogleSignIn

func application(
  _ app: UIApplication,
  open url: URL,
  options: [UIApplication.OpenURLOptionsKey: Any] = [:]
) -> Bool {
  return GIDSignIn.sharedInstance.handle(url)
}
```

#### Objective-C AppDelegate

```objc
#import <GoogleSignIn/GoogleSignIn.h>

- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [[GIDSignIn sharedInstance] handleURL:url];
}
```

## Usage

```typescript
import { GoogleSignIn } from 'react-native-google-signin-modern';

// Configure with your Web Client ID (not iOS Client ID)
await GoogleSignIn.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

// Sign in
const result = await GoogleSignIn.signIn();
console.log('User:', result.user);
console.log('ID Token:', result.idToken);
```

## Important Notes

1. **Use Web Client ID**: Always configure with your Web Client ID (not iOS Client ID) for proper backend verification
2. **URL Schemes**: Make sure the URL scheme in `Info.plist` matches your `REVERSED_CLIENT_ID`
3. **Bundle ID**: Ensure your bundle identifier matches what's configured in Google Cloud Console
4. **Testing**: Test on a real device as Google Sign-In doesn't work in iOS Simulator

## Troubleshooting

### Common Issues

1. **"No application found to handle request"**
   - Check URL scheme configuration in `Info.plist`
   - Ensure `REVERSED_CLIENT_ID` is correct

2. **"Configuration not found"**
   - Verify `GoogleService-Info.plist` is added to project
   - Check bundle identifier matches Google Cloud Console

3. **"Invalid client ID"**
   - Make sure you're using the Web Client ID (not iOS Client ID)
   - Verify the client ID is correctly configured

4. **Sign-In dialog doesn't appear**
   - Test on a real device (not simulator)
   - Check if Google Sign-In app is installed

### Debug Information

Enable debug logging in development:

```typescript
// This will log additional information during development
if (__DEV__) {
  console.log('Google Sign-In Debug Mode Enabled');
}
```
