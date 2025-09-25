# react-native-google-signin-modern — GitHub Copilot Instructions

This is a modern React Native Google Sign-In library built with AndroidX Credential Manager and Google Identity Services APIs, designed as a contemporary alternative to legacy Google Sign-In libraries.

## 🎯 Project Overview

- **Purpose**: Modern, secure, and lightweight Google Sign-In for React Native
- **Architecture**: TurboModule-based with TypeScript support
- **Platforms**: Android (AndroidX Credential Manager) + iOS (Google Sign-In SDK)
- **Build System**: React Native Builder Bob with TypeScript compilation
- **Testing**: Jest with React Native preset (currently minimal coverage)

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

## 🧪 Testing Strategy

### Current State
- **Minimal coverage**: Only `it.todo('write a test')` in place
- **Jest configured**: React Native preset with proper ignores
- **Testing planned**: See issue #12 for comprehensive testing foundation

### Testing Guidelines (When Implemented)
- **Unit tests**: Focus on TypeScript API behavior and error handling
- **Native module tests**: Mock platform-specific implementations
- **Integration tests**: Test complete sign-in flows with test accounts
- **Coverage target**: ≥90% for core TypeScript API

### Test Structure (Future)
```
src/__tests__/
├── index.test.tsx         # Main API tests
├── error-handling.test.tsx # Error scenarios
└── __mocks__/             # Native module mocks
```

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
- **Testing**: `yarn test` (currently minimal)
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
- [ ] All tests passing (when implemented)
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
5. **Update documentation** and examples
6. **Add tests** (when testing is implemented)

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
- **Don't forget to test** on real devices

---

## 🎯 Current Priorities

1. **Testing Foundation**: Implement comprehensive test suite (issue #12)
2. **Documentation**: Keep README and API docs up to date
3. **Stability**: Focus on rock-solid core functionality
4. **Performance**: Optimize bundle size and runtime performance
5. **Developer Experience**: Clear error messages and debugging

---

*Last updated: September 25, 2025*
*Update these instructions when significant architectural changes occur*