package com.tradingview.binancefutures.presentation.ui.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.tradingview.binancefutures.domain.model.AlertCondition
import com.tradingview.binancefutures.domain.model.PriceAlert
import com.tradingview.binancefutures.presentation.ui.theme.*
import java.util.Locale

@Composable
fun AlertsDialogCompose(
    isOpen: Boolean,
    onDismiss: () -> Unit,
    symbol: String,
    currentPrice: Float,
    alerts: List<PriceAlert>,
    onAddAlert: (Float, AlertCondition) -> Unit,
    onDeleteAlert: (String) -> Unit
) {
    if (!isOpen) return

    var targetPriceText by remember(currentPrice) { mutableStateOf(String.format(Locale.US, "%.2f", currentPrice)) }
    var selectedCondition by remember { mutableStateOf(AlertCondition.CROSSES_ABOVE) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(16.dp),
            color = TVSurface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Notifications, contentDescription = null, tint = TVPrimaryBlue)
                        Text(
                            text = "Price Alert · $symbol",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = TVTextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Target Price Input
                Text("Target Price (USD)", color = TVTextSecondary, fontSize = 11.sp)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = targetPriceText,
                    onValueChange = { targetPriceText = it },
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
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Condition Buttons
                Text("Trigger Condition", color = TVTextSecondary, fontSize = 11.sp)
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        AlertCondition.CROSSES_ABOVE to "Crosses Above",
                        AlertCondition.CROSSES_BELOW to "Crosses Below"
                    ).forEach { (cond, label) ->
                        val isSelected = selectedCondition == cond
                        Surface(
                            onClick = { selectedCondition = cond },
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) TVPrimaryBlue else TVBackground,
                            modifier = Modifier
                                .weight(1f)
                                .height(34.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    color = if (isSelected) Color.White else TVTextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = {
                        val p = targetPriceText.toFloatOrNull() ?: currentPrice
                        onAddAlert(p, selectedCondition)
                        onDismiss()
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(40.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = TVPrimaryBlue)
                ) {
                    Text("Set Price Alert Line", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                if (alerts.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Active Alerts (${alerts.size})", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyColumn(modifier = Modifier.heightIn(max = 140.dp)) {
                        items(alerts) { a ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .background(TVBackground, RoundedCornerShape(6.dp))
                                    .padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "${a.symbol} ${String.format(Locale.US, "%.2f", a.targetPrice)}",
                                        color = Color.White,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(text = a.condition.name.replace('_', ' '), color = TVTextSecondary, fontSize = 10.sp)
                                }
                                IconButton(onClick = { onDeleteAlert(a.id) }, modifier = Modifier.size(24.dp)) {
                                    Icon(imageVector = Icons.Default.Delete, contentDescription = "Delete", tint = TVBearishRed, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
