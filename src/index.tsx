import GoogleSigninModern from './NativeGoogleSigninModern';

export interface GoogleSignInResult {
  idToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
  };
}

export interface GoogleSignInConfig {
  webClientId: string;
}

/**
 * Modern Google Sign-In for React Native
 * Uses AndroidX Credential Manager and Google Identity Services APIs
 */
class GoogleSignIn {
  private isConfigured = false;

  /**
   * Configure Google Sign-In with Web Client ID
   */
  async configure(config: GoogleSignInConfig): Promise<void> {
    await GoogleSigninModern.configure(config.webClientId);
    this.isConfigured = true;
  }

  /**
   * Check if Google Play Services are available
   */
  async isPlayServicesAvailable(): Promise<boolean> {
    return await GoogleSigninModern.isPlayServicesAvailable();
  }

  /**
   * Sign in with Google using native Android APIs
   */
  async signIn(): Promise<GoogleSignInResult> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured. Call configure() first.');
    }
    return await GoogleSigninModern.signIn();
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured');
    }
    await GoogleSigninModern.signOut();
  }

  /**
   * Check if user is currently signed in
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }
    return await GoogleSigninModern.isSignedIn();
  }
}

export const GoogleSignInModule = new GoogleSignIn();
export { GoogleSignInModule as default };
