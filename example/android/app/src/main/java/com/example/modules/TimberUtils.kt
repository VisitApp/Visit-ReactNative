package com.example.modules

import com.reactnative.BuildConfig
import timber.log.Timber

object TimberUtils {

    @JvmStatic
    fun configTimber() {
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        }
    }
}
