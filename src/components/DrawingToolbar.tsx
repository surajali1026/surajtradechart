import React, { useState } from 'react';
import { DrawingType } from '../types/trading';
import { MousePointer, TrendingUp, Minus, Square, Percent, Trash2, ChevronRight, Pin, PinOff } from 'lucide-react';

interface DrawingToolbarProps {
  activeDrawingTool: DrawingType | null;
  onSelectTool: (tool: DrawingType | null) => void;
  onClearAllDrawings: () => void;
  drawingsCount: number;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeDrawingTool,
  onSelectTool,
  onClearAllDrawings,
  drawingsCount,
}) => {
  // Auto-hide state: collapses when not hovered or unpinned
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // If a tool is active, or if user is hovering, or if pinned, keep panel expanded
  const isOpen = isPinned || isHovered || activeDrawingTool !== null;

  return (
    <div
      className="absolute top-0 left-0 bottom-7 z-30 flex items-start select-none pointer-events-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sliding Toolbar Panel */}
      <aside
        aria-label="Chart drawing tools"
        className={`pointer-events-auto h-full flex flex-col items-center py-2 px-1 bg-[#181b24]/95 backdrop-blur-md border-r border-[#242731] gap-1 shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Pointer / Cursor */}
        <button
          onClick={() => onSelectTool(null)}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawingTool === null
              ? 'bg-[#2962ff] text-white shadow'
              : 'text-[#787b86] hover:bg-[#202430] hover:text-[#d1d4dc]'
          }`}
          title="Cursor / Select tool"
          aria-label="Cursor mode"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-[#242731] my-1" />

        {/* Trendline */}
        <button
          onClick={() => onSelectTool(activeDrawingTool === 'trendline' ? null : 'trendline')}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawingTool === 'trendline'
              ? 'bg-[#2962ff] text-white shadow'
              : 'text-[#787b86] hover:bg-[#202430] hover:text-[#d1d4dc]'
          }`}
          title="Trendline (Click 2 points)"
          aria-label="Draw Trendline"
        >
          <TrendingUp className="w-4 h-4" />
        </button>

        {/* Horizontal Line */}
        <button
          onClick={() => onSelectTool(activeDrawingTool === 'horizontal_line' ? null : 'horizontal_line')}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawingTool === 'horizontal_line'
              ? 'bg-[#2962ff] text-white shadow'
              : 'text-[#787b86] hover:bg-[#202430] hover:text-[#d1d4dc]'
          }`}
          title="Horizontal Line (Click 1 price level)"
          aria-label="Draw Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Rectangle */}
        <button
          onClick={() => onSelectTool(activeDrawingTool === 'rectangle' ? null : 'rectangle')}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawingTool === 'rectangle'
              ? 'bg-[#2962ff] text-white shadow'
              : 'text-[#787b86] hover:bg-[#202430] hover:text-[#d1d4dc]'
          }`}
          title="Rectangle / Support & Resistance Box"
          aria-label="Draw Rectangle"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Price Change in % (Price Range) */}
        <button
          onClick={() => onSelectTool(activeDrawingTool === 'price_range' ? null : 'price_range')}
          className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
            activeDrawingTool === 'price_range'
              ? 'bg-[#2962ff] text-white shadow'
              : 'text-[#787b86] hover:bg-[#202430] hover:text-[#d1d4dc]'
          }`}
          title="Price Change in % (Measure Price & Percentage Change)"
          aria-label="Price Change in Percentage Tool"
        >
          <Percent className="w-4 h-4" />
        </button>

        {/* Clear All Drawings (only when drawings exist) */}
        {drawingsCount > 0 && (
          <button
            onClick={onClearAllDrawings}
            className="w-9 h-9 mt-auto rounded flex items-center justify-center text-[#787b86] hover:bg-[#f23645]/20 hover:text-[#f23645] transition-colors cursor-pointer"
            title={`Delete all drawings (${drawingsCount})`}
            aria-label="Clear all drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Pin / Unpin Auto-Hide Toggle */}
        <div className="w-6 h-[1px] bg-[#242731] my-1 mt-auto" />
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={`w-8 h-8 rounded flex items-center justify-center text-[10px] transition-colors cursor-pointer ${
            isPinned
              ? 'bg-[#242731] text-[#2962ff]'
              : 'text-[#787b86] hover:text-white hover:bg-[#202430]'
          }`}
          title={isPinned ? 'Unpin (Auto-Hide enabled)' : 'Pin panel open'}
          aria-label="Toggle pin"
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Auto-Hide Toggle Tab Handle (visible on left edge when collapsed) */}
      {!isOpen && (
        <button
          onClick={() => setIsHovered(true)}
          className="pointer-events-auto mt-14 flex items-center justify-center w-5 h-12 bg-[#181b24]/90 hover:bg-[#202430] text-[#787b86] hover:text-white border-y border-r border-[#242731] rounded-r-md shadow-md transition-colors cursor-pointer"
          title="Open Drawing Tools"
          aria-label="Show drawing tools"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
