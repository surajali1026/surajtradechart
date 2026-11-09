import React, { useState, useMemo } from 'react';
import { TradingPair } from '../types/trading';
import { formatPrice } from './CandlestickChart';
import { Search, Star, TrendingUp, TrendingDown, Layers, X, Flame } from 'lucide-react';

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  pairs: TradingPair[];
  currentSymbol: string;
  onSelectPair: (symbol: string) => void;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
}

type TabType = 'watchlist' | 'top100' | 'gainers' | 'losers';

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  pairs,
  currentSymbol,
  onSelectPair,
  favorites,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('watchlist');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. My Watchlist items
  const watchlistItems = useMemo(() => {
    return pairs.filter((p) => favorites.includes(p.symbol));
  }, [pairs, favorites]);

  // 2. Top 100 Coins by Quote Volume
  const top100Items = useMemo(() => {
    return [...pairs].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 100);
  }, [pairs]);

  // 3. Top Gainers by Price Change %
  const topGainers = useMemo(() => {
    return [...pairs].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 50);
  }, [pairs]);

  // 4. Top Losers by Price Change %
  const topLosers = useMemo(() => {
    return [...pairs].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 50);
  }, [pairs]);

  // Active items based on selected tab
  const tabItems = useMemo(() => {
    switch (activeTab) {
      case 'watchlist': return watchlistItems;
      case 'top100': return top100Items;
      case 'gainers': return topGainers;
      case 'losers': return topLosers;
    }
  }, [activeTab, watchlistItems, top100Items, topGainers, topLosers]);

  // Filtered by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return tabItems;
    const q = searchQuery.toUpperCase();
    return tabItems.filter((item) => item.symbol.includes(q) || item.baseAsset.includes(q));
  }, [tabItems, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Binance Futures Watchlist"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
    >
      <div className="flex flex-col w-full max-w-lg h-[82vh] max-h-[680px] bg-[#181b24] border border-[#242731] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#242731] bg-[#131722]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm tracking-wide">Binance USD-M Futures</span>
            <span className="text-[11px] text-[#787b86]">· {pairs.length} Pairs</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#787b86] hover:bg-[#202430] hover:text-white transition-colors cursor-pointer"
            aria-label="Close Watchlist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-4 py-2.5 bg-[#181b24] border-b border-[#242731]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#131722] rounded-lg border border-[#242731] focus-within:border-[#2962ff] transition-colors">
            <Search className="w-4 h-4 text-[#787b86] shrink-0" />
            <input
              type="text"
              placeholder="Search symbol (e.g. BTC, ETH, SOL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-[#787b86] outline-none font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#787b86] hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 4-Part Tabs (Watchlist, Top 100, Gainers, Losers) */}
        <div className="flex items-center gap-1 px-3 py-1.5 bg-[#131722] border-b border-[#242731] overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-[#2962ff] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Watchlist ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('top100')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'top100'
                ? 'bg-[#2962ff] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Top 100</span>
          </button>

          <button
            onClick={() => setActiveTab('gainers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'gainers'
                ? 'bg-[#089981] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#089981] hover:bg-[#1e222d]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-inherit" />
            <span>Top Gainers</span>
          </button>

          <button
            onClick={() => setActiveTab('losers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'losers'
                ? 'bg-[#f23645] text-white shadow-sm'
                : 'text-[#787b86] hover:text-[#f23645] hover:bg-[#1e222d]'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-inherit" />
            <span>Top Losers</span>
          </button>
        </div>

        {/* Column Header */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#181b24] border-b border-[#242731] text-[10.5px] font-semibold text-[#787b86] uppercase tracking-wider">
          <div className="flex items-center gap-6">
            <span className="w-4"></span>
            <span>Symbol</span>
          </div>
          <div className="flex items-center gap-8 pr-2">
            <span>Last Price</span>
            <span className="w-14 text-right">24h Chg</span>
          </div>
        </div>

        {/* Pair List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#242731]/50">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4 text-[#787b86]">
              {activeTab === 'watchlist' && favorites.length === 0 ? (
                <>
                  <Star className="w-8 h-8 text-[#787b86] mb-2 opacity-40" />
                  <p className="text-sm font-medium text-white">Your Watchlist is empty</p>
                  <p className="text-xs mt-1">Click the star on any pair in Top 100, Gainers, or Losers to add it here.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">No trading pairs found</p>
                  <p className="text-xs mt-1">Try a different search keyword.</p>
                </>
              )}
            </div>
          ) : (
            filteredItems.map((pair) => {
              const isFav = favorites.includes(pair.symbol);
              const isSelected = pair.symbol === currentSymbol;
              const isBull = pair.priceChangePercent >= 0;

              return (
                <div
                  key={pair.symbol}
                  className={`flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer hover:bg-[#202430] ${
                    isSelected ? 'bg-[#2962ff]/10 border-l-2 border-[#2962ff]' : ''
                  }`}
                  onClick={() => {
                    onSelectPair(pair.symbol);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Star Favorite Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(pair.symbol);
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isFav ? 'text-[#ff9800]' : 'text-[#787b86] hover:text-white'
                      }`}
                      title={isFav ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      aria-label="Toggle favorite"
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-xs">{pair.baseAsset}</span>
                        <span className="text-[10px] text-[#787b86]">/USDT</span>
                      </div>
                      <div className="text-[10px] text-[#787b86] font-mono-numbers">
                        Vol ${(pair.quoteVolume / 1_000_000).toFixed(1)}M
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono-numbers text-right">
                    <div className="text-xs font-semibold text-white">
                      {formatPrice(pair.price)}
                    </div>
                    <div
                      className={`w-16 px-1.5 py-0.5 rounded text-[11px] font-semibold text-right ${
                        isBull ? 'bg-[#089981]/15 text-[#089981]' : 'bg-[#f23645]/15 text-[#f23645]'
                      }`}
                    >
                      {isBull ? '+' : ''}{pair.priceChangePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#131722] border-t border-[#242731] flex items-center justify-between text-[11px] text-[#787b86]">
          <span>Perpetual Futures USD-M</span>
          <span>Showing {filteredItems.length} items</span>
        </div>
      </div>
    </div>
  );
};
