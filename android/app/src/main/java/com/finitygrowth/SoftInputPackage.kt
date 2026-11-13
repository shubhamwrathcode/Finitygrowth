package com.finitygrowth

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SoftInputPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name == SoftInputModule.NAME) {
      return SoftInputModule(reactContext)
    }
    return null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
      ReactModuleInfoProvider {
        mapOf(
            SoftInputModule.NAME to
                ReactModuleInfo(
                    SoftInputModule.NAME,
                    SoftInputModule::class.java.name,
                    false,
                    false,
                    false,
                    false,
                ),
        )
      }
}
