import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// --- Light Mode Styles ---
const LIGHT_BG = "bg-[#e0e5ec]";
const LIGHT_OUTER_SHADOW = "shadow-[7px_7px_14px_#bec3c9,-7px_-7px_14px_#ffffff]"; 
const LIGHT_INNER_SHADOW = "shadow-[inset_6px_6px_10px_#bec3c9,inset_-6px_-6px_10px_#ffffff]";
const LIGHT_BORDER = "border border-white/40";

// --- Dark Mode Styles ---
const DARK_BG = "bg-gray-800";
const DARK_OUTER_SHADOW = "shadow-[6px_6px_12px_#111827,-6px_-6px_12px_#374151]";
const DARK_INNER_SHADOW = "shadow-[inset_5px_5px_10px_#111827,inset_-5px_-5px_10px_#374151]";
const DARK_BORDER = "border border-gray-700/30";

interface CommonProps {
  darkMode: boolean;
}

interface CardProps extends CommonProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", darkMode }) => {
  const themeClasses = darkMode 
    ? `${DARK_BG} ${DARK_OUTER_SHADOW} ${DARK_BORDER} text-gray-200`
    : `${LIGHT_BG} ${LIGHT_OUTER_SHADOW} ${LIGHT_BORDER} text-gray-700`;

  return (
    <div className={`rounded-[24px] transition-colors duration-300 ${themeClasses} ${className}`}>
      {children}
    </div>
  );
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  isActive?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, className = "", isActive = false, darkMode, ...props }) => {
  const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 ease-in-out outline-none select-none flex items-center justify-center gap-2";
  
  let themeStyles = "";
  
  if (darkMode) {
    const activeState = isActive ? `${DARK_INNER_SHADOW} text-indigo-400` : `${DARK_OUTER_SHADOW} active:${DARK_INNER_SHADOW} hover:-translate-y-0.5 active:translate-y-0 text-gray-200`;
    themeStyles = `${DARK_BG} ${DARK_BORDER} ${activeState}`;
  } else {
    const activeState = isActive ? `${LIGHT_INNER_SHADOW} text-indigo-600` : `${LIGHT_OUTER_SHADOW} active:${LIGHT_INNER_SHADOW} hover:-translate-y-0.5 active:translate-y-0 text-gray-700`;
    themeStyles = `${LIGHT_BG} ${LIGHT_BORDER} ${activeState}`;
  }

  return (
    <button className={`${baseStyles} ${themeStyles} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface SliderProps extends InputHTMLAttributes<HTMLInputElement>, CommonProps {
  label: string;
  valueDisplay?: string | number;
}

export const Slider: React.FC<SliderProps> = ({ label, valueDisplay, className = "", darkMode, ...props }) => {
  const shadowLight = darkMode ? '#374151' : '#ffffff';
  const shadowDark = darkMode ? '#111827' : '#a0aec0';

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex justify-between items-center px-1">
        <label className={`text-sm font-bold tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</label>
        <span className={`text-xs font-mono py-1 px-2 rounded-lg ${darkMode ? 'bg-gray-900 text-indigo-400 shadow-inner' : 'bg-gray-200 text-indigo-600 shadow-inner'}`}>
          {valueDisplay}
        </span>
      </div>
      <div className="relative h-8 flex items-center">
        <style>{`
          .slider-${darkMode ? 'dark' : 'light'}::-webkit-slider-runnable-track {
            width: 100%;
            height: 10px;
            background: ${darkMode ? '#1f2937' : '#e0e5ec'};
            border-radius: 9999px;
            box-shadow: inset 3px 3px 6px ${shadowDark}, inset -3px -3px 6px ${shadowLight};
          }
          .slider-${darkMode ? 'dark' : 'light'}::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 22px;
            width: 22px;
            border-radius: 50%;
            background: ${darkMode ? '#374151' : '#e0e5ec'};
            margin-top: -6px;
            border: 1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'};
            box-shadow: 4px 4px 8px ${shadowDark}, -4px -4px 8px ${shadowLight};
            cursor: pointer;
            transition: transform 0.1s;
          }
          .slider-${darkMode ? 'dark' : 'light'}::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
        `}</style>
        <input 
          type="range" 
          className={`range-input w-full slider-${darkMode ? 'dark' : 'light'}`}
          {...props} 
        />
      </div>
    </div>
  );
};