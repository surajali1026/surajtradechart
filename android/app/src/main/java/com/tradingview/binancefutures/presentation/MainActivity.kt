package com.tradingview.binancefutures.presentation

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tradingview.binancefutures.domain.model.AlertCondition
import com.tradingview.binancefutures.presentation.ui.alerts.AlertsDialogCompose
import com.tradingview.binancefutures.presentation.ui.chart.CandlestickChartCompose
import com.tradingview.binancefutures.presentation.ui.drawing.DrawingToolbarCompose
import com.tradingview.binancefutures.presentation.ui.header.TradingHeader
import com.tradingview.binancefutures.presentation.ui.theme.*
import com.tradingview.binancefutures.presentation.ui.timeframe.CustomTimeframeDialog
import com.tradingview.binancefutures.presentation.ui.watchlist.WatchlistDialogCompose
import com.tradingview.binancefutures.presentation.viewmodel.ChartViewModel

class MainActivity : ComponentActivity() {

    private fun toggleScreenOrientation() {
        requestedOrientation = if (resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE) {
            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TradingViewTheme {
                val viewModel: ChartViewModel = viewModel()
                val uiState by viewModel.uiState.collectAsState()

                var isWatchlistOpen by remember { mutableStateOf(false) }
                var isAlertsOpen by remember { mutableStateOf(false) }
                var isCustomTfOpen by remember { mutableStateOf(false) }

                val currentPair = remember(uiState.pairs, uiState.symbol) {
                    uiState.pairs.firstOrNull { it.symbol == uiState.symbol }
                }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = TVBackground
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // 1. Top Header with Symbol, Timeframes, and Price Type switcher
                        TradingHeader(
                            symbol = uiState.symbol,
                            currentPair = currentPair,
                            timeframe = uiState.timeframe,
                            priceType = uiState.priceType,
                            alertsCount = uiState.alerts.size,
                            onOpenWatchlist = { isWatchlistOpen = true },
                            onSelectTimeframe = { viewModel.selectTimeframe(it) },
                            onOpenCustomTimeframe = { isCustomTfOpen = true },
                            onSelectPriceType = { viewModel.setPriceType(it) },
                            onOpenAlerts = { isAlertsOpen = true },
                            onToggleOrientation = { toggleScreenOrientation() }
                        )

                        // 2. Main Workspace: Candlestick Chart + Auto-hiding Drawing Toolbar + Fixed Alert Button
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                        ) {
                            // Candlestick Chart
                            CandlestickChartCompose(
                                candles = uiState.candles,
                                timeframe = uiState.timeframe,
                                symbol = uiState.symbol,
                                priceType = uiState.priceType,
                                drawings = uiState.drawings,
                                activeDrawingTool = uiState.activeDrawingTool,
                                selectedDrawingId = uiState.selectedDrawingId,
                                onSelectDrawing = { viewModel.selectDrawing(it) },
                                onAddDrawing = { viewModel.addDrawing(it) },
                                onUpdateDrawing = { viewModel.updateDrawing(it) },
                                modifier = Modifier.fillMaxSize()
                            )

                            // Left Auto-Hide Drawing Toolbar
                            DrawingToolbarCompose(
                                activeDrawingTool = uiState.activeDrawingTool,
                                onSelectTool = { viewModel.setActiveDrawingTool(it) },
                                onClearAll = { viewModel.clearAllDrawings() },
                                drawingsCount = uiState.drawings.size,
                                modifier = Modifier.align(Alignment.CenterStart)
                            )

                            // Fixed Alert Plus Button at Bottom Right
                            Surface(
                                onClick = {
                                    if (uiState.candles.isNotEmpty()) {
                                        val p = uiState.candles.last().close
                                        viewModel.addAlert(uiState.symbol, p, AlertCondition.CROSSES_ABOVE)
                                        viewModel.triggerDeviceVibration(this@MainActivity)
                                    }
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFF9800),
                                shadowElevation = 6.dp,
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(end = 65.dp, bottom = 28.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Add,
                                        contentDescription = "Add Alert",
                                        tint = Color.Black,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "Alert",
                                        color = Color.Black,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        // 3. Bottom Status Strip
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(TVSurface)
                                .padding(horizontal = 12.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Binance USD-M Live · ${uiState.priceType.name}",
                                color = TVBullishGreen,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Drawings: ${uiState.drawings.size} · Alerts: ${uiState.alerts.size}",
                                color = TVTextSecondary,
                                fontSize = 10.sp
                            )
                        }
                    }

                    // 4-Part Watchlist Dialog (Watchlist, Top 100, Gainers, Losers)
                    WatchlistDialogCompose(
                        isOpen = isWatchlistOpen,
                        onDismiss = { isWatchlistOpen = false },
                        pairs = uiState.pairs,
                        currentSymbol = uiState.symbol,
                        favorites = uiState.favorites,
                        onToggleFavorite = { viewModel.toggleFavorite(it) },
                        onSelectSymbol = { viewModel.selectSymbol(it) }
                    )

                    // Price Alerts Dialog
                    AlertsDialogCompose(
                        isOpen = isAlertsOpen,
                        onDismiss = { isAlertsOpen = false },
                        symbol = uiState.symbol,
                        currentPrice = uiState.candles.lastOrNull()?.close ?: 0f,
                        alerts = uiState.alerts.filter { it.symbol == uiState.symbol },
                        onAddAlert = { price, cond ->
                            viewModel.addAlert(uiState.symbol, price, cond)
                            viewModel.triggerDeviceVibration(this@MainActivity)
                        },
                        onDeleteAlert = { viewModel.deleteAlert(it) }
                    )

                    // Custom Timeframe Dialog
                    CustomTimeframeDialog(
                        isOpen = isCustomTfOpen,
                        onDismiss = { isCustomTfOpen = false },
                        currentTimeframe = uiState.timeframe,
                        onSelectTimeframe = { viewModel.selectTimeframe(it) }
                    )
                }
            }
        }
    }
}
