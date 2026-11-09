package com.tradingview.binancefutures.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tradingview.binancefutures.presentation.ui.chart.CandlestickChartCompose
import com.tradingview.binancefutures.presentation.ui.theme.*
import com.tradingview.binancefutures.presentation.viewmodel.ChartViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TradingViewTheme {
                val viewModel: ChartViewModel = viewModel()
                val uiState by viewModel.uiState.collectAsState()

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = TVBackground
                ) {
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Chart Area
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
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    }
}
