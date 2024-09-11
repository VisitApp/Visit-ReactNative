package com.example;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContract;
import androidx.health.connect.client.PermissionController;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.getvisitapp.google_fit.healthConnect.OnActivityResultImplementation;

import java.util.Set;

import timber.log.Timber;

public class MainActivity extends ReactActivity {

  private final ActivityResultContract<Set<String>, Set<String>> requestPermissionActivityContract =
    PermissionController.createRequestPermissionResultContract();

  public OnActivityResultImplementation<Set<String>, Set<String>> onActivityResultImplementation = null;

  public final ActivityResultLauncher<Set<String>> requestPermissions =
    registerForActivityResult(requestPermissionActivityContract, granted -> {
      Timber.d("requestPermissions registerForActivityResult: %s", granted);
      if (onActivityResultImplementation != null) {
        onActivityResultImplementation.execute(granted);
      }
    });

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "example";
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flag [fabricEnabled].
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(this, getMainComponentName(), fabricEnabled());
  }

  private boolean fabricEnabled() {
    // Return true or false based on your configuration.
    return true;
  }
}
