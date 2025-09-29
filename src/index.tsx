import GoogleSigninModern from './NativeGoogleSigninModern';

export interface GoogleSignInResult {
  idToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    photo: string | null;
  };
  nonce?: string | null;
}

export interface GoogleSignInTokens {
  idToken: string;
  accessToken: string;
}

export interface GoogleSignInConfig {
  webClientId: string;
}

export interface GoogleSignInOptions {
  nonce?: string;
}

/**
 * Generate a cryptographically secure URL-safe nonce for Google Sign-In
 * @param byteLength Number of random bytes to generate (default: 32)
 * @returns URL-safe base64 encoded nonce string
 */
export const getUrlSafeNonce = (byteLength: number = 32): string => {
  if (byteLength < 16) {
    throw new Error('Nonce must be at least 16 bytes long for security');
  }
  if (byteLength > 128) {
    throw new Error('Nonce length should not exceed 128 bytes');
  }

  // Generate random bytes
  const randomBytes = new Uint8Array(byteLength);
  
  // Use crypto.getRandomValues if available (modern environments)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < byteLength; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to URL-safe base64
  let base64 = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  
  // Process bytes in groups of 3 to create base64
  for (let i = 0; i < randomBytes.length; i += 3) {
    const a = randomBytes[i] ?? 0;
    const b = randomBytes[i + 1] ?? 0;
    const c = randomBytes[i + 2] ?? 0;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    base64 += chars.charAt((bitmap >> 18) & 63);
    base64 += chars.charAt((bitmap >> 12) & 63);
    
    if (i + 1 < randomBytes.length) {
      base64 += chars.charAt((bitmap >> 6) & 63);
    }
    if (i + 2 < randomBytes.length) {
      base64 += chars.charAt(bitmap & 63);
    }
  }

  return base64;
};

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
   * @param options Optional sign-in options including nonce
   */
  async signIn(options?: GoogleSignInOptions): Promise<GoogleSignInResult> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured. Call configure() first.');
    }
    const nativeResult = await GoogleSigninModern.signIn(options?.nonce);

    // Normalize optional properties to ensure they are never undefined
    return {
      idToken: nativeResult.idToken,
      user: {
        id: nativeResult.user.id,
        name: nativeResult.user.name ?? null,
        email: nativeResult.user.email,
        photo: nativeResult.user.photo ?? null,
      },
      nonce: nativeResult.nonce ?? null,
    };
  }

  /**
   * Attempt to sign in silently (no UI shown)
   * Useful for checking if user is already authenticated when app starts
   * @param options Optional sign-in options including nonce
   */
  async signInSilently(options?: GoogleSignInOptions): Promise<GoogleSignInResult> {
    if (!this.isConfigured) {
      throw new Error('Google Sign-In not configured. Call configure() first.');
    }
    const nativeResult = await GoogleSigninModern.signInSilently(options?.nonce);

    // Normalize optional properties to ensure they are never undefined
    return {
      idToken: nativeResult.idToken,
      user: {
        id: nativeResult.user.id,
        name: nativeResult.user.name ?? null,
        email: nativeResult.user.email,
        photo: nativeResult.user.photo ?? null,
      },
      nonce: nativeResult.nonce ?? null,
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
