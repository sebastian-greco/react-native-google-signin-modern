/**
 * Mock for NativeGoogleSigninModern TurboModule
 * This mock provides controllable responses for testing
 */

import type {
  GoogleSignInResult,
  GoogleSignInTokens,
} from '../../NativeGoogleSigninModern';

// Mock state to control responses
interface MockState {
  isConfigured: boolean;
  isPlayServicesAvailable: boolean;
  isSignedIn: boolean;
  currentUser: GoogleSignInResult['user'] | null;
  shouldThrow: boolean;
  throwError?: Error;
  signInDelay?: number;
  signInInProgress: boolean;
}

const defaultMockState: MockState = {
  isConfigured: false,
  isPlayServicesAvailable: true,
  isSignedIn: false,
  currentUser: null,
  shouldThrow: false,
  signInInProgress: false,
};

let mockState = { ...defaultMockState };

// Mock implementation
const mockNativeModule = {
  configure: jest.fn(async (webClientId: string): Promise<void> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Configure failed');
    }

    if (!webClientId || typeof webClientId !== 'string') {
      throw new Error('Invalid web client ID');
    }

    mockState.isConfigured = true;
  }),

  isPlayServicesAvailable: jest.fn(async (): Promise<boolean> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Play Services check failed');
    }
    return mockState.isPlayServicesAvailable;
  }),

  signIn: jest.fn(async (nonce?: string | null): Promise<GoogleSignInResult> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Sign in failed');
    }

    if (!mockState.isConfigured) {
      throw new Error('Not configured');
    }

    if (mockState.signInInProgress) {
      const error = new Error('Sign-in already in progress') as any;
      error.code = 'SIGN_IN_IN_PROGRESS';
      throw error;
    }

    if (!mockState.isPlayServicesAvailable) {
      const error = new Error('Google Play Services not available') as any;
      error.code = 'PLAY_SERVICES_NOT_AVAILABLE';
      throw error;
    }

    // Set sign in as in progress
    mockState.signInInProgress = true;

    try {
      // Simulate delay if specified
      if (mockState.signInDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, mockState.signInDelay)
        );
      }

      const user = mockState.currentUser || {
        id: 'test@example.com',
        email: 'test@example.com',
        name: 'Test User',
        photo: 'https://example.com/photo.jpg',
      };

      mockState.isSignedIn = true;
      mockState.currentUser = user;

      return {
        idToken: 'mock-id-token-' + Date.now() + '-' + Math.random(),
        user,
        nonce: nonce || null,
      };
    } finally {
      // Clear sign in progress flag
      mockState.signInInProgress = false;
    }
  }),

  signInSilently: jest.fn(async (nonce?: string | null): Promise<GoogleSignInResult> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Silent sign in failed');
    }

    if (!mockState.isConfigured) {
      throw new Error('Not configured');
    }

    if (mockState.signInInProgress) {
      const error = new Error('Sign-in already in progress') as any;
      error.code = 'SIGN_IN_IN_PROGRESS';
      throw error;
    }

    if (!mockState.isSignedIn || !mockState.currentUser) {
      const error = new Error('No signed in user') as any;
      error.code = 'NO_SIGNED_IN_USER';
      throw error;
    }

    // Set sign in as in progress
    mockState.signInInProgress = true;

    try {
      // Simulate delay if specified
      if (mockState.signInDelay) {
        await new Promise((resolve) =>
          setTimeout(resolve, mockState.signInDelay)
        );
      }

      return {
        idToken: 'mock-silent-id-token-' + Date.now() + '-' + Math.random(),
        user: mockState.currentUser,
        nonce: nonce || null,
      };
    } finally {
      // Clear sign in progress flag
      mockState.signInInProgress = false;
    }
  }),

  getTokens: jest.fn(async (): Promise<GoogleSignInTokens> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Get tokens failed');
    }

    if (!mockState.isConfigured) {
      throw new Error('Not configured');
    }

    if (!mockState.isSignedIn) {
      const error = new Error('No signed in user') as any;
      error.code = 'NO_SIGNED_IN_USER';
      throw error;
    }

    return {
      idToken: 'mock-fresh-id-token-' + Date.now() + '-' + Math.random(),
      accessToken: 'mock-access-token-' + Date.now() + '-' + Math.random(),
    };
  }),

  signOut: jest.fn(async (): Promise<void> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Sign out failed');
    }

    mockState.isSignedIn = false;
    mockState.currentUser = null;
    mockState.signInInProgress = false; // Clear any pending sign-in operations
  }),

  isSignedIn: jest.fn(async (): Promise<boolean> => {
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error('Is signed in check failed');
    }

    return mockState.isSignedIn;
  }),
};

// Mock control utilities
export const mockGoogleSignIn = {
  // Reset mock to default state
  reset: () => {
    mockState = { ...defaultMockState };
    Object.values(mockNativeModule).forEach((fn) => {
      if (jest.isMockFunction(fn)) {
        fn.mockClear();
      }
    });
  },

  // Configure mock state
  setState: (newState: Partial<MockState>) => {
    mockState = { ...mockState, ...newState };
  },

  // Get current mock state
  getState: () => ({ ...mockState }),

  // Set up common error scenarios
  setPlayServicesUnavailable: () => {
    mockState.isPlayServicesAvailable = false;
  },

  setNotConfigured: () => {
    mockState.isConfigured = false;
  },

  setSignedOut: () => {
    mockState.isSignedIn = false;
    mockState.currentUser = null;
  },

  setSignedIn: (user?: GoogleSignInResult['user']) => {
    mockState.isSignedIn = true;
    mockState.currentUser = user || {
      id: 'test@example.com',
      email: 'test@example.com',
      name: 'Test User',
      photo: 'https://example.com/photo.jpg',
    };
  },

  setError: (error: Error) => {
    mockState.shouldThrow = true;
    mockState.throwError = error;
  },

  clearError: () => {
    mockState.shouldThrow = false;
    mockState.throwError = undefined;
  },

  setSignInDelay: (ms: number) => {
    // Add a small buffer to account for timing variations in test execution
    mockState.signInDelay = ms + 10;
  },

  // Access to mock functions for verification
  mocks: mockNativeModule,
};

// Default export for Jest module mocking
export default mockNativeModule;
