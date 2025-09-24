package com.googlesigninmodern

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap
import android.util.Log

class GoogleSigninModernPackage : BaseReactPackage() {

  init {
    Log.d("GoogleSigninModern", "GoogleSigninModernPackage initialized")
  }
  
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == GoogleSigninModernModule.NAME) {
      GoogleSigninModernModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[GoogleSigninModernModule.NAME] = ReactModuleInfo(
        GoogleSigninModernModule.NAME,
        GoogleSigninModernModule.NAME,
        false,  // canOverrideExistingModule
        false,  // needsEagerInit
        false,  // isCxxModule
        true // isTurboModule
      )
      moduleInfos
    }
  }
}
