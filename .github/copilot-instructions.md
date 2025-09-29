# react-native-google-signin-modern — GitHub Copilot Instructions

This is a modern React Native Google Sign-In library built with AndroidX Credential Manager and Google Identity Services APIs, designed as a contemporary alternative to legacy Google Sign-In libraries.

## 🎯 Project Overview

- **Purpose**: Modern, secure, and lightweight Google Sign-In for React Native
- **Architecture**: TurboModule-based with TypeScript support
- **Platforms**: Android (AndroidX Credential Manager) + iOS (Google Sign-In SDK)
- **Build System**: React Native Builder Bob with TypeScript compilation
- **Testing**: Comprehensive Jest infrastructure with 68 tests and 100% coverage

---

## 🚨 Critical Guidelines

### Before Major Changes
- **Always ask before big re-writes** or changing important libraries
- **Never suggest removing or replacing core dependencies** like:
  - `react-native` (framework foundation)
  - `androidx.credentials` (Android credential management)
  - `GoogleSignIn` iOS SDK (iOS authentication)
  - `react-native-builder-bob` (library build system)
- **Discuss architectural changes** before implementing

### Library Philosophy
- **Don't reinvent the wheel** — use well-documented, actively maintained libraries
- **Example**: Don't create custom retry mechanisms, use proven libraries like `@react-native-async-storage/async-storage` or `react-query` for data management
- **Prefer established patterns** over custom implementations

---

## 📝 Code Conventions

### TypeScript Standards
- **Strict TypeScript**: No `any` types in public APIs
- **Interface definitions**: Use readonly types for all return objects
- **Null handling**: Use `null` instead of `undefined` for optional values
- **Type exports**: Export all public interfaces and types

### Formatting & Style
- **Indentation**: Use **tabs** (not spaces) for all indentation
- **Prettier config**: Follow existing `.prettierrc` settings
- **ESLint**: Follow `@react-native` and `prettier` configurations
- **Line endings**: Use `\n` (LF) consistently

### Code Organization
- **No monolithic files**: Keep files focused and under 500 lines
- **Reuse code**: Extract common patterns into utilities
- **Encapsulation**: Use classes for stateful APIs, functions for utilities
- **Clear naming**: Use descriptive names for variables and methods

### Error Handling
- **Consistent error codes**: Use predefined constants (see Android/iOS implementations)
- **Promise-based**: All async operations return Promises
- **Error normalization**: Standardize error formats across platforms

---

## 🏗️ Architecture Patterns

### Native Module Structure
```
src/
├── index.tsx              # Main TypeScript API (singleton class)
├── NativeGoogleSigninModern.ts # TurboModule interface
└── __tests__/             # Unit tests (minimal coverage currently)

android/src/main/java/com/googlesigninmodern/
├── GoogleSigninModernModule.kt    # Android implementation
└── GoogleSigninModernPackage.kt  # Android package registration

ios/
├── GoogleSigninModern.h   # Objective-C header
└── GoogleSigninModern.mm  # Objective-C++ implementation
```

### API Design Principles
- **Configuration first**: Require `configure()` before any operations
- **Singleton pattern**: Single global instance (`GoogleSignInModule`)
- **Platform abstraction**: Hide platform differences behind unified API
- **Result normalization**: Ensure consistent response shapes across platforms

### Native Implementation Notes
- **Android**: Uses `CredentialManager` with coroutines (`CoroutineScope`)
- **iOS**: Uses `GIDSignIn` with completion handlers
- **Error mapping**: Both platforms use consistent error codes
- **State management**: Track configuration and pending operations

---

## 🧪 Testing Infrastructure

### Current State
- **Comprehensive coverage**: 68 tests across 3 specialized test suites
- **Coverage metrics**: 100% statement/function coverage, 88.88% branch coverage
- **Advanced mocking**: Sophisticated native module mocks with controllable state
- **Testing documentation**: Complete guide available in `TESTING.md`

### Testing Guidelines
- **Unit tests**: Focus on TypeScript API behavior and comprehensive error handling
- **Native module tests**: Use advanced mocking system for platform-specific implementations
- **Integration tests**: Test complete sign-in flows with realistic scenarios
- **Custom matchers**: Use domain-specific Jest matchers (`toBeGoogleSignInResult`, etc.)

### Test Structure
```
src/__tests__/
├── index.test.tsx              # Main API tests (35 tests)
├── error-scenarios.test.tsx    # Error handling tests (16 tests)
├── native-module.test.tsx      # Mock infrastructure tests (17 tests)
├── setup.ts                    # Global test configuration and custom matchers
├── factories.ts                # Test data factories and generators
├── test-utils.ts               # Common utilities and helpers
└── __mocks__/
    └── NativeGoogleSigninModern.ts  # Comprehensive native module mock
```

### Writing Tests
- **Always use the testing infrastructure**: Import utilities from `test-utils.ts` and data from `factories.ts`
- **Mock control**: Use `mockGoogleSignIn` utilities to control mock behavior and state
- **Custom assertions**: Leverage custom matchers for Google Sign-In specific validations
- **Error testing**: Test all error scenarios with proper error codes using `expectErrorCode`
- **State management**: Use `setupConfiguredState`, `setupSignedInUser` for consistent test setup
- **Async patterns**: All setup functions are async - use `await` in `beforeEach` hooks

### Test Examples
```typescript
// Basic test structure
beforeEach(async () => {
  await commonTestSetup();
  resetFactoryCounters();
});

// Using test utilities
const mockResult = await setupSignedInUser();
const config = createMockConfig();
await expectToThrow(() => GoogleSignInModule.signIn(), 'Expected error');

// Custom matchers
expect(result).toBeGoogleSignInResult();
expect(tokens).toBeGoogleSignInTokens();
```

**📖 Complete Testing Guide**: See `TESTING.md` for comprehensive documentation, examples, and best practices.

---

## 🧪 Android Native Testing Guidelines

### Dependency Management for Testing
- **Version Alignment**: Always align coroutines-test version with coroutines-android version to prevent binary incompatibilities
- **Mockito Consolidation**: For Robolectric/JVM tests, use only `mockito-inline` (+ mockito-kotlin). Avoid mixing `mockito-core`, `mockito-android`, and `mockito-inline` which can cause classpath conflicts
- **Stay Current**: Use latest stable versions of testing dependencies (check current versions before adding)

### Static Mocking Best Practices
- **Lifecycle Management**: Static mocks (mockStatic) must be properly scoped with `.use {}` blocks or managed at class level with proper cleanup in `@After`
- **Per-Test Mocking**: Prefer per-test static mocking over setup-level mocking to avoid test pollution
- **Verification Completeness**: When testing error scenarios, verify both the method call AND the expected promise rejection with correct error codes

### Test Structure & Quality
- **Test-Assertion Alignment**: Ensure test names match what's actually being verified. If testing rejection behavior, verify the reject() call with expected parameters
- **Avoid Code Duplication**: Extract common test setup patterns into helper methods when used across multiple tests
- **Helper Method Signatures**: Make helper method signatures as specific as possible (avoid unnecessary generics)
- **Mock API Accuracy**: Verify mocked method signatures match the actual API being used (e.g., AndroidX CredentialManager methods)

### Build Configuration
- **Coverage Tools**: If mentioning coverage commands like `jacocoTestReport` in documentation, ensure the corresponding Gradle plugin and tasks are configured
- **Test Dependencies**: Include all necessary test dependencies for the testing patterns being used

### Security & False Positives
- **Test Data**: Hardcoded test tokens/keys in test files are acceptable and should be documented as test data to avoid security scanner false positives
- **Use Clear Naming**: Prefix test constants with `TEST_` or `MOCK_` to clearly indicate their purpose

### Examples to Follow
```kotlin
// ✅ Good: Proper static mock lifecycle
mockStatic(Arguments::class.java).use { mockedArguments ->
    // test implementation
}

// ✅ Good: Complete error verification  
verify(mockPromise).reject(
    eq("EXPECTED_ERROR_CODE"),
    contains("expected message")
)

// ❌ Avoid: Setup-level static mocking that closes immediately
@BeforeEach
fun setup() {
    mockStatic(SomeClass::class.java).use { /* closes before test runs */ }
}

---

## 📚 Dependencies & Libraries

### Core Dependencies
- **React Native**: Framework foundation
- **TurboModules**: Native module architecture
- **TypeScript**: Type safety and developer experience

### Build & Development
- **react-native-builder-bob**: Library compilation and packaging
- **Jest**: Testing framework (React Native preset)
- **ESLint + Prettier**: Code quality and formatting
- **Lefthook**: Git hooks for quality gates

### Native Dependencies
- **Android**: `androidx.credentials`, `com.google.android.libraries.identity.googleid`
- **iOS**: `GoogleSignIn` SDK via CocoaPods

### Adding New Dependencies
- **Check maintenance status**: Active development, good documentation
- **Verify React Native compatibility**: Works with TurboModules
- **Consider bundle size impact**: Keep library lightweight
- **Update peer dependencies**: If requiring new React Native features

---

## 📖 Documentation Standards

### README Updates
- **Update README.md** whenever API changes occur
- **Include code examples** for all public methods
- **Document error scenarios** and handling strategies
- **Platform-specific notes** when behavior differs

### Code Documentation
- **JSDoc comments** for all public methods
- **Parameter descriptions** and return type documentation
- **Usage examples** in complex scenarios
- **Error code documentation** with descriptions

### API Changes
- **Breaking changes**: Update major version, document migration
- **New features**: Update minor version, add examples
- **Bug fixes**: Update patch version, document fixes

---

## 🔧 Development Workflow

### Before Making Changes
1. **Understand the existing pattern** by reading current implementations
2. **Check issues and PRs** for related work or discussions
3. **Consider both platforms** when making changes
4. **Test on real devices** when possible (Android primarily)

### Code Quality Checks
- **TypeScript compilation**: `yarn typecheck`
- **Linting**: `yarn lint` (auto-fix with `yarn lint --fix`)
- **Testing**: `yarn test` (comprehensive suite with 68 tests)
- **Test coverage**: `yarn test:coverage` (generates detailed reports)
- **Test watch mode**: `yarn test:watch` (for development)
- **Building**: `yarn prepare` (builds library for distribution)

### Platform-Specific Notes
- **Android**: Test on devices with Google Play Services
- **iOS**: Requires GoogleSignIn SDK configuration
- **Example app**: Use for integration testing (`yarn example start`)

---

## 🚀 Release & Publishing

### Version Management
- **Semantic versioning**: Follow semver strictly
- **Conventional commits**: Use conventional changelog format
- **Release automation**: `release-it` handles tagging and publishing

### Pre-Release Checklist
- [x] All tests passing (comprehensive test suite implemented)
- [ ] Documentation updated
- [ ] Example app working on both platforms
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)

---

## 📋 Common Tasks

### Adding New Methods
1. **Define TypeScript interface** in `NativeGoogleSigninModern.ts`
2. **Implement Android version** in `GoogleSigninModernModule.kt`
3. **Implement iOS version** in `GoogleSigninModern.mm`
4. **Add wrapper in main API** (`src/index.tsx`)
5. **Write comprehensive tests** using testing infrastructure
6. **Update documentation** and examples

### Debugging Platform Issues
- **Android**: Use `adb logcat` and Android Studio
- **iOS**: Use Xcode debugging and device logs
- **JavaScript**: React Native debugger and Metro logs
- **Example app**: Best place for integration debugging

### Handling Breaking Changes
- **Document impact**: What changes for developers
- **Provide migration path**: Step-by-step upgrade guide
- **Version bump**: Major version increment
- **Deprecation period**: Give developers time to migrate

---

## ❌ What NOT to Do

### Dependencies
- **Don't add unnecessary dependencies** without discussion
- **Don't downgrade React Native** compatibility requirements
- **Don't remove TypeScript** type safety features
- **Don't bundle large libraries** that impact app size

### Code Quality
- **Don't use `any` types** in public APIs
- **Don't create huge files** (>500 lines without good reason)
- **Don't duplicate code** across files without abstraction
- **Don't ignore ESLint/Prettier** warnings

### Platform Compatibility
- **Don't make Android-only** or iOS-only changes without consideration
- **Don't break existing method signatures** without version bumps
- **Don't ignore error handling** scenarios
- **Don't forget to write tests** using the comprehensive testing infrastructure
- **Don't skip error scenarios** in test coverage

---

## 🎯 Current Priorities

1. **Continued Testing Excellence**: Maintain and extend comprehensive test coverage
2. **Documentation**: Keep README and API docs up to date
3. **Stability**: Focus on rock-solid core functionality
4. **Performance**: Optimize bundle size and runtime performance
5. **Developer Experience**: Clear error messages and debugging

---

## 🤖 GitHub Copilot Agent Guidelines

### Testing Implementation Requirements
When writing or modifying code in this repository, agents MUST:

1. **Write comprehensive tests** for all new functionality using the established testing infrastructure
2. **Use existing test utilities** from `src/__tests__/test-utils.ts` and factories from `src/__tests__/factories.ts`
3. **Follow async patterns** in test setup - use `await commonTestSetup()` in `beforeEach` hooks
4. **Test error scenarios** with proper error codes using `expectErrorCode` utility
5. **Use custom matchers** like `toBeGoogleSignInResult()`, `toBeGoogleSignInTokens()` for domain-specific assertions

### Android Native Testing Requirements
When implementing Android native tests, agents MUST:

1. **Verify dependency compatibility** - check version alignment between related dependencies
2. **Use proper mock lifecycle management** - static mocks must be properly scoped
3. **Include complete test verifications** - test both method calls and expected outcomes
4. **Extract common patterns** - create helper methods for repeated setup/assertion logic
5. **Match API signatures** - ensure mocked methods match actual implementations

### Test Structure Guidelines
- Place tests in appropriate files: `index.test.tsx` (API tests), `error-scenarios.test.tsx` (error handling), or `native-module.test.tsx` (mock infrastructure)
- Use descriptive test names that explain expected behavior
- Follow AAA pattern: Arrange (setup), Act (execute), Assert (verify)
- Group related tests in `describe` blocks with clear naming

### Mock Control Examples
```typescript
// Set up configured state
await setupConfiguredState();

// Set up signed-in user with custom data
const mockResult = await setupSignedInUser({ name: 'Custom User' });

// Control mock behavior
mockGoogleSignIn.setState({ isPlayServicesAvailable: false });
mockGoogleSignIn.setError(new Error('Test error'));
```

### When NOT to Modify Tests
- Don't modify existing passing tests without clear justification
- Don't remove error handling tests
- Don't skip test writing for new functionality
- Don't use `any` types in test code

**📖 Reference**: See `TESTING.md` for complete testing guide with examples and best practices.

---

*Last updated: January 2025 - Updated with comprehensive testing infrastructure*
*Update these instructions when significant architectural changes occur*