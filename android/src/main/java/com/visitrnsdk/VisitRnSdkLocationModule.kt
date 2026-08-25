package com.visitrnsdk

import android.content.Context
import android.location.LocationManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VisitRnSdkLocationModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "VisitRnSdkLocation"

  @ReactMethod
  fun isLocationServicesEnabled(promise: Promise) {
    try {
      val locationManager =
        reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val isEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        locationManager.isLocationEnabled
      } else {
        locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
          locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
      }

      promise.resolve(isEnabled)
    } catch (error: Exception) {
      promise.reject(
        "LOCATION_SERVICES_CHECK_FAILED",
        "Unable to determine whether Location Services are enabled.",
        error
      )
    }
  }
}
