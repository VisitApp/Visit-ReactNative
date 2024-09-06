package com.example

import android.content.Intent
import androidx.activity.result.contract.ActivityResultContract
import androidx.health.connect.client.PermissionController
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.concurrentReactEnabled
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.getvisitapp.google_fit.healthConnect.OnActivityResultImplementation
import timber.log.Timber

class MainActivity : ReactActivity() {

    private val requestPermissionActivityContract: ActivityResultContract<Set<String>, Set<String>> =
        PermissionController.createRequestPermissionResultContract()

    var onActivityResultImplementation: OnActivityResultImplementation<Set<String>, Set<String>>? =
        null

    val requestPermissions =
        registerForActivityResult(requestPermissionActivityContract) { granted: Set<String> ->

            Timber.d("requestPermissions registerForActivityResult: $granted")

            onActivityResultImplementation?.execute(granted)
        }



    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String? {
        return "example"
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [ ] which allows you to easily enable Fabric and Concurrent React
     * (aka React 18) with two boolean flags.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName!!,  // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            fabricEnabled,  // fabricEnabled
            // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
            concurrentReactEnabled // concurrentRootEnabled
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {

        Timber.d("MainActivity requestCode: $resultCode, resultCode: $resultCode, data:$data")

        super.onActivityResult(requestCode, resultCode, data)

    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {

        Timber.d(
            "MainActivity requestCode: $requestCode,\n" +
                    "    permissions: $permissions,\n" +
                    "    grantResults: $grantResults"
        )



        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

    }
}
