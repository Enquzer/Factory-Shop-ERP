'use client';

import React, { useState, useEffect } from 'react';

interface MeasurementPopupProps {
  initialValue: number;
  position: { x: number, y: number };
  onConfirm: (newValue: number) => void;
  onCancel: () => void;
}

export const MeasurementPopup: React.FC<MeasurementPopupProps> = ({ initialValue, position, onConfirm, onCancel }) => {
  const [value, setValue] = useState(initialValue.toString());

  useEffect(() => {
    setValue(Math.round(initialValue).toString());
  }, [initialValue]);

  return (
    <div 
      className="absolute bg-white p-4 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-3 z-[1000] animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: position.x + 10,
        top: position.y - 40,
      }}
    >
      <div className="flex flex-col">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter mb-1">Set Length</label>
          <div className="flex items-center gap-2">
            <div className="relative">
                <input 
                    type="number" 
                    value={value} 
                    autoFocus
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onConfirm(parseFloat(value));
                        if (e.key === 'Escape') onCancel();
                    }}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
                <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">mm</span>
            </div>
            <button 
                onClick={() => onConfirm(parseFloat(value))}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
            >
                Set
            </button>
            <button 
                onClick={onCancel} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
                ×
            </button>
          </div>
      </div>
    </div>
  );
};
