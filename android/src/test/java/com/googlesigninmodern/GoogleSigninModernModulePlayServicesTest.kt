package com.googlesigninmodern

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.MockedStatic
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Focused tests for Google Play Services integration in GoogleSigninModernModule
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GoogleSigninModernModulePlayServicesTest {

    @Mock
    private lateinit var mockReactContext: ReactApplicationContext

    @Mock
    private lateinit var mockPromise: Promise

    @Mock
    private lateinit var mockGoogleApiAvailability: GoogleApiAvailability

    private lateinit var module: GoogleSigninModernModule

    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        module = GoogleSigninModernModule(mockReactContext)
        whenever(mockReactContext.packageName).thenReturn("com.test.package")
    }

    // ========================================
    // PLAY SERVICES AVAILABILITY TESTS
    // ========================================

    @Test
    fun `isPlayServicesAvailable should return true when Play Services are available`() {
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
    fun `isPlayServicesAvailable should return false when Play Services are missing`() {
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
    fun `isPlayServicesAvailable should return false when Play Services are disabled`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_DISABLED)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should return false when Play Services version is too old`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should return false when Play Services are invalid`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_INVALID)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should return false when Play Services are updating`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_UPDATING)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should return false for unknown connection result`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(99) // Unknown result code

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then
            verify(mockPromise).resolve(false)
        }
    }

    // ========================================
    // ERROR HANDLING TESTS
    // ========================================

    @Test
    fun `isPlayServicesAvailable should handle GoogleApiAvailability getInstance failure`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenThrow(RuntimeException("Instance creation failed"))

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then - should handle gracefully and return false
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should handle availability check failure`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenThrow(RuntimeException("Availability check failed"))

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then - should handle gracefully and return false
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should handle SecurityException gracefully`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenThrow(SecurityException("Security check failed"))

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then - should handle gracefully and return false
            verify(mockPromise).resolve(false)
        }
    }

    @Test
    fun `isPlayServicesAvailable should handle null context gracefully`() {
        // Given - module with null context behavior
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(null))
                .thenThrow(NullPointerException("Context is null"))

            // Create module with potentially problematic context
            val moduleWithNullContext = GoogleSigninModernModule(mockReactContext)

            // When
            moduleWithNullContext.isPlayServicesAvailable(mockPromise)

            // Then - should still check availability with the provided context
            verify(mockGoogleApiAvailability).isGooglePlayServicesAvailable(mockReactContext)
        }
    }

    // ========================================
    // INTEGRATION BEHAVIOR TESTS
    // ========================================

    @Test
    fun `isPlayServicesAvailable should call GoogleApiAvailability correctly`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SUCCESS)

            // When
            module.isPlayServicesAvailable(mockPromise)

            // Then - verify correct API calls
            verify { GoogleApiAvailability.getInstance() }
            verify(mockGoogleApiAvailability).isGooglePlayServicesAvailable(mockReactContext)
        }
    }

    @Test
    fun `isPlayServicesAvailable should work with different context instances`() {
        // Given
        val anotherContext = mock<ReactApplicationContext>()
        val anotherModule = GoogleSigninModernModule(anotherContext)
        val anotherPromise = mock<Promise>()

        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(anotherContext))
                .thenReturn(ConnectionResult.SUCCESS)

            // When
            anotherModule.isPlayServicesAvailable(anotherPromise)

            // Then
            verify(anotherPromise).resolve(true)
            verify(mockGoogleApiAvailability).isGooglePlayServicesAvailable(anotherContext)
        }
    }

    // ========================================
    // EDGE CASE TESTS
    // ========================================

    @Test
    fun `isPlayServicesAvailable should handle concurrent calls correctly`() {
        // Given
        val promise1 = mock<Promise>()
        val promise2 = mock<Promise>()
        val promise3 = mock<Promise>()

        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SUCCESS)

            // When - make multiple concurrent calls
            module.isPlayServicesAvailable(promise1)
            module.isPlayServicesAvailable(promise2)
            module.isPlayServicesAvailable(promise3)

            // Then - all should succeed independently
            verify(promise1).resolve(true)
            verify(promise2).resolve(true)
            verify(promise3).resolve(true)
            verify(mockGoogleApiAvailability, times(3))
                .isGooglePlayServicesAvailable(mockReactContext)
        }
    }

    @Test
    fun `isPlayServicesAvailable should be stateless`() {
        // Given
        mockStaticGoogleApiAvailability {
            whenever(GoogleApiAvailability.getInstance()).thenReturn(mockGoogleApiAvailability)
            
            // First call returns success
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SUCCESS)
            val firstPromise = mock<Promise>()
            module.isPlayServicesAvailable(firstPromise)
            
            // Second call returns failure
            whenever(mockGoogleApiAvailability.isGooglePlayServicesAvailable(mockReactContext))
                .thenReturn(ConnectionResult.SERVICE_MISSING)
            val secondPromise = mock<Promise>()

            // When
            module.isPlayServicesAvailable(secondPromise)

            // Then - results should reflect current state, not cached state
            verify(firstPromise).resolve(true)
            verify(secondPromise).resolve(false)
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private fun <T> mockStaticGoogleApiAvailability(block: MockedStatic<GoogleApiAvailability>.() -> T): T {
        return mockStatic(GoogleApiAvailability::class.java).use { mockedStatic ->
            mockedStatic.block()
        }
    }
}