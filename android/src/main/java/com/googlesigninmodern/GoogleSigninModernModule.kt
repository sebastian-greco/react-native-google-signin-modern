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
		
		// Credential types
		private const val GOOGLE_ID_TOKEN_CREDENTIAL_TYPE = "com.google.android.libraries.identity.googleid.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL"
		private const val NO_CREDENTIAL_EXCEPTION_TYPE = "androidx.credentials.exceptions.GetCredentialException.TYPE_NO_CREDENTIAL"
		
		// Google account type for add account intent
		private const val GOOGLE_ACCOUNT_TYPE = "com.google"
	}

    override fun configure(webClientId: String, promise: Promise) {
        try {
            // Validate webClientId format (basic validation)
            if (webClientId.isBlank() || !webClientId.contains(".")) {
                promise.reject(ERROR_CONFIGURE_ERROR, "Invalid webClientId format")
                return
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

    override fun signIn(promise: Promise) {
        try {
            Log.d(TAG, "Sign-in request initiated")
            
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

            Log.d(TAG, "Starting sign-in flow with authorized accounts filter")
            // First attempt: Check for authorized accounts (existing sign-ins)
            signInWithFilter(true)

        } catch (e: Exception) {
            Log.e(TAG, "Exception in signIn", e)
            clearPendingPromiseWithError(ERROR_SIGN_IN_ERROR, "Sign-in failed: ${e.message}", promise)
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

    private fun createSignInResponse(credential: GoogleIdTokenCredential): WritableMap {
        val idToken = credential.idToken
        val user = Arguments.createMap().apply {
            putString("id", credential.id)
            putString("name", credential.displayName)
            putString("email", credential.id) // Google ID is the email
            putString("photo", credential.profilePictureUri?.toString())
        }

        return Arguments.createMap().apply {
            putString("idToken", idToken)
            putMap("user", user)
        }
    }

    private fun signInWithFilter(filterByAuthorizedAccounts: Boolean) {
        val currentActivity = reactApplicationContext.currentActivity ?: return

        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId!!)
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        val filterType = if (filterByAuthorizedAccounts) "authorized accounts" else "all accounts"
        Log.d(TAG, "Starting credential request with filter: $filterType")

        // Use coroutines for async operation
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val result = credentialManager!!.getCredential(
                    request = request,
                    context = currentActivity
                )

                Log.d(TAG, "Credential result received")
                Log.d(TAG, "Credential type: ${result.credential.type}")
                Log.d(TAG, "Credential class: ${result.credential.javaClass.name}")

                when (val credential = result.credential) {
                    is GoogleIdTokenCredential -> {
                        Log.d(TAG, "Google ID token credential received (instanceof)")
                        
                        val response = createSignInResponse(credential)
                        pendingPromise?.resolve(response)
                        pendingPromise = null
                    }
                    else -> {
                        // Handle Google ID Token credential by type string
                        if (credential.type == GOOGLE_ID_TOKEN_CREDENTIAL_TYPE) {
                            Log.d(TAG, "Google ID token credential received (by type)")
                            try {
                                val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                val response = createSignInResponse(googleCredential)
                                pendingPromise?.resolve(response)
                                pendingPromise = null
                            } catch (parseError: Exception) {
                                Log.e(TAG, "Failed to parse Google credential", parseError)
                                clearPendingPromiseWithError(ERROR_CREDENTIAL_PARSE_ERROR, "Failed to parse Google credential: ${parseError.message}")
                            }
                        } else {
                            Log.e(TAG, "Unexpected credential type: ${credential.type}")
                            Log.d(TAG, "Credential class: ${credential.javaClass.name}")
                            Log.d(TAG, "Available credential data: ${credential.data}")
                            clearPendingPromiseWithError(ERROR_UNEXPECTED_CREDENTIAL, "Unexpected credential type: ${credential.type}")
                        }
                    }
                }

            } catch (e: GetCredentialException) {
                Log.e(TAG, "GetCredentialException: ${e.type} - ${e.message}")
                
                // Handle the case where no credentials are available
                if (filterByAuthorizedAccounts && e.type == NO_CREDENTIAL_EXCEPTION_TYPE) {
                    Log.d(TAG, "No authorized accounts found, retrying with all accounts")
                    // Retry with all accounts (allows sign-up flow)
                    signInWithFilter(false)
                } else {
                    handleNoAccountsError(e)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in signInWithFilter", e)
                clearPendingPromiseWithError(ERROR_SIGN_IN_ERROR, "Sign-in failed: ${e.message}")
            }
        }
    }
    
    /**
     * Handle the case when no Google accounts are available
     */
    private fun handleNoAccountsError(e: GetCredentialException) {
        val errorMessage = e.message ?: ""
        if (errorMessage.contains("No credentials available") || 
            errorMessage.contains("no accounts") ||
            e.type == NO_CREDENTIAL_EXCEPTION_TYPE) {
            Log.d(TAG, "No Google accounts available - triggering add account flow")
            triggerAddGoogleAccountIntent()
            clearPendingPromiseWithError(ERROR_NO_GOOGLE_ACCOUNTS, "Please add a Google account to continue. The account settings have been opened for you.")
        } else {
            clearPendingPromiseWithError(ERROR_SIGN_IN_ERROR, "Sign-in failed: ${e.message}")
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

    override fun invalidate() {
        super.invalidate()
        Log.d(TAG, "Module invalidated - cleaning up resources")
        pendingPromise?.reject(ERROR_MODULE_DESTROYED, "Module was destroyed")
        pendingPromise = null
        credentialManager = null
        webClientId = null
    }
}
