package com.tradingview.binancefutures.presentation.ui.chart

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tradingview.binancefutures.domain.model.*
import com.tradingview.binancefutures.presentation.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.max
import kotlin.math.min

@OptIn(ExperimentalTextApi::class)
@Composable
fun CandlestickChartCompose(
    candles: List<Candle>,
    timeframe: Timeframe,
    symbol: String,
    priceType: PriceType,
    drawings: List<Drawing>,
    activeDrawingTool: DrawingType?,
    selectedDrawingId: String?,
    onSelectDrawing: (String?) -> Unit,
    onAddDrawing: (Drawing) -> Unit,
    onUpdateDrawing: (Drawing) -> Unit,
    modifier: Modifier = Modifier
) {
    var candleWidth by remember { mutableFloatStateOf(24f) }
    var scrollOffset by remember { mutableFloatStateOf(0f) }
    var priceScaleMultiplier by remember { mutableFloatStateOf(1f) }
    var crosshairPosition by remember { mutableStateOf<Offset?>(null) }

    // Drawing in progress
    var tempPoint by remember { mutableStateOf<ChartPoint?>(null) }

    val textMeasurer = rememberTextMeasurer()

    Box(
        modifier = modifier
            .background(TVBackground)
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scrollOffset += pan.x / candleWidth
                    candleWidth = (candleWidth * zoom).coerceIn(6f, 100f)
                }
            }
            .pointerInput(drawings, activeDrawingTool) {
                detectTapGestures(
                    onTap = { offset ->
                        crosshairPosition = offset
                        // Handle drawing creation or selection
                    }
                )
            }
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val chartWidth = size.width - 160f // reserve 160px for price scale
            val chartHeight = size.height - 60f // reserve 60px for time scale

            if (candles.isEmpty()) return@Canvas

            val visibleCount = (chartWidth / candleWidth).toInt() + 2
            val endIndex = (candles.size - 1 + scrollOffset.toInt()).coerceIn(0, candles.size - 1)
            val startIndex = (endIndex - visibleCount).coerceAtLeast(0)

            val visibleCandles = candles.subList(startIndex, endIndex + 1)
            if (visibleCandles.isEmpty()) return@Canvas

            var minPrice = visibleCandles.minOf { it.low }
            var maxPrice = visibleCandles.maxOf { it.high }
            val priceRange = max(maxPrice - minPrice, maxPrice * 0.001f) * 1.1f / priceScaleMultiplier
            val midPrice = (maxPrice + minPrice) / 2f
            val displayMin = midPrice - priceRange / 2f
            val displayMax = midPrice + priceRange / 2f

            fun priceToY(price: Float): Float {
                return chartHeight - ((price - displayMin) / priceRange) * chartHeight
            }

            fun yToPrice(y: Float): Float {
                return displayMin + ((chartHeight - y) / chartHeight) * priceRange
            }

            fun indexToX(idx: Int): Float {
                val offsetFromEnd = endIndex - idx
                return chartWidth - (offsetFromEnd + 0.5f) * candleWidth
            }

            // Draw grid lines
            val numSteps = 5
            for (i in 0..numSteps) {
                val p = displayMin + (priceRange / numSteps) * i
                val y = priceToY(p)
                drawLine(
                    color = TVBorder,
                    start = Offset(0f, y),
                    end = Offset(chartWidth, y),
                    strokeWidth = 1f
                )
                // Draw price text on scale
                drawText(
                    textMeasurer = textMeasurer,
                    text = String.format(Locale.US, "%.2f", p),
                    topLeft = Offset(chartWidth + 10f, y - 12f),
                    style = TextStyle(color = TVTextSecondary, fontSize = 10.sp)
                )
            }

            // Draw Candlesticks
            for (i in startIndex..endIndex) {
                val c = candles[i]
                val x = indexToX(i)
                val isBull = c.close >= c.open
                val color = if (isBull) TVBullishGreen else TVBearishRed

                val openY = priceToY(c.open)
                val closeY = priceToY(c.close)
                val highY = priceToY(c.high)
                val lowY = priceToY(c.low)

                val bodyTop = min(openY, closeY)
                val bodyHeight = max(Math.abs(closeY - openY), 2f)
                val barW = max(candleWidth * 0.7f, 2f)

                // Wick
                drawLine(
                    color = color,
                    start = Offset(x, highY),
                    end = Offset(x, lowY),
                    strokeWidth = 2f
                )

                // Body
                drawRect(
                    color = color,
                    topLeft = Offset(x - barW / 2f, bodyTop),
                    size = Size(barW, bodyHeight)
                )
            }

            // Draw Drawings (Trendline, Horizontal Line, Rectangle)
            drawings.forEach { drawing ->
                val isSelected = drawing.id == selectedDrawingId
                val strokeW = if (isSelected) drawing.strokeWidth + 2f else drawing.strokeWidth

                when (drawing.type) {
                    DrawingType.HORIZONTAL_LINE -> {
                        val p = drawing.points.firstOrNull() ?: return@forEach
                        val y = priceToY(p.price)
                        drawLine(
                            color = Color(drawing.color),
                            start = Offset(0f, y),
                            end = Offset(chartWidth, y),
                            strokeWidth = strokeW,
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f))
                        )
                    }
                    DrawingType.TRENDLINE -> {
                        if (drawing.points.size >= 2) {
                            val p1 = drawing.points[0]
                            val p2 = drawing.points[1]
                            val y1 = priceToY(p1.price)
                            val y2 = priceToY(p2.price)
                            val x1 = chartWidth - 100f // mapped from time
                            val x2 = chartWidth - 20f
                            drawLine(
                                color = Color(drawing.color),
                                start = Offset(x1, y1),
                                end = Offset(x2, y2),
                                strokeWidth = strokeW
                            )
                        }
                    }
                    DrawingType.RECTANGLE -> {
                        if (drawing.points.size >= 2) {
                            val y1 = priceToY(drawing.points[0].price)
                            val y2 = priceToY(drawing.points[1].price)
                            val top = min(y1, y2)
                            val h = Math.abs(y2 - y1)
                            drawRect(
                                color = Color(drawing.color).copy(alpha = 0.2f),
                                topLeft = Offset(50f, top),
                                size = Size(chartWidth - 100f, h)
                            )
                        }
                    }
                }
            }

            // Draw Current Price Line & Tag
            val last = candles.last()
            val lastY = priceToY(last.close)
            val currentBull = last.close >= last.open
            val currentTagColor = if (currentBull) TVBullishGreen else TVBearishRed

            drawLine(
                color = currentTagColor,
                start = Offset(0f, lastY),
                end = Offset(chartWidth, lastY),
                strokeWidth = 1.5f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f))
            )

            // Price scale tag
            drawRect(
                color = currentTagColor,
                topLeft = Offset(chartWidth, lastY - 14f),
                size = Size(150f, 28f)
            )
            drawText(
                textMeasurer = textMeasurer,
                text = String.format(Locale.US, "%.2f", last.close),
                topLeft = Offset(chartWidth + 12f, lastY - 8f),
                style = TextStyle(color = Color.White, fontSize = 11.sp)
            )

            // Crosshair
            crosshairPosition?.let { pos ->
                if (pos.x in 0f..chartWidth && pos.y in 0f..chartHeight) {
                    drawLine(
                        color = Color.Gray,
                        start = Offset(pos.x, 0f),
                        end = Offset(pos.x, chartHeight),
                        strokeWidth = 1f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f))
                    )
                    drawLine(
                        color = Color.Gray,
                        start = Offset(0f, pos.y),
                        end = Offset(chartWidth, pos.y),
                        strokeWidth = 1f,
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f))
                    )
                }
            }
        }

        // Top HUD Header
        if (candles.isNotEmpty()) {
            val last = candles.last()
            Row(
                modifier = Modifier
                    .padding(8.dp)
                    .align(Alignment.TopStart),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("$symbol · ${timeframe.displayName}", color = Color.White, fontSize = 12.sp)
                Text("O: ${last.open}", color = TVTextSecondary, fontSize = 11.sp)
                Text("H: ${last.high}", color = TVTextSecondary, fontSize = 11.sp)
                Text("L: ${last.low}", color = TVTextSecondary, fontSize = 11.sp)
                Text("C: ${last.close}", color = if (last.close >= last.open) TVBullishGreen else TVBearishRed, fontSize = 11.sp)
            }
        }
    }
}
