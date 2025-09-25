# Testing Guide - React Native Google Sign-In Modern

This guide covers the comprehensive testing infrastructure established for the React Native Google Sign-In Modern library.

## 📋 Overview

The testing infrastructure provides:

- **68 comprehensive tests** across multiple test suites
- **100% statement and function coverage**
- **88.88% branch coverage** (exceeding industry standards)
- **Robust mocking strategies** for native module testing
- **Custom Jest matchers** for Google Sign-In specific assertions
- **Test utilities and factories** for consistent test data
- **CI/CD integration** with GitHub Actions

## 🧪 Test Structure

### Test Files

- **`src/__tests__/index.test.tsx`** - Main API functionality tests (35 tests)
- **`src/__tests__/error-scenarios.test.tsx`** - Comprehensive error handling tests (16 tests)  
- **`src/__tests__/native-module.test.tsx`** - Native module interface tests (17 tests)

### Supporting Files

- **`src/__tests__/setup.ts`** - Global test configuration and custom matchers
- **`src/__tests__/factories.ts`** - Test data factories for consistent mock data
- **`src/__tests__/test-utils.ts`** - Common test utilities and helper functions
- **`src/__tests__/__mocks__/NativeGoogleSigninModern.ts`** - Comprehensive native module mock

## 🎯 Test Coverage

```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |     100 |    88.88 |     100 |     100 |
 index.tsx                   |     100 |    88.88 |     100 |     100 |
-----------------------------|---------|----------|---------|---------|
```

- **Statements**: 100% (23/23) 
- **Branches**: 88.88% (16/18)
- **Functions**: 100% (8/8)
- **Lines**: 100% (23/23)

## 🚀 Running Tests

### Basic Test Commands

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run tests for CI (silent with coverage)
yarn test:ci

# Update snapshots
yarn test:update
```

### Running Specific Test Suites

```bash
# Run main functionality tests only
yarn test src/__tests__/index.test.tsx

# Run error handling tests only
yarn test src/__tests__/error-scenarios.test.tsx

# Run native module tests only
yarn test src/__tests__/native-module.test.tsx

# Run tests matching a pattern
yarn test --testNamePattern="sign in"
```

## 🎭 Mocking Strategy

### Native Module Mock

The native module mock (`NativeGoogleSigninModern`) provides:

- **Controllable state** - Configure mock responses and errors
- **Realistic simulation** - Generate proper response structures
- **Error scenarios** - Simulate various error conditions with proper error codes
- **State tracking** - Monitor configuration and sign-in states
- **Call verification** - Track method calls for testing

### Mock Control Interface

```typescript
import { mockGoogleSignIn } from './src/__tests__/__mocks__/NativeGoogleSigninModern';

// Reset to default state
mockGoogleSignIn.reset();

// Configure mock state
mockGoogleSignIn.setState({ 
  isConfigured: true,
  isSignedIn: false 
});

// Set up signed in user
mockGoogleSignIn.setSignedIn(customUser);

// Simulate errors
mockGoogleSignIn.setError(new Error('Test error'));

// Clear errors
mockGoogleSignIn.clearError();
```

### Test Data Factories

Use factories for consistent test data:

```typescript
import { 
  createMockUser, 
  createMockSignInResult, 
  createMockTokens,
  createMockConfig,
  mockUsers 
} from './src/__tests__/factories';

// Create custom mock user
const user = createMockUser({ 
  name: 'Test User', 
  email: 'test@example.com' 
});

// Use predefined mock users
const completeUser = mockUsers.complete;
const minimalUser = mockUsers.minimal;
```

## 🛠️ Test Utilities

### Setup Helpers

```typescript
import { 
  setupSignedInUser,
  setupConfiguredState,
  setupUnconfiguredState,
  setupPlayServicesUnavailable,
  setupErrorScenario 
} from './src/__tests__/test-utils';

// Set up a configured and signed-in user
const mockResult = await setupSignedInUser();

// Set up configured but signed-out state  
await setupConfiguredState();

// Set up error scenario
await setupErrorScenario(new Error('Test error'));
```

### Assertion Helpers

```typescript
import { 
  expectToThrow,
  expectErrorCode,
  expectMockCallCounts,
  expectMockCalledWith 
} from './src/__tests__/test-utils';

// Test async errors
await expectToThrow(
  () => GoogleSignInModule.signIn(),
  'Expected error message'
);

// Verify error codes
expectErrorCode(error, 'SIGN_IN_FAILED');

// Verify mock call counts
expectMockCallCounts({
  configure: 1,
  signIn: 1,
  signOut: 1
});
```

### Custom Jest Matchers

The testing infrastructure includes custom matchers:

```typescript
// Verify Google Sign-In result structure
expect(result).toBeGoogleSignInResult();

// Verify Google Sign-In tokens structure
expect(tokens).toBeGoogleSignInTokens(); 

// Verify Google Sign-In user structure
expect(user).toBeGoogleSignInUser();
```

## 📝 Writing Tests

### Basic Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    commonTestSetup();
  });

  afterEach(() => {
    commonTestCleanup();  
  });

  it('should perform expected behavior', async () => {
    // Arrange
    await setupConfiguredState();
    
    // Act
    const result = await GoogleSignInModule.signIn();
    
    // Assert
    expect(result).toBeGoogleSignInResult();
  });
});
```

### Testing Error Scenarios

```typescript
it('should handle sign in errors properly', async () => {
  await setupConfiguredState();
  const error = new Error('Sign in failed') as any;
  error.code = 'SIGN_IN_FAILED';
  
  await setupErrorScenario(error);
  
  try {
    await GoogleSignInModule.signIn();
    fail('Expected error to be thrown');
  } catch (thrownError) {
    expectErrorCode(thrownError, 'SIGN_IN_FAILED');
  }
});
```

### Testing Integration Flows

```typescript
it('should handle complete sign in flow', async () => {
  const config = createMockConfig();
  
  // Configure
  await GoogleSignInModule.configure(config);
  
  // Sign in
  const result = await GoogleSignInModule.signIn();
  expect(result).toBeGoogleSignInResult();
  
  // Get tokens
  const tokens = await GoogleSignInModule.getTokens();
  expect(tokens).toBeGoogleSignInTokens();
  
  // Sign out
  await GoogleSignInModule.signOut();
  
  // Verify final state
  const isSignedIn = await GoogleSignInModule.isSignedIn();
  expect(isSignedIn).toBe(false);
});
```

## 🔄 CI/CD Integration

### GitHub Actions

The testing infrastructure is integrated with GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run unit tests
  run: yarn test:ci
```

This runs tests with:
- Coverage reporting
- Maximum 2 workers for CI efficiency  
- Silent output
- Proper exit codes

### Coverage Reporting

Coverage reports are generated in multiple formats:
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **JSON**: `coverage/coverage-final.json`
- **Console**: Text summary in terminal

## 📊 Test Categories

### Unit Tests (35 tests)
- Configuration management
- Sign-in flows (regular and silent)
- Token management
- Sign-out functionality
- Status checks
- Error handling
- Integration flows

### Error Handling Tests (16 tests)  
- Configuration errors
- Sign-in errors with various codes
- Token management errors
- Silent sign-in errors
- Error recovery scenarios
- State consistency during errors

### Mock Infrastructure Tests (17 tests)
- Mock control utilities
- Method behavior simulation
- Error simulation
- Response generation
- State transitions
- Call verification

## 🎯 Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain expected behavior
- Follow Arrange-Act-Assert pattern
- Use `beforeEach`/`afterEach` for consistent setup/teardown

### Mock Management  
- Always reset mocks in `beforeEach`
- Use appropriate setup helpers for common scenarios
- Verify mock calls to ensure proper integration
- Clear errors after error tests

### Assertions
- Use custom matchers for domain-specific validations
- Test both success and error cases
- Verify state changes and side effects
- Use appropriate assertion methods

### Error Testing
- Test all documented error codes
- Verify error messages and structure
- Test error recovery scenarios  
- Ensure proper error propagation

## 🚧 Future Enhancements

- **Performance Testing**: Add benchmarks for method execution times
- **Integration Testing**: Test with real Google APIs in controlled environment  
- **Accessibility Testing**: Ensure proper screen reader compatibility
- **Platform-Specific Testing**: Add Android/iOS specific test scenarios
- **Visual Regression Testing**: Add screenshot testing for UI components

## 📚 References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Mock Functions](https://jestjs.io/docs/mock-functions)