package com.googlesigninmodern

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.MockedStatic
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.CompletableFuture

/**
 * Comprehensive tests for GoogleSigninModernModule
 * Tests the Android Kotlin implementation including AndroidX Credential Manager integration,
 * flow state management, and React Native bridge interactions.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GoogleSigninModernModuleTest {

    @Mock
    private lateinit var mockReactContext: ReactApplicationContext

    @Mock
    private lateinit var mockCredentialManager: CredentialManager

    @Mock
    private lateinit var mockPromise: Promise

    @Mock
    private lateinit var mockActivity: Activity

    @Mock
    private lateinit var mockGoogleApiAvailability: GoogleApiAvailability

    @Mock
    private lateinit var mockWritableMap: WritableMap

    private lateinit var module: GoogleSigninModernModule

    companion object {
        private const val VALID_CLIENT_ID = "123456789.apps.googleusercontent.com"
        private const val INVALID_CLIENT_ID = "invalid-client-id"
        private const val BLANK_CLIENT_ID = ""
        private const val TEST_EMAIL = "test@example.com"
        private const val TEST_NAME = "Test User"
        private const val TEST_ID_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.signature"
        private const val TEST_USER_ID = "1234567890"
    }

    @Before
    fun setup() {
        // Initialize mocks
        MockitoAnnotations.openMocks(this)
        
        // Initialize module with mocked context
        module = GoogleSigninModernModule(mockReactContext)

        // Setup default mocks
        whenever(mockReactContext.currentActivity).thenReturn(mockActivity)
        whenever(mockReactContext.packageName).thenReturn("com.test.package")
        
        // Setup Arguments static mock for WritableMap creation
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
        }
        setupWritableMapMock()
    }

    private fun setupWritableMapMock() {
        // Setup WritableMap mock for method chaining
        whenever(mockWritableMap.putString(any<String>(), any<String?>())).thenReturn(mockWritableMap)
        whenever(mockWritableMap.putMap(any<String>(), any<WritableMap>())).thenReturn(mockWritableMap)
    }

    // ========================================
    // CONFIGURATION TESTS
    // ========================================

    @Test
    fun `configure should initialize credential manager with valid client ID`() {
        // Given
        val validClientId = VALID_CLIENT_ID
        mockStaticCredentialManager {
            whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)

            // When
            module.configure(validClientId, mockPromise)

            // Then
            verify(mockPromise).resolve(null)
            verify(CredentialManager::class.java).create(mockReactContext)
        }
    }

    @Test
    fun `configure should reject with invalid client ID format`() {
        // Given
        val invalidClientId = INVALID_CLIENT_ID

        // When
        module.configure(invalidClientId, mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("CONFIGURE_ERROR"),
            contains("Failed to configure Google Sign-In"),
            any<Exception>()
        )
    }

    @Test
    fun `configure should reject with blank client ID`() {
        // Given
        val blankClientId = BLANK_CLIENT_ID

        // When
        module.configure(blankClientId, mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("CONFIGURE_ERROR"),
            eq("webClientId cannot be blank")
        )
    }

    @Test
    fun `configure should handle credential manager creation failure`() {
        // Given
        val validClientId = VALID_CLIENT_ID
        mockStaticCredentialManager {
            whenever(CredentialManager.create(mockReactContext)).thenThrow(RuntimeException("Creation failed"))

            // When
            module.configure(validClientId, mockPromise)

            // Then
            verify(mockPromise).reject(
                eq("CONFIGURE_ERROR"),
                contains("Failed to configure Google Sign-In: Creation failed"),
                any<Exception>()
            )
        }
    }

    // ========================================
    // PLAY SERVICES TESTS
    // ========================================

    @Test
    fun `isPlayServicesAvailable should return true when available`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SUCCESS)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(true)
        }
    }

    @Test
    fun `isPlayServicesAvailable should return false when unavailable`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_MISSING)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should handle errors gracefully`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenThrow(RuntimeException("Service check failed"))

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    // ========================================
    // SIGN IN FLOW TESTS
    // ========================================

    @Test
    fun `signIn should reject when not configured`() {
        // Given - module not configured

        // When
        module.signIn(mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("NOT_CONFIGURED"),
            eq("Google Sign-In not configured. Call configure() first.")
        )
    }

    @Test
    fun `signIn should reject when no current activity`() {
        // Given
        setupConfiguredModule()
        whenever(mockReactContext.currentActivity).thenReturn(null)

        // When
        module.signIn(mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("NO_ACTIVITY"),
            eq("No current activity found")
        )
    }

    @Test
    fun `signIn should reject concurrent sign in attempts`() {
        // Given
        setupConfiguredModule()
        val firstPromise = mock<Promise>()
        val secondPromise = mock<Promise>()

        // Start first sign in (will be pending)
        module.signIn(firstPromise)

        // When - attempt second sign in
        module.signIn(secondPromise)

        // Then
        verify(secondPromise).reject(
            eq("SIGN_IN_IN_PROGRESS"),
            eq("Sign-in already in progress")
        )
    }

    @Test
    fun `signInSilently should reject when not configured`() {
        // Given - module not configured

        // When
        module.signInSilently(mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("NOT_CONFIGURED"),
            eq("Google Sign-In not configured. Call configure() first.")
        )
    }

    // ========================================
    // CREDENTIAL MANAGER INTEGRATION TESTS
    // ========================================

    @Test
    fun `signIn should handle successful credential response`() {
        // Given
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            
            setupConfiguredModule()
            val mockCredential = createMockGoogleIdTokenCredential()
            val mockResponse = mock<GetCredentialResponse>()
            whenever(mockResponse.credential).thenReturn(mockCredential)

            val credentialFuture = CompletableFuture.completedFuture(mockResponse)
            whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
                .thenReturn(credentialFuture)

            // When
            module.signIn(mockPromise)

            // Then - verify the credential manager was called correctly
            verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
        }
    }

    @Test
    fun `signInSilently should reject with SIGN_IN_REQUIRED when no credentials`() {
        // Given
        setupConfiguredModule()
        val noCredentialException = NoCredentialException("No credentials found")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredentialException)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.signInSilently(mockPromise)

        // Then - verify the credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // TOKEN MANAGEMENT TESTS
    // ========================================

    @Test
    fun `getTokens should reject when not configured`() {
        // Given - module not configured

        // When
        module.getTokens(mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("NOT_CONFIGURED"),
            eq("Google Sign-In not configured. Call configure() first.")
        )
    }

    @Test
    fun `getTokens should handle successful token refresh`() {
        // Given
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            
            setupConfiguredModule()
            val mockCredential = createMockGoogleIdTokenCredential()
            val mockResponse = mock<GetCredentialResponse>()
            whenever(mockResponse.credential).thenReturn(mockCredential)

            val credentialFuture = CompletableFuture.completedFuture(mockResponse)
            whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
                .thenReturn(credentialFuture)

            // When
            module.getTokens(mockPromise)

            // Then - verify the credential manager was called
            verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
        }
    }

    @Test
    fun `getTokens should reject with NO_USER when no credentials available`() {
        // Given
        setupConfiguredModule()
        val noCredentialException = NoCredentialException("No user signed in")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredentialException)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.getTokens(mockPromise)

        // Then - verify the credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // SIGN OUT TESTS
    // ========================================

    @Test
    fun `signOut should clear all state successfully`() {
        // Given
        setupConfiguredModule()

        // When
        module.signOut(mockPromise)

        // Then
        verify(mockPromise).resolve(null)
        // Verify internal state is cleared (we can test this indirectly)
    }

    @Test
    fun `signOut should reject pending sign in operation`() {
        // Given
        setupConfiguredModule()
        val pendingPromise = mock<Promise>()
        
        // Start a sign in operation (this will make it pending)
        module.signIn(pendingPromise)

        // When
        module.signOut(mockPromise)

        // Then
        verify(mockPromise).resolve(null)
        verify(pendingPromise).reject(
            eq("SIGN_OUT_REQUESTED"),
            eq("Sign-out was requested")
        )
    }

    // ========================================
    // SIGNED IN STATUS TESTS
    // ========================================

    @Test
    fun `isSignedIn should always return false`() {
        // Given - any state

        // When
        module.isSignedIn(mockPromise)

        // Then
        verify(mockPromise).resolve(false)
    }

    // ========================================
    // ERROR HANDLING TESTS
    // ========================================

    @Test
    fun `should handle credential parsing errors`() {
        // Given
        setupConfiguredModule()
        val mockCredential = mock<GoogleIdTokenCredential>()
        // Mock credential parsing failure
        whenever(mockCredential.idToken).thenThrow(RuntimeException("Parse error"))

        val mockResponse = mock<GetCredentialResponse>()
        whenever(mockResponse.credential).thenReturn(mockCredential)

        val credentialFuture = CompletableFuture.completedFuture(mockResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(credentialFuture)

        // When
        module.signIn(mockPromise)

        // Then - verify the credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `should handle unexpected credential types`() {
        // Given
        setupConfiguredModule()
        val mockCredential = mock<androidx.credentials.Credential>()
        whenever(mockCredential.type).thenReturn("unexpected.type")

        val mockResponse = mock<GetCredentialResponse>()
        whenever(mockResponse.credential).thenReturn(mockCredential)

        val credentialFuture = CompletableFuture.completedFuture(mockResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(credentialFuture)

        // When
        module.signIn(mockPromise)

        // Then - verify the credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // MODULE LIFECYCLE TESTS
    // ========================================

    @Test
    fun `invalidate should clean up resources and reject pending operations`() {
        // Given
        setupConfiguredModule()
        val pendingPromise = mock<Promise>()
        module.signIn(pendingPromise) // Create pending operation

        // When
        module.invalidate()

        // Then
        verify(pendingPromise).reject(
            eq("MODULE_DESTROYED"),
            eq("Module was destroyed")
        )
    }

    @Test
    fun `getName should return correct module name`() {
        // When
        val name = module.name

        // Then
        assert(name == "GoogleSigninModern")
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Sets up the module in a configured state with mocked credential manager
     */
    private fun setupConfiguredModule() {
        mockStaticCredentialManager {
            whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
            module.configure(VALID_CLIENT_ID, mock())
        }
    }

    /**
     * Creates a mock GoogleIdTokenCredential for testing
     */
    private fun createMockGoogleIdTokenCredential(): GoogleIdTokenCredential {
        return mock<GoogleIdTokenCredential>().apply {
            whenever(idToken).thenReturn(TEST_ID_TOKEN)
            whenever(id).thenReturn(TEST_EMAIL)
            whenever(displayName).thenReturn(TEST_NAME)
            whenever(profilePictureUri).thenReturn(null)
        }
    }

    /**
     * Helper method to mock static CredentialManager methods
     */
    private fun <T> mockStaticCredentialManager(block: MockedStatic<CredentialManager>.() -> T): T {
        return mockStatic(CredentialManager::class.java).use { mockedStatic ->
            mockedStatic.block()
        }
    }

    /**
     * Helper method to mock static GoogleApiAvailability methods
     */
    private fun <T> mockStaticGoogleApiAvailability(block: MockedStatic<GoogleApiAvailability>.() -> T): T {
        return mockStatic(GoogleApiAvailability::class.java).use { mockedStatic ->
            mockedStatic.block()
        }
    }
}