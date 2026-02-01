import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// Common shadow styles
const OUTER_SHADOW = "shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]";
const INNER_SHADOW = "shadow-[inset_6px_6px_10px_0_rgba(163,177,198,0.7),inset_-6px_-6px_10px_0_rgba(255,255,255,0.8)]";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-[#e0e5ec] rounded-[30px] ${OUTER_SHADOW} ${className}`}>
      {children}
    </div>
  );
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, className = "", isActive = false, ...props }) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 ease-in-out outline-none select-none text-[#4a5568]";
  const shadowStyles = isActive 
    ? `${INNER_SHADOW} text-indigo-500` 
    : `${OUTER_SHADOW} active:${INNER_SHADOW} hover:-translate-y-0.5 active:translate-y-0`;

  return (
    <button className={`${baseStyles} ${shadowStyles} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface SliderProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  valueDisplay?: string | number;
}

export const Slider: React.FC<SliderProps> = ({ label, valueDisplay, className = "", ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className="text-sm font-semibold text-gray-600">{label}</label>
        <span className="text-xs font-mono text-gray-500">{valueDisplay}</span>
      </div>
      <div className="relative h-8 flex items-center">
        <input 
          type="range" 
          className="neu-slider w-full"
          {...props} 
        />
      </div>
    </div>
  );
};