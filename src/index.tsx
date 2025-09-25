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

export interface GoogleSignInTokens {
  idToken: string;
  accessToken: string;
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
   * INTERNAL: Reset configuration state (for testing only)
   * @internal
   */
  _resetForTesting(): void {
    this.isConfigured = false;
  }

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
    const nativeResult = await GoogleSigninModern.signIn();

    // Normalize optional properties to ensure they are never undefined
    return {
      idToken: nativeResult.idToken,
      user: {
        id: nativeResult.user.id,
        name: nativeResult.user.name ?? null,
        email: nativeResult.user.email,
        photo: nativeResult.user.photo ?? null,
      },
    };
  }

  /**
   * Attempt to sign in silently (no UI shown)
   * Useful for checking if user is already authenticated when app starts
   */
  async signInSilently(): Promise<GoogleSignInResult> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured. Call configure() first.');
    }
    const nativeResult = await GoogleSigninModern.signInSilently();

    // Normalize optional properties to ensure they are never undefined
    return {
      idToken: nativeResult.idToken,
      user: {
        id: nativeResult.user.id,
        name: nativeResult.user.name ?? null,
        email: nativeResult.user.email,
        photo: nativeResult.user.photo ?? null,
      },
    };
  }

  /**
   * Get fresh authentication tokens for the currently signed-in user.
   *
   * **Important**: This method initiates a fresh credential request flow and does NOT
   * return cached tokens. It may prompt the user for account selection or authentication.
   *
   * Use this method before making authenticated API requests that require fresh tokens.
   */
  async getTokens(): Promise<GoogleSignInTokens> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured. Call configure() first.');
    }
    return await GoogleSigninModern.getTokens();
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
