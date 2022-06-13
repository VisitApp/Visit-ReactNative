package com.fitnessappdemo.newarchitecture.modules;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.getvisitapp.google_fit.data.GoogleFitStatusListener;
import com.getvisitapp.google_fit.data.GoogleFitUtil;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.fitness.FitnessOptions;

public class GoogleFitPermissionModule extends ReactContextBaseJavaModule implements GoogleFitStatusListener {

    String TAG = "mytag";


    private ReactContext reactContext;


    private GoogleFitUtil googleFitUtil;

    private Promise promise;
    private Callback successCallback;

    public GoogleFitPermissionModule(@Nullable ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        // Add the listener for `onActivityResult`
        reactContext.addActivityEventListener(mActivityEventListener);
        Log.d(TAG, "GoogleFitPermissionModule: inside constructor");
    }


    @ReactMethod
    public void initiateSDK(String defaultWebClientId, String baseUrl) {
        Log.d(TAG, "default client id:" + defaultWebClientId + " baseUrl: " + baseUrl);
        googleFitUtil = new GoogleFitUtil(reactContext.getCurrentActivity(), this, defaultWebClientId, baseUrl);
        googleFitUtil.init();
    }

    @ReactMethod
    public void askForFitnessPermission(final Promise promise) {
        this.promise = promise;
        googleFitUtil.askForGoogleFitPermission();

    }

    @ReactMethod
    public void requestDailyFitnessData(Callback successCallback) {
        this.successCallback = successCallback;
        googleFitUtil.fetchDataFromFit();
    }

    @ReactMethod
    public void requestActivityDataFromGoogleFit(String type, String frequency, double timestamp, Callback successCallback) {
        this.successCallback = successCallback;
        requestActivityData(type, frequency, Math.round(timestamp));
    }


    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {

        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {

            Log.d(TAG, "onActivityResult: requestCode:" + requestCode + ", resultCode:" + resultCode);
            if (promise != null) {
                googleFitUtil.onActivityResult(requestCode, resultCode, intent);
            }

        }
    };


    @NonNull
    @Override
    public String getName() {
        return "GoogleFitPermissionModule";
    }

    @Override
    public void askForPermissions() {

    }

    @Override
    public void onFitnessPermissionGranted() {
        promise.resolve("GRANTED");
        googleFitUtil.fetchDataFromFit();

        //TODO replace this with web callback and move it to syncDataWithServer()

//        syncDataWithServer("https://api.samuraijack.xyz/v3", "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ1MjM3LCJwbGF0Zm9ybSI6IlNUQVItSEVBTFRIIiwidXNlclR5cGUiOiJ1c2VyIiwiaWF0IjoxNjU0NTk0ODE3LCJleHAiOjE2ODYxMzA4MTd9.SPtQ5_Tfo228C32K2HpItWezzZwvHGJ4Kv1v4kodYoA",
//                1650220200000L, 1650220200688L);
    }

    @Override
    public void loadGraphData(String s) {
        Log.d("mytag", "loadGraphDataUrl: " + s);
        successCallback.invoke(s);
    }

    @Override
    public void onFitnessPermissionCancelled() {
        promise.reject("CANCELLED", "Google Permission was cancelled");
    }

    @Override
    public void onFitnessPermissionDenied() {
        promise.reject("CANCELLED", "Google Permission was Denied");
    }


    @Override
    public void requestActivityData(String type, String frequency, long timestamp) {
        googleFitUtil.getActivityData(type, frequency, timestamp);
    }

    @Override
    public void loadDailyFitnessData(long steps, long sleep) {
        String finalString = "window.updateFitnessPermissions(true," + steps + "," + sleep + ")";
        Log.d("mytag", "loadDailyFitnessData() called: finalString :" + finalString);
        successCallback.invoke(finalString);
    }


    @Override
    public void syncDataWithServer(String baseUrl, String authToken, long googleFitLastSync, long gfHourlyLastSync) {
        googleFitUtil.sendDataToServer(
                baseUrl + "/",
                authToken,
                googleFitLastSync,
                gfHourlyLastSync
        );
    }

    @Override
    public void askForLocationPermission() {

    }

    @Override
    public void closeVisitPWA() {

    }
}
