package com.tradingview.binancefutures.presentation.ui.watchlist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.tradingview.binancefutures.domain.model.TradingPair
import com.tradingview.binancefutures.presentation.ui.theme.*
import java.util.Locale

enum class WatchlistTab {
    WATCHLIST, TOP_100, GAINERS, LOSERS
}

@Composable
fun WatchlistDialogCompose(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    pairs: List<TradingPair>,
    currentSymbol: String,
    favorites: Set<String>,
    onToggleFavorite: (String) -> Unit,
    onSelectSymbol: (String) -> Unit
) {
    if (!isOpen) return

    var selectedTab by remember { mutableStateOf(WatchlistTab.WATCHLIST) }
    var searchQuery by remember { mutableStateOf("") }

    val filteredList = remember(pairs, selectedTab, searchQuery, favorites) {
        val baseList = when (selectedTab) {
            WatchlistTab.WATCHLIST -> pairs.filter { favorites.contains(it.symbol) }
            WatchlistTab.TOP_100 -> pairs.sortedByDescending { it.quoteVolume }.take(100)
            WatchlistTab.GAINERS -> pairs.sortedByDescending { it.priceChangePercent }.take(50)
            WatchlistTab.LOSERS -> pairs.sortedBy { it.priceChangePercent }.take(50)
        }
        if (searchQuery.isBlank()) {
            baseList
        } else {
            val q = searchQuery.trim().uppercase()
            baseList.filter { it.symbol.contains(q) || it.baseAsset.contains(q) }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            color = TVSurface
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Binance Futures USD-M",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TVTextSecondary)
                    }
                }

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search coin (e.g. BTC, ETH)...", color = TVTextSecondary, fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TVTextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = TVBackground,
                        unfocusedContainerColor = TVBackground,
                        focusedBorderColor = TVPrimaryBlue,
                        unfocusedBorderColor = TVBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .height(50.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                // 4 Tabs: Watchlist, Top 100, Gainers, Losers
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    val tabs = listOf(
                        WatchlistTab.WATCHLIST to "Watchlist",
                        WatchlistTab.TOP_100 to "Top 100",
                        WatchlistTab.GAINERS to "Gainers",
                        WatchlistTab.LOSERS to "Losers"
                    )

                    tabs.forEach { (tab, label) ->
                        val isSelected = selectedTab == tab
                        Surface(
                            onClick = { selectedTab = tab },
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) TVPrimaryBlue else TVBackground,
                            modifier = Modifier
                                .weight(1f)
                                .height(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    color = if (isSelected) Color.White else TVTextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Column Titles
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("SYMBOL", color = TVTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("PRICE / 24H CHG", color = TVTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }

                Divider(color = TVBorder, thickness = 1.dp)

                // Coin List
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(filteredList, key = { it.symbol }) { pair ->
                        val isFav = favorites.contains(pair.symbol)
                        val isBull = pair.priceChangePercent >= 0f
                        val isSelected = pair.symbol == currentSymbol

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onSelectSymbol(pair.symbol)
                                    onDismiss()
                                }
                                .background(if (isSelected) TVPrimaryBlue.copy(alpha = 0.15f) else Color.Transparent)
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                IconButton(
                                    onClick = { onToggleFavorite(pair.symbol) },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isFav) Icons.Default.Star else Icons.Default.StarBorder,
                                        contentDescription = "Favorite",
                                        tint = if (isFav) Color(0xFFFFB300) else TVTextSecondary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = pair.baseAsset,
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "/USDT",
                                            color = TVTextSecondary,
                                            fontSize = 10.sp
                                        )
                                    }
                                    Text(
                                        text = "Vol $${String.format(Locale.US, "%.1f", pair.quoteVolume / 1_000_000f)}M",
                                        color = TVTextSecondary,
                                        fontSize = 10.sp
                                    )
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = String.format(Locale.US, "%.2f", pair.price),
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = String.format(Locale.US, "%s%.2f%%", if (isBull) "+" else "", pair.priceChangePercent),
                                    color = if (isBull) TVBullishGreen else TVBearishRed,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
