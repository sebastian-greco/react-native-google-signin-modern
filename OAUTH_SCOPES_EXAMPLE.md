# OAuth Scopes Usage Examples

This document demonstrates how to use the new OAuth scopes functionality in react-native-google-signin-modern.

## Basic Configuration

### Default Configuration (Basic Profile)
```typescript
import { GoogleSignInModule } from 'react-native-google-signin-modern';

// Configure with default scopes: ['openid', 'email', 'profile']
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com'
});
```

### Configuration with Custom Scopes
```typescript
import { GoogleSignInModule } from 'react-native-google-signin-modern';

// Configure with custom scopes for Google APIs
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: [
    'openid',
    'email', 
    'profile',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.readonly'
  ]
});
```

### Configuration with Offline Access
```typescript
import { GoogleSignInModule } from 'react-native-google-signin-modern';

// Enable offline access for server-side token refresh
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  offlineAccess: true // Enables server auth code
});
```

## Sign-In with Scopes

### Basic Sign-In
```typescript
try {
  const result = await GoogleSignInModule.signIn();
  
  console.log('User:', result.user);
  console.log('ID Token:', result.idToken);
  console.log('Granted Scopes:', result.scopes);
  console.log('Access Token:', result.accessToken);
  console.log('Server Auth Code:', result.serverAuthCode);
} catch (error) {
  console.error('Sign-in failed:', error);
}
```

### Response Structure
```typescript
interface GoogleSignInResult {
  idToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
  };
  scopes: string[];           // NEW: Granted scopes
  accessToken?: string;       // NEW: Access token when available
  serverAuthCode?: string;    // NEW: Server auth code for offline access
}
```

## Token Management with Scopes

### Get Fresh Tokens
```typescript
try {
  const tokens = await GoogleSignInModule.getTokens();
  
  console.log('ID Token:', tokens.idToken);
  console.log('Access Token:', tokens.accessToken);
  console.log('Scopes:', tokens.scopes); // NEW: Scopes included
} catch (error) {
  console.error('Token refresh failed:', error);
}
```

### Token Response Structure
```typescript
interface GoogleSignInTokens {
  idToken: string;
  accessToken: string;
  scopes: string[];    // NEW: Granted scopes
}
```

## Real-World Examples

### Example 1: Google Drive Integration
```typescript
// Configure for Google Drive access
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.file'
  ]
});

// Sign in and get tokens
const result = await GoogleSignInModule.signIn();

// Use access token to call Google Drive API
if (result.accessToken) {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    headers: {
      'Authorization': `Bearer ${result.accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const files = await response.json();
  console.log('Drive files:', files);
}
```

### Example 2: Gmail Integration with Offline Access
```typescript
// Configure for Gmail access with offline capability
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly'  
  ],
  offlineAccess: true
});

// Sign in
const result = await GoogleSignInModule.signIn();

// Send server auth code to your backend for token exchange
if (result.serverAuthCode) {
  await fetch('https://your-backend.com/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serverAuthCode: result.serverAuthCode,
      userId: result.user.id
    })
  });
}

// Use access token for immediate Gmail access
if (result.accessToken) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
    headers: {
      'Authorization': `Bearer ${result.accessToken}`
    }
  });
  
  const messages = await response.json();
  console.log('Gmail messages:', messages);
}
```

### Example 3: Multiple Google APIs
```typescript
// Configure for multiple Google APIs
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/contacts.readonly'
  ],
  offlineAccess: true
});

const result = await GoogleSignInModule.signIn();

// Verify which scopes were actually granted
const grantedScopes = result.scopes;
console.log('Granted scopes:', grantedScopes);

// Conditional API access based on granted scopes
if (grantedScopes.includes('https://www.googleapis.com/auth/drive.file')) {
  // Access Google Drive
  console.log('Drive access granted');
}

if (grantedScopes.includes('https://www.googleapis.com/auth/calendar')) {
  // Access Google Calendar
  console.log('Calendar access granted');
}

if (grantedScopes.includes('https://www.googleapis.com/auth/contacts.readonly')) {
  // Access Google Contacts
  console.log('Contacts access granted');
}
```

## Error Handling

### Scope Authorization Errors
```typescript
try {
  await GoogleSignInModule.configure({
    webClientId: 'your-client-id.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const result = await GoogleSignInModule.signIn();
  console.log('Sign-in successful');
} catch (error) {
  if (error.code === 'USER_CANCELLED') {
    console.log('User cancelled scope authorization');
  } else if (error.code === 'SIGN_IN_ERROR') {
    console.log('Scope authorization failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Migration from Previous Versions

### Before (No Scopes Support)
```typescript
// Old configuration
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com'
});

const result = await GoogleSignInModule.signIn();
// result only had: { idToken, user }
```

### After (With Scopes Support)
```typescript
// New configuration (backward compatible)
await GoogleSignInModule.configure({
  webClientId: 'your-client-id.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/drive.file'], // NEW
  offlineAccess: true // NEW
});

const result = await GoogleSignInModule.signIn();
// result now has: { idToken, user, scopes, accessToken, serverAuthCode }
```

**Note**: Existing code continues to work without changes. New fields are optional and backward compatible.

## Common Google API Scopes

Here are some commonly used Google API scopes:

### Google Drive
- `https://www.googleapis.com/auth/drive` - Full access to Google Drive
- `https://www.googleapis.com/auth/drive.file` - Access to files created by the app
- `https://www.googleapis.com/auth/drive.readonly` - Read-only access to Google Drive

### Gmail
- `https://www.googleapis.com/auth/gmail.readonly` - Read-only access to Gmail
- `https://www.googleapis.com/auth/gmail.modify` - Read, compose, send, and permanently delete emails
- `https://www.googleapis.com/auth/gmail.compose` - Manage drafts and send emails

### Google Calendar
- `https://www.googleapis.com/auth/calendar` - Manage calendars and events
- `https://www.googleapis.com/auth/calendar.readonly` - Read-only access to calendars
- `https://www.googleapis.com/auth/calendar.events` - Manage calendar events

### Google Contacts
- `https://www.googleapis.com/auth/contacts.readonly` - Read-only access to contacts
- `https://www.googleapis.com/auth/contacts` - Manage contacts

### YouTube
- `https://www.googleapis.com/auth/youtube` - Manage YouTube account
- `https://www.googleapis.com/auth/youtube.readonly` - Read-only access to YouTube

For a complete list of available scopes, visit: https://developers.google.com/identity/protocols/oauth2/scopes