# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ===========================
# React Native Core
# ===========================
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keep @com.facebook.jni.annotations.DoNotStrip class *

-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# ===========================
# Hermes & JNI
# ===========================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# ===========================
# Debug / Crash Reporting
# ===========================
# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep custom exceptions
-keep public class * extends java.lang.Exception

# Preserve annotations and signatures
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep BuildConfig
-keep class **.BuildConfig { *; }

# ===========================
# Expo
# ===========================
-keep class expo.modules.** { *; }
-keep class expo.modules.documentpicker.** { *; }
-keep class expo.modules.notifications.** { *; }
-keep class expo.modules.camera.** { *; }

# ===========================
# App Package
# ===========================
-keep class com.mumerch.pakhims.** { *; }

# ===========================
# React Native Reanimated
# ===========================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ===========================
# React Native Gesture Handler
# ===========================
-keep class com.swmansion.gesturehandler.** { *; }

# ===========================
# React Native Screens
# ===========================
-keep class com.swmansion.rnscreens.** { *; }

# ===========================
# React Native Safe Area Context
# ===========================
-keep class com.th3rdwave.safeareacontext.** { *; }

# ===========================
# React Native WebView
# ===========================
-keep class com.reactnativecommunity.webview.** { *; }

# ===========================
# AsyncStorage
# ===========================
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ===========================
# DateTimePicker
# ===========================
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ===========================
# Picker
# ===========================
-keep class com.reactnativecommunity.picker.** { *; }

# ===========================
# OkHttp / Networking
# ===========================
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Add any project specific keep options here:
