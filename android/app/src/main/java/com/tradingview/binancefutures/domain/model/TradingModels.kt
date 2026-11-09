package com.tradingview.binancefutures.domain.model

data class Candle(
    val time: Long,
    val open: Float,
    val high: Float,
    val low: Float,
    val close: Float,
    val volume: Float
)

data class TradingPair(
    val symbol: String,
    val baseAsset: String,
    val quoteAsset: String,
    val price: Float,
    val priceChangePercent: Float,
    val highPrice: Float,
    val lowPrice: Float,
    val volume: Float,
    val quoteVolume: Float
)

enum class Timeframe(val interval: String, val displayName: String, val durationMs: Long) {
    M1("1m", "1m", 60 * 1000L),
    M3("3m", "3m", 3 * 60 * 1000L),
    M5("5m", "5m", 5 * 60 * 1000L),
    M15("15m", "15m", 15 * 60 * 1000L),
    H1("1h", "1h", 60 * 60 * 1000L),
    H4("4h", "4h", 4 * 60 * 60 * 1000L),
    D1("1d", "1D", 24 * 60 * 60 * 1000L);

    companion object {
        fun fromInterval(interval: String): Timeframe =
            values().firstOrNull { it.interval == interval } ?: M1
    }
}

enum class PriceType {
    LAST, MARK, INDEX
}

enum class DrawingType {
    TRENDLINE, HORIZONTAL_LINE, RECTANGLE, PRICE_RANGE
}

data class ChartPoint(
    val time: Long,
    val price: Float
)

data class Drawing(
    val id: String,
    val type: DrawingType,
    val points: List<ChartPoint>,
    val color: Long = 0xFF2962FF,
    val strokeWidth: Float = 2f,
    val isLocked: Boolean = false,
    val isSelected: Boolean = false
)

enum class AlertCondition {
    CROSSES_ABOVE, CROSSES_BELOW, CROSSING
}

data class PriceAlert(
    val id: String,
    val symbol: String,
    val targetPrice: Float,
    val condition: AlertCondition,
    val createdAt: Long = System.currentTimeMillis(),
    val isTriggered: Boolean = false,
    val soundEnabled: Boolean = true,
    val vibrateEnabled: Boolean = true
)

data class BarReplayState(
    val isActive: Boolean = false,
    val cutIndex: Int = -1,
    val currentIndex: Int = -1,
    val isPlaying: Boolean = false,
    val speedMs: Long = 1000L
)
