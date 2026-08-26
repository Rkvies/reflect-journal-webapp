import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState<{ top: number; left: number; position: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 220;
    const tooltipHeight = 70;
    const margin = 8;

    // Check if there's enough space above
    const spaceAbove = rect.top;
    const placeAbove = spaceAbove >= tooltipHeight + margin;

    let left = rect.left + rect.width / 2;
    // Prevent tooltip from overflowing the viewport horizontally
    const minLeft = tooltipWidth / 2 + 10;
    const maxLeft = window.innerWidth - tooltipWidth / 2 - 10;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    let top = 0;
    if (placeAbove) {
      top = rect.top - margin;
    } else {
      top = rect.bottom + margin;
    }

    setCoords({
      top,
      left,
      position: placeAbove ? 'top' : 'bottom',
    });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <span
        ref={triggerRef}
        id={id}
        className={`inline-flex items-center gap-1 cursor-help ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
        <button
          type="button"
          aria-label="Confidence score info"
          className="inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 focus:outline-none focus:text-indigo-600 cursor-pointer transition-colors"
        >
          <Info className="w-3 h-3 flex-shrink-0 opacity-80 hover:opacity-100" />
        </button>
      </span>

      {/* Portal Tooltip to body to prevent overflow clipping and misplaced layout */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: coords.position === 'top' ? coords.top : coords.top,
            left: coords.left,
            transform: coords.position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            zIndex: 9999,
          }}
          className="w-52 sm:w-56 p-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white dark:text-slate-100 text-[11px] font-sans font-normal leading-tight shadow-xl border border-slate-700/80 text-center pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          {explanation}
          {/* Tooltip Arrow */}
          <span
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            className={`absolute border-4 border-transparent ${
              coords.position === 'top'
                ? 'top-full -mt-[1px] border-t-slate-900/95 dark:border-t-slate-800/95'
                : 'bottom-full -mb-[1px] border-b-slate-900/95 dark:border-b-slate-800/95'
            }`}
          />
        </div>,
        document.body
      )}
    </>
  );
};
