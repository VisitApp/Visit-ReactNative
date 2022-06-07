package com.fitnessappdemo.newarchitecture.modules;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.getvisitapp.google_fit.FitnessPermissionListener;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.Scopes;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.fitness.Fitness;
import com.google.android.gms.fitness.FitnessOptions;
import com.google.android.gms.fitness.data.DataType;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;

public class GoogleFitPermissionModule extends ReactContextBaseJavaModule {

    String TAG = "mytag";

    private static final int REQUEST_OAUTH_REQUEST_CODE = 0x1001;
    private static final int GM_SIGN_IN = 1900;

    private GoogleSignInClient mGoogleSignInClient;
    private GoogleSignInAccount googleSignInAccount;
    FitnessOptions fitnessOptions;

    private ReactContext reactContext;

    private Promise promise;



    public GoogleFitPermissionModule(@Nullable ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        // Add the listener for `onActivityResult`
        reactContext.addActivityEventListener(mActivityEventListener);
        Log.d(TAG, "GoogleFitPermissionModule: inside constructor");
    }



    private GoogleSignInAccount handleGoogleSignIn(Intent data) {
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            return googleSignInAccount = task.getResult(ApiException.class);

        } catch (ApiException e) {
            e.printStackTrace();
            Log.w(TAG, "signInResult:failed code=" + e.getMessage());
        }
        return null;
    }

    @ReactMethod
    public void intiateGoogleFitPermission(String defaultWebClientId, final Promise promise) {

        Log.d(TAG, "default client id:" + defaultWebClientId);

        this.promise = promise;
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestScopes(new Scope(Scopes.EMAIL),
                        new Scope(Scopes.PROFILE),
                        new Scope(Scopes.PLUS_ME),
                        new Scope(Scopes.FITNESS_ACTIVITY_READ_WRITE),
                        new Scope(Scopes.FITNESS_LOCATION_READ_WRITE),
                        new Scope(Scopes.FITNESS_BODY_READ_WRITE))
                .requestServerAuthCode(defaultWebClientId, false)
                .requestIdToken(defaultWebClientId)
                .build();

        googleSignInAccount = GoogleSignIn.getLastSignedInAccount(reactContext);

        if (googleSignInAccount != null) {
            Log.d(TAG, "googleSignInAccount:" + googleSignInAccount.getEmail());
            mGoogleSignInClient = GoogleSignIn.getClient(reactContext, gso);
            askFitnessPermissions(googleSignInAccount, true);
        } else {
            mGoogleSignInClient = GoogleSignIn.getClient(reactContext, gso);
            mGoogleSignInClient.signOut();
            loginUsingGoogle();
        }

    }




    private void loginUsingGoogle() {
        Log.d(TAG, "loginUsingGoogle");
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        (reactContext.getCurrentActivity()).startActivityForResult(signInIntent, GM_SIGN_IN);

    }

    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {

        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {

            Log.d(TAG, "onActivityResult: requestCode:" + requestCode + ", resultCode:" + resultCode);
            if (promise != null) {
                if (resultCode == Activity.RESULT_OK) {
                    if (requestCode == REQUEST_OAUTH_REQUEST_CODE) {
                        Log.d(TAG, "onActivity result: google fit 1");
                        handleFitnessPermission();
                    }
                    if (requestCode == GM_SIGN_IN) {
                        Log.d(TAG, "onActivity result: google fit 2");
                        askFitnessPermissions(handleGoogleSignIn(intent), false);
                    }
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    promise.reject("CANCELLED", "Google Permission was cancelled");
                }
            }

        }
    };

    private void askFitnessPermissions(GoogleSignInAccount googleSignInAccount, boolean isLastSignedIn) {
        if (googleSignInAccount != null) {
            fitnessOptions = FitnessOptions.builder()
                    .addDataType(DataType.TYPE_STEP_COUNT_CUMULATIVE, FitnessOptions.ACCESS_WRITE)
                    .addDataType(DataType.TYPE_STEP_COUNT_CUMULATIVE, FitnessOptions.ACCESS_READ)

                    .addDataType(DataType.TYPE_ACTIVITY_SEGMENT, FitnessOptions.ACCESS_WRITE)
                    .addDataType(DataType.TYPE_ACTIVITY_SEGMENT, FitnessOptions.ACCESS_READ)

                    .addDataType(DataType.TYPE_STEP_COUNT_DELTA, FitnessOptions.ACCESS_READ)
                    .addDataType(DataType.TYPE_STEP_COUNT_DELTA, FitnessOptions.ACCESS_WRITE)

                    .addDataType(DataType.TYPE_WEIGHT, FitnessOptions.ACCESS_READ)
                    .addDataType(DataType.TYPE_WEIGHT, FitnessOptions.ACCESS_WRITE)

                    .addDataType(DataType.TYPE_HEIGHT, FitnessOptions.ACCESS_READ)
                    .addDataType(DataType.TYPE_HEIGHT, FitnessOptions.ACCESS_WRITE)

                    .addDataType(DataType.TYPE_LOCATION_SAMPLE, FitnessOptions.ACCESS_READ)
                    .addDataType(DataType.TYPE_LOCATION_SAMPLE, FitnessOptions.ACCESS_WRITE)

                    .addDataType(DataType.TYPE_DISTANCE_DELTA)
                    .addDataType(DataType.AGGREGATE_DISTANCE_DELTA)
                    .build();
            if (!GoogleSignIn.hasPermissions(googleSignInAccount, fitnessOptions)) {
                GoogleSignIn.requestPermissions(
                        reactContext.getCurrentActivity(),
                        REQUEST_OAUTH_REQUEST_CODE,
                        googleSignInAccount,
                        fitnessOptions);

            } else {
                handleFitnessPermission();
            }
        }
    }

    private void handleFitnessPermission() {
        //Log.d(TAG, "handleFitnessPermission: 1 : " + googleSignInAccount.getIdToken());
        //Log.d(TAG, "handleFitnessPermission: 2 : " + googleSignInAccount.getServerAuthCode());
        //Log.d(TAG, "handleFitnessPermission: 3 : " + googleSignInAccount.getGrantedScopes());

        promise.resolve("GRANTED");
        try {
            subscribe();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void subscribe() {

        Fitness.getRecordingClient(reactContext, GoogleSignIn.getAccountForExtension(reactContext, fitnessOptions))
                .subscribe(DataType.TYPE_STEP_COUNT_CUMULATIVE)
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        Log.d(TAG, " TYPE_STEP_COUNT_CUMULATIVE Existing subscription for activity detected.");
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        Log.d(TAG, "TYPE_STEP_COUNT_CUMULATIVE There was a problem subscribing.");
                    }
                });


        Fitness.getRecordingClient(reactContext, GoogleSignIn.getAccountForExtension(reactContext, fitnessOptions))
                .subscribe(DataType.TYPE_STEP_COUNT_DELTA)
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        Log.d(TAG, "TYPE_STEP_COUNT_DELTA Successfully subscribed!");
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        Log.d(TAG, "TYPE_STEP_COUNT_DELTA There was a problem subscribing.");
                    }
                });


        Fitness.getRecordingClient(reactContext, GoogleSignIn.getAccountForExtension(reactContext, fitnessOptions))
                .subscribe(DataType.TYPE_ACTIVITY_SEGMENT)
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        Log.d(TAG, "TYPE_ACTIVITY_SEGMENT Successfully subscribed!");
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        Log.d(TAG, "TYPE_ACTIVITY_SEGMENT There was a problem subscribing.");
                    }
                });
        Fitness.getRecordingClient(reactContext, googleSignInAccount)
                .subscribe(DataType.TYPE_STEP_COUNT_CUMULATIVE)
                .addOnCompleteListener(
                        new OnCompleteListener<Void>() {
                            @Override
                            public void onComplete(@NonNull Task<Void> task) {
                                if (task.isSuccessful()) {
                                    //Log.d(TAG, "Successfully subscribed!");
                                } else {
                                    //Log.d(TAG, "There was a problem subscribing.", task.getException());
                                }
                            }
                        })
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        //Log.d(TAG, "onSuccess: " + aVoid.toString());
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
//                        Crashlytics.logException(e);
                        e.printStackTrace();
                    }
                });


        Fitness.getRecordingClient(reactContext, googleSignInAccount)
                .subscribe(DataType.TYPE_ACTIVITY_SEGMENT)
                .addOnCompleteListener(
                        new OnCompleteListener<Void>() {
                            @Override
                            public void onComplete(@NonNull Task<Void> task) {
                                if (task.isSuccessful()) {
                                    //Log.d(TAG, "Successfully subscribed!");
                                } else {
                                    //Log.d(TAG, "There was a problem subscribing.", task.getException());
                                }
                            }
                        })
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        //Log.d(TAG, "onSuccess: " + aVoid.toString());
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
//                        Crashlytics.logException(e);
                        e.printStackTrace();
                    }
                });

        Fitness.getRecordingClient(reactContext, googleSignInAccount)
                .subscribe(DataType.TYPE_STEP_COUNT_DELTA)
                .addOnCompleteListener(
                        new OnCompleteListener<Void>() {
                            @Override
                            public void onComplete(@NonNull Task<Void> task) {
                                if (task.isSuccessful()) {
                                    //Log.d(TAG, "Successfully subscribed!");
                                } else {
                                    //Log.d(TAG, "There was a problem subscribing.", task.getException());
                                }
                            }
                        })
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        //Log.d(TAG, "onSuccess: " + aVoid.toString());
                    }
                })
                .addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
//                        Crashlytics.logException(e);
                        e.printStackTrace();
                    }
                });
    }

    public boolean hasAccess() {

        if (GoogleSignIn.getLastSignedInAccount(reactContext) != null) {
            FitnessOptions fitnessOptions =
                    FitnessOptions.builder()
                            .addDataType(DataType.TYPE_STEP_COUNT_CUMULATIVE, FitnessOptions.ACCESS_WRITE)
                            .addDataType(DataType.TYPE_STEP_COUNT_CUMULATIVE, FitnessOptions.ACCESS_READ)

                            .addDataType(DataType.TYPE_ACTIVITY_SEGMENT, FitnessOptions.ACCESS_WRITE)
                            .addDataType(DataType.TYPE_ACTIVITY_SEGMENT, FitnessOptions.ACCESS_READ)


                            .addDataType(DataType.TYPE_STEP_COUNT_DELTA, FitnessOptions.ACCESS_READ)
                            .addDataType(DataType.TYPE_STEP_COUNT_DELTA, FitnessOptions.ACCESS_WRITE)

                            .addDataType(DataType.TYPE_WEIGHT, FitnessOptions.ACCESS_READ)
                            .addDataType(DataType.TYPE_WEIGHT, FitnessOptions.ACCESS_WRITE)

                            .addDataType(DataType.TYPE_HEIGHT, FitnessOptions.ACCESS_READ)
                            .addDataType(DataType.TYPE_HEIGHT, FitnessOptions.ACCESS_WRITE)

                            .addDataType(DataType.TYPE_LOCATION_SAMPLE, FitnessOptions.ACCESS_READ)
                            .addDataType(DataType.TYPE_LOCATION_SAMPLE, FitnessOptions.ACCESS_WRITE)

                            .addDataType(DataType.TYPE_DISTANCE_DELTA)
                            .addDataType(DataType.AGGREGATE_DISTANCE_DELTA)
                            .build();
            if (!GoogleSignIn.hasPermissions(GoogleSignIn.getLastSignedInAccount(reactContext), fitnessOptions)) {
                return false;
            } else {
                return true;
            }
        } else return false;

    }


    @NonNull
    @Override
    public String getName() {
        return "GoogleFitPermissionModule";
    }
}
