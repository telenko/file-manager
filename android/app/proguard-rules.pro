# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ==============================================================================
# 1. ONNX Runtime (Критично для виправлення поточного вильоту JNI / OrtSession)
# ==============================================================================
# Захищаємо абсолютно всі класи та їхні члени (методи, поля) ONNX Runtime
# Повний захист ONNX Runtime від будь-яких оптимізацій R8
-keep class ai.onnxruntime.** { *; }
-keepclassmembers class ai.onnxruntime.** { *; }
-keepclasseswithmembers class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# Вкрай важливо: не перейменовувати Enums та Native методи
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers enum ai.onnxruntime.** { *; }
# ==============================================================================
# 2. ObjectBox (Для підтримки QueryBuilder, FileEmbeddingEntity, FileIndexEntity)
# ==============================================================================
-keep class io.objectbox.** { *; }
-keepclassmembers class io.objectbox.** { *; }
-dontwarn io.objectbox.**

# Захищаємо ваші Entity-класи (збереження полів від видалення)
-keep @io.objectbox.annotation.Entity class * { *; }
-keepclassmembers class * {
    @io.objectbox.annotation.** <fields>;
}

# ==============================================================================
# 3. PDFBox Android & JNA (Для пригнічення помилок R8 "Missing class")
# ==============================================================================
-dontwarn com.tom_roush.pdfbox.**
-dontwarn com.gemalto.jp2.**
-dontwarn java.awt.**
-dontwarn com.sun.jna.**

# ==============================================================================
# 4. React Native & Native Modules (Для ваших розширень та модулів)
# ==============================================================================
-keep class com.facebook.react.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod *;
}