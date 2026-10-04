# Proguard Rules for Karur Taxi Driver App (2GB Budget Device Resilience)

# Preserve OkHttp WebSockets and internal reflection
-keepattributes Signature
-keepattributes *Annotation*
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Preserve Google Play Location Services
-keep class com.google.android.gms.location.** { *; }
-dontwarn com.google.android.gms.location.**

# Preserve Osmdroid raster map tile cache
-keep class org.osmdroid.** { *; }
-dontwarn org.osmdroid.**

# Preserve JSON models and Serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
