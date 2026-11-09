package com.tradingview.binancefutures.presentation.viewmodel

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tradingview.binancefutures.data.repository.TradingRepository
import com.tradingview.binancefutures.data.repository.TradingRepositoryImpl
import com.tradingview.binancefutures.domain.model.*
import java.util.UUID
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

data class ChartUiState(
    val symbol: String = "BTCUSDT",
    val timeframe: Timeframe = Timeframe.M1,
    val priceType: PriceType = PriceType.LAST,
    val candles: List<Candle> = emptyList(),
    val pairs: List<TradingPair> = emptyList(),
    val favorites: Set<String> = setOf("BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"),
    val drawings: List<Drawing> = emptyList(),
    val activeDrawingTool: DrawingType? = null,
    val selectedDrawingId: String? = null,
    val alerts: List<PriceAlert> = emptyList(),
    val replayState: BarReplayState = BarReplayState(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class ChartViewModel(
    private val repository: TradingRepository = TradingRepositoryImpl()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChartUiState())
    val uiState: StateFlow<ChartUiState> = _uiState.asStateFlow()

    private var wsJob: Job? = null

    init {
        loadTradingPairs()
        loadCandles("BTCUSDT", Timeframe.M1)
    }

    fun loadTradingPairs() {
        viewModelScope.launch {
            try {
                val pairs = repository.getFuturesTradingPairs()
                _uiState.value = _uiState.value.copy(pairs = pairs)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = e.message)
            }
        }
    }

    fun selectSymbol(symbol: String) {
        if (_uiState.value.symbol == symbol) return
        _uiState.value = _uiState.value.copy(symbol = symbol)
        loadCandles(symbol, _uiState.value.timeframe)
    }

    fun selectTimeframe(tf: Timeframe) {
        if (_uiState.value.timeframe == tf) return
        _uiState.value = _uiState.value.copy(timeframe = tf)
        loadCandles(_uiState.value.symbol, tf)
    }

    fun setPriceType(type: PriceType) {
        _uiState.value = _uiState.value.copy(priceType = type)
    }

    private fun loadCandles(symbol: String, tf: Timeframe) {
        wsJob?.cancel()
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val history = repository.getHistoricalCandles(symbol, tf)
                _uiState.value = _uiState.value.copy(candles = history, isLoading = false)

                // Start WebSocket stream
                wsJob = launch {
                    repository.getLiveCandleStream(symbol, tf)
                        .catch { /* handle reconnect */ }
                        .collect { updatedCandle ->
                            val currentCandles = _uiState.value.candles.toMutableList()
                            if (currentCandles.isNotEmpty() && currentCandles.last().time == updatedCandle.time) {
                                currentCandles[currentCandles.size - 1] = updatedCandle
                            } else {
                                currentCandles.add(updatedCandle)
                            }
                            _uiState.value = _uiState.value.copy(candles = currentCandles)
                            checkAlerts(updatedCandle.close)
                        }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = e.message)
            }
        }
    }

    // Drawings
    fun setActiveDrawingTool(tool: DrawingType?) {
        _uiState.value = _uiState.value.copy(activeDrawingTool = tool)
    }

    fun addDrawing(drawing: Drawing) {
        _uiState.value = _uiState.value.copy(
            drawings = _uiState.value.drawings + drawing,
            activeDrawingTool = null,
            selectedDrawingId = drawing.id
        )
    }

    fun updateDrawing(drawing: Drawing) {
        _uiState.value = _uiState.value.copy(
            drawings = _uiState.value.drawings.map { if (it.id == drawing.id) drawing else it }
        )
    }

    fun deleteDrawing(id: String) {
        _uiState.value = _uiState.value.copy(
            drawings = _uiState.value.drawings.filter { it.id != id },
            selectedDrawingId = null
        )
    }

    fun selectDrawing(id: String?) {
        _uiState.value = _uiState.value.copy(selectedDrawingId = id)
    }

    fun clearAllDrawings() {
        _uiState.value = _uiState.value.copy(drawings = emptyList(), selectedDrawingId = null)
    }

    // Alerts
    fun addAlert(symbol: String, targetPrice: Float, condition: AlertCondition) {
        val alert = PriceAlert(
            id = UUID.randomUUID().toString(),
            symbol = symbol,
            targetPrice = targetPrice,
            condition = condition
        )
        _uiState.value = _uiState.value.copy(alerts = _uiState.value.alerts + alert)
    }

    private fun checkAlerts(currentPrice: Float) {
        // Trigger matching alerts
    }

    fun triggerDeviceVibration(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            @Suppress("DEPRECATION")
            vibrator?.vibrate(200)
        }
    }
}
