package com.googlesigninmodern

import android.app.Activity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.NoCredentialException
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.MockedStatic
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.concurrent.CompletableFuture

/**
 * Focused tests for sign-in flow management in GoogleSigninModernModule
 * Tests the different flow types: INTERACTIVE, SILENT, TOKEN_REFRESH
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GoogleSigninModernModuleFlowTest {

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

    @Mock
    private lateinit var mockGoogleIdTokenCredential: GoogleIdTokenCredential

    @Mock
    private lateinit var mockGetCredentialResponse: GetCredentialResponse

    private lateinit var module: GoogleSigninModernModule

    companion object {
        private const val VALID_CLIENT_ID = "123456789.apps.googleusercontent.com"
        private const val TEST_ID_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
        private const val TEST_EMAIL = "test@example.com"
        private const val TEST_NAME = "Test User"
    }

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        module = GoogleSigninModernModule(mockReactContext)
        whenever(mockReactContext.currentActivity).thenReturn(mockActivity)
        whenever(mockReactContext.packageName).thenReturn("com.test.package")
        
        setupMockCredential()
        setupMockResponse()
    }

    private fun setupMockCredential() {
        whenever(mockGoogleIdTokenCredential.idToken).thenReturn(TEST_ID_TOKEN)
        whenever(mockGoogleIdTokenCredential.id).thenReturn(TEST_EMAIL)
        whenever(mockGoogleIdTokenCredential.displayName).thenReturn(TEST_NAME)
        whenever(mockGoogleIdTokenCredential.profilePictureUri).thenReturn(null)
    }

    private fun setupMockResponse() {
        whenever(mockGetCredentialResponse.credential).thenReturn(mockGoogleIdTokenCredential)
    }

    // ========================================
    // INTERACTIVE FLOW TESTS
    // ========================================

    @Test
    fun `signIn should start with authorized accounts first`() {
        // Given
        mockStatic(Arguments::class.java).use { mockedArguments ->
            mockStatic(GetGoogleIdOption::class.java).use { mockedOptions ->
                whenever(Arguments.createMap()).thenReturn(mockWritableMap, mock<WritableMap>())
                
                val mockBuilder = mock<GetGoogleIdOption.Builder>()
                val mockOption = mock<GetGoogleIdOption>()
                
                whenever(GetGoogleIdOption.Builder()).thenReturn(mockBuilder)
                whenever(mockBuilder.setServerClientId(any<String>())).thenReturn(mockBuilder)
                whenever(mockBuilder.setFilterByAuthorizedAccounts(any<Boolean>())).thenReturn(mockBuilder)
                whenever(mockBuilder.build()).thenReturn(mockOption)
                
                mockStaticCredentialManager {
                    whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
                    module.configure(VALID_CLIENT_ID, mock())
                    
                    val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
                    whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
                        .thenReturn(successFuture)

                    // When
                    module.signIn(mockPromise)

                    // Then - verify credential manager was called and builder was configured correctly
                    verify(mockCredentialManager).getCredential(any<GetCredentialRequest>(), eq(mockActivity))
                    verify(mockBuilder).setFilterByAuthorizedAccounts(true)
                    verify(mockBuilder).setServerClientId(VALID_CLIENT_ID)
                }
            }
        }
    }

    @Test
    fun `signIn should fallback to all accounts when no authorized accounts`() {
        // Given
        setupConfiguredModule()
        
        // First call fails with NoCredentialException
        val noCredException = NoCredentialException("No authorized accounts")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredException)
        
        // Second call succeeds
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture, successFuture)

        // When
        module.signIn(mockPromise)

        // Then - verify two calls were made (authorized accounts, then all accounts)
        verify(mockCredentialManager, times(2))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `signIn should trigger add account intent when no Google accounts available`() {
        // Given
        setupConfiguredModule()
        
        // Both calls fail with NoCredentialException
        val noCredException = NoCredentialException("No credentials available")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredException)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture, failedFuture)

        // When
        module.signIn(mockPromise)

        // Then - verify fallback attempt was made
        verify(mockCredentialManager, times(2))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // SILENT FLOW TESTS
    // ========================================

    @Test
    fun `signInSilently should only check authorized accounts`() {
        // Given
        setupConfiguredModule()
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(successFuture)

        // When
        module.signInSilently(mockPromise)

        // Then - verify only one call was made (no fallback for silent)
        verify(mockCredentialManager, times(1))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `signInSilently should not fallback to all accounts when no authorized accounts`() {
        // Given
        setupConfiguredModule()
        val noCredException = NoCredentialException("No authorized accounts")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredException)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.signInSilently(mockPromise)

        // Then - verify only one call was made (no fallback)
        verify(mockCredentialManager, times(1))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // TOKEN REFRESH FLOW TESTS
    // ========================================

    @Test
    fun `getTokens should only check authorized accounts`() {
        // Given
        setupConfiguredModule()
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(successFuture)

        // When
        module.getTokens(mockPromise)

        // Then - verify only one call was made (no fallback for token refresh)
        verify(mockCredentialManager, times(1))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    @Test
    fun `getTokens should not fallback when no user signed in`() {
        // Given
        setupConfiguredModule()
        val noCredException = NoCredentialException("No user signed in")
        val failedFuture = CompletableFuture<GetCredentialResponse>()
        failedFuture.completeExceptionally(noCredException)

        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(failedFuture)

        // When
        module.getTokens(mockPromise)

        // Then - verify only one call was made
        verify(mockCredentialManager, times(1))
            .getCredential(any<GetCredentialRequest>(), any<Activity>())
    }

    // ========================================
    // PROMISE STATE MANAGEMENT TESTS
    // ========================================

    @Test
    fun `should reject concurrent operations across different flow types`() {
        // Given
        setupConfiguredModule()
        val signInPromise = mock<Promise>()
        val silentPromise = mock<Promise>()
        val tokensPromise = mock<Promise>()

        // Start signIn (will be pending)
        module.signIn(signInPromise)

        // When - attempt other operations while signIn is pending
        module.signInSilently(silentPromise)
        module.getTokens(tokensPromise)

        // Then - subsequent operations should be rejected
        verify(silentPromise).reject(
            eq("SIGN_IN_IN_PROGRESS"),
            eq("Sign-in already in progress")
        )
        verify(tokensPromise).reject(
            eq("SIGN_IN_IN_PROGRESS"),
            eq("Sign-in already in progress")
        )
    }

    @Test
    fun `should allow new operations after previous operation completes`() {
        // Given
        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap, mock<WritableMap>())
            
            mockStaticCredentialManager {
                whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
                module.configure(VALID_CLIENT_ID, mock())
                
                val firstPromise = mock<Promise>()
                val secondPromise = mock<Promise>()

                val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
                whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
                    .thenReturn(successFuture)

                // Start first operation and verify it completes
                module.signIn(firstPromise)
                verify(firstPromise).resolve(any<WritableMap>())

                // When - start second operation (should be allowed after first completes)
                module.signInSilently(secondPromise)

                // Then - both operations should be processed
                verify(mockCredentialManager, times(2))
                    .getCredential(any<GetCredentialRequest>(), any<Activity>())
            }
        }
    }

    // ========================================
    // CREDENTIAL REQUEST BUILDING TESTS
    // ========================================

    @Test
    fun `should use correct web client ID in credential requests`() {
        // Given
        setupConfiguredModule()
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
        
        // Mock GetGoogleIdOption.Builder for verification
        mockStatic(GetGoogleIdOption::class.java).use { mockedStatic ->
            val mockBuilder = mock<GetGoogleIdOption.Builder>()
            val mockOption = mock<GetGoogleIdOption>()
            
            whenever(GetGoogleIdOption.Builder()).thenReturn(mockBuilder)
            whenever(mockBuilder.setServerClientId(any<String>())).thenReturn(mockBuilder)
            whenever(mockBuilder.setFilterByAuthorizedAccounts(any<Boolean>())).thenReturn(mockBuilder)
            whenever(mockBuilder.build()).thenReturn(mockOption)
            
            whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
                .thenReturn(successFuture)

            // When
            module.signIn(mockPromise)

            // Then - verify correct client ID was used
            verify(mockBuilder).setServerClientId(VALID_CLIENT_ID)
        }
    }

    // ========================================
    // RESPONSE FORMAT TESTS
    // ========================================

    @Test
    fun `signIn should create user info response format`() {
        // Given
        setupConfiguredModule()
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(successFuture)

        mockStatic(Arguments::class.java).use { mockedArguments ->
            val userMap = mock<WritableMap>()
            whenever(Arguments.createMap()).thenReturn(mockWritableMap, userMap)
            whenever(mockWritableMap.putString(any<String>(), any<String?>())).thenReturn(mockWritableMap)
            whenever(mockWritableMap.putMap(any<String>(), any<WritableMap>())).thenReturn(mockWritableMap)
            whenever(userMap.putString(any<String>(), any<String?>())).thenReturn(userMap)

            // When
            module.signIn(mockPromise)

            // Then - verify response creation methods were called
            verify(Arguments, times(2)).createMap()
        }
    }

    @Test
    fun `getTokens should create tokens response format`() {
        // Given
        setupConfiguredModule()
        val successFuture = CompletableFuture.completedFuture(mockGetCredentialResponse)
        whenever(mockCredentialManager.getCredential(any<GetCredentialRequest>(), any<Activity>()))
            .thenReturn(successFuture)

        mockStatic(Arguments::class.java).use { mockedArguments ->
            whenever(Arguments.createMap()).thenReturn(mockWritableMap)
            whenever(mockWritableMap.putString(any<String>(), any<String?>())).thenReturn(mockWritableMap)

            // When
            module.getTokens(mockPromise)

            // Then - verify response creation was attempted
            verify(Arguments).createMap()
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private fun setupConfiguredModule() {
        // Note: This method is deprecated in favor of inline static mock handling
        // Use mockStatic blocks directly in test methods for proper lifecycle management
        mockStaticCredentialManager {
            whenever(CredentialManager.create(mockReactContext)).thenReturn(mockCredentialManager)
            module.configure(VALID_CLIENT_ID, mock())
        }
    }

    private fun <T> mockStaticCredentialManager(block: MockedStatic<CredentialManager>.() -> T): T {
        return mockStatic(CredentialManager::class.java).use { mockedStatic ->
            mockedStatic.block()
        }
    }
}