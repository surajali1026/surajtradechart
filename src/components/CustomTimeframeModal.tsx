import React, { useState } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { Timeframe } from '../types/trading';

interface CustomTimeframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
}

const PRESET_GROUPS = [
  {
    category: 'Minutes',
    items: ['1m', '3m', '5m', '15m', '30m'],
  },
  {
    category: 'Hours',
    items: ['1h', '2h', '4h', '6h', '8h', '12h'],
  },
  {
    category: 'Days & Weeks',
    items: ['1d', '3d', '1w', '1M'],
  },
];

export const CustomTimeframeModal: React.FC<CustomTimeframeModalProps> = ({
  isOpen,
  onClose,
  currentTimeframe,
  onSelectTimeframe,
}) => {
  const [customNum, setCustomNum] = useState<string>('10');
  const [customUnit, setCustomUnit] = useState<'m' | 'h' | 'd' | 'w'>('m');

  if (!isOpen) return null;

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customNum, 10);
    if (isNaN(val) || val <= 0) return;
    const tf = `${val}${customUnit}`;
    onSelectTimeframe(tf);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Custom Timeframe Selector"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="flex flex-col w-full max-w-sm bg-[#181b24] border border-[#242731] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#242731] bg-[#131722]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2962ff]" />
            <span className="font-semibold text-white text-sm">Select Timeframe</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#787b86] hover:bg-[#202430] hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Groups */}
        <div className="p-4 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {PRESET_GROUPS.map((group) => (
            <div key={group.category}>
              <div className="text-[11px] font-semibold text-[#787b86] uppercase tracking-wider mb-1.5">
                {group.category}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {group.items.map((tf) => {
                  const isSelected = currentTimeframe === tf;
                  return (
                    <button
                      key={tf}
                      onClick={() => {
                        onSelectTimeframe(tf);
                        onClose();
                      }}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-sm'
                          : 'bg-[#131722] text-[#d1d4dc] border-[#242731] hover:bg-[#202430] hover:border-[#2a2e39]'
                      }`}
                    >
                      <span>{tf}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Custom Timeframe Creator */}
          <div className="pt-2 border-t border-[#242731]">
            <div className="text-[11px] font-semibold text-[#787b86] uppercase tracking-wider mb-2">
              Custom Interval
            </div>
            <form onSubmit={handleApplyCustom} className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="240"
                value={customNum}
                onChange={(e) => setCustomNum(e.target.value)}
                className="w-20 px-2.5 py-1.5 bg-[#131722] border border-[#242731] rounded-lg text-xs text-white text-center font-mono-numbers outline-none focus:border-[#2962ff]"
                placeholder="10"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as any)}
                className="px-2 py-1.5 bg-[#131722] border border-[#242731] rounded-lg text-xs text-white outline-none cursor-pointer focus:border-[#2962ff]"
              >
                <option value="m">Minute(s)</option>
                <option value="h">Hour(s)</option>
                <option value="d">Day(s)</option>
                <option value="w">Week(s)</option>
              </select>
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 bg-[#2962ff] hover:bg-[#1e4bd8] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
