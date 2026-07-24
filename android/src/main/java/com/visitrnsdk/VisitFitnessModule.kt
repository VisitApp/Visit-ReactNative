package com.visitrnsdk

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.annotation.Keep
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.health.connect.client.PermissionController
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.getvisitapp.visit.HealthConnectListener
import com.getvisitapp.visit.data.VisitStepSyncHelper
import com.getvisitapp.visit.healthConnect.activity.HealthConnectUtil
import com.getvisitapp.visit.healthConnect.contants.Contants.previouslyRevoked
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.CONNECTED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.INSTALLED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NONE
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NOT_INSTALLED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NOT_SUPPORTED
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber

@Keep
class VisitFitnessModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), HealthConnectListener {

  private companion object {
    private const val HEALTH_CONNECT_PERMISSION_REQUEST_CODE = 7021
  }

  private val TAG = "mytag"
  private val reactContext: ReactContext = reactContext
  private val reactApplicationContext: ReactApplicationContext = reactContext

  private var promise: Promise? = null

  private var healthConnectStatusPromise: Promise? = null
  private var dataRetrivalPromise: Promise? = null
  private var isLoggingEnabled = false

  private var visitStepSyncHelper: VisitStepSyncHelper? = null
  private var healthConnectUtil: HealthConnectUtil? = null
  private var syncDataWithServer = false

  @Volatile
  private var isSyncInProgress = false
  private var mainActivity: Activity? = null

  private lateinit var visitSessionStorage: VisitSessionStorage
  private val requestPermissionActivityContract =
    PermissionController.createRequestPermissionResultContract()
  private var requestPermissionsLauncher: ActivityResultLauncher<Set<String>>? = null
  private var requestPermissionsLauncherActivity: Activity? = null

  init {
    Log.d(TAG, "GoogleFitPermissionModule: inside constructor")
  }

  @ReactMethod
  fun initiateSDK(isLoggingEnabled: Boolean) {
    this.isLoggingEnabled = isLoggingEnabled
    configureTimber(isLoggingEnabled)
    Timber.d("mytag: initiateSDK %b", isLoggingEnabled)
    mainActivity = reactApplicationContext.currentActivity

    //don't initialise the native module if the mainActivity instance is null.
    if (mainActivity == null) {
      Timber.d("mytag: initiateSDK() skipped because currentActivity is null")
      return
    }
    visitStepSyncHelper = VisitStepSyncHelper(mainActivity!!)
    healthConnectUtil = HealthConnectUtil(mainActivity!!, this)
    healthConnectUtil!!.initialize()
    visitSessionStorage = VisitSessionStorage(mainActivity!!)

    Timber.d("mytag: initiateSDK() called")
  }

  @ReactMethod
  fun getHealthConnectStatus(healthConnectStatusPromise: Promise) {
    this.healthConnectStatusPromise = healthConnectStatusPromise

    Timber.d("mytag: getHealthConnectStatus called")

    healthConnectUtil?.scope?.launch {
      val status: HealthConnectConnectionState = healthConnectUtil!!.checkAvailability()

      withContext(Dispatchers.Main) {
        when (status) {
          NOT_SUPPORTED -> {
            healthConnectStatusPromise.resolve("NOT_SUPPORTED")
          }

          NOT_INSTALLED -> {
            healthConnectStatusPromise.resolve("NOT_INSTALLED")
          }

          INSTALLED -> {
            healthConnectStatusPromise.resolve("INSTALLED")
          }

          CONNECTED -> {
            healthConnectStatusPromise.resolve("CONNECTED")
          }

          NONE -> {

          }
        }
      }
    }
  }

  @ReactMethod
  fun askForFitnessPermission(promise: Promise) {
    this.promise = promise
    healthConnectUtil?.let {
      if (healthConnectUtil!!.healthConnectConnectionState == CONNECTED) {
        Timber.d("askForFitnessPermission: already granted")
        promise.resolve("GRANTED")
      } else {
        Timber.d("askForFitnessPermission: request permission")
        healthConnectUtil!!.requestPermission()
      }
    }

  }

  override fun userAcceptedHealthConnectPermission() {
    Timber.d("userAcceptedHealthConnectPermission")
    promise?.resolve("GRANTED")
  }

  override fun userDeniedHealthConnectPermission() {
    Timber.d("userDeniedHealthConnectPermission")
    promise?.resolve("CANCELLED")
  }

  @ReactMethod
  fun requestDailyFitnessData(promise: Promise?) {
    this.dataRetrivalPromise = promise

    if (healthConnectUtil!!.healthConnectConnectionState == CONNECTED) {
      healthConnectUtil!!.getVisitDashboardGraph()
    }
  }

  @ReactMethod
  fun requestActivityDataFromHealthConnect(
    type: String?, frequency: String?, timestamp: Double, promise: Promise?
  ) {
    this.dataRetrivalPromise = promise
    Timber.d("mytag: requestActivityData() called.")
    healthConnectUtil?.let {
      if (healthConnectUtil!!.healthConnectConnectionState == HealthConnectConnectionState.CONNECTED) {
        //Health Connect Implementation
        healthConnectUtil!!.getActivityData(type, frequency, Math.round(timestamp))
      } else {
        Timber.d("mytag: permission not available healthConnectConnectionState: ${healthConnectUtil!!.healthConnectConnectionState}")
        healthConnectUtil!!.requestPermission()
      }
    }

  }

  @ReactMethod
  fun updateApiBaseUrl(
    apiBaseUrl: String,
    authToken: String,
    googleFitLastSync: Double,
    gfHourlyLastSync: Double,
    promise: Promise?
  ) {
    if (isLoggingEnabled) {
      Log.d(
        "mytag",
        "GoogleFitPermissionModule syncDataWithServer(): baseUrl: " + apiBaseUrl + " googleFitLastSync: " + googleFitLastSync + "  gfHourlyLastSync:" + gfHourlyLastSync
      )
    }

    if (!::visitSessionStorage.isInitialized) {
      promise?.resolve("Health SDK Not Initialized")
      return
    }

    val normalizedBaseUrl = normalizeBaseUrl(apiBaseUrl)

    visitSessionStorage.saveBaseUrl(normalizedBaseUrl)
    visitSessionStorage.saveVisitAuthToken(authToken)
    visitSessionStorage.saveDailyLastSyncTimeStamp(Math.round(googleFitLastSync))
    visitSessionStorage.saveHourlyLastSyncTimeStamp(Math.round(gfHourlyLastSync))

    val healthConnectUtil = healthConnectUtil
    val visitStepSyncHelper = visitStepSyncHelper

    if (healthConnectUtil == null || visitStepSyncHelper == null) {
      promise?.resolve("Health SDK Not Initialized")
      return
    }

    if (isSyncInProgress) {
      promise?.resolve("Health Data Sync Already In Progress")
      return
    }

    if (!syncDataWithServer) {
      Timber.d("mytag: syncDataWithServer() called")
      isSyncInProgress = true
      visitStepSyncHelper.sendDataToVisitServer(
        healthConnectUtil,
        Math.round(googleFitLastSync),
        Math.round(gfHourlyLastSync),
        normalizedBaseUrl,
        authToken,
        onSuccess = { message ->
          isSyncInProgress = false
          Timber.d("mytag: syncDataWithServer() completed. $message")
        },
        onFailure = { reason ->
          isSyncInProgress = false
          syncDataWithServer = false
          Timber.d("mytag: syncDataWithServer() failed. $reason")
        }
      )
      syncDataWithServer = true
      promise?.resolve("Health Data Sync Started")
    } else {
      promise?.resolve("Health Data Already Synced")
    }


  }

  @ReactMethod
  fun openHraLink(link: String?) {
    try {
      val i = Intent(Intent.ACTION_VIEW)
      i.setData(Uri.parse(link))
      currentActivityOrCached()?.startActivity(i)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  @ReactMethod
  fun fetchDailyFitnessData(timestamp: Double, promise: Promise?) {
    this.promise = promise
    // TODO: to be implemented in the future.
  }

  @ReactMethod
  fun fetchHourlyFitnessData(timestamp: Double, promise: Promise?) {
    this.promise = promise
    // TODO: to be implemented in the future.
  }

  @ReactMethod
  fun openHealthConnectApp(promise: Promise?) {
    this.promise = promise
    healthConnectUtil?.openHealthConnectApp();
  }

  override fun getName(): String {
    return "VisitFitnessModule"
  }

  override fun loadVisitWebViewGraphData(webUrl: String) {
    Handler(Looper.getMainLooper()).post {
      if (isLoggingEnabled) {
        Log.d("mytag", "loadVisitWebViewGraphData: $webUrl")
      }
      dataRetrivalPromise!!.resolve(webUrl)
    }
  }


  override fun requestPermission() {
    Timber.d("requestPermission called 218")
    Handler(Looper.getMainLooper()).post {
      val activity = currentActivityOrCached()
      val healthConnectUtil = healthConnectUtil

      if (activity == null || healthConnectUtil == null) {
        Timber.d(
          "requestPermission skipped. activityReady=%s, healthConnectUtilReady=%s",
          activity != null,
          healthConnectUtil != null
        )
        userDeniedHealthConnectPermission()
        return@post
      }

      val launcher = getOrCreatePermissionLauncher(activity)
      if (launcher == null) {
        val exception = IllegalStateException(
          "Current activity must implement ActivityResultRegistryOwner to request Health Connect permissions"
        )
        Timber.e(exception, "requestPermission failed")
        logHealthConnectError(exception)
        userDeniedHealthConnectPermission()
        return@post
      }

      try {
        launcher.launch(healthConnectUtil.PERMISSIONS)
      } catch (exception: Exception) {
        Timber.e(exception, "requestPermission failed")
        logHealthConnectError(exception)
        userDeniedHealthConnectPermission()
      }
    }
  }

  override fun updateHealthConnectConnectionStatus(
    status: HealthConnectConnectionState, text: String
  ) {
    Timber.d("updateHealthConnectConnectionStatus: %s %s", status, text)

    when (status) {
      CONNECTED -> {}
      NOT_SUPPORTED -> {}
      NOT_INSTALLED -> {}
      INSTALLED -> {}
      NONE -> {}
    }
  }

  override fun logHealthConnectError(throwable: Throwable) {
    //pass it via a callback.
    throwable.message?.let {
      val formattedMessage = "${throwable.javaClass}: ${throwable.message}"
      Timber.d("mytag: logHealthConnectError= $formattedMessage")

      sendMessageToReactNative(formattedMessage)
    }
  }

  private fun sendMessageToReactNative(message: String) {
    Timber.d("mytag: sendMessageToReactNative called()")
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onMessage", message) // "onMessage" is the event name
  }


  @ReactMethod
  fun getTodayStepCount(promise: Promise?) {
    healthConnectUtil?.let { healthConnectUtil ->
      healthConnectUtil.scope.launch {
        try {
          val stepsCount = healthConnectUtil.getTodayStepData()
          promise?.resolve(stepsCount.toInt())
        } catch (e: Exception) {
          promise?.reject(e)
        }
      }
    }
  }

  @ReactMethod
  fun getTodaySleepMinutes(promise: Promise?) {
    healthConnectUtil?.let { healthConnectUtil ->
      healthConnectUtil.scope.launch {
        try {
          val sleepMinutes = healthConnectUtil.getTodaySleepData()
          promise?.resolve(sleepMinutes.toInt())
        } catch (e: Exception) {
          promise?.reject(e)
        }
      }
    }
  }

  @ReactMethod
  fun getTodayCalorieCount(promise: Promise?) {
    healthConnectUtil?.let { healthConnectUtil ->
      healthConnectUtil.scope.launch {
        try {
          val calorieCount = healthConnectUtil.getTodayCalorieData()
          promise?.resolve(calorieCount.toInt())
        } catch (e: Exception) {
          promise?.reject(e)
        }
      }
    }
  }


  @ReactMethod
  fun triggerManualSync(promise: Promise?) {

    val manualSyncStartedAt = System.currentTimeMillis()

    Timber.d(
      "mytag: triggerManualSync() called. storageInitialized=%s, healthConnectUtilReady=%s, visitStepSyncHelperReady=%s, isSyncInProgress=%s",
      ::visitSessionStorage.isInitialized,
      healthConnectUtil != null,
      visitStepSyncHelper != null,
      isSyncInProgress
    )

    if (!::visitSessionStorage.isInitialized) {
      Timber.d(
        "mytag: triggerManualSync() rejected. code=SDK_NOT_INITIALIZED, reason=visitSessionStorage not initialized, elapsedMs=%s",
        System.currentTimeMillis() - manualSyncStartedAt
      )
      rejectPromiseOnMainThread(promise, "SDK_NOT_INITIALIZED", "Health SDK is not initialized")
      return
    }

    val healthConnectUtil = healthConnectUtil
    val visitStepSyncHelper = visitStepSyncHelper

    if (healthConnectUtil == null || visitStepSyncHelper == null) {
      Timber.d(
        "mytag: triggerManualSync() rejected. code=SDK_NOT_INITIALIZED, healthConnectUtilReady=%s, visitStepSyncHelperReady=%s, elapsedMs=%s",
        healthConnectUtil != null,
        visitStepSyncHelper != null,
        System.currentTimeMillis() - manualSyncStartedAt
      )
      rejectPromiseOnMainThread(promise, "SDK_NOT_INITIALIZED", "Health SDK is not initialized")
      return
    }

    if (isSyncInProgress) {
      Timber.d(
        "mytag: triggerManualSync() rejected. code=SYNC_IN_PROGRESS, elapsedMs=%s",
        System.currentTimeMillis() - manualSyncStartedAt
      )
      rejectPromiseOnMainThread(
        promise,
        "SYNC_IN_PROGRESS",
        "Health data sync is already in progress"
      )
      return
    }

    val baseUrl = visitSessionStorage.getBaseURL()
    val authToken = visitSessionStorage.getVisitAuthToken()
    val dailyLastSyncTimeStamp = visitSessionStorage.getDailyLastSyncTimestamp()
    val hourlyLastSyncTimestamp = visitSessionStorage.getHourlyLastSyncTimeStamp()

    Timber.d(
      "mytag: triggerManualSync() sync inputs loaded. baseUrl=%s, authTokenPresent=%s, dailyLastSyncTimeStamp=%s, hourlyLastSyncTimestamp=%s",
      baseUrl,
      !authToken.isNullOrBlank(),
      dailyLastSyncTimeStamp,
      hourlyLastSyncTimestamp
    )

    if (baseUrl.isNullOrBlank() || authToken.isNullOrBlank()) {
      Timber.d(
        "mytag: triggerManualSync() rejected. code=MISSING_SYNC_CREDENTIALS, baseUrlPresent=%s, authTokenPresent=%s, elapsedMs=%s",
        !baseUrl.isNullOrBlank(),
        !authToken.isNullOrBlank(),
        System.currentTimeMillis() - manualSyncStartedAt
      )
      rejectPromiseOnMainThread(
        promise,
        "MISSING_SYNC_CREDENTIALS",
        "Visit sync base URL or auth token is missing"
      )
      return
    }

    if (dailyLastSyncTimeStamp < 0 || hourlyLastSyncTimestamp < 0) {
      Timber.d(
        "mytag: triggerManualSync() rejected. code=MISSING_SYNC_TIMESTAMPS, dailyLastSyncTimeStamp=%s, hourlyLastSyncTimestamp=%s, elapsedMs=%s",
        dailyLastSyncTimeStamp,
        hourlyLastSyncTimestamp,
        System.currentTimeMillis() - manualSyncStartedAt
      )
      rejectPromiseOnMainThread(
        promise,
        "MISSING_SYNC_TIMESTAMPS",
        "Visit sync timestamps are missing"
      )
      return
    }

    Timber.d(
      "mytag: triggerManualSync() dispatching sendDataToVisitServer. baseUrl=%s, dailyLastSyncTimeStamp=%s, hourlyLastSyncTimestamp=%s",
      baseUrl,
      dailyLastSyncTimeStamp,
      hourlyLastSyncTimestamp
    )
    isSyncInProgress = true
    visitStepSyncHelper.sendDataToVisitServer(
      healthConnectUtil = healthConnectUtil,
      googleFitLastSync = dailyLastSyncTimeStamp,
      gfHourlyLastSync = hourlyLastSyncTimestamp,
      visitBaseUrl = baseUrl,
      visitAuthToken = authToken,
      onSuccess = { message ->
        isSyncInProgress = false
        Timber.d(
          "mytag: triggerManualSync() succeeded. elapsedMs=%s, message=%s",
          System.currentTimeMillis() - manualSyncStartedAt,
          message
        )
        resolvePromiseOnMainThread(promise, message)
      },
      onFailure = { reason ->
        isSyncInProgress = false
        Timber.d(
          "mytag: triggerManualSync() failed. elapsedMs=%s, reason=%s",
          System.currentTimeMillis() - manualSyncStartedAt,
          reason
        )
        rejectPromiseOnMainThread(promise, "SYNC_FAILED", reason)
      }
    )
  }

  private fun normalizeBaseUrl(baseUrl: String): String {
    val trimmedBaseUrl = baseUrl.trim()
    return if (trimmedBaseUrl.endsWith("/")) trimmedBaseUrl else "$trimmedBaseUrl/"
  }

  private fun resolvePromiseOnMainThread(promise: Promise?, value: String) {
    Handler(Looper.getMainLooper()).post {
      promise?.resolve(value)
    }
  }

  private fun rejectPromiseOnMainThread(promise: Promise?, code: String, message: String) {
    Handler(Looper.getMainLooper()).post {
      promise?.reject(code, message)
    }
  }

  private fun handlePermissionResult(granted: Set<String>?) {
    Timber.d("handlePermissionResult: result: %s", granted)

    val healthConnectUtil = healthConnectUtil
    if (granted == null || healthConnectUtil == null) {
      Timber.d("Lack of required permissions")
      healthConnectUtil?.checkPermissionsAndRunForStar(true)
      return
    }

    if (granted.containsAll(healthConnectUtil.PERMISSIONS)) {
      previouslyRevoked = false
      Timber.d("Permissions successfully granted")
    } else {
      Timber.d("Lack of required permissions")
    }

    healthConnectUtil.checkPermissionsAndRunForStar(true)
  }

  private fun getOrCreatePermissionLauncher(
    activity: Activity
  ): ActivityResultLauncher<Set<String>>? {
    val existingLauncher = requestPermissionsLauncher
    if (existingLauncher != null && requestPermissionsLauncherActivity === activity) {
      return existingLauncher
    }

    val registryOwner = activity as? ActivityResultRegistryOwner ?: return null
    requestPermissionsLauncher?.unregister()

    requestPermissionsLauncher =
      registryOwner.activityResultRegistry.register(
        "visit-rn-sdk-health-connect-permissions-${System.identityHashCode(this)}",
        requestPermissionActivityContract
      ) { granted ->
        handlePermissionResult(granted)
      }
    requestPermissionsLauncherActivity = activity

    return requestPermissionsLauncher
  }

  private fun currentActivityOrCached(): Activity? {
    val activity = reactApplicationContext.currentActivity
    if (activity != null) {
      mainActivity = activity
    }
    return activity ?: mainActivity
  }

  private fun configureTimber(loggingEnabled: Boolean) {
    if (loggingEnabled && Timber.forest().isEmpty()) {
      Timber.plant(Timber.DebugTree())
    }
  }

  override fun invalidate() {
    requestPermissionsLauncher?.unregister()
    requestPermissionsLauncher = null
    requestPermissionsLauncherActivity = null
    super.invalidate()
  }
}
