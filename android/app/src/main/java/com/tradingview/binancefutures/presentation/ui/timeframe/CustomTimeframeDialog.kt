package com.tradingview.binancefutures.presentation.ui.timeframe

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.tradingview.binancefutures.domain.model.Timeframe
import com.tradingview.binancefutures.presentation.ui.theme.*

@Composable
fun CustomTimeframeDialog(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    currentTimeframe: Timeframe,
    onSelectTimeframe: (Timeframe) -> Unit
) {
    if (!isOpen) return

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = TVSurface
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Select Timeframe",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TVTextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text("ALL TIMEFRAMES", color = TVTextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))

                val allTfs = listOf(
                    Timeframe.M1, Timeframe.M3, Timeframe.M5, Timeframe.M15,
                    Timeframe.H1, Timeframe.H4, Timeframe.D1
                )

                allTfs.chunked(4).forEach { rowItems ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        rowItems.forEach { tf ->
                            val isSelected = tf == currentTimeframe
                            Surface(
                                onClick = {
                                    onSelectTimeframe(tf)
                                    onDismiss()
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) TVPrimaryBlue else TVBackground,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(34.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = tf.displayName,
                                        color = if (isSelected) Color.White else TVTextSecondary,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
