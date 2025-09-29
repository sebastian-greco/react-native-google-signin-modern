/**
 * Nonce Support Tests for React Native Google Sign-In Modern
 * Tests the critical security feature for preventing replay attacks
 */

// Mock the native module before importing
jest.mock(
  '../NativeGoogleSigninModern',
  () => require('./__mocks__/NativeGoogleSigninModern').default
);

import { GoogleSignInModule, getUrlSafeNonce } from '../index';
import { mockGoogleSignIn } from './__mocks__/NativeGoogleSigninModern';
import {
  setupConfiguredState,
  setupSignedInUser,
  expectToThrow,
  commonTestSetup,
} from './test-utils';
import { createMockConfig, resetFactoryCounters } from './factories';

describe('GoogleSignInModule - Nonce Security Support', () => {
  beforeEach(async () => {
    await commonTestSetup();
    resetFactoryCounters();
  });

  describe('getUrlSafeNonce Utility', () => {
    it('should generate a URL-safe nonce with default length', () => {
      const nonce = getUrlSafeNonce();
      
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThanOrEqual(32);
      
      // Should only contain URL-safe characters
      expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate nonces with custom byte length', () => {
      const nonce16 = getUrlSafeNonce(16);
      const nonce64 = getUrlSafeNonce(64);
      
      expect(nonce16.length).toBeGreaterThanOrEqual(16);
      expect(nonce64.length).toBeGreaterThanOrEqual(64);
      expect(nonce64.length).toBeGreaterThan(nonce16.length);
    });

    it('should generate unique nonces on each call', () => {
      const nonce1 = getUrlSafeNonce();
      const nonce2 = getUrlSafeNonce();
      const nonce3 = getUrlSafeNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);
    });

    it('should validate minimum nonce length for security', () => {
      expect(() => getUrlSafeNonce(15)).toThrow('Nonce must be at least 16 bytes long for security');
      expect(() => getUrlSafeNonce(8)).toThrow('Nonce must be at least 16 bytes long for security');
      
      // Should work with minimum length
      expect(() => getUrlSafeNonce(16)).not.toThrow();
    });

    it('should validate maximum nonce length', () => {
      expect(() => getUrlSafeNonce(129)).toThrow('Nonce length should not exceed 128 bytes');
      expect(() => getUrlSafeNonce(200)).toThrow('Nonce length should not exceed 128 bytes');
      
      // Should work with maximum length
      expect(() => getUrlSafeNonce(128)).not.toThrow();
    });
  });

  describe('Sign In with Nonce', () => {
    it('should sign in successfully with valid nonce', async () => {
      await setupConfiguredState();
      const nonce = getUrlSafeNonce();

      const result = await GoogleSignInModule.signIn({ nonce });

      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(nonce);
      expect(result.idToken).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should sign in successfully without nonce', async () => {
      await setupConfiguredState();

      const result = await GoogleSignInModule.signIn();

      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBeNull();
    });

    it('should sign in successfully with null nonce', async () => {
      await setupConfiguredState();

      const result = await GoogleSignInModule.signIn({ nonce: undefined });

      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBeNull();
    });

    it('should pass nonce to native module correctly', async () => {
      await setupConfiguredState();
      const nonce = getUrlSafeNonce();

      await GoogleSignInModule.signIn({ nonce });

      expect(mockGoogleSignIn.mocks.signIn).toHaveBeenCalledWith(nonce);
    });

    it('should handle nonce validation errors from native module', async () => {
      await setupConfiguredState();
      const invalidNonce = 'too-short';
      
      // Mock native module to throw nonce validation error
      const nonceError = new Error('Nonce must be at least 32 characters long') as any;
      nonceError.code = 'NONCE_ERROR';
      mockGoogleSignIn.setError(nonceError);

      await expectToThrow(
        () => GoogleSignInModule.signIn({ nonce: invalidNonce }),
        'Nonce must be at least 32 characters long'
      );
    });
  });

  describe('Silent Sign In with Nonce', () => {
    it('should sign in silently with valid nonce', async () => {
      const mockResult = await setupSignedInUser();
      const nonce = getUrlSafeNonce();

      const result = await GoogleSignInModule.signInSilently({ nonce });

      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(nonce);
      expect(result.user.email).toBe(mockResult.user.email);
    });

    it('should sign in silently without nonce', async () => {
      await setupSignedInUser();

      const result = await GoogleSignInModule.signInSilently();

      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBeNull();
    });

    it('should pass nonce to native module correctly for silent sign in', async () => {
      await setupSignedInUser();
      const nonce = getUrlSafeNonce();

      await GoogleSignInModule.signInSilently({ nonce });

      expect(mockGoogleSignIn.mocks.signInSilently).toHaveBeenCalledWith(nonce);
    });
  });

  describe('Nonce Security Scenarios', () => {
    it('should handle nonce mismatch errors', async () => {
      await setupConfiguredState();
      
      // Mock native module to throw nonce validation error
      const nonceValidationError = new Error('Nonce validation failed: ID token nonce doesn\'t match request nonce') as any;
      nonceValidationError.code = 'NONCE_VALIDATION_ERROR';
      mockGoogleSignIn.setError(nonceValidationError);

      await expectToThrow(
        () => GoogleSignInModule.signIn({ nonce: getUrlSafeNonce() }),
        'Nonce validation failed: ID token nonce doesn\'t match request nonce'
      );
    });

    it('should handle replay attack scenario', async () => {
      await setupConfiguredState();
      const nonce = getUrlSafeNonce();

      // First sign in should succeed
      const result1 = await GoogleSignInModule.signIn({ nonce });
      expect(result1.nonce).toBe(nonce);

      // Clear mock state to simulate new session
      mockGoogleSignIn.reset();
      await setupConfiguredState();

      // Reusing the same nonce should be detectable by the backend
      // (This would typically be validated by the backend, not the client)
      const result2 = await GoogleSignInModule.signIn({ nonce });
      expect(result2.nonce).toBe(nonce);
      
      // The fact that we can generate the same nonce response demonstrates
      // that nonce validation must happen on the backend
    });

    it('should support enterprise security requirements', async () => {
      await setupConfiguredState();
      
      // Generate a high-entropy nonce suitable for enterprise use
      const enterpriseNonce = getUrlSafeNonce(64);
      expect(enterpriseNonce.length).toBeGreaterThanOrEqual(64);

      const result = await GoogleSignInModule.signIn({ nonce: enterpriseNonce });
      
      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(enterpriseNonce);
    });
  });

  describe('Backend Integration Patterns', () => {
    it('should support Supabase integration pattern', async () => {
      await setupConfiguredState();
      
      // Simulate Supabase pattern: generate raw nonce, hash it for Google
      const rawNonce = getUrlSafeNonce();
      
      // In real implementation, this would be:
      // const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce);
      const hashedNonce = `sha256_${rawNonce}`; // Mock hash for testing
      
      const result = await GoogleSignInModule.signIn({ nonce: hashedNonce });
      
      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(hashedNonce);
      
      // Backend would validate using:
      // await supabase.auth.signInWithIdToken({
      //   provider: 'google',
      //   token: result.idToken,
      //   nonce: rawNonce
      // });
    });

    it('should support Firebase Auth integration pattern', async () => {
      await setupConfiguredState();
      const nonce = getUrlSafeNonce();

      const result = await GoogleSignInModule.signIn({ nonce });
      
      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(nonce);
      
      // Firebase would validate the nonce internally when verifying the ID token
    });

    it('should support Auth0 integration pattern', async () => {
      await setupConfiguredState();
      const nonce = getUrlSafeNonce();

      const result = await GoogleSignInModule.signIn({ nonce });
      
      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBe(nonce);
      
      // Auth0 requires nonce for security compliance
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for invalid nonces', async () => {
      await setupConfiguredState();
      
      const shortNonceError = new Error('Nonce must be at least 32 characters long') as any;
      shortNonceError.code = 'NONCE_ERROR';
      mockGoogleSignIn.setError(shortNonceError);

      try {
        await GoogleSignInModule.signIn({ nonce: 'short' });
        fail('Should have thrown error for short nonce');
      } catch (error: any) {
        expect(error.message).toContain('Nonce must be at least 32 characters long');
      }
    });

    it('should handle malformed nonce format errors', async () => {
      await setupConfiguredState();
      
      const formatError = new Error('Nonce must be URL-safe base64 encoded') as any;
      formatError.code = 'NONCE_ERROR';
      mockGoogleSignIn.setError(formatError);

      try {
        await GoogleSignInModule.signIn({ nonce: 'invalid@nonce!with#special$chars%' });
        fail('Should have thrown error for malformed nonce');
      } catch (error: any) {
        expect(error.message).toContain('Nonce must be URL-safe base64 encoded');
      }
    });
  });

  describe('Integration with Existing API', () => {
    it('should maintain backward compatibility when no nonce is provided', async () => {
      await setupConfiguredState();

      // All existing calls should work without modification
      const result = await GoogleSignInModule.signIn();
      
      expect(result).toBeGoogleSignInResult();
      expect(result.nonce).toBeNull();
    });

    it('should work with existing test infrastructure', async () => {
      const mockResult = await setupSignedInUser();
      
      expect(mockResult).toBeGoogleSignInResult();
      expect(mockResult.nonce).toBeNull(); // Default behavior
    });

    it('should support configuration without nonce requirements', async () => {
      const config = createMockConfig();
      
      await GoogleSignInModule.configure(config);
      
      // Should work with and without nonce
      const resultWithoutNonce = await GoogleSignInModule.signIn();
      const resultWithNonce = await GoogleSignInModule.signIn({ nonce: getUrlSafeNonce() });
      
      expect(resultWithoutNonce).toBeGoogleSignInResult();
      expect(resultWithNonce).toBeGoogleSignInResult();
      expect(resultWithoutNonce.nonce).toBeNull();
      expect(resultWithNonce.nonce).toBeTruthy();
    });
  });
});