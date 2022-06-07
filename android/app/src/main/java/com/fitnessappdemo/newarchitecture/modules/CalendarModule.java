package com.fitnessappdemo.newarchitecture.modules;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Map;
import java.util.Random;

public class CalendarModule extends ReactContextBaseJavaModule {

    public CalendarModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "CalendarModule";
    }

    //callback style
//    @ReactMethod
//    public void createCalendarEvent(String name, String location, Callback myFailureCallback, Callback mySuccessCallback) {
//
//        Integer eventId= new Random().nextInt();
//
//        Log.d("CalendarModule", "Create event called with name: " + name
//                + " and location: " + location);
//
//        mySuccessCallback.invoke(eventId);
//    }


    //promise style
    @ReactMethod
    public void createCalendarEvent(String name, String location, Promise promise) {


        Log.d("CalendarModule", "Create event called with name: " + name
                + " and location: " + location);

        try {
            Integer eventId = new Random().nextInt();
            promise.resolve(eventId);
        } catch (Exception e) {
            promise.reject("Create Event error", "Error parsing date", e);
        }
    }



    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        return super.getConstants();
    }




}