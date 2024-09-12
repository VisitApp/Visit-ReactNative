package com.example.modules;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Keep;

import com.example.MainActivity;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.getvisitapp.google_fit.HealthConnectListener;
import com.getvisitapp.google_fit.data.VisitStepSyncHelper;
import com.getvisitapp.google_fit.healthConnect.OnActivityResultImplementation;
import com.getvisitapp.google_fit.healthConnect.activity.HealthConnectUtil;
import com.getvisitapp.google_fit.healthConnect.contants.Contants;
import com.getvisitapp.google_fit.healthConnect.enums.HealthConnectConnectionState;

import java.util.Set;

import timber.log.Timber;

@Keep
public class VisitFitnessModule extends ReactContextBaseJavaModule implements HealthConnectListener {

  private final String TAG = "mytag";
  private final ReactContext reactContext;

  private Promise promise;
  private Callback successCallback;
  private boolean isLoggingEnabled = false;

  private VisitStepSyncHelper visitStepSyncHelper;
  private HealthConnectUtil healthConnectUtil;
  private boolean syncDataWithServer = false;
  private MainActivity mainActivity;

  public VisitFitnessModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    Log.d(TAG, "GoogleFitPermissionModule: inside constructor");
  }

  @ReactMethod
  public void initiateSDK(boolean isLoggingEnabled) {
    Timber.d("mytag: initiateSDK %b", isLoggingEnabled);

    this.isLoggingEnabled = isLoggingEnabled;
    mainActivity = (MainActivity) reactContext.getCurrentActivity();
    visitStepSyncHelper = new VisitStepSyncHelper(mainActivity);
    healthConnectUtil = new HealthConnectUtil(mainActivity, this);
    healthConnectUtil.initialize();

    mainActivity.setOnActivityResultImplementation(new OnActivityResultImplementation<Set<String>, Set<String>>() {
      @Override
      public Set<String> execute(Set<String> granted) {
        Timber.d("onActivityResultImplementation execute: result: %s", granted);

        if (granted.containsAll(healthConnectUtil.getPERMISSIONS())) {
          Contants.INSTANCE.setPreviouslyRevoked(false);


          Timber.d("Permissions successfully granted");
          healthConnectUtil.checkPermissionsAndRunForStar(true);

        } else {
          Timber.d("Lack of required permissions");
          healthConnectUtil.checkPermissionsAndRunForStar(true);
        }
        return granted;
      }
    });

    Timber.d("mytag: initiateSDK() called");
  }

  @ReactMethod
  public void getHealthConnectStatus(Promise promise) {
    this.promise = promise;
    if (healthConnectUtil.getHealthConnectConnectionState() == HealthConnectConnectionState.NOT_SUPPORTED) {
      promise.resolve("NOT_SUPPORTED");
    } else if (healthConnectUtil.getHealthConnectConnectionState() == HealthConnectConnectionState.NOT_INSTALLED) {
      promise.resolve("NOT_INSTALLED");
    } else if (healthConnectUtil.getHealthConnectConnectionState() == HealthConnectConnectionState.INSTALLED) {
      promise.resolve("INSTALLED");
    } else {
      promise.resolve(healthConnectUtil.getHealthConnectConnectionState().name());
    }
  }

  @ReactMethod
  public void askForFitnessPermission(Promise promise) {
    this.promise = promise;
    if (healthConnectUtil.getHealthConnectConnectionState() == HealthConnectConnectionState.CONNECTED) {
      Timber.d("askForFitnessPermission: already granted");
      promise.resolve("GRANTED");
    } else {
      Timber.d("askForFitnessPermission: request permission");
      healthConnectUtil.requestPermission();
    }
  }

  @Override
  public void userAcceptedHealthConnectPermission() {
    Timber.d("userAcceptedHealthConnectPermission");
    promise.resolve("GRANTED");
  }

  @Override
  public void userDeniedHealthConnectPermission() {
    Timber.d("userDeniedHealthConnectPermission");
    promise.reject("CANCELLED", "Google Permission was Denied");
  }

  @ReactMethod
  public void requestDailyFitnessData(Callback successCallback) {
    this.successCallback = successCallback;

    if (healthConnectUtil.getHealthConnectConnectionState() == HealthConnectConnectionState.CONNECTED) {
      healthConnectUtil.getVisitDashboardGraph();
    }
  }

  @ReactMethod
  public void requestActivityDataFromHealthConnect(String type, String frequency, double timestamp, Callback successCallback) {
    this.successCallback = successCallback;
    Timber.d("mytag: requestActivityData() called.");
    healthConnectUtil.getActivityData(type, frequency, Math.round(timestamp));
  }

  @ReactMethod
  public void updateApiBaseUrl(String apiBaseUrl, String authToken, double googleFitLastSync, double gfHourlyLastSync) {
    if (isLoggingEnabled) {
      Log.d("mytag", "GoogleFitPermissionModule syncDataWithServer(): baseUrl: " + apiBaseUrl + " authToken: " + authToken +
        " googleFitLastSync: " + googleFitLastSync + "  gfHourlyLastSync:" + gfHourlyLastSync);
    }

    if (!syncDataWithServer) {
      Timber.d("mytag: syncDataWithServer() called");
      visitStepSyncHelper.sendDataToVisitServer(healthConnectUtil, Math.round(googleFitLastSync), Math.round(gfHourlyLastSync),
        apiBaseUrl + "/", authToken);
      syncDataWithServer = true;
    }
  }

  @ReactMethod
  public void openHraLink(String link) {
    try {
      Intent i = new Intent(Intent.ACTION_VIEW);
      i.setData(Uri.parse(link));
      mainActivity.startActivity(i);
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @ReactMethod
  public void fetchDailyFitnessData(double timestamp, Promise promise) {
    this.promise = promise;
    // TODO: to be implemented in the future.
  }

  @ReactMethod
  public void fetchHourlyFitnessData(double timestamp, Promise promise) {
    this.promise = promise;
    // TODO: to be implemented in the future.
  }

  @Override
  public String getName() {
    return "VisitFitnessModule";
  }

  @Override
  public void loadVisitWebViewGraphData(final String webString) {
    new Handler(Looper.getMainLooper()).post(() -> {
      if (isLoggingEnabled) {
        Log.d("mytag", "loadVisitWebViewGraphData: " + webString);
      }
      successCallback.invoke(webString);
    });
  }

  @Override
  public void requestPermission() {
    Timber.d("requestPermission called 218");
    mainActivity.getRequestPermissions().launch(healthConnectUtil.getPERMISSIONS());
  }

  @Override
  public void updateHealthConnectConnectionStatus(HealthConnectConnectionState healthConnectConnectionState, String s) {
    Timber.d("updateHealthConnectConnectionStatus: %s", healthConnectConnectionState);

    switch (healthConnectConnectionState) {
      case CONNECTED:
        break;
      case NOT_SUPPORTED:
        break;
      case NOT_INSTALLED:
        break;
      case INSTALLED:
        break;
      case NONE:
        break;
    }
  }
}
