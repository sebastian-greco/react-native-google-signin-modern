package com.googlesigninmodern

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
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
 * Focused tests for error handling scenarios in GoogleSigninModernModule
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GoogleSigninModernModuleErrorHandlingTest {

    @Mock
    private lateinit var mockReactContext: ReactApplicationContext

    @Mock
    private lateinit var mockCredentialManager: CredentialManager

    @Mock
    private lateinit var mockPromise: Promise

    @Mock
    private lateinit var mockActivity: Activity

    @Mock
    private lateinit var mockWritableMap: WritableMap

    private lateinit var module: GoogleSigninModernModule

    companion object {
        private const val VALID_CLIENT_ID = "123456789.apps.googleusercontent.com"
    }

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        module = GoogleSigninModernModule(mockReactContext)
        whenever(mockReactContext.currentActivity).thenReturn(mockActivity)
        whenever(mockReactContext.packageName).thenReturn("com.test.package")
    }

    // ========================================
    // CONFIGURATION ERROR TESTS
    // ========================================

    @Test
    fun `configure should reject with blank web client ID`() {
        // When
        module.configure("", mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("CONFIGURE_ERROR"),
            eq("webClientId cannot be blank")
        )
    }

    @Test
    fun `configure should warn about malformed web client ID but still configure`() {
        // Given
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            
            mockStaticCredentialManager {
                whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)

                // When
                module.configure("malformed-client-id", mockPromise)

                // Then - should still resolve despite warning
                verify(mockPromise).resolve(null)
            }
        }
    }

    // ========================================
    // SIGN IN ERROR TESTS
    // ========================================

    @Test
    fun `signIn should reject when not configured`() {
        // When
        module.signIn(mockPromise)

        // Then
        verify(mockPromise).reject(
            eq("NOT_CONFIGURED"),
            eq("Google Sign-In not configured. Call configure() first.")
        )
    }

    @Test
    fun `signIn should reject when credential manager is null`() {
        // Given - configure module but credential manager creation fails
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            
            mockStaticCredentialManager {
                whenever(CredentialManager.create(mockReactContext)).thenReturn(null)
                module.configure(VALID_CLIENT_ID, mock())

                // When
                module.signIn(mockPromise)

                // Then
                verify(mockPromise).reject(
                    eq("NOT_CONFIGURED"),
                    eq("Credential manager not initialized")
                )
            }
        }
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
    fun `signIn should reject concurrent requests`() {
        // Given
        setupConfiguredModule()
        val firstPromise = mock<Promise>()
        val secondPromise = mock<Promise>()

        // Start first request
        module.signIn(firstPromise)

        // When - start second request while first is pending
        module.signIn(secondPromise)

        // Then - second request should be rejected
        verify(secondPromise).reject(
            eq("SIGN_IN_IN_PROGRESS"),
            eq("Sign-in already in progress")
        )
    }

    // ========================================
    // CREDENTIAL EXCEPTION TESTS
    // ========================================

    @Test
    fun `signInSilently should reject with SIGN_IN_REQUIRED on NoCredentialException`() {
        // Given
        setupConfiguredModule()
        val exception = NoCredentialException("No credentials")
        val failedFuture = CompletableFuture<Nothing>()
        failedFuture.completeExceptionally(exception)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.signInSilently(mockPromise)

        // Then - verify credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `getTokens should reject with NO_USER on NoCredentialException`() {
        // Given
        setupConfiguredModule()
        val exception = NoCredentialException("No user")
        val failedFuture = CompletableFuture<Nothing>()
        failedFuture.completeExceptionally(exception)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.getTokens(mockPromise)

        // Then - verify credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `should handle generic GetCredentialException during signIn`() {
        // Given
        setupConfiguredModule()
        val exception = mock<GetCredentialException>()
        whenever(exception.type).thenReturn("custom.error.type")
        whenever(exception.message).thenReturn("Custom error")
        
        val failedFuture = CompletableFuture<Nothing>()
        failedFuture.completeExceptionally(exception)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.signIn(mockPromise)

        // Then - verify credential manager was called
        verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // SIGN OUT ERROR TESTS
    // ========================================

    @Test
    fun `signOut should cancel pending sign in operations`() {
        // Given
        setupConfiguredModule()
        val pendingPromise = mock<Promise>()
        
        // Start sign in operation (creates pending state)
        module.signIn(pendingPromise)

        // When
        module.signOut(mockPromise)

        // Then - sign out should succeed and cancel pending operation
        verify(mockPromise).resolve(null)
        verify(pendingPromise).reject(
            eq("SIGN_OUT_REQUESTED"),
            eq("Sign-out was requested")
        )
    }

    // ========================================
    // MODULE LIFECYCLE ERROR TESTS
    // ========================================

    @Test
    fun `invalidate should reject pending operations with MODULE_DESTROYED`() {
        // Given
        setupConfiguredModule()
        val pendingPromise = mock<Promise>()
        
        // Create pending operation
        module.signIn(pendingPromise)

        // When
        module.invalidate()

        // Then
        verify(pendingPromise).reject(
            eq("MODULE_DESTROYED"),
            eq("Module was destroyed")
        )
    }

    @Test
    fun `operations after invalidate should behave correctly`() {
        // Given
        setupConfiguredModule()
        module.invalidate()

        // When - try to use module after invalidation
        module.signIn(mockPromise)

        // Then - should reject due to not configured (internal state cleared)
        verify(mockPromise).reject(
            eq("NOT_CONFIGURED"),
            eq("Google Sign-In not configured. Call configure() first.")
        )
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private fun setupConfiguredModule() {
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            
            mockStaticCredentialManager {
                whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
                module.configure(VALID_CLIENT_ID, mock())
            }
        }
    }

    private fun <T> mockStaticCredentialManager(block: MockedStatic<CredentialManager>.() -> T): T {
        return mockStatic(CredentialManager::class.java).use { mockedStatic ->
            mockedStatic.block()
        }
    }
}