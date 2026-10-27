package com.telenko.filemanager.images

import android.graphics.PointF
import android.util.Log
import android.view.MotionEvent
import com.davemorrissey.labs.subscaleview.ImageSource
import com.davemorrissey.labs.subscaleview.SubsamplingScaleImageView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter

class NativeZoomImageView(context: ThemedReactContext) : SubsamplingScaleImageView(context) {

    companion object {
        const val REACT_CLASS = "RNCSubsamplingScaleImageView"
        const val TAG = "NativeZoomDebug"
    }

    var reactMinScale = 0.5f
    var reactMaxScale = 5f
    var reactDoubleTapScale = 3f
    var minPanPointers = 1
    var panGesturesEnabled = true
    var doubleTapEnabled = true
    var baseScale: Float? = null
    var onPinchStart: (() -> Unit)? = null
    var onDoubleTap: ((Boolean) -> Unit)? = null
    var onResetAnimationEnd: (() -> Unit)? = null

    private var isZoomed = false

    init {
        setMinimumScaleType(SCALE_TYPE_CENTER_INSIDE)
        setQuickScaleEnabled(true)
        setDoubleTapZoomScale(3f)

        setOnStateChangedListener(object : OnStateChangedListener {
            override fun onScaleChanged(newScale: Float, origin: Int) {
                val relativeScale = currentRelativeScale(newScale)
                Log.d(TAG, "onScaleChanged: newScale=$newScale, relativeScale=$relativeScale, origin=$origin")
                
                val isDoubleTapOrigin = (origin == 1 || origin == 2) 

                if (relativeScale > 1.05f) {
                    if (!isZoomed) {
                        isZoomed = true
                        Log.d(TAG, "Zoom activated -> isZoomed = true")
                        if (isDoubleTapOrigin) {
                            onDoubleTap?.invoke(true)
                        }
                    }
                } else if (isZoomed) {
                    isZoomed = false
                    Log.d(TAG, "Zoom reset -> isZoomed = false")
                    if (isDoubleTapOrigin) {
                        onDoubleTap?.invoke(false)
                    }
                    onResetAnimationEnd?.invoke()
                }
            }

            override fun onCenterChanged(newCenter: PointF, origin: Int) = Unit
        })

        setOnImageEventListener(object : OnImageEventListener {
            override fun onReady() {
                Log.d(TAG, "Image onReady, applying scale limits")
                applyScaleLimits()
            }
            override fun onImageLoaded() = Unit
            override fun onPreviewLoadError(error: Exception) = Unit
            override fun onImageLoadError(error: Exception) = Unit
            override fun onTileLoadError(error: Exception) = Unit
            override fun onPreviewReleased() = Unit
        })
    }

    fun setImageUri(uri: String?) {
        if (uri.isNullOrBlank()) return
        Log.d(TAG, "setImageUri: $uri")
        isZoomed = false
        baseScale = null
        setImage(ImageSource.uri(uri))
    }

    fun applyScaleLimits() {
        val fittedScale = minScale
        if (!fittedScale.isFinite() || fittedScale <= 0f) return

        baseScale = fittedScale
        val minimum = (fittedScale * reactMinScale).coerceAtLeast(0.01f)
        val maximum = (fittedScale * reactMaxScale).coerceAtLeast(minimum)
        setMinScale(minimum)
        setMaxScale(maximum)
        setDoubleTapZoomScale((fittedScale * reactDoubleTapScale).coerceIn(minimum, maximum))
        setScaleAndCenter(fittedScale, PointF(sWidth / 2f, sHeight / 2f))
        Log.d(TAG, "Scale limits applied: min=$minimum, max=$maximum, fitted=$fittedScale")
    }

    // Перевизначаємо головний перехоплювач подій дотику
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val currentRelScale = currentRelativeScale()
        val actionStr = when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> "ACTION_DOWN"
            MotionEvent.ACTION_UP -> "ACTION_UP"
            MotionEvent.ACTION_MOVE -> "ACTION_MOVE"
            MotionEvent.ACTION_CANCEL -> "ACTION_CANCEL"
            MotionEvent.ACTION_POINTER_DOWN -> "ACTION_POINTER_DOWN"
            MotionEvent.ACTION_POINTER_UP -> "ACTION_POINTER_UP"
            else -> "OTHER(${event.actionMasked})"
        }

        Log.d(TAG, "onTouchEvent: action=$actionStr, currentRelScale=$currentRelScale, pointerCount=${event.pointerCount}")

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                // Якщо маємо збільшення — блокуємо батька. Якщо масштаб базовий — дозволяємо свайп галереї
                val shouldDisallow = currentRelScale > 1.05f
                Log.d(TAG, "-> requestDisallowInterceptTouchEvent($shouldDisallow)")
                parent?.requestDisallowInterceptTouchEvent(shouldDisallow)

                setPanEnabled(panGesturesEnabled && event.pointerCount >= minPanPointers)
                
                if (event.actionMasked == MotionEvent.ACTION_POINTER_DOWN && event.pointerCount >= 2) {
                    onPinchStart?.invoke()
                }
            }
            MotionEvent.ACTION_POINTER_UP -> {
                setPanEnabled(panGesturesEnabled && event.pointerCount - 1 >= minPanPointers)
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                Log.d(TAG, "-> ACTION_UP/CANCEL: звільняємо батька requestDisallowInterceptTouchEvent(false)")
                parent?.requestDisallowInterceptTouchEvent(false)
                setPanEnabled(panGesturesEnabled)
            }
        }

        val result = super.onTouchEvent(event)
        // Логуємо також стан після виконання обробки бібліотекою, чи вона випадково не перезаписала наш запит
        return result
    }

    private fun currentRelativeScale(currentScale: Float = this.scale): Float {
        val fittedScale = baseScale ?: return 1f
        return if (fittedScale > 0f) currentScale / fittedScale else 1f
    }
}

class SubsamplingScaleImageViewManager : SimpleViewManager<NativeZoomImageView>() {
    override fun getName(): String = NativeZoomImageView.REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): NativeZoomImageView {
        val view = NativeZoomImageView(reactContext)
        view.onPinchStart = { emitEvent(reactContext, view, "onPinchStart") }
        view.onDoubleTap = { zoomIn ->
            val event = Arguments.createMap().apply {
                putString("zoomType", if (zoomIn) "ZOOM_IN" else "ZOOM_OUT")
            }
            emitEvent(reactContext, view, "onDoubleTap", event)
        }
        view.onResetAnimationEnd = { emitEvent(reactContext, view, "onResetAnimationEnd") }
        return view
    }

    @ReactProp(name = "uri")
    fun setUri(view: NativeZoomImageView, uri: String?) = view.setImageUri(uri)

    @ReactProp(name = "minScale", defaultFloat = 0.5f)
    fun setMinScale(view: NativeZoomImageView, scale: Float) {
        view.reactMinScale = scale
        if (view.isReady) view.applyScaleLimits()
    }

    @ReactProp(name = "maxScale", defaultFloat = 5f)
    fun setMaxScale(view: NativeZoomImageView, scale: Float) {
        view.reactMaxScale = scale
        if (view.isReady) view.applyScaleLimits()
    }

    @ReactProp(name = "doubleTapScale", defaultFloat = 3f)
    fun setDoubleTapScale(view: NativeZoomImageView, scale: Float) {
        view.reactDoubleTapScale = scale
        if (view.isReady) view.applyScaleLimits()
    }

    @ReactProp(name = "minPanPointers", defaultInt = 1)
    fun setMinPanPointers(view: NativeZoomImageView, pointers: Int) {
        view.minPanPointers = pointers.coerceAtLeast(1)
    }

    @ReactProp(name = "isSingleTapEnabled", defaultBoolean = true)
    fun setIsSingleTapEnabled(view: NativeZoomImageView, enabled: Boolean) {
        view.isClickable = enabled
    }

    @ReactProp(name = "isDoubleTapEnabled", defaultBoolean = true)
    fun setIsDoubleTapEnabled(view: NativeZoomImageView, enabled: Boolean) {
        view.doubleTapEnabled = enabled
        if (!enabled) {
            view.setDoubleTapZoomScale(0f)
        }
    }

    @ReactProp(name = "isPanEnabled", defaultBoolean = true)
    fun setIsPanEnabled(view: NativeZoomImageView, enabled: Boolean) {
        view.panGesturesEnabled = enabled
        view.setPanEnabled(enabled)
    }

    @ReactProp(name = "resizeMode")
    fun setResizeMode(view: NativeZoomImageView, resizeMode: String?) {
        view.setMinimumScaleType(when (resizeMode) {
            "cover" -> SubsamplingScaleImageView.SCALE_TYPE_CENTER_CROP
            "center" -> SubsamplingScaleImageView.SCALE_TYPE_CUSTOM
            else -> SubsamplingScaleImageView.SCALE_TYPE_CENTER_INSIDE
        })
    }

    private fun emitEvent(
        context: ThemedReactContext,
        view: NativeZoomImageView,
        eventName: String,
        params: WritableMap? = null
    ) {
        @Suppress("DEPRECATION")
        context.getJSModule(RCTEventEmitter::class.java).receiveEvent(view.id, eventName, params)
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> = mutableMapOf(
        "onPinchStart" to mapOf("registrationName" to "onPinchStart"),
        "onDoubleTap" to mapOf("registrationName" to "onDoubleTap"),
        "onResetAnimationEnd" to mapOf("registrationName" to "onResetAnimationEnd")
    )
}