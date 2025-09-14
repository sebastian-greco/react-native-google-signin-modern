import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import GoogleSignIn, { type GoogleSignInResult } from 'react-native-google-signin-modern';

export default function App() {
  const [user, setUser] = useState<GoogleSignInResult | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        await GoogleSignIn.configure({
          webClientId: 'your-web-client-id.apps.googleusercontent.com',
        });
        setIsConfigured(true);
        console.log('Google Sign-In configured');
      } catch (error) {
        console.error('Failed to configure Google Sign-In:', error);
      }
    };

    configureGoogleSignIn();
  }, []);

  const handleSignIn = async () => {
    try {
      if (!isConfigured) {
        Alert.alert('Error', 'Google Sign-In not configured');
        return;
      }

      const result = await GoogleSignIn.signIn();
      setUser(result);
      Alert.alert('Success', `Welcome, ${result.user.name || result.user.email}!`);
    } catch (error) {
      console.error('Sign-in failed:', error);
      Alert.alert('Error', 'Sign-in failed. Please try again.');
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
      
      {user ? (
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
});
