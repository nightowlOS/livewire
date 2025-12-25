import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className = '' }) => {
  return (
    <label className={`flex items-center cursor-pointer gap-3 ${className}`}>
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-ableton-accent' : 'bg-ableton-panel border border-ableton-border'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
      {label && <span className="text-sm text-ableton-text font-medium select-none">{label}</span>}
    </label>
  );
};