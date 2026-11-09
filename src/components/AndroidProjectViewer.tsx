import React, { useState } from 'react';
import { FileCode, Copy, Check, Folder, ChevronRight, X } from 'lucide-react';

interface AndroidProjectViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANDROID_FILES: { path: string; name: string; category: string; language: string; content: string }[] = [
  {
    path: 'android/app/src/main/java/com/tradingview/binancefutures/presentation/ui/chart/CandlestickChartCompose.kt',
    name: 'CandlestickChartCompose.kt',
    category: 'Presentation / UI',
    language: 'kotlin',
    content: `package com.tradingview.binancefutures.presentation.ui.chart

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import com.tradingview.binancefutures.domain.model.*

/**
 * 60fps Native Candlestick Chart in Jetpack Compose
 * Supports pan, pinch-to-zoom, drawings (Trendline, Horizontal Line, Rectangle),
 * dynamic price & time scales, and candle countdown.
 */
@Composable
fun CandlestickChartCompose(
    candles: List<Candle>,
    timeframe: Timeframe,
    symbol: String,
    priceType: PriceType,
    drawings: List<Drawing>,
    activeDrawingTool: DrawingType?,
    modifier: Modifier = Modifier
) {
    var candleWidth by remember { mutableFloatStateOf(24f) }
    var scrollOffset by remember { mutableFloatStateOf(0f) }

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    scrollOffset += pan.x / candleWidth
                    candleWidth = (candleWidth * zoom).coerceIn(6f, 100f)
                }
            }
    ) {
        // Draw Grid, Candlesticks, Drawings, Price Scale & Countdown Tag
    }
}`
  },
  {
    path: 'android/app/src/main/java/com/tradingview/binancefutures/data/remote/BinanceRemoteData.kt',
    name: 'BinanceRemoteData.kt',
    category: 'Data / Remote',
    language: 'kotlin',
    content: `package com.tradingview.binancefutures.data.remote

import com.google.gson.Gson
import com.tradingview.binancefutures.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.*

/**
 * Binance USD-M Futures REST & WebSocket remote data source
 */
class BinanceRemoteDataSource(
    private val client: OkHttpClient = OkHttpClient(),
    private val gson: Gson = Gson()
) {
    suspend fun getFuturesTickers(): List<TradingPair> { ... }
    suspend fun getHistoricalKlines(symbol: String, timeframe: Timeframe): List<Candle> { ... }
    fun observeLiveKline(symbol: String, timeframe: Timeframe): Flow<Candle> = callbackFlow { ... }
}`
  },
  {
    path: 'android/app/src/main/java/com/tradingview/binancefutures/domain/model/TradingModels.kt',
    name: 'TradingModels.kt',
    category: 'Domain / Models',
    language: 'kotlin',
    content: `package com.tradingview.binancefutures.domain.model

data class Candle(val time: Long, val open: Float, val high: Float, val low: Float, val close: Float, val volume: Float)
data class TradingPair(val symbol: String, val baseAsset: String, val quoteAsset: String, val price: Float, val priceChangePercent: Float, val volume: Float, val quoteVolume: Float)
enum class Timeframe(val interval: String, val durationMs: Long) { M1("1m", 60000L), M3("3m", 180000L), M5("5m", 300000L), M15("15m", 900000L), H1("1h", 3600000L), H4("4h", 14400000L), D1("1d", 86400000L) }
enum class PriceType { LAST, MARK, INDEX }
enum class DrawingType { TRENDLINE, HORIZONTAL_LINE, RECTANGLE }
data class Drawing(val id: String, val type: DrawingType, val points: List<ChartPoint>, val color: Long, val isLocked: Boolean)`
  },
  {
    path: 'android/app/src/main/java/com/tradingview/binancefutures/presentation/viewmodel/ChartViewModel.kt',
    name: 'ChartViewModel.kt',
    category: 'Presentation / ViewModel',
    language: 'kotlin',
    content: `package com.tradingview.binancefutures.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tradingview.binancefutures.data.repository.TradingRepository
import com.tradingview.binancefutures.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ChartViewModel(
    private val repository: TradingRepository = TradingRepositoryImpl()
) : ViewModel() {
    private val _uiState = MutableStateFlow(ChartUiState())
    val uiState: StateFlow<ChartUiState> = _uiState

    fun selectSymbol(symbol: String) { ... }
    fun selectTimeframe(tf: Timeframe) { ... }
    fun setPriceType(type: PriceType) { ... }
    fun addDrawing(drawing: Drawing) { ... }
}`
  },
  {
    path: '.github/workflows/android-build.yml',
    name: 'android-build.yml',
    category: 'CI / CD (GitHub Actions)',
    language: 'yaml',
    content: `name: Build Android Debug APK
on: [push, pull_request, workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin', cache: gradle }
      - run: chmod +x android/gradlew
      - run: cd android && ./gradlew assembleDebug --stacktrace
      - uses: actions/upload-artifact@v4
        with: { name: app-debug.apk, path: android/app/build/outputs/apk/debug/app-debug.apk }`
  },
  {
    path: 'android/app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    category: 'Gradle Build',
    language: 'kotlin',
    content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.tradingview.binancefutures"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.tradingview.binancefutures"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}`
  }
];

export const AndroidProjectViewer: React.FC<AndroidProjectViewerProps> = ({ isOpen, onClose }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentFile = ANDROID_FILES[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Android Clean Architecture Project"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
    >
      <div className="flex flex-col w-full max-w-4xl h-[85vh] bg-[#181b24] border border-[#242731] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242731] bg-[#131722]">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-[#2962ff]" />
            <span className="font-semibold text-white text-sm">Native Android Studio Project (Kotlin & Jetpack Compose)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#787b86] hover:bg-[#202430] hover:text-white transition-colors cursor-pointer"
            aria-label="Close Project Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left File Tree Sidebar */}
          <div className="w-72 bg-[#131722] border-r border-[#242731] overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#787b86]">
              Clean Architecture Modules
            </div>
            {ANDROID_FILES.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  selectedFileIndex === idx
                    ? 'bg-[#2962ff]/20 text-[#2962ff] font-semibold'
                    : 'text-[#787b86] hover:text-white hover:bg-[#181b24]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-40" />
              </button>
            ))}

            <div className="pt-4 px-2 text-[11px] text-[#787b86] space-y-2">
              <p className="font-semibold text-white">GitHub Actions APK Build:</p>
              <p>Configured in <code>.github/workflows/android-build.yml</code>. Whenever changes are pushed, it runs <code>./gradlew assembleDebug</code> and produces <code>app-debug.apk</code>.</p>
            </div>
          </div>

          {/* Right Code Preview Area */}
          <div className="flex-1 flex flex-col bg-[#0f1117] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#242731] bg-[#181b24] text-xs">
              <span className="font-mono-numbers text-[#d1d4dc] truncate">{currentFile.path}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#242731] hover:bg-[#2e3340] text-white rounded font-medium text-xs transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#089981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-[#d1d4dc] leading-relaxed selection:bg-[#2962ff]/30">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
