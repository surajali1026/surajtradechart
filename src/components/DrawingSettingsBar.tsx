import React from 'react';
import { Drawing } from '../types/trading';
import { Lock, Unlock, Trash2, X, Move } from 'lucide-react';

interface DrawingSettingsBarProps {
  drawing: Drawing;
  onUpdate: (drawing: Drawing) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const DEFAULT_COLORS = ['#2962ff', '#089981', '#f23645', '#ff9800', '#ab47bc'];

export const DrawingSettingsBar: React.FC<DrawingSettingsBarProps> = ({
  drawing,
  onUpdate,
  onDelete,
  onClose,
}) => {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools settings"
      className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl backdrop-blur-md select-none text-xs"
    >
      {/* Move affordance indicator */}
      <div
        className="flex items-center gap-1 text-[#787b86] pr-1 border-r border-[#2a2e39]"
        title={drawing.isLocked ? "Locked - Unlock to move" : "Drag points on chart to move"}
      >
        <Move className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium hidden sm:inline">
          {drawing.isLocked ? 'Locked' : 'Move'}
        </span>
      </div>

      {/* Lock / Unlock Toggle */}
      <button
        onClick={() => onUpdate({ ...drawing, isLocked: !drawing.isLocked })}
        className={`p-1.5 rounded transition-colors cursor-pointer ${
          drawing.isLocked
            ? 'bg-[#ff9800]/20 text-[#ff9800]'
            : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]'
        }`}
        title={drawing.isLocked ? 'Unlock drawing' : 'Lock drawing in place'}
        aria-label={drawing.isLocked ? 'Unlock drawing' : 'Lock drawing'}
      >
        {drawing.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Default Colors Picker */}
      <div className="flex items-center gap-1 px-1 border-x border-[#2a2e39]">
        {DEFAULT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ ...drawing, color: c })}
            style={{ backgroundColor: c }}
            className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
              drawing.color === c ? 'scale-125 ring-2 ring-white/60' : 'opacity-80 hover:opacity-100'
            }`}
            title={`Set color ${c}`}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      {/* Delete Drawing */}
      <button
        onClick={() => onDelete(drawing.id)}
        className="p-1.5 rounded text-[#787b86] hover:bg-[#f23645]/20 hover:text-[#f23645] transition-colors cursor-pointer"
        title="Delete drawing"
        aria-label="Delete drawing"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Close/Deselect */}
      <button
        onClick={onClose}
        className="p-1 rounded text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition-colors cursor-pointer"
        title="Deselect"
        aria-label="Close settings bar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
