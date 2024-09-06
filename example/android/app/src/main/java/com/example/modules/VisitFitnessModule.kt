package com.example.modules

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.example.MainActivity
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.getvisitapp.google_fit.HealthConnectListener
import com.getvisitapp.google_fit.data.VisitStepSyncHelper
import com.getvisitapp.google_fit.healthConnect.OnActivityResultImplementation
import com.getvisitapp.google_fit.healthConnect.activity.HealthConnectUtil
import com.getvisitapp.google_fit.healthConnect.contants.Contants
import com.getvisitapp.google_fit.healthConnect.enums.HealthConnectConnectionState
import kotlinx.coroutines.launch
import timber.log.Timber


/**
 * successCallback is used only when requesting the graph data.
 * promise is used for everything else
 */
class VisitFitnessModule(reactContext: ReactApplicationContext?) :
    ReactContextBaseJavaModule(reactContext), HealthConnectListener {
    var TAG: String = "mytag"


    private val reactContext: ReactContext? = reactContext

    lateinit var promise: Promise
    lateinit var successCallback: Callback
    var isLoggingEnabled: Boolean = false

    lateinit var visitStepSyncHelper: VisitStepSyncHelper
    lateinit var healthConnectUtil: HealthConnectUtil
    var syncDataWithServer: Boolean = false
    lateinit var mainActivity: MainActivity


    init {
        Log.d(TAG, "GoogleFitPermissionModule: inside constructor")
    }


    @ReactMethod
    fun initiateSDK(isLoggingEnabled: Boolean) {
        Timber.d("mytag: initiateSDK $isLoggingEnabled")

        this.isLoggingEnabled = isLoggingEnabled


        mainActivity = (reactContext!!.currentActivity!! as MainActivity)
        visitStepSyncHelper = VisitStepSyncHelper(mainActivity)
        healthConnectUtil = HealthConnectUtil(mainActivity, this)
        healthConnectUtil.initialize()




        mainActivity.onActivityResultImplementation =
            object : OnActivityResultImplementation<Set<String>, Set<String>> {
                override fun execute(granted: Set<String>): Set<String> {
                    Timber.d("onActivityResultImplementation execute: result: $granted")

                    if (granted.containsAll(healthConnectUtil.PERMISSIONS)) {
                        Contants.previouslyRevoked = false

                        Timber.d("Permissions successfully granted")
                        healthConnectUtil.scope.launch {
                            healthConnectUtil.checkPermissionsAndRun(afterRequestingPermission = true)
                        }

                    } else {
                        Timber.d(" Lack of required permissions")

                        //Currently the Health Connect SDK, only asks for the remaining permission was the NOT granted in the first time, and when it return,
                        //it also send the granted permission (and not the permission that was previously granted), so the control flow comes inside the else statement.
                        //So we need to check for permission again.
                        healthConnectUtil.scope.launch {
                            healthConnectUtil.checkPermissionsAndRun(afterRequestingPermission = true)
                        }
                    }
                    return granted
                }
            }




        Timber.d("mytag: initiateSDK() called")
    }

    @ReactMethod
    fun getHealthConnectStatus(promise: Promise) {
        this.promise = promise
        if (healthConnectUtil.healthConnectConnectionState == HealthConnectConnectionState.NOT_SUPPORTED) {
            promise.resolve("NOT_SUPPORTED")
        } else if (healthConnectUtil.healthConnectConnectionState == HealthConnectConnectionState.NOT_INSTALLED) {
            promise.resolve("NOT_INSTALLED")
        } else if (healthConnectUtil.healthConnectConnectionState == HealthConnectConnectionState.INSTALLED) {
            promise.resolve("INSTALLED")
        } else {
            promise.resolve(healthConnectUtil.healthConnectConnectionState.name)
        }
    }


    @ReactMethod
    fun askForFitnessPermission(promise: Promise) {
        this.promise = promise
        if (healthConnectUtil.healthConnectConnectionState == HealthConnectConnectionState.CONNECTED) {
            Timber.d("askForFitnessPermission: already granted")
            promise.resolve("GRANTED")
        } else {
            Timber.d("askForFitnessPermission: request permission")
            healthConnectUtil.requestPermission()
        }
    }


    override fun userAcceptedHealthConnectPermission() {
        Timber.d("userAcceptedHealthConnectPermission")

        promise.resolve("GRANTED")
    }

    override fun userDeniedHealthConnectPermission() {
        Timber.d("userDeniedHealthConnectPermission")

        promise.reject("CANCELLED", "Google Permission was Denied")
    }

    @ReactMethod
    fun requestDailyFitnessData(successCallback: Callback) {
        this.successCallback = successCallback

        if (healthConnectUtil.healthConnectConnectionState == HealthConnectConnectionState.CONNECTED) {
            healthConnectUtil.getVisitDashboardGraph()
        }
    }

    @ReactMethod
    fun requestActivityDataFromHealthConnect(
        type: String,
        frequency: String,
        timestamp: Double,
        successCallback: Callback
    ) {
        this.successCallback = successCallback
        Timber.d("mytag: requestActivityData() called.")

        //Health Connect Implementation
        healthConnectUtil.getActivityData(type, frequency, Math.round(timestamp))
    }

    @ReactMethod
    fun updateApiBaseUrl(
        apiBaseUrl: String,
        authToken: String,
        googleFitLastSync: Double,
        gfHourlyLastSync: Double
    ) {

        if (isLoggingEnabled) {
            Log.d(
                "mytag",
                "GoogleFitPermissionModule syncDataWithServer(): baseUrl: " + apiBaseUrl + " authToken: " + authToken +
                        " googleFitLastSync: " + googleFitLastSync + "  gfHourlyLastSync:" + gfHourlyLastSync
            )
        }

        if (!syncDataWithServer) {
            Timber.d("mytag: syncDataWithServer() called")

            visitStepSyncHelper!!.sendDataToVisitServer(
                healthConnectUtil,
                Math.round(googleFitLastSync),
                Math.round(gfHourlyLastSync),
                apiBaseUrl + "/",
                authToken
            )

            syncDataWithServer = true
        }
    }

    @ReactMethod
    fun openHraLink(link: String) {
        try {
            val i = Intent(Intent.ACTION_VIEW)
            i.setData(Uri.parse(link))
            mainActivity.startActivity(i)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun fetchDailyFitnessData(timestamp: Double, promise: Promise) {
        this.promise = promise
        //TODO: to be implemented in the future.
    }

    @ReactMethod
    fun fetchHourlyFitnessData(timestamp: Double, promise: Promise) {
        this.promise = promise
        //TODO: to be implemented in the future.
    }

    override fun getName(): String {
        return "VisitFitnessModule"
    }


    override fun loadVisitWebViewGraphData(webString: String) {
        Handler(Looper.getMainLooper()).post {
            if (isLoggingEnabled) {
                Log.d("mytag", "loadVisitWebViewGraphData: $webString")
            }
            successCallback!!.invoke(webString)
        }
    }

    override fun requestPermission() {
        Timber.d("requestPermission called 218")
        mainActivity.requestPermissions.launch(healthConnectUtil.PERMISSIONS)
    }

    override fun updateHealthConnectConnectionStatus(
        healthConnectConnectionState: HealthConnectConnectionState,
        s: String
    ) {
        Timber.d("updateHealthConnectConnectionStatus: $healthConnectConnectionState")

        when (healthConnectConnectionState) {
            HealthConnectConnectionState.CONNECTED -> {

            }

            HealthConnectConnectionState.NOT_SUPPORTED -> {

            }

            HealthConnectConnectionState.NOT_INSTALLED -> {

            }

            HealthConnectConnectionState.INSTALLED -> {

            }

            HealthConnectConnectionState.NONE -> {

            }
        }
    }
}
