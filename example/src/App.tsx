import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Button, Alert, Platform } from 'react-native';
import GoogleSignIn, {
  type GoogleSignInResult,
} from 'react-native-google-signin-modern';

// Configuration - in a real app, load this from environment variables or config
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  'your-web-client-id.apps.googleusercontent.com';

const isValidWebClientId = (clientId: string): boolean => {
  // Check if it's not empty, not the placeholder, and has the correct format
  if (!clientId || clientId.trim().length === 0) {
    return false;
  }

  if (clientId === 'your-web-client-id.apps.googleusercontent.com') {
    return false;
  }

  if (!clientId.includes('.apps.googleusercontent.com')) {
    return false;
  }

  return true;
};

export default function App() {
  const [user, setUser] = useState<GoogleSignInResult | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        // Validate webClientId first
        if (!isValidWebClientId(WEB_CLIENT_ID)) {
          const errorMessage = `Invalid Google Web Client ID configuration. Please provide a valid Web Client ID from Google Cloud Console. Current value: ${WEB_CLIENT_ID.includes('.apps.googleusercontent.com') ? '[invalid format]' : '[placeholder]'}`;
          console.error('Google Sign-In Configuration Error:', errorMessage);
          setConfigError(errorMessage);
          return;
        }

        // On Android, check Play Services availability first
        if (Platform.OS === 'android') {
          const playServicesAvailable =
            await GoogleSignIn.isPlayServicesAvailable();
          if (!playServicesAvailable) {
            const errorMessage =
              'Google Play Services not available on this device. Google Sign-In requires Google Play Services to be installed and up to date.';
            console.error('Google Play Services Error:', errorMessage);
            setConfigError(errorMessage);
            return;
          }
          console.log('Google Play Services available');
        }

        await GoogleSignIn.configure({
          webClientId: WEB_CLIENT_ID,
        });
        setIsConfigured(true);
        setConfigError(null);
        console.log('Google Sign-In configured successfully');
      } catch (error: any) {
        const errorMessage = `Failed to configure Google Sign-In: ${error.message || 'Unknown error'}`;
        console.error('Google Sign-In Configuration Error:', errorMessage);
        setConfigError(errorMessage);
      }
    };

    configureGoogleSignIn();
  }, []);

  const handleSignIn = async () => {
    try {
      if (!isConfigured) {
        Alert.alert(
          'Configuration Error',
          configError ||
            'Google Sign-In not configured. Please check your configuration.'
        );
        return;
      }

      const result = await GoogleSignIn.signIn();
      setUser(result);
      Alert.alert(
        'Success',
        `Welcome, ${result.user.name || result.user.email}!`
      );
    } catch (error: any) {
      console.error('Sign-in failed:', error);

      let errorMessage = 'Sign-in failed. Please try again.';

      // Provide more specific error messages based on common error types
      if (error.message) {
        if (error.message.includes('cancelled')) {
          // User cancelled, don't show error
          return;
        } else if (error.message.includes('network')) {
          errorMessage =
            'Network error. Please check your internet connection.';
        } else if (error.message.includes('Play Services')) {
          errorMessage =
            'Google Play Services issue. Please update Google Play Services and try again.';
        } else if (error.message.includes('configuration')) {
          errorMessage =
            'Configuration error. Please check your Google Sign-In setup.';
        }
      }

      Alert.alert('Sign-In Error', errorMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      await GoogleSignIn.signOut();
      setUser(null);
      Alert.alert('Success', 'Signed out successfully');
    } catch (error) {
      console.error('Sign-out failed:', error);
      Alert.alert('Error', 'Sign-out failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Sign-In Example</Text>

      {configError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Configuration Error</Text>
          <Text style={styles.errorText}>{configError}</Text>
          <Text style={styles.instructionText}>
            To fix this:
            {'\n'}1. Get a Web Client ID from Google Cloud Console
            {'\n'}2. Either:
            {'\n'} • Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variable,
            or
            {'\n'} • Update the WEB_CLIENT_ID constant in this file
            {'\n'}3. Ensure the ID ends with .apps.googleusercontent.com
          </Text>
        </View>
      ) : user ? (
        <View style={styles.userInfo}>
          <Text style={styles.text}>Welcome!</Text>
          <Text style={styles.text}>Name: {user.user.name || 'N/A'}</Text>
          <Text style={styles.text}>Email: {user.user.email}</Text>
          <Button title="Sign Out" onPress={handleSignOut} />
        </View>
      ) : (
        <View style={styles.signInContainer}>
          <Text style={styles.text}>
            {isConfigured ? 'Tap to sign in with Google' : 'Configuring...'}
          </Text>
          <Button
            title="Sign In with Google"
            onPress={handleSignIn}
            disabled={!isConfigured}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  signInContainer: {
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    margin: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 12,
    color: '#424242',
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
});
