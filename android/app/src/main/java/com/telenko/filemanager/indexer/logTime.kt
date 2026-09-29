import android.util.Log
import kotlin.system.measureTimeMillis

inline fun <T> logTime(tag: String = "Benchmark", label: String, block: () -> T): T {
    var result: T
    val time = measureTimeMillis {
        result = block()
    }
    Log.d(tag, "⏱️ [$label]: ${time}ms")
    return result
}