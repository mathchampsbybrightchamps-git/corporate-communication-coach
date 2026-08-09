package com.communicationcoach.fluxsy

import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * OpenAI API Client supporting GPT-4o / GPT-4o-mini for text generation,
 * executive reframing, meeting MOM synthesis, and vision OCR.
 */
object OpenAIClient {

    const val CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions"
    const val DEFAULT_MODEL = "gpt-4o-mini"

    fun isConfigured(): Boolean = BuildConfig.OPENAI_API_KEY.isNotBlank()

    fun buildErrorEnvelope(message: String): String =
        JSONObject().put("error", JSONObject().put("message", message)).toString()

    /**
     * Sends a chat completion request to OpenAI API.
     */
    fun post(jsonBody: String, callback: (String) -> Unit) {
        if (!isConfigured()) {
            android.util.Log.e("OpenAIClient", "OPENAI_API_KEY is not set; add OPENAI_API_KEY to local.properties")
            callback(buildErrorEnvelope("OpenAI API key missing. Add OPENAI_API_KEY to local.properties and rebuild."))
            return
        }

        thread {
            try {
                val conn = URL(CHAT_ENDPOINT).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Authorization", "Bearer ${BuildConfig.OPENAI_API_KEY}")
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
                    android.util.Log.e("OpenAIClient", "HTTP $responseCode from OpenAI: $responseText")
                    callback(if (responseText.isNotBlank()) responseText else buildErrorEnvelope("OpenAI request failed with HTTP $responseCode."))
                } else {
                    // Extract content text from OpenAI response structure
                    val formattedResponse = try {
                        val root = JSONObject(responseText)
                        val choices = root.optJSONArray("choices")
                        if (choices != null && choices.length() > 0) {
                            val message = choices.getJSONObject(0).optJSONObject("message")
                            val content = message?.optString("content") ?: ""
                            content
                        } else {
                            responseText
                        }
                    } catch (e: Exception) {
                        responseText
                    }
                    callback(formattedResponse)
                }
            } catch (e: Exception) {
                android.util.Log.e("OpenAIClient", "Network request failed for OpenAI", e)
                callback(buildErrorEnvelope("Network error: ${e.message ?: e.javaClass.simpleName}"))
            }
        }
    }

    /**
     * Generates text coaching or MOM synthesis using gpt-4o-mini.
     */
    fun generateText(prompt: String, callback: (String) -> Unit) {
        val messages = JSONArray().apply {
            put(JSONObject().apply {
                put("role", "system")
                put("content", "You are an executive communication coach and high precision analyzer.")
            })
            put(JSONObject().apply {
                put("role", "user")
                put("content", prompt)
            })
        }

        val json = JSONObject().apply {
            put("model", DEFAULT_MODEL)
            put("messages", messages)
            put("temperature", 0.3)
        }

        post(json.toString(), callback)
    }

    /**
     * Performs Multimodal Vision OCR and Translation using gpt-4o-mini vision capabilities.
     */
    fun processVisionOCR(base64Image: String, targetLang: String, callback: (String) -> Unit) {
        val cleanBase64 = if (base64Image.contains(",")) base64Image.split(",")[1] else base64Image
        val dataUrl = "data:image/jpeg;base64,$cleanBase64"

        val promptText = "Perform high accuracy OCR text extraction on this image. Extract all readable text present in the image word for word. Then translate the extracted text into target language code '$targetLang'. Respond ONLY in strict JSON format without markdown code blocks: {\"detected\":\"[Exact extracted original text]\",\"translated\":\"[Translation in $targetLang]\"}"

        val contentArray = JSONArray().apply {
            put(JSONObject().apply {
                put("type", "text")
                put("text", promptText)
            })
            put(JSONObject().apply {
                put("type", "image_url")
                put("image_url", JSONObject().apply {
                    put("url", dataUrl)
                    put("detail", "low")
                })
            })
        }

        val messages = JSONArray().apply {
            put(JSONObject().apply {
                put("role", "user")
                put("content", contentArray)
            })
        }

        val json = JSONObject().apply {
            put("model", DEFAULT_MODEL)
            put("messages", messages)
            put("max_tokens", 1000)
        }

        post(json.toString(), callback)
    }
}
