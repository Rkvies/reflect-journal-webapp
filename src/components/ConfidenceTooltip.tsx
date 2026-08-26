import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface ConfidenceTooltipProps {
  children?: React.ReactNode;
  explanation?: string;
  className?: string;
  id?: string;
}

export const ConfidenceTooltip: React.FC<ConfidenceTooltipProps> = ({
  children,
  explanation = "Gemini's estimated confidence based on language and sentiment in this entry.",
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span
      id={id}
      className={`relative inline-flex items-center gap-1 group cursor-help ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      {children}
      <button
        type="button"
        aria-label="Confidence score info"
        className="inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 focus:outline-none focus:text-indigo-600 cursor-pointer transition-colors"
      >
        <Info className="w-3 h-3 flex-shrink-0 opacity-80 group-hover:opacity-100" />
      </button>

      {/* Popover Tooltip */}
      <span
        aria-live="polite"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white dark:text-slate-100 text-[11px] font-sans font-normal leading-tight shadow-xl border border-slate-700/80 z-40 text-center transition-all duration-150 pointer-events-none ${
          isOpen
            ? 'opacity-100 visible scale-100 translate-y-0'
            : 'opacity-0 invisible scale-95 translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:scale-100 group-hover:translate-y-0'
        }`}
      >
        {explanation}
        {/* Tooltip Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95" />
      </span>
    </span>
  );
};
