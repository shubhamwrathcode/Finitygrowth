package com.finitygrowth

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Lets the support chat stop Android from resizing the window when the
 * keyboard opens. That resize was blurring the reply field and closing the keyboard.
 */
class SoftInputModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  @Suppress("DEPRECATION")
  fun setMode(mode: String) {
    val flag =
        when (mode) {
          "nothing" -> WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
          "pan" -> WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
          else -> WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }
    UiThreadUtil.runOnUiThread {
      reactApplicationContext.currentActivity?.window?.setSoftInputMode(flag)
    }
  }

  companion object {
    const val NAME = "SoftInputMode"
  }
}
