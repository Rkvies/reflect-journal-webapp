import React from 'react';
import skyCloudsDay from '../assets/images/peaceful_sky_clouds_1788332495235.jpg';
import skyCloudsNight from '../assets/images/twilight_night_clouds_1788332514189.jpg';

interface BackgroundPatternProps {
  className?: string;
  intensity?: 'subtle' | 'vibrant' | 'default';
  isDeepFocus?: boolean;
}

/**
 * Atmospheric Sky & Cumulus Cloudscape Background for Reflect.
 * Renders the painterly blue sky & warm towering cumulus clouds background
 * with responsive coverage, smooth daylight/twilight transitions, and subtle
 * overlay textures. Softly fades during Deep Focus mode to minimize distraction.
 */
export const BackgroundPattern: React.FC<BackgroundPatternProps> = ({
  className = '',
  intensity = 'default',
  isDeepFocus = false,
}) => {
  return (
    <div
      id="atmospheric-cloud-background"
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-700 ${
        isDeepFocus ? 'opacity-30' : 'opacity-100'
      } ${className}`}
    >
      {/* Light Mode Sky & Warm Cloudscape Wallpaper */}
      <div
        className="absolute inset-0 dark:opacity-0 transition-opacity duration-700 ease-in-out bg-cover bg-center sm:bg-right-bottom bg-no-repeat"
        style={{
          backgroundImage: `url(${skyCloudsDay})`,
          opacity: isDeepFocus ? 0.35 : intensity === 'vibrant' ? 1 : intensity === 'subtle' ? 0.75 : 0.92,
        }}
      />

      {/* Dark Mode Luminous Twilight Cloudscape Wallpaper */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-85 transition-opacity duration-700 ease-in-out bg-cover bg-center sm:bg-right-bottom bg-no-repeat"
        style={{
          backgroundImage: `url(${skyCloudsNight})`,
          opacity: isDeepFocus ? 0.25 : undefined,
        }}
      />

      {/* Soft Ambient Contrast Vignette for Content Readability without washing out clouds */}
      <div className={`absolute inset-0 transition-colors duration-700 ${
        isDeepFocus 
          ? 'bg-slate-50/85 dark:bg-slate-950/90' 
          : 'bg-gradient-to-b from-sky-100/20 via-white/20 to-amber-100/30 dark:from-slate-950/50 dark:via-slate-950/40 dark:to-slate-950/70'
      } pointer-events-none`} />

      {/* Subtle Mindful Stationery Dot-Grid Overlay */}
      <svg
        className={`absolute inset-0 w-full h-full mix-blend-multiply dark:mix-blend-screen transition-opacity duration-700 ${
          isDeepFocus ? 'opacity-10 dark:opacity-10' : 'opacity-35 dark:opacity-20'
        }`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="reflect-sky-dots"
            x="0"
            y="0"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="0.8"
              className="fill-indigo-950/30 dark:fill-indigo-200/25"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#reflect-sky-dots)" />
      </svg>
    </div>
  );
};

export default BackgroundPattern;
