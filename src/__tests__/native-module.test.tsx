/**
 * Native module interface tests
 * Tests the mocking infrastructure and native module contracts
 */

// Mock the native module before importing
jest.mock(
  '../NativeGoogleSigninModern',
  () => require('./__mocks__/NativeGoogleSigninModern').default
);

import NativeGoogleSigninModern from '../NativeGoogleSigninModern';
import { mockGoogleSignIn } from './__mocks__/NativeGoogleSigninModern';
import {
  createMockConfig,
  createMockSignInResult,
  resetFactoryCounters,
} from './factories';
import { commonTestSetup, commonTestCleanup } from './test-utils';

describe('Native Module Interface', () => {
  beforeEach(() => {
    commonTestSetup();
    resetFactoryCounters();
  });

  afterEach(() => {
    commonTestCleanup();
  });

  describe('Mock Infrastructure', () => {
    it('should provide mock control utilities', () => {
      expect(mockGoogleSignIn).toBeDefined();
      expect(mockGoogleSignIn.reset).toBeInstanceOf(Function);
      expect(mockGoogleSignIn.setState).toBeInstanceOf(Function);
      expect(mockGoogleSignIn.getState).toBeInstanceOf(Function);
      expect(mockGoogleSignIn.mocks).toBeDefined();
    });

    it('should reset mock state properly', () => {
      // Change state
      mockGoogleSignIn.setState({ isConfigured: true, isSignedIn: true });
      const stateBefore = mockGoogleSignIn.getState();
      expect(stateBefore.isConfigured).toBe(true);
      expect(stateBefore.isSignedIn).toBe(true);

      // Reset should restore defaults
      mockGoogleSignIn.reset();
      const stateAfter = mockGoogleSignIn.getState();
      expect(stateAfter.isConfigured).toBe(false);
      expect(stateAfter.isSignedIn).toBe(false);
    });

    it('should allow state configuration', () => {
      mockGoogleSignIn.setState({
        isConfigured: true,
        isPlayServicesAvailable: false,
      });

      const state = mockGoogleSignIn.getState();
      expect(state.isConfigured).toBe(true);
      expect(state.isPlayServicesAvailable).toBe(false);
    });
  });

  describe('Mock Method Behavior', () => {
    it('should mock configure method', async () => {
      const config = createMockConfig();

      await expect(
        NativeGoogleSigninModern.configure(config.webClientId)
      ).resolves.toBeUndefined();

      expect(mockGoogleSignIn.mocks.configure).toHaveBeenCalledWith(
        config.webClientId
      );
      expect(mockGoogleSignIn.mocks.configure).toHaveBeenCalledTimes(1);
    });

    it('should mock isPlayServicesAvailable method', async () => {
      mockGoogleSignIn.setState({ isPlayServicesAvailable: true });

      const result = await NativeGoogleSigninModern.isPlayServicesAvailable();

      expect(result).toBe(true);
      expect(
        mockGoogleSignIn.mocks.isPlayServicesAvailable
      ).toHaveBeenCalledTimes(1);
    });

    it('should mock signIn method with realistic data', async () => {
      mockGoogleSignIn.setState({ isConfigured: true });
      const expectedResult = createMockSignInResult();
      mockGoogleSignIn.setSignedIn(expectedResult.user);

      const result = await NativeGoogleSigninModern.signIn();

      expect(result).toHaveProperty('idToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(mockGoogleSignIn.mocks.signIn).toHaveBeenCalledTimes(1);
    });

    it('should mock getTokens method', async () => {
      mockGoogleSignIn.setState({ isConfigured: true, isSignedIn: true });

      const tokens = await NativeGoogleSigninModern.getTokens();

      expect(tokens).toHaveProperty('idToken');
      expect(tokens).toHaveProperty('accessToken');
      expect(typeof tokens.idToken).toBe('string');
      expect(typeof tokens.accessToken).toBe('string');
      expect(mockGoogleSignIn.mocks.getTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Simulation', () => {
    it('should simulate configuration errors', async () => {
      mockGoogleSignIn.setError(new Error('Configuration failed'));

      await expect(NativeGoogleSigninModern.configure('test')).rejects.toThrow(
        'Configuration failed'
      );
    });

    it('should simulate sign in errors with codes', async () => {
      mockGoogleSignIn.setState({ isConfigured: true });

      const error = new Error('Play Services not available') as any;
      error.code = 'PLAY_SERVICES_NOT_AVAILABLE';
      mockGoogleSignIn.setError(error);

      try {
        await NativeGoogleSigninModern.signIn();
        fail('Should have thrown error');
      } catch (thrownError) {
        expect((thrownError as Error).message).toBe(
          'Play Services not available'
        );
        expect((thrownError as any).code).toBe('PLAY_SERVICES_NOT_AVAILABLE');
      }
    });

    it('should clear errors properly', async () => {
      // Set error
      mockGoogleSignIn.setError(new Error('Test error'));
      await expect(NativeGoogleSigninModern.configure('test')).rejects.toThrow(
        'Test error'
      );

      // Clear error
      mockGoogleSignIn.clearError();
      await expect(
        NativeGoogleSigninModern.configure('test')
      ).resolves.toBeUndefined();
    });
  });

  describe('Realistic Response Simulation', () => {
    it('should generate realistic sign in responses', async () => {
      mockGoogleSignIn.setState({ isConfigured: true });

      // Multiple calls should generate different tokens but consistent user
      const result1 = await NativeGoogleSigninModern.signIn();
      const result2 = await NativeGoogleSigninModern.signIn();

      // Tokens should be different (fresh)
      expect(result1.idToken).not.toBe(result2.idToken);

      // But user should be consistent within session
      expect(result1.user.id).toBe(result2.user.id);
      expect(result1.user.email).toBe(result2.user.email);
    });

    it('should simulate delays when configured', async () => {
      mockGoogleSignIn.setState({ isConfigured: true });
      mockGoogleSignIn.setSignInDelay(100); // 100ms delay

      const startTime = Date.now();
      await NativeGoogleSigninModern.signIn();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // 100ms delay with 10ms buffer
    });

    it('should handle pre-configured user scenarios', async () => {
      const customUser = createMockSignInResult({
        name: 'Custom Test User',
        email: 'custom@test.com',
      }).user;

      mockGoogleSignIn.setState({ isConfigured: true });
      mockGoogleSignIn.setSignedIn(customUser);

      const result = await NativeGoogleSigninModern.signIn();

      expect(result.user.name).toBe('Custom Test User');
      expect(result.user.email).toBe('custom@test.com');
    });
  });

  describe('State Transition Testing', () => {
    it('should track sign in state transitions', async () => {
      const config = createMockConfig();

      // Initially not configured
      let state = mockGoogleSignIn.getState();
      expect(state.isConfigured).toBe(false);
      expect(state.isSignedIn).toBe(false);

      // Configure
      await NativeGoogleSigninModern.configure(config.webClientId);
      state = mockGoogleSignIn.getState();
      expect(state.isConfigured).toBe(true);
      expect(state.isSignedIn).toBe(false);

      // Sign in
      await NativeGoogleSigninModern.signIn();
      state = mockGoogleSignIn.getState();
      expect(state.isConfigured).toBe(true);
      expect(state.isSignedIn).toBe(true);

      // Sign out
      await NativeGoogleSigninModern.signOut();
      state = mockGoogleSignIn.getState();
      expect(state.isConfigured).toBe(true);
      expect(state.isSignedIn).toBe(false);
    });

    it('should validate method call sequences', async () => {
      const config = createMockConfig();

      // Configure first
      await NativeGoogleSigninModern.configure(config.webClientId);

      // Then sign in
      await NativeGoogleSigninModern.signIn();

      // Verify call order
      const { mocks } = mockGoogleSignIn;
      const configureCall = mocks.configure.mock.invocationCallOrder?.[0];
      const signInCall = mocks.signIn.mock.invocationCallOrder?.[0];

      if (configureCall && signInCall) {
        expect(configureCall).toBeLessThan(signInCall);
      }
    });
  });

  describe('Mock Function Verification', () => {
    it('should track all method calls', async () => {
      const config = createMockConfig();

      await NativeGoogleSigninModern.configure(config.webClientId);
      await NativeGoogleSigninModern.isPlayServicesAvailable();
      await NativeGoogleSigninModern.signIn();
      await NativeGoogleSigninModern.getTokens();
      await NativeGoogleSigninModern.isSignedIn();
      await NativeGoogleSigninModern.signOut();

      const { mocks } = mockGoogleSignIn;
      expect(mocks.configure).toHaveBeenCalledTimes(1);
      expect(mocks.isPlayServicesAvailable).toHaveBeenCalledTimes(1);
      expect(mocks.signIn).toHaveBeenCalledTimes(1);
      expect(mocks.getTokens).toHaveBeenCalledTimes(1);
      expect(mocks.isSignedIn).toHaveBeenCalledTimes(1);
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });

    it('should reset mock call counts', () => {
      mockGoogleSignIn.mocks.configure('test');
      mockGoogleSignIn.mocks.configure('test2');

      expect(mockGoogleSignIn.mocks.configure).toHaveBeenCalledTimes(2);

      mockGoogleSignIn.reset();

      expect(mockGoogleSignIn.mocks.configure).toHaveBeenCalledTimes(0);
    });
  });
});
