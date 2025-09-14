import { NativeModules } from 'react-native';

interface GoogleSignInResult {
  idToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
  };
}

interface GoogleSigninModernInterface {
  configure(webClientId: string): Promise<void>;
  isPlayServicesAvailable(): Promise<boolean>;
  signIn(): Promise<GoogleSignInResult>;
  signOut(): Promise<void>;
  isSignedIn(): Promise<boolean>;
}

const { GoogleSigninModern } = NativeModules;

if (!GoogleSigninModern) {
  throw new Error(
    'GoogleSigninModern native module not found. Make sure the library is properly linked and you have rebuilt the app.'
  );
}

export default GoogleSigninModern as GoogleSigninModernInterface;
