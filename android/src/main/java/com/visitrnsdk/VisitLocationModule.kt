package com.visitrnsdk

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageManager
import android.location.Location
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.Granularity
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.tasks.CancellationTokenSource

class VisitLocationModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val mainHandler = Handler(Looper.getMainLooper())
  private val settingsLock = Any()
  private val locationLock = Any()
  private val pendingSettingsPromises = mutableListOf<Promise>()
  private val pendingLocationPromises = mutableListOf<Promise>()

  private var settingsResolutionInProgress = false
  private var locationRequestInProgress = false
  private var locationCancellationTokenSource: CancellationTokenSource? = null
  private var locationTimeoutRunnable: Runnable? = null

  private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?
    ) {
      if (requestCode != REQUEST_LOCATION_SETTINGS) {
        return
      }

      finishSettingsResolution(resultCode == Activity.RESULT_OK)
    }
  }

  init {
    reactApplicationContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun requestLocationSettings(promise: Promise) {
    synchronized(settingsLock) {
      if (settingsResolutionInProgress) {
        pendingSettingsPromises.add(promise)
        return
      }
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject(ERROR_NO_ACTIVITY, "No foreground Activity is available")
      return
    }

    val locationRequest = LocationRequest.Builder(
      Priority.PRIORITY_HIGH_ACCURACY,
      LOCATION_SETTINGS_INTERVAL_MS
    ).build()
    val settingsRequest = LocationSettingsRequest.Builder()
      .addLocationRequest(locationRequest)
      .setAlwaysShow(true)
      .build()

    LocationServices.getSettingsClient(activity)
      .checkLocationSettings(settingsRequest)
      .addOnSuccessListener {
        promise.resolve(true)
      }
      .addOnFailureListener { error ->
        if (error !is ResolvableApiException) {
          promise.resolve(false)
          return@addOnFailureListener
        }

        var shouldStartResolution = false
        synchronized(settingsLock) {
          pendingSettingsPromises.add(promise)
          if (!settingsResolutionInProgress) {
            settingsResolutionInProgress = true
            shouldStartResolution = true
          }
        }

        if (shouldStartResolution) {
          UiThreadUtil.runOnUiThread {
            try {
              error.startResolutionForResult(activity, REQUEST_LOCATION_SETTINGS)
            } catch (_: IntentSender.SendIntentException) {
              finishSettingsResolution(false)
            }
          }
        }
      }
  }

  @ReactMethod
  fun getCurrentLocation(options: ReadableMap, promise: Promise) {
    val hasFinePermission = hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)
    val hasCoarsePermission = hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION)

    if (!hasFinePermission && !hasCoarsePermission) {
      promise.reject(
        ERROR_PERMISSION_DENIED,
        "Foreground location permission has not been granted"
      )
      return
    }

    synchronized(locationLock) {
      pendingLocationPromises.add(promise)
      if (locationRequestInProgress) {
        return
      }
      locationRequestInProgress = true
    }

    val maximumAgeMillis = readLongOption(
      options,
      "maximumAgeMs",
      DEFAULT_MAXIMUM_AGE_MS,
      0L,
      MAXIMUM_ALLOWED_AGE_MS
    )
    val timeoutMillis = readLongOption(
      options,
      "timeoutMs",
      DEFAULT_TIMEOUT_MS,
      MINIMUM_TIMEOUT_MS,
      MAXIMUM_TIMEOUT_MS
    )
    val precision = if (hasFinePermission) PRECISION_PRECISE else PRECISION_APPROXIMATE

    val currentLocationRequest = CurrentLocationRequest.Builder()
      .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
      .setGranularity(Granularity.GRANULARITY_PERMISSION_LEVEL)
      .setMaxUpdateAgeMillis(maximumAgeMillis)
      .setDurationMillis(timeoutMillis)
      .build()

    val cancellationTokenSource = CancellationTokenSource()
    locationCancellationTokenSource = cancellationTokenSource

    val timeoutRunnable = Runnable {
      cancellationTokenSource.cancel()
      finishLocationFailure(
        ERROR_LOCATION_TIMEOUT,
        "Timed out while waiting for the current location"
      )
    }
    locationTimeoutRunnable = timeoutRunnable
    mainHandler.postDelayed(timeoutRunnable, timeoutMillis)

    try {
      LocationServices.getFusedLocationProviderClient(reactApplicationContext)
        .getCurrentLocation(currentLocationRequest, cancellationTokenSource.token)
        .addOnSuccessListener { location ->
          if (location == null) {
            finishLocationFailure(
              ERROR_LOCATION_UNAVAILABLE,
              "Fused Location Provider returned no location"
            )
          } else if (!isValidLocation(location)) {
            finishLocationFailure(
              ERROR_LOCATION_UNAVAILABLE,
              "Fused Location Provider returned invalid coordinates"
            )
          } else {
            finishLocationSuccess(location, precision)
          }
        }
        .addOnFailureListener { error ->
          finishLocationFailure(
            ERROR_LOCATION_REQUEST_FAILED,
            error.message ?: "Fused Location Provider request failed",
            error
          )
        }
    } catch (error: SecurityException) {
      finishLocationFailure(
        ERROR_PERMISSION_DENIED,
        "Foreground location permission is no longer available",
        error
      )
    } catch (error: Exception) {
      finishLocationFailure(
        ERROR_LOCATION_REQUEST_FAILED,
        error.message ?: "Unable to request the current location",
        error
      )
    }
  }

  private fun hasPermission(permission: String): Boolean {
    return reactApplicationContext.packageManager.checkPermission(
      permission,
      reactApplicationContext.packageName
    ) == PackageManager.PERMISSION_GRANTED
  }

  private fun readLongOption(
    options: ReadableMap,
    key: String,
    defaultValue: Long,
    minimumValue: Long,
    maximumValue: Long
  ): Long {
    if (!options.hasKey(key) || options.isNull(key)) {
      return defaultValue
    }

    return try {
      val value = options.getDouble(key)
      if (value.isFinite()) {
        value.toLong().coerceIn(minimumValue, maximumValue)
      } else {
        defaultValue
      }
    } catch (_: Exception) {
      defaultValue
    }
  }

  private fun isValidLocation(location: Location): Boolean {
    return location.latitude.isFinite() &&
      location.longitude.isFinite() &&
      location.latitude in -90.0..90.0 &&
      location.longitude in -180.0..180.0
  }

  private fun finishSettingsResolution(enabled: Boolean) {
    val promises = synchronized(settingsLock) {
      if (!settingsResolutionInProgress && pendingSettingsPromises.isEmpty()) {
        return
      }

      settingsResolutionInProgress = false
      pendingSettingsPromises.toList().also { pendingSettingsPromises.clear() }
    }

    promises.forEach { it.resolve(enabled) }
  }

  private fun finishLocationSuccess(location: Location, precision: String) {
    val promises = takePendingLocationPromises() ?: return

    promises.forEach { promise ->
      val payload = Arguments.createMap().apply {
        putDouble("latitude", location.latitude)
        putDouble("longitude", location.longitude)
        putDouble("accuracy", location.accuracy.toDouble())
        putDouble("timestamp", location.time.toDouble())
        putString("precision", precision)
        putString("source", LOCATION_SOURCE)
      }
      promise.resolve(payload)
    }
  }

  private fun finishLocationFailure(
    code: String,
    message: String,
    error: Throwable? = null
  ) {
    val promises = takePendingLocationPromises() ?: return

    promises.forEach { promise ->
      if (error == null) {
        promise.reject(code, message)
      } else {
        promise.reject(code, message, error)
      }
    }
  }

  private fun takePendingLocationPromises(): List<Promise>? {
    return synchronized(locationLock) {
      if (!locationRequestInProgress) {
        return@synchronized null
      }

      locationRequestInProgress = false
      locationTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
      locationTimeoutRunnable = null
      locationCancellationTokenSource = null
      pendingLocationPromises.toList().also { pendingLocationPromises.clear() }
    }
  }

  override fun invalidate() {
    locationTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
    locationCancellationTokenSource?.cancel()
    synchronized(locationLock) {
      locationRequestInProgress = false
      pendingLocationPromises.clear()
    }
    synchronized(settingsLock) {
      settingsResolutionInProgress = false
      pendingSettingsPromises.clear()
    }
    reactApplicationContext.removeActivityEventListener(activityEventListener)
    super.invalidate()
  }

  companion object {
    const val NAME = "VisitLocationModule"

    private const val REQUEST_LOCATION_SETTINGS = 48127
    private const val LOCATION_SETTINGS_INTERVAL_MS = 10_000L
    private const val DEFAULT_MAXIMUM_AGE_MS = 60_000L
    private const val DEFAULT_TIMEOUT_MS = 10_000L
    private const val MAXIMUM_ALLOWED_AGE_MS = 300_000L
    private const val MINIMUM_TIMEOUT_MS = 1_000L
    private const val MAXIMUM_TIMEOUT_MS = 60_000L

    private const val PRECISION_PRECISE = "precise"
    private const val PRECISION_APPROXIMATE = "approximate"
    private const val LOCATION_SOURCE = "android-fused"

    private const val ERROR_NO_ACTIVITY = "E_NO_ACTIVITY"
    private const val ERROR_PERMISSION_DENIED = "E_LOCATION_PERMISSION_DENIED"
    private const val ERROR_LOCATION_TIMEOUT = "E_LOCATION_TIMEOUT"
    private const val ERROR_LOCATION_UNAVAILABLE = "E_LOCATION_UNAVAILABLE"
    private const val ERROR_LOCATION_REQUEST_FAILED = "E_LOCATION_REQUEST_FAILED"
  }
}
