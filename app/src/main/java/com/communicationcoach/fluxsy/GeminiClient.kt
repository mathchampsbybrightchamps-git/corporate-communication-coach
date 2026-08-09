package com.communicationcoach.fluxsy

import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Shared network + audio-encoding helper.
 *
 * Both MainActivity (OCR, coaching, MOM synthesis) and MeetingCaptureService (background
 * meeting transcription) call Gemini, so the API key header, error shaping and WAV encoding
 * live here rather than being duplicated.
 */
object GeminiClient {

    const val ENDPOINT =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    // 16 kHz mono PCM16: intelligible for speech, and a 20s chunk stays comfortably
    // under the inline request size limit.
    const val SAMPLE_RATE = 16000
    const val BYTES_PER_SAMPLE = 2

    fun isConfigured(): Boolean = BuildConfig.GEMINI_API_KEY.isNotBlank()

    /** Wraps a failure in the same {"error":{"message":...}} shape Google returns. */
    fun buildErrorEnvelope(message: String): String =
        JSONObject().put("error", JSONObject().put("message", message)).toString()

    /**
     * POSTs JSON and delivers the raw response body. Gemini requests are authenticated with
     * the compiled-in API key; other hosts (Firestore) are passed through untouched.
     */
    fun post(urlStr: String, jsonBody: String, callback: (String) -> Unit) {
        val isGemini = urlStr.startsWith(ENDPOINT)

        // Fail fast rather than firing an unauthenticated request that returns an opaque 403.
        if (isGemini && !isConfigured()) {
            android.util.Log.e("GeminiClient", "GEMINI_API_KEY is not set; add it to local.properties")
            callback(buildErrorEnvelope(
                "Gemini API key missing. Add GEMINI_API_KEY to local.properties and rebuild."
            ))
            return
        }

        thread {
            try {
                val conn = URL(urlStr).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                if (isGemini) {
                    conn.setRequestProperty("x-goog-api-key", BuildConfig.GEMINI_API_KEY)
                }
                conn.connectTimeout = 30000
                conn.readTimeout = 30000
                conn.doOutput = true

                conn.outputStream.use { os ->
                    OutputStreamWriter(os, "UTF-8").use { it.write(jsonBody) }
                }

                val responseCode = conn.responseCode
                val stream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                val responseText = stream?.bufferedReader()?.use { it.readText() } ?: ""

                if (responseCode !in 200..299) {
                    android.util.Log.e("GeminiClient", "HTTP $responseCode from $urlStr: $responseText")
                    callback(
                        if (responseText.isNotBlank()) responseText
                        else buildErrorEnvelope("Request failed with HTTP $responseCode.")
                    )
                } else {
                    callback(responseText)
                }
            } catch (e: Exception) {
                android.util.Log.e("GeminiClient", "Network request failed for $urlStr", e)
                callback(buildErrorEnvelope("Network error: ${e.message ?: e.javaClass.simpleName}"))
            }
        }
    }

    /** Convenience wrapper for a plain text-only prompt. */
    fun generateText(prompt: String, callback: (String) -> Unit) {
        val json = JSONObject().apply {
            put("contents", JSONArray().put(
                JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt)))
            ))
        }
        post(ENDPOINT, json.toString(), callback)
    }

    /**
     * Sends a chunk of raw PCM for diarization, per-utterance language ID, verbatim
     * transcription and English translation.
     *
     * @param contextJson running roster + language hint, used to keep speaker labels stable
     *                    across chunk boundaries.
     */
    fun transcribeMeetingChunk(pcm: ByteArray, contextJson: String, callback: (String) -> Unit) {
        val base64Audio = android.util.Base64.encodeToString(buildWavFile(pcm), android.util.Base64.NO_WRAP)

        val context = try {
            JSONObject(contextJson)
        } catch (e: Exception) {
            JSONObject()
        }

        val knownSpeakers = context.optJSONArray("speakers")
        val rosterText = if (knownSpeakers != null && knownSpeakers.length() > 0) {
            (0 until knownSpeakers.length()).joinToString("\n") { "- ${knownSpeakers.optString(it)}" }
        } else {
            "(none yet - this is the first chunk)"
        }

        val languageHint = context.optString("languageHint", "").trim()
        val hintText = if (languageHint.isNotBlank()) {
            "Languages likely present in this meeting: $languageHint. " +
                "Prefer these when a regional language is ambiguous."
        } else {
            "No language hint provided; detect languages purely from the audio."
        }

        val promptText = """
            You are an expert multilingual meeting transcriptionist and speaker diarization engine.
            Analyse the attached meeting audio.

            Speakers already identified earlier in this meeting (reuse these EXACT labels whenever
            the same voice speaks again, so labels stay consistent across the whole meeting):
            $rosterText

            $hintText

            Instructions:
            1. Determine how many distinct speakers are audible. Assign each a stable label.
               If a voice matches a known speaker above, reuse that exact label. Otherwise create
               the next "Speaker N".
            2. For every contiguous utterance, identify the spoken language by its English name
               (for example "English", "Hindi", "Bhojpuri", "Tamil", "Marathi", "Spanish").
               Regional languages and dialects matter: do not collapse Bhojpuri, Maithili or
               Awadhi into "Hindi". If one utterance mixes languages, join them with " + "
               (for example "Hindi + English").
            3. Transcribe verbatim in the original language and its native script.
            4. Provide a fluent, professional English translation of each utterance. If the
               utterance is already English, repeat it cleaned up.
            5. Ignore silence, background noise and non-speech audio. If there is no intelligible
               speech at all, return an empty segments array.

            Respond with STRICT JSON only, no markdown and no code fences:
            {"segments":[{"speaker":"Speaker 1","language":"Bhojpuri","original":"...","english":"..."}]}
        """.trimIndent()

        val partsArray = JSONArray().apply {
            put(JSONObject().put("text", promptText))
            put(JSONObject().put("inline_data", JSONObject().apply {
                put("mime_type", "audio/wav")
                put("data", base64Audio)
            }))
        }

        val json = JSONObject().apply {
            put("contents", JSONArray().put(JSONObject().put("parts", partsArray)))
        }

        post(ENDPOINT, json.toString(), callback)
    }

    /** Prepends a 44-byte RIFF/WAVE header to raw PCM16 so the model can decode it. */
    fun buildWavFile(pcm: ByteArray): ByteArray {
        val channels = 1
        val bitsPerSample = 16
        val byteRate = SAMPLE_RATE * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8
        val dataSize = pcm.size

        val header = java.nio.ByteBuffer.allocate(44).order(java.nio.ByteOrder.LITTLE_ENDIAN)
        header.put("RIFF".toByteArray(Charsets.US_ASCII))
        header.putInt(36 + dataSize)
        header.put("WAVE".toByteArray(Charsets.US_ASCII))
        header.put("fmt ".toByteArray(Charsets.US_ASCII))
        header.putInt(16)                        // PCM subchunk size
        header.putShort(1)                       // audio format: PCM
        header.putShort(channels.toShort())
        header.putInt(SAMPLE_RATE)
        header.putInt(byteRate)
        header.putShort(blockAlign.toShort())
        header.putShort(bitsPerSample.toShort())
        header.put("data".toByteArray(Charsets.US_ASCII))
        header.putInt(dataSize)

        return header.array() + pcm
    }
}
