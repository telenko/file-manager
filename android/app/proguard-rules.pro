# ==============================================================================
# 1. ONNX Runtime (Нативний JNI рушій для AI)
# ==============================================================================
-keep class ai.onnxruntime.** { *; }
-dontwarn ai.onnxruntime.**

# ==============================================================================
# 2. DJL Tokenizers (Нативний JNI токенайзер)
# ==============================================================================
-keep class ai.djl.** { *; }
-dontwarn ai.djl.**

# ==============================================================================
# 3. ObjectBox (База даних та Entity-сутності)
# ==============================================================================
-keep class io.objectbox.** { *; }
-keep @io.objectbox.annotation.Entity class * { *; }
-dontwarn io.objectbox.**

# ==============================================================================
# 4. Зовнішні бібліотеки (Ігнорування опціональних/відсутніх класів R8)
# ==============================================================================
# PDFBox / JNA опціональні залежності
-dontwarn com.tom_roush.pdfbox.**
-dontwarn com.gemalto.jp2.**
-dontwarn java.awt.**
-dontwarn com.sun.jna.**

# Apache Commons Compress опціональні алгоритми стиснення
-dontwarn org.apache.commons.lang3.**
-dontwarn com.github.luben.zstd.**
-dontwarn org.brotli.dec.**
-dontwarn org.tukaani.xz.**


# ==============================================================================
# React Native - Захист від надмірного вирізання R8 у релізі
# ==============================================================================
-keep class com.facebook.react.devsupport.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.react.devsupport.**