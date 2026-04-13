package com.visitrnsdk

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.twiliorn.library.TwilioPackage


class VisitRnSdkPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return emptyList()
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    val managers = mutableListOf<ViewManager<*, *>>()
    managers.add(VisitRnSdkViewManager())
    managers.addAll(TwilioPackage().createViewManagers(reactContext))
    return managers
  }
}
