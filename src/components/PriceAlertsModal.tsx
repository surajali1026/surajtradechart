import React, { useState } from 'react';
import { AlertCondition, PriceAlert } from '../types/trading';
import { formatPrice } from './CandlestickChart';
import { Bell, Trash2, X, Volume2, Smartphone } from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  alerts: PriceAlert[];
  onAddAlert: (targetPrice: number, condition: AlertCondition, sound: boolean, vibrate: boolean) => void;
  onDeleteAlert: (id: string) => void;
  onClearTriggered: () => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onClearTriggered,
}) => {
  const [targetPriceInput, setTargetPriceInput] = useState<string>(currentPrice.toString());
  const [condition, setCondition] = useState<AlertCondition>('CROSSES_ABOVE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPriceInput);
    if (isNaN(price) || price <= 0) return;
    onAddAlert(price, condition, soundEnabled, vibrateEnabled);
  };

  const currentSymbolAlerts = alerts.filter((a) => a.symbol === symbol);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Price Alerts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="flex flex-col w-full max-w-md bg-[#181b24] border border-[#242731] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#242731] bg-[#131722]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#2962ff]" />
            <span className="font-semibold text-white text-sm">Price Alerts · {symbol}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#787b86] hover:bg-[#202430] hover:text-white transition-colors cursor-pointer"
            aria-label="Close Alerts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Create Alert Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs text-[#787b86]">
                <span>Target Price (USD)</span>
                <span className="font-mono-numbers">Current: {formatPrice(currentPrice)}</span>
              </div>
              <input
                type="number"
                step="any"
                required
                value={targetPriceInput}
                onChange={(e) => setTargetPriceInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#131722] border border-[#242731] rounded-lg text-sm text-white font-mono-numbers focus:border-[#2962ff] outline-none"
                placeholder="Enter price..."
              />
            </div>

            {/* Condition Selector */}
            <div>
              <label className="block mb-1.5 text-xs text-[#787b86]">Trigger Condition</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'CROSSES_ABOVE', label: 'Crosses Above' },
                  { id: 'CROSSES_BELOW', label: 'Crosses Below' },
                  { id: 'CROSSING', label: 'Any Crossing' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCondition(item.id as AlertCondition)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      condition === item.id
                        ? 'bg-[#2962ff] text-white border-[#2962ff]'
                        : 'bg-[#131722] text-[#787b86] border-[#242731] hover:text-white hover:bg-[#1e222d]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Options (Sound & Vibration) */}
            <div className="flex items-center justify-between pt-1 text-xs text-[#787b86]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded border-[#242731] accent-[#2962ff]"
                />
                <Volume2 className="w-3.5 h-3.5 text-[#d1d4dc]" />
                <span className="text-[#d1d4dc]">Audio Chime</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vibrateEnabled}
                  onChange={(e) => setVibrateEnabled(e.target.checked)}
                  className="rounded border-[#242731] accent-[#2962ff]"
                />
                <Smartphone className="w-3.5 h-3.5 text-[#d1d4dc]" />
                <span className="text-[#d1d4dc]">Device Vibration</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#2962ff] hover:bg-[#1e4bd8] text-white font-medium text-xs rounded-lg shadow-md transition-colors cursor-pointer"
            >
              Set Price Alert
            </button>
          </form>

          {/* Active Alerts List */}
          <div className="pt-2 border-t border-[#242731]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Active Alerts ({currentSymbolAlerts.length})</span>
              {alerts.some((a) => a.triggered) && (
                <button
                  onClick={onClearTriggered}
                  className="text-[11px] text-[#787b86] hover:text-white cursor-pointer"
                >
                  Clear Triggered
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {currentSymbolAlerts.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#787b86]">
                  No active alerts for {symbol}
                </div>
              ) : (
                currentSymbolAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                      a.triggered
                        ? 'bg-[#f23645]/10 border-[#f23645]/30 text-[#f23645]'
                        : 'bg-[#131722] border-[#242731] text-[#d1d4dc]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono-numbers">{formatPrice(a.targetPrice)}</span>
                        <span className="text-[10px] text-[#787b86]">
                          {a.condition.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#787b86]">
                        {a.triggered ? 'Triggered' : 'Waiting for price'}
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteAlert(a.id)}
                      className="p-1 rounded text-[#787b86] hover:text-[#f23645] hover:bg-[#202430] transition-colors cursor-pointer"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
