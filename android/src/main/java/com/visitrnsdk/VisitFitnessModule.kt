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
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.getvisitapp.visit.HealthConnectListener
import com.getvisitapp.visit.data.VisitStepSyncHelper
import com.getvisitapp.visit.healthConnect.TimeUtil
import com.getvisitapp.visit.healthConnect.activity.HealthConnectUtil
import com.getvisitapp.visit.healthConnect.contants.Contants.previouslyRevoked
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.CONNECTED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.INSTALLED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NONE
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NOT_INSTALLED
import com.getvisitapp.visit.healthConnect.enums.HealthConnectConnectionState.NOT_SUPPORTED
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
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

  private val documentScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var permissionPromise: Promise? = null
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
  fun getHealthConnectStatus(promise: Promise) {
    val util = healthConnectUtil
    if (util == null) {
      promise.reject("SDK_NOT_INITIALIZED", "Initialize the SDK before checking Health Connect")
      return
    }
    util.scope.launch {
      try {
        promise.resolve(util.checkAvailability().name)
      } catch (error: CancellationException) {
        throw error
      } catch (error: Exception) {
        promise.reject("HEALTH_CONNECT_STATUS_ERROR", error)
      }
    }
  }

  @ReactMethod
  fun askForFitnessPermission(promise: Promise) {
    val util = healthConnectUtil
    if (util == null) {
      promise.reject("SDK_NOT_INITIALIZED", "Initialize the SDK before connecting Health Connect")
      return
    }

    util.scope.launch {
      try {
        val status = util.checkAvailability()
        withContext(Dispatchers.Main) {
          when (status) {
            CONNECTED -> promise.resolve("GRANTED")
            INSTALLED -> {
              if (permissionPromise == null) {
                permissionPromise = promise
                util.requestPermission()
              } else {
                promise.reject("PERMISSION_IN_PROGRESS", "Health Connect permissions are already open")
              }
            }
            NOT_INSTALLED -> {
              util.requestPermission()
              promise.resolve(status.name)
            }
            NOT_SUPPORTED, NONE -> promise.resolve(status.name)
          }
        }
      } catch (error: CancellationException) {
        throw error
      } catch (error: Exception) {
        promise.reject("HEALTH_CONNECT_PERMISSION_ERROR", error)
      }
    }
  }

  override fun userAcceptedHealthConnectPermission() = finishPermissionRequest("GRANTED")

  override fun userDeniedHealthConnectPermission() = finishPermissionRequest("CANCELLED")

  private fun finishPermissionRequest(result: String) {
    Handler(Looper.getMainLooper()).post {
      val pending = permissionPromise
      permissionPromise = null
      pending?.resolve(result)
    }
  }

  @ReactMethod
  fun requestDailyFitnessData(promise: Promise) {
    loadHealthConnectGraph(promise) { it.loadDashboardGraph() }
  }

  @ReactMethod
  fun requestActivityDataFromHealthConnect(
    type: String?, frequency: String?, timestamp: Double, promise: Promise
  ) {
    loadHealthConnectGraph(promise, requestPermissionIfDisconnected = true) {
      it.loadActivityGraph(type, frequency, Math.round(timestamp))
    }
  }

  private fun loadHealthConnectGraph(
    promise: Promise,
    requestPermissionIfDisconnected: Boolean = false,
    loadGraph: suspend (HealthConnectUtil) -> String?
  ) {
    val util = healthConnectUtil
    if (util == null) {
      promise.reject("SDK_NOT_INITIALIZED", "Initialize the SDK before loading Health Connect data")
      return
    }

    util.scope.launch {
      try {
        if (util.healthConnectConnectionState == CONNECTED) {
          promise.resolve(loadGraph(util))
        } else {
          if (requestPermissionIfDisconnected) {
            withContext(Dispatchers.Main) {
              if (permissionPromise == null) util.requestPermission()
            }
          }
          promise.resolve(null)
        }
      } catch (error: CancellationException) {
        throw error
      } catch (error: Exception) {
        promise.reject("HEALTH_CONNECT_GRAPH_ERROR", error)
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
    if (!::visitSessionStorage.isInitialized) {
      promise?.resolve("Health SDK Not Initialized")
      return
    }

    val normalizedBaseUrl = normalizeBaseUrl(apiBaseUrl)
    val sessionChanged = visitSessionStorage.getBaseURL() != normalizedBaseUrl ||
      visitSessionStorage.getVisitAuthToken() != authToken
    val dailyCursor = if (googleFitLastSync >= 0) Math.round(googleFitLastSync)
      else if (sessionChanged) 0L else visitSessionStorage.getDailyLastSyncTimestamp().coerceAtLeast(0)
    val hourlyCursor = if (gfHourlyLastSync >= 0) Math.round(gfHourlyLastSync)
      else if (sessionChanged) 0L else visitSessionStorage.getHourlyLastSyncTimeStamp().coerceAtLeast(0)
    visitSessionStorage.saveBaseUrl(normalizedBaseUrl)
    visitSessionStorage.saveVisitAuthToken(authToken)
    visitSessionStorage.saveDailyLastSyncTimeStamp(dailyCursor)
    visitSessionStorage.saveHourlyLastSyncTimeStamp(hourlyCursor)
    if (sessionChanged) syncDataWithServer = false
    if (dailyCursor == 0L && hourlyCursor == 0L) {
      promise?.resolve("Health Sync Configuration Updated")
      return
    }

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
    if (isLoggingEnabled) Timber.d("Health Connect graph data delivered to legacy listener")
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
  fun getTodayCaloriesForWeb(promise: Promise) {
    val util = healthConnectUtil
    if (util == null) {
      promise.resolve(null)
      return
    }
    util.scope.launch {
      try {
        if (util.checkAvailability() != CONNECTED) {
          promise.resolve(null)
          return@launch
        }
        val (start, end) = TimeUtil.getTodayElapsedTimeRangeInstant()
        val metric = TotalCaloriesBurnedRecord.ENERGY_TOTAL
        val result = HealthConnectClient.getOrCreate(reactApplicationContext).aggregate(
          AggregateRequest(setOf(metric), TimeRangeFilter.between(start, end))
        )
        promise.resolve(result[metric]?.inKilocalories?.toInt())
      } catch (error: CancellationException) {
        throw error
      } catch (error: Exception) {
        promise.reject("CALORIE_QUERY_FAILED", error)
      }
    }
  }

  @ReactMethod
  fun downloadAndShare(link: String, authToken: String?, promise: Promise) {
    documentScope.launch {
      val share = VisitDocumentShare(reactApplicationContext)
      var file: java.io.File? = null
      try {
        val (downloaded, mimeType) = share.download(link, authToken)
        file = downloaded
        withContext(Dispatchers.Main) {
          val activity = checkNotNull(currentActivityOrCached())
          share.share(activity, downloaded, mimeType)
        }
        promise.resolve(null)
      } catch (error: CancellationException) {
        file?.delete()
        throw error
      } catch (error: Exception) {
        file?.delete()
        promise.reject("DOCUMENT_SHARE_FAILED", "The document could not be shared.")
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
    documentScope.cancel()
    requestPermissionsLauncher?.unregister()
    requestPermissionsLauncher = null
    requestPermissionsLauncherActivity = null
    super.invalidate()
  }
}
