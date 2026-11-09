package com.tradingview.binancefutures.data.remote

import com.google.gson.Gson
import com.google.gson.JsonArray
import com.tradingview.binancefutures.domain.model.Candle
import com.tradingview.binancefutures.domain.model.Timeframe
import com.tradingview.binancefutures.domain.model.TradingPair
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.withContext
import okhttp3.*
import java.io.IOException
import java.util.concurrent.TimeUnit

class BinanceRemoteDataSource(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build(),
    private val gson: Gson = Gson()
) {
    private val baseUrl = "https://fapi.binance.com"
    private val wsBaseUrl = "wss://fstream.binance.com/ws"

    suspend fun getFuturesTickers(): List<TradingPair> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("$baseUrl/fapi/v1/ticker/24hr")
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch tickers: ${response.code}")
            val body = response.body?.string() ?: return@withContext emptyList()
            val array = gson.fromJson(body, JsonArray::class.java)

            val list = mutableListOf<TradingPair>()
            for (element in array) {
                val obj = element.asJsonObject
                val symbol = obj.get("symbol").asString
                if (symbol.endsWith("USDT")) {
                    list.add(
                        TradingPair(
                            symbol = symbol,
                            baseAsset = symbol.replace("USDT", ""),
                            quoteAsset = "USDT",
                            price = obj.get("lastPrice").asFloat,
                            priceChangePercent = obj.get("priceChangePercent").asFloat,
                            highPrice = obj.get("highPrice").asFloat,
                            lowPrice = obj.get("lowPrice").asFloat,
                            volume = obj.get("volume").asFloat,
                            quoteVolume = obj.get("quoteVolume").asFloat
                        )
                    )
                }
            }
            list.sortedByDescending { it.quoteVolume }
        }
    }

    suspend fun getHistoricalKlines(
        symbol: String,
        timeframe: Timeframe,
        limit: Int = 500
    ): List<Candle> = withContext(Dispatchers.IO) {
        val url = "$baseUrl/fapi/v1/klines?symbol=${symbol.uppercase()}&interval=${timeframe.interval}&limit=$limit"
        val request = Request.Builder().url(url).build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Failed to fetch klines: ${response.code}")
            val body = response.body?.string() ?: return@withContext emptyList()
            val array = gson.fromJson(body, JsonArray::class.java)

            val candles = mutableListOf<Candle>()
            for (element in array) {
                val kline = element.asJsonArray
                candles.add(
                    Candle(
                        time = kline.get(0).asLong,
                        open = kline.get(1).asFloat,
                        high = kline.get(2).asFloat,
                        low = kline.get(3).asFloat,
                        close = kline.get(4).asFloat,
                        volume = kline.get(5).asFloat
                    )
                )
            }
            candles
        }
    }

    fun observeLiveKline(symbol: String, timeframe: Timeframe): Flow<Candle> = callbackFlow {
        val stream = "${symbol.lowercase()}@kline_${timeframe.interval}"
        val request = Request.Builder().url("$wsBaseUrl/$stream").build()

        val webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val root = gson.fromJson(text, com.google.gson.JsonObject::class.java)
                    if (root.has("k")) {
                        val k = root.getAsJsonObject("k")
                        val candle = Candle(
                            time = k.get("t").asLong,
                            open = k.get("o").asFloat,
                            high = k.get("h").asFloat,
                            low = k.get("l").asFloat,
                            close = k.get("c").asFloat,
                            volume = k.get("v").asFloat
                        )
                        trySend(candle)
                    }
                } catch (e: Exception) {
                    // ignore json parse error
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                close(t)
            }
        })

        awaitClose {
            webSocket.close(1000, "Closed flow")
        }
    }
}
