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
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.ConnectionResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import android.util.Log

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
	}

    override fun configure(webClientId: String, promise: Promise) {
        try {
            this.webClientId = webClientId
            this.credentialManager = CredentialManager.create(reactApplicationContext)
            Log.d(TAG, "Google Sign-In configured with client ID: $webClientId")
            Log.d(TAG, "Package name: ${reactApplicationContext.packageName}")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to configure Google Sign-In", e)
            promise.reject("CONFIGURE_ERROR", "Failed to configure Google Sign-In: ${e.message}", e)
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
            Log.d(TAG, "signIn called")
            
            if (webClientId == null) {
                promise.reject("NOT_CONFIGURED", "Google Sign-In not configured")
                return
            }

            val credentialManager = this.credentialManager
            if (credentialManager == null) {
                promise.reject("NOT_CONFIGURED", "Credential manager not initialized")
                return
            }

            val currentActivity = reactApplicationContext.currentActivity
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            // Check if there's already a sign-in in progress to prevent concurrent calls
            if (pendingPromise != null) {
                promise.reject("SIGN_IN_IN_PROGRESS", "Sign-in already in progress")
                return
            }

            // Store promise for callback
            pendingPromise = promise

            Log.d(TAG, "Creating Google ID option with webClientId: $webClientId")

            val googleIdOption = GetGoogleIdOption.Builder()
                .setServerClientId(webClientId!!)
                .setFilterByAuthorizedAccounts(false)
                .build()

            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            Log.d(TAG, "Starting credential request")

            // Use coroutines for async operation
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    val result = credentialManager.getCredential(
                        request = request,
                        context = currentActivity
                    )

                    Log.d(TAG, "Credential result received")
                    Log.d(TAG, "Credential type: ${result.credential.type}")
                    Log.d(TAG, "Credential class: ${result.credential.javaClass.name}")

                    when (val credential = result.credential) {
                        is GoogleIdTokenCredential -> {
                            Log.d(TAG, "Google ID token credential received (instanceof)")
                            
                            val idToken = credential.idToken
                            val user = Arguments.createMap().apply {
                                putString("id", credential.id)
                                putString("name", credential.displayName)
                                putString("email", credential.id) // Google ID is the email
                                putString("photo", credential.profilePictureUri?.toString())
                            }

                            val response = Arguments.createMap().apply {
                                putString("idToken", idToken)
                                putMap("user", user)
                            }

                            pendingPromise?.resolve(response)
                            pendingPromise = null
                        }
                        else -> {
                            // Handle Google ID Token credential by type string
                            if (credential.type == "com.google.android.libraries.identity.googleid.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL") {
                                Log.d(TAG, "Google ID token credential received (by type)")
                                try {
                                    val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                    val idToken = googleCredential.idToken
                                    val user = Arguments.createMap().apply {
                                        putString("id", googleCredential.id)
                                        putString("name", googleCredential.displayName)
                                        putString("email", googleCredential.id)
                                        putString("photo", googleCredential.profilePictureUri?.toString())
                                    }

                                    val response = Arguments.createMap().apply {
                                        putString("idToken", idToken)
                                        putMap("user", user)
                                    }

                                    pendingPromise?.resolve(response)
                                    pendingPromise = null
                                } catch (parseError: Exception) {
                                    Log.e(TAG, "Failed to parse Google credential", parseError)
                                    pendingPromise?.reject("CREDENTIAL_PARSE_ERROR", "Failed to parse Google credential: ${parseError.message}")
                                    pendingPromise = null
                                }
                            } else {
                                Log.e(TAG, "Unexpected credential type: ${credential.type}")
                                Log.d(TAG, "Credential class: ${credential.javaClass.name}")
                                Log.d(TAG, "Available credential data: ${credential.data}")
                                pendingPromise?.reject("UNEXPECTED_CREDENTIAL", "Unexpected credential type: ${credential.type}")
                                pendingPromise = null
                            }
                        }
                    }

                } catch (e: GetCredentialException) {
                    Log.e(TAG, "GetCredentialException: ${e.type} - ${e.message}")
                    pendingPromise?.reject("SIGN_IN_ERROR", "Sign-in failed: ${e.message}")
                    pendingPromise = null
                } catch (e: Exception) {
                    Log.e(TAG, "Exception in signInWithGoogle", e)
                    pendingPromise?.reject("SIGN_IN_ERROR", "Sign-in failed: ${e.message}")
                    pendingPromise = null
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Exception in signIn", e)
            // Reject the active promise (pendingPromise if set, otherwise the original promise)
            val activePromise = pendingPromise ?: promise
            activePromise.reject("SIGN_IN_ERROR", "Sign-in failed: ${e.message}")
            // Clear pendingPromise to avoid leaking or reusing it
            pendingPromise = null
        }
    }

	override fun signOut(promise: Promise) {
        try {
            Log.d(TAG, "signOut called")
            
            // If there's a pending sign-in, reject it first
            pendingPromise?.reject("SIGN_OUT_REQUESTED", "Sign-out was requested")
            
            // Clear stored authentication state
            webClientId = null
            credentialManager = null
            pendingPromise = null
            
            Log.d(TAG, "Sign out completed")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error during sign out", e)
            promise.reject("SIGN_OUT_ERROR", "Sign out failed: ${e.message}")
        }
    }

	override fun isSignedIn(promise: Promise) {
        // With Credential Manager, we don't maintain persistent sign-in state
        // The app should manage this through its own authentication state
        promise.resolve(false)
    }

    override fun invalidate() {
        super.invalidate()
        pendingPromise?.reject("MODULE_DESTROYED", "Module was destroyed")
        pendingPromise = null
    }
}
