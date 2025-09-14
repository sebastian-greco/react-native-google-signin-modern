package com.googlesigninmodern

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import android.util.Log

class GoogleSigninModernPackage : BaseReactPackage() {
  
  init {
    Log.d("GoogleSigninModern", "GoogleSigninModernPackage initialized")
  }
  
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    Log.d("GoogleSigninModern", "getModule called with name: $name")
    return if (name == GoogleSigninModernModule.NAME) {
      Log.d("GoogleSigninModern", "Creating GoogleSigninModernModule")
      GoogleSigninModernModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        GoogleSigninModernModule.NAME to ReactModuleInfo(
          GoogleSigninModernModule.NAME, // name
          GoogleSigninModernModule.NAME, // className
          false, // canOverrideExistingModule
          false, // needsEagerInit
          true, // hasConstants
          false // isCxxModule
        )
      )
    }
  }
}
