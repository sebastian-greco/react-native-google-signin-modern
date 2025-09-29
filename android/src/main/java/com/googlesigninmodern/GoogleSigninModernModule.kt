package com.googlesigninmodern

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.ConnectionResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import android.util.Log
import android.content.Intent
import android.provider.Settings
import android.util.Base64
import org.json.JSONObject

@ReactModule(name = GoogleSigninModernModule.NAME)
class GoogleSigninModernModule(reactContext: ReactApplicationContext) :
	NativeGoogleSigninModernSpec(reactContext) {

    private val TAG = "GoogleSigninModern"
	private var credentialManager: CredentialManager? = null
	private var webClientId: String? = null
	private var pendingPromise: Promise? = null

	override fun getName(): String {
		return NAME
	}

	companion object {
		const val NAME = "GoogleSigninModern"
		
		// Error codes
		private const val ERROR_NOT_CONFIGURED = "NOT_CONFIGURED"
		private const val ERROR_NO_ACTIVITY = "NO_ACTIVITY"
		private const val ERROR_SIGN_IN_IN_PROGRESS = "SIGN_IN_IN_PROGRESS"
		private const val ERROR_NO_GOOGLE_ACCOUNTS = "NO_GOOGLE_ACCOUNTS"
		private const val ERROR_SIGN_IN_ERROR = "SIGN_IN_ERROR"
		private const val ERROR_CREDENTIAL_PARSE_ERROR = "CREDENTIAL_PARSE_ERROR"
		private const val ERROR_UNEXPECTED_CREDENTIAL = "UNEXPECTED_CREDENTIAL"
		private const val ERROR_CONFIGURE_ERROR = "CONFIGURE_ERROR"
		private const val ERROR_SIGN_OUT_ERROR = "SIGN_OUT_ERROR"
		private const val ERROR_SIGN_OUT_REQUESTED = "SIGN_OUT_REQUESTED"
		private const val ERROR_MODULE_DESTROYED = "MODULE_DESTROYED"
		private const val ERROR_NO_USER = "NO_USER"
		private const val ERROR_TOKEN_REFRESH_ERROR = "TOKEN_REFRESH_ERROR"
		private const val ERROR_NONCE_ERROR = "NONCE_ERROR"
		private const val ERROR_NONCE_VALIDATION_ERROR = "NONCE_VALIDATION_ERROR"
		
		// Credential types
		private const val GOOGLE_ID_TOKEN_CREDENTIAL_TYPE = "com.google.android.libraries.identity.googleid.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL"
		private const val NO_CREDENTIAL_EXCEPTION_TYPE = "androidx.credentials.exceptions.GetCredentialException.TYPE_NO_CREDENTIAL"
		
		// Google account type for add account intent
		private const val GOOGLE_ACCOUNT_TYPE = "com.google"
	}

    override fun configure(webClientId: String, promise: Promise) {
        try {
            // Validate webClientId format - Google OAuth client IDs typically end with .apps.googleusercontent.com
            if (webClientId.isBlank()) {
                promise.reject(ERROR_CONFIGURE_ERROR, "webClientId cannot be blank")
                return
            }
            if (!webClientId.endsWith(".apps.googleusercontent.com")) {
                Log.w(TAG, "webClientId doesn't match expected format: *.apps.googleusercontent.com")
            }
            
            this.webClientId = webClientId
            this.credentialManager = CredentialManager.create(reactApplicationContext)
            Log.d(TAG, "Google Sign-In configured successfully")
            Log.d(TAG, "Package name: ${reactApplicationContext.packageName}")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to configure Google Sign-In", e)
            promise.reject(ERROR_CONFIGURE_ERROR, "Failed to configure Google Sign-In: ${e.message}", e)
        }
    }

    override fun isPlayServicesAvailable(promise: Promise) {
        try {
            val googleApiAvailability = GoogleApiAvailability.getInstance()
            val result = googleApiAvailability.isGooglePlayServicesAvailable(reactApplicationContext)
            promise.resolve(result == ConnectionResult.SUCCESS)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking Play Services availability", e)
            promise.resolve(false)
        }
    }

    override fun signIn(nonce: String?, promise: Promise) {
        try {
            // Validate nonce if provided
            val validatedNonce = if (nonce != null) validateNonce(nonce) else null
            
            performSignIn(
                promise = promise,
                flowType = SignInFlowType.INTERACTIVE,
                logMessage = "Sign-in request initiated",
                nonce = validatedNonce
            )
        } catch (e: Exception) {
            Log.e(TAG, "Nonce validation failed", e)
            promise.reject(ERROR_NONCE_ERROR, "Invalid nonce: ${e.message}", e)
        }
    }

    override fun signInSilently(nonce: String?, promise: Promise) {
        try {
            // Validate nonce if provided
            val validatedNonce = if (nonce != null) validateNonce(nonce) else null
            
            performSignIn(
                promise = promise,
                flowType = SignInFlowType.SILENT,
                logMessage = "Silent sign-in request initiated",
                nonce = validatedNonce
            )
        } catch (e: Exception) {
            Log.e(TAG, "Nonce validation failed", e)
            promise.reject(ERROR_NONCE_ERROR, "Invalid nonce: ${e.message}", e)
        }
    }

    /**
     * Enum to define different sign-in flow types
     */
    private enum class SignInFlowType {
        INTERACTIVE,    // Regular sign-in with fallback to all accounts
        SILENT,         // Silent sign-in, authorized accounts only
        TOKEN_REFRESH   // Token refresh, authorized accounts only
    }

    /**
     * Unified sign-in method that handles all flow types
     */
    private fun performSignIn(promise: Promise, flowType: SignInFlowType, logMessage: String, nonce: String? = null) {
        try {
            Log.d(TAG, logMessage)
            
            if (webClientId == null) {
                promise.reject(ERROR_NOT_CONFIGURED, "Google Sign-In not configured. Call configure() first.")
                return
            }

            val credentialManager = this.credentialManager
            if (credentialManager == null) {
                promise.reject(ERROR_NOT_CONFIGURED, "Credential manager not initialized")
                return
            }

            val currentActivity = reactApplicationContext.currentActivity
            if (currentActivity == null) {
                promise.reject(ERROR_NO_ACTIVITY, "No current activity found")
                return
            }

            // Check if there's already a sign-in in progress to prevent concurrent calls
            if (pendingPromise != null) {
                Log.w(TAG, "Sign-in already in progress, rejecting new request")
                promise.reject(ERROR_SIGN_IN_IN_PROGRESS, "Sign-in already in progress")
                return
            }

            // Store promise for callback
            pendingPromise = promise

            Log.d(TAG, "Starting ${flowType.name.lowercase(java.util.Locale.ROOT)} flow with authorized accounts")
            // All flows start by checking authorized accounts first
            performCredentialRequest(filterByAuthorizedAccounts = true, flowType = flowType, nonce = nonce)

        } catch (e: Exception) {
            Log.e(TAG, "Exception in ${flowType.name.lowercase(java.util.Locale.ROOT)}", e)
            val errorCode = if (flowType == SignInFlowType.TOKEN_REFRESH) ERROR_TOKEN_REFRESH_ERROR else ERROR_SIGN_IN_ERROR
            val errorMessage = "${flowType.name.lowercase(java.util.Locale.ROOT)} failed: ${e.message}"
            clearPendingPromiseWithError(errorCode, errorMessage, promise)
        }
    }
    
    /**
     * Helper method to safely clear pending promise and reject with error
     */
    private fun clearPendingPromiseWithError(errorCode: String, message: String, fallbackPromise: Promise? = null) {
        val activePromise = pendingPromise ?: fallbackPromise
        activePromise?.reject(errorCode, message)
        pendingPromise = null
    }

    /**
     * Validate nonce parameter for security requirements
     */
    private fun validateNonce(nonce: String): String {
        if (nonce.isBlank()) {
            throw IllegalArgumentException("Nonce cannot be blank")
        }
        
        if (nonce.length < 32) {
            throw IllegalArgumentException("Nonce must be at least 32 characters long for security")
        }
        
        if (nonce.length > 255) {
            throw IllegalArgumentException("Nonce is too long (max 255 characters)")
        }
        
        // Ensure URL-safe base64 format (allows alphanumeric, -, _, and =)
        if (!nonce.matches(Regex("[A-Za-z0-9_-]+"))) {
            throw IllegalArgumentException("Nonce must be URL-safe base64 encoded (alphanumeric, -, _ only)")
        }
        
        return nonce
    }

    /**
     * Extract and validate nonce from ID token
     */
    private fun validateNonceInIdToken(idToken: String, expectedNonce: String): Boolean {
        return try {
            // JWT tokens have 3 parts separated by dots: header.payload.signature
            val parts = idToken.split(".")
            if (parts.size >= 2) {
                // Decode the payload (second part)
                val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING))
                val json = JSONObject(payload)
                val tokenNonce = json.optString("nonce", null)
                
                Log.d(TAG, "Expected nonce: $expectedNonce, Token nonce: $tokenNonce")
                tokenNonce == expectedNonce
            } else {
                Log.w(TAG, "Invalid ID token format for nonce validation")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to validate nonce in ID token: ${e.message}")
            false
        }
    }
    private fun extractUserIdFromToken(idToken: String): String? {
        return try {
            // JWT tokens have 3 parts separated by dots: header.payload.signature
            val parts = idToken.split(".")
            if (parts.size >= 2) {
                // Decode the payload (second part)
                val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_PADDING))
                val json = JSONObject(payload)
                json.optString("sub", null)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to extract user ID from token: ${e.message}")
            null
        }
    }

    private fun createSignInResponse(credential: GoogleIdTokenCredential, nonce: String? = null): WritableMap {
        val idToken = credential.idToken
        
        // Validate nonce if provided
        if (nonce != null) {
            if (!validateNonceInIdToken(idToken, nonce)) {
                throw SecurityException("Nonce validation failed: ID token nonce doesn't match request nonce")
            }
        }
        
        val stableUserId = extractUserIdFromToken(idToken) ?: credential.id
        val user = Arguments.createMap().apply {
            putString("id", stableUserId)
            putString("name", credential.displayName)
            putString("email", credential.id) // Google ID is the email
            putString("photo", credential.profilePictureUri?.toString())
        }

        return Arguments.createMap().apply {
            putString("idToken", idToken)
            putMap("user", user)
            if (nonce != null) {
                putString("nonce", nonce)
            }
        }
    }

    /**
     * Unified credential request method that handles all flow types
     */
    private fun performCredentialRequest(filterByAuthorizedAccounts: Boolean, flowType: SignInFlowType, nonce: String? = null) {
        val currentActivity = reactApplicationContext.currentActivity ?: return

        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId!!)
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .apply {
                // Add nonce to credential request if provided
                if (nonce != null) {
                    setNonce(nonce)
                    Log.d(TAG, "Adding nonce to credential request")
                }
            }
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val filterType = if (filterByAuthorizedAccounts) "authorized accounts" else "all accounts"
        Log.d(TAG, "Starting credential request with filter: $filterType (${flowType.name})")

        // Use coroutines for async operation
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = credentialManager!!.getCredential(
                    request = request,
                    context = currentActivity
                )

                Log.d(TAG, "Credential result received for ${flowType.name}")
                Log.d(TAG, "Credential type: ${result.credential.type}")

                when (val credential = result.credential) {
                    is GoogleIdTokenCredential -> {
                        Log.d(TAG, "Google ID token credential received (instanceof) for ${flowType.name}")
                        
                        val response = createResponseForFlowType(credential, flowType, nonce)
                        pendingPromise?.resolve(response)
                        pendingPromise = null
                    }
                    else -> {
                        // Handle Google ID Token credential by type string
                        if (credential.type == GOOGLE_ID_TOKEN_CREDENTIAL_TYPE) {
                            Log.d(TAG, "Google ID token credential received (by type) for ${flowType.name}")
                            try {
                                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                val response = createResponseForFlowType(googleCredential, flowType, nonce)
                                pendingPromise?.resolve(response)
                                pendingPromise = null
                            } catch (parseError: Exception) {
                                Log.e(TAG, "Failed to parse Google credential for ${flowType.name}", parseError)
                                val errorCode = if (flowType == SignInFlowType.TOKEN_REFRESH) ERROR_TOKEN_REFRESH_ERROR else ERROR_CREDENTIAL_PARSE_ERROR
                                clearPendingPromiseWithError(errorCode, "Failed to parse Google credential: ${parseError.message}")
                            }
                        } else {
                            Log.e(TAG, "Unexpected credential type for ${flowType.name}: ${credential.type}")
                            val errorCode = if (flowType == SignInFlowType.TOKEN_REFRESH) ERROR_TOKEN_REFRESH_ERROR else ERROR_UNEXPECTED_CREDENTIAL
                            clearPendingPromiseWithError(errorCode, "Unexpected credential type: ${credential.type}")
                        }
                    }
                }

            } catch (e: GetCredentialException) {
                Log.e(TAG, "GetCredentialException for ${flowType.name}: ${e.type} - ${e.message}")
                handleCredentialException(e, filterByAuthorizedAccounts, flowType, nonce)
            } catch (e: SecurityException) {
                Log.e(TAG, "Security exception (nonce validation failed) for ${flowType.name}", e)
                val errorCode = ERROR_NONCE_VALIDATION_ERROR
                clearPendingPromiseWithError(errorCode, "Nonce validation failed: ${e.message}")
            } catch (e: Exception) {
                Log.e(TAG, "Exception in performCredentialRequest for ${flowType.name}", e)
                val errorCode = if (flowType == SignInFlowType.TOKEN_REFRESH) ERROR_TOKEN_REFRESH_ERROR else ERROR_SIGN_IN_ERROR
                clearPendingPromiseWithError(errorCode, "${flowType.name} failed: ${e.message}")
            }
        }
    }

    /**
     * Create appropriate response based on flow type
     */
    private fun createResponseForFlowType(credential: GoogleIdTokenCredential, flowType: SignInFlowType, nonce: String? = null): WritableMap {
        return when (flowType) {
            SignInFlowType.TOKEN_REFRESH -> {
                // For token refresh, return tokens format
                Arguments.createMap().apply {
                    putString("idToken", credential.idToken)
                    // Note: Credential Manager doesn't provide access tokens
                    // Access tokens would need to be obtained separately via Google APIs
                    putString("accessToken", "")
                }
            }
            else -> {
                // For sign-in flows, return user info format
                createSignInResponse(credential, nonce)
            }
        }
    }

    /**
     * Handle credential exceptions based on flow type
     */
    private fun handleCredentialException(e: GetCredentialException, filterByAuthorizedAccounts: Boolean, flowType: SignInFlowType, nonce: String? = null) {
        when (flowType) {
            SignInFlowType.INTERACTIVE -> {
                // Interactive sign-in can retry with all accounts if authorized accounts fail
                if (filterByAuthorizedAccounts && e.type == NO_CREDENTIAL_EXCEPTION_TYPE) {
                    Log.d(TAG, "No authorized accounts found, retrying with all accounts")
                    performCredentialRequest(filterByAuthorizedAccounts = false, flowType = flowType, nonce = nonce)
                } else {
                    handleNoAccountsError(e)
                }
            }
            SignInFlowType.SILENT -> {
                // Silent sign-in returns SIGN_IN_REQUIRED if no authorized accounts
                if (e.type == NO_CREDENTIAL_EXCEPTION_TYPE || e is NoCredentialException) {
                    clearPendingPromiseWithError("SIGN_IN_REQUIRED", "The user has never signed in before, or they have since signed out.")
                } else {
                    clearPendingPromiseWithError(ERROR_SIGN_IN_ERROR, "Silent sign-in failed: ${e.message}")
                }
            }
            SignInFlowType.TOKEN_REFRESH -> {
                // Token refresh returns NO_USER if no authorized accounts
                if (e.type == NO_CREDENTIAL_EXCEPTION_TYPE || e is NoCredentialException) {
                    clearPendingPromiseWithError(ERROR_NO_USER, "No user signed in. Please sign in first.")
                } else {
                    clearPendingPromiseWithError(ERROR_TOKEN_REFRESH_ERROR, "Token refresh failed: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Handle the case when no Google accounts are available
     */
    private fun handleNoAccountsError(e: GetCredentialException) {
        // Check exception type first (most reliable)
        if (e.type == NO_CREDENTIAL_EXCEPTION_TYPE || e is NoCredentialException) {
            Log.d(TAG, "No Google accounts available - triggering add account flow")
            triggerAddGoogleAccountIntent()
            clearPendingPromiseWithError(ERROR_NO_GOOGLE_ACCOUNTS, "Please add a Google account to continue. The account settings have been opened for you.")
        } else {
            // Fall back to case-insensitive message parsing as secondary check
            val errorMessage = (e.message ?: "").lowercase()
            if (errorMessage.contains("no credentials available") || 
                errorMessage.contains("no accounts")) {
                Log.d(TAG, "No Google accounts available (detected via message) - triggering add account flow")
                triggerAddGoogleAccountIntent()
                clearPendingPromiseWithError(ERROR_NO_GOOGLE_ACCOUNTS, "Please add a Google account to continue. The account settings have been opened for you.")
            } else {
                clearPendingPromiseWithError(ERROR_SIGN_IN_ERROR, "Sign-in failed: ${e.message}")
            }
        }
    }

    private fun triggerAddGoogleAccountIntent() {
        try {
            val currentActivity = reactApplicationContext.currentActivity
            if (currentActivity != null) {
                Log.d(TAG, "Opening Add Account screen for Google accounts")
                val addAccountIntent = Intent(Settings.ACTION_ADD_ACCOUNT).apply {
                    // Filter to show only Google account types
                    putExtra(Settings.EXTRA_ACCOUNT_TYPES, arrayOf(GOOGLE_ACCOUNT_TYPE))
                }
                currentActivity.startActivity(addAccountIntent)
            } else {
                Log.w(TAG, "No current activity available to show Add Account screen")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Add Account screen", e)
            // Not critical - user can still manually add accounts
        }
    }

	override fun signOut(promise: Promise) {
        try {
            Log.d(TAG, "Sign-out requested")
            
            // If there's a pending sign-in, reject it first
            pendingPromise?.reject(ERROR_SIGN_OUT_REQUESTED, "Sign-out was requested")
            
            // Clear stored authentication state
            webClientId = null
            credentialManager = null
            pendingPromise = null
            
            Log.d(TAG, "Sign-out completed successfully")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error during sign-out", e)
            promise.reject(ERROR_SIGN_OUT_ERROR, "Sign-out failed: ${e.message}")
        }
    }

	override fun isSignedIn(promise: Promise) {
        // With Credential Manager, we don't maintain persistent sign-in state
        // The app should manage this through its own authentication state
        Log.d(TAG, "isSignedIn called - returning false (app should manage auth state)")
        promise.resolve(false)
    }

    /**
     * Initiates a fresh credential request/refresh flow to obtain new authentication tokens.
     * 
     * **Important**: This method does NOT return cached tokens. Instead, it triggers a complete
     * credential refresh flow using Android's Credential Manager API.
     * 
     * **Behavior**:
     * - Triggers a new sign-in flow with [SignInFlowType.TOKEN_REFRESH]
     * - Uses Credential Manager to request fresh credentials from Google
     * - May prompt the user for account selection or authentication
     * - Tokens are not persisted by this module (app should manage token storage)
     * 
     * **When to use**:
     * - Before making authenticated API requests that require fresh tokens
     * - When existing tokens have expired or need refresh
     * - When you need guaranteed fresh credentials
     * 
     * **Note**: With Android's Credential Manager, persistent token storage is not maintained
     * by this module. Apps are responsible for managing their own authentication state and
     * token persistence as needed.
     * 
     * @param promise Promise that resolves with fresh [GoogleSignInTokens] or rejects on failure
     */
    override fun getTokens(promise: Promise) {
        // Initiating fresh credential request flow via Credential Manager
        Log.i(TAG, "getTokens called - initiating fresh credential refresh flow")
        
        performSignIn(
            promise = promise,
            flowType = SignInFlowType.TOKEN_REFRESH,
            logMessage = "Token refresh request initiated"
        )
    }

    override fun invalidate() {
        super.invalidate()
        Log.d(TAG, "Module invalidated - cleaning up resources")
        pendingPromise?.reject(ERROR_MODULE_DESTROYED, "Module was destroyed")
        pendingPromise = null
        credentialManager = null
        webClientId = null
    }
}
