# Android Native Module Tests

This directory contains comprehensive unit tests for the Android native Kotlin module (`GoogleSigninModernModule.kt`) using JUnit, Mockito, and Robolectric.

## 🧪 Test Structure

### Test Classes

1. **`GoogleSigninModernModuleTest.kt`** - Main comprehensive test suite
   - Module initialization & configuration
   - Basic flow testing
   - Credential manager integration
   - Token management
   - Sign out functionality
   - Module lifecycle

2. **`GoogleSigninModernModuleErrorHandlingTest.kt`** - Error handling scenarios
   - Configuration errors
   - Sign in errors
   - Credential exceptions
   - Sign out errors
   - Module lifecycle errors

3. **`GoogleSigninModernModuleFlowTest.kt`** - Flow management testing
   - Interactive flow (with fallback)
   - Silent flow (authorized accounts only)
   - Token refresh flow
   - Promise state management
   - Credential request building
   - Response format validation

4. **`GoogleSigninModernModulePlayServicesTest.kt`** - Play Services integration
   - Availability checking for all connection result codes
   - Error handling for API failures
   - Concurrent call handling
   - Edge case scenarios

## 🏗️ Testing Framework

- **JUnit 4** - Core testing framework
- **Mockito + Mockito-Kotlin** - Mocking framework for dependencies
- **Robolectric** - Android framework simulation (SDK 34)
- **AndroidX Test** - Android testing utilities

## 🎯 Test Coverage

The tests comprehensively cover:

### ✅ **Module Initialization & Configuration**
- [x] Module construction with ReactApplicationContext setup
- [x] Configure method with web client ID validation and storage
- [x] Credential Manager setup and initialization
- [x] State management testing

### ✅ **Play Services Integration**
- [x] Available case returns true when Play Services available
- [x] Unavailable case returns false when Play Services missing
- [x] Error handling for API failures
- [x] All ConnectionResult codes handling

### ✅ **Sign In Flow Management**
- [x] Interactive flow behavior with fallback logic
- [x] Silent flow with authorized accounts only
- [x] Token refresh flow handling
- [x] Promise management for concurrent operations

### ✅ **Credential Request Handling**
- [x] Authorization filter behavior
- [x] GoogleIdOption building and credential requests
- [x] Async operation management
- [x] Success response handling and credential parsing
- [x] Exception handling for GetCredentialException

### ✅ **Error Handling & Recovery**
- [x] No accounts error handling
- [x] Credential exception type handling
- [x] Promise state management for concurrent operations
- [x] Error code mapping consistency across flows
- [x] Activity validation for missing current activity

### ✅ **Response Creation & Data Transformation**
- [x] User data parsing from credentials
- [x] Token extraction handling
- [x] WritableMap creation for React Native bridge
- [x] Flow-specific response formats

## 🔧 Running the Tests

### Prerequisites
- Android SDK installed
- Java 17 or higher
- Gradle 8.x

### Command Line
```bash
# From the android directory
./gradlew test

# With info output
./gradlew test --info

# Run specific test class
./gradlew test --tests="GoogleSigninModernModuleTest"

# Run with coverage
./gradlew test jacocoTestReport
```

### Android Studio
1. Open the `android` directory in Android Studio
2. Right-click on `src/test/java` directory
3. Select "Run All Tests"

Or run individual test classes by right-clicking the test file.

## 🏗️ Mock Strategy

### **Credential Manager Mocking**
```kotlin
mockStaticCredentialManager {
    whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
    
    val successFuture = CompletableFuture.completedFuture(mockResponse)
    whenever(mockCredentialManager.getCredential(any(), any())).thenReturn(successFuture)
}
```

### **React Native Bridge Mocking**
```kotlin
mockStatic(Arguments::class.java).use { mockedArguments ->
    whenever(Arguments.createMap()).thenReturn(mockWritableMap)
    whenever(mockWritableMap.putString(any(), any())).thenReturn(mockWritableMap)
}
```

### **Google Play Services Mocking**
```kotlin
mockStaticGoogleApiAvailability {
    whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
    whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
        .thenReturn(ConnectionResult.SUCCESS)
}
```

## 📊 Test Coverage Targets

- **Methods**: 100% (all public methods tested)
- **Branches**: ≥95% (all conditional paths tested)
- **Lines**: ≥95% (comprehensive line coverage)
- **Edge Cases**: All error scenarios covered

## 🚀 Integration with CI

These tests can be integrated into CI pipelines:

```yaml
# Example GitHub Actions step
- name: Run Android Unit Tests
  run: |
    cd android
    ./gradlew test --no-daemon
    ./gradlew jacocoTestReport
```

## 🔍 Test Patterns

### **Setup Pattern**
```kotlin
@Before
fun setup() {
    module = GoogleSigninModernModule(mockReactContext)
    whenever(mockReactContext.currentActivity).thenReturn(mockActivity)
    setupConfiguredModule()
}
```

### **Error Testing Pattern**
```kotlin
@Test
fun `should handle specific error scenario`() {
    // Given
    setupErrorCondition()
    
    // When
    module.methodUnderTest(mockPromise)
    
    // Then
    verify(mockPromise).reject(eq("ERROR_CODE"), contains("error message"))
}
```

### **Flow Testing Pattern**
```kotlin
@Test
fun `should follow expected flow behavior`() {
    // Given
    setupFlowConditions()
    
    // When
    module.performOperation(mockPromise)
    
    // Then
    verify(mockCredentialManager, times(expectedCallCount))
        .getCredential(any(), any())
}
```

## 📝 Notes

- These tests focus on the **native Android Kotlin implementation**
- They complement the existing TypeScript/JavaScript tests in `src/__tests__`
- Tests use Robolectric for Android API simulation without requiring a device/emulator
- Mock strategy properly isolates dependencies (CredentialManager, GoogleApiAvailability, etc.)
- All async operations are handled through CompletableFuture mocking
- Tests verify behavior, not implementation details where possible

## 🎯 Benefits

1. **Confidence in Native Implementation** - Thorough testing of Android-specific logic
2. **Regression Prevention** - Catch breaking changes in native code
3. **Documentation** - Tests serve as executable documentation of expected behavior
4. **Refactoring Safety** - Enable safe refactoring of native module
5. **CI Integration** - Automated testing in continuous integration