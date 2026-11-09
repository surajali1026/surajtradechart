import React from 'react';
import { Play, Pause, SkipForward, X, RotateCcw } from 'lucide-react';

interface BarReplayBarProps {
  isActive: boolean;
  isPlaying: boolean;
  currentIndex: number;
  totalCandles: number;
  speedMs: number;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onResetToCut: () => void;
  onChangeSpeed: (speedMs: number) => void;
  onSeek: (index: number) => void;
  onExit: () => void;
}

export const BarReplayBar: React.FC<BarReplayBarProps> = ({
  isActive,
  isPlaying,
  currentIndex,
  totalCandles,
  speedMs,
  onTogglePlay,
  onStepForward,
  onResetToCut,
  onChangeSpeed,
  onSeek,
  onExit,
}) => {
  if (!isActive) return null;

  return (
    <div
      role="region"
      aria-label="Bar Replay Controls"
      className="flex items-center justify-between px-3 py-1.5 bg-[#181b24] border-b border-[#2962ff]/40 text-xs text-white z-20 select-none shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-semibold text-[#2962ff] text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Bar Replay</span>
        </span>
        <span className="text-[11px] text-[#787b86] hidden md:inline">
          Click any candle on chart to set starting point
        </span>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        {/* Reset to initial cut */}
        <button
          onClick={onResetToCut}
          className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#202430] transition-colors cursor-pointer"
          title="Reset to cut point"
          aria-label="Reset replay"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
            isPlaying ? 'bg-[#ff9800] text-black font-semibold' : 'bg-[#2962ff] text-white hover:bg-[#1e4bd8]'
          }`}
          aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step Forward 1 Candle */}
        <button
          onClick={onStepForward}
          className="p-1 rounded text-[#787b86] hover:text-white hover:bg-[#202430] transition-colors cursor-pointer"
          title="Step forward 1 candle"
          aria-label="Step forward 1 candle"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Scrubber */}
        <div className="flex items-center gap-2 px-2">
          <input
            type="range"
            min={10}
            max={Math.max(10, totalCandles - 1)}
            value={currentIndex}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="w-24 sm:w-36 h-1 bg-[#242731] rounded-lg appearance-none cursor-pointer accent-[#2962ff]"
            aria-label="Replay progress"
          />
          <span className="text-[10px] text-[#787b86] font-mono-numbers">
            {currentIndex + 1}/{totalCandles}
          </span>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 border-l border-[#242731] pl-2">
          {[
            { label: '1x', ms: 1000 },
            { label: '2x', ms: 500 },
            { label: '5x', ms: 200 },
            { label: '10x', ms: 100 },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => onChangeSpeed(s.ms)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors cursor-pointer ${
                speedMs === s.ms
                  ? 'bg-[#242731] text-white font-bold'
                  : 'text-[#787b86] hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exit Replay Button */}
      <button
        onClick={onExit}
        className="flex items-center gap-1 px-2 py-1 rounded bg-[#202430] hover:bg-[#2a2e39] text-[#787b86] hover:text-white text-xs transition-colors cursor-pointer"
        aria-label="Exit Replay Mode"
      >
        <X className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </div>
  );
};
