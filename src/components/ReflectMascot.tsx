import React from 'react';
import { motion } from 'motion/react';

interface ReflectMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showAura?: boolean;
  interactive?: boolean;
}

/**
 * Mindful Fox Companion Mascot holding a journal.
 * Soft-flat premium aesthetic with rich indigo fur, soft cream accents,
 * sage inner ears & journal cover, and thin, elegant strokes.
 */
export const ReflectMascot: React.FC<ReflectMascotProps> = ({
  size = 'md',
  className = '',
  showAura = true,
  interactive = true,
}) => {
  const dimensions = {
    sm: { box: 'w-10 h-10', svg: 40 },
    md: { box: 'w-13 h-13 sm:w-15 sm:h-15', svg: 60 },
    lg: { box: 'w-18 h-18 sm:w-20 sm:h-20', svg: 80 },
    xl: { box: 'w-24 h-24 sm:w-28 sm:h-28', svg: 112 },
  };

  const currentDim = dimensions[size];

  return (
    <motion.div
      id="reflect-fox-mascot"
      className={`relative inline-flex items-center justify-center select-none flex-shrink-0 ${currentDim.box} ${className}`}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={interactive ? { scale: 1.06, y: -1 } : undefined}
    >
      {/* Soft Ambient Halo / Aura */}
      {showAura && (
        <motion.div
          className="absolute inset-0.5 rounded-2xl bg-gradient-to-tr from-indigo-300/30 via-emerald-200/20 to-teal-300/30 dark:from-indigo-900/30 dark:via-emerald-950/20 dark:to-teal-900/30 blur-md pointer-events-none -z-10"
          animate={{
            scale: [1, 1.07, 1],
            opacity: [0.55, 0.85, 0.55],
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Mindful Fox holding Journal SVG */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
        aria-label="Mindful Fox Mascot holding Journal"
      >
        <defs>
          {/* Base Backdrop Tile Gradient */}
          <linearGradient id="fox-tile-gradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5F7FF" className="dark:[stop-color:#1E1B4B]" />
            <stop offset="60%" stopColor="#F0FDF4" className="dark:[stop-color:#064E3B]" />
            <stop offset="100%" stopColor="#ECFDF5" className="dark:[stop-color:#022C22]" />
          </linearGradient>

          {/* Fox Fur Rich Indigo Gradient */}
          <linearGradient id="fox-indigo-fur" x1="30" y1="18" x2="70" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="55%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          {/* Fox Soft Cream Face & Chest */}
          <linearGradient id="fox-cream-fur" x1="50" y1="32" x2="50" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EEF2FF" />
          </linearGradient>

          {/* Inner Ear Sage Gradient */}
          <linearGradient id="fox-ear-sage-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>

          {/* Journal Cover Sage Gradient */}
          <linearGradient id="fox-journal-sage-grad" x1="38" y1="52" x2="64" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="60%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Tail Soft Gradient */}
          <linearGradient id="fox-tail-indigo" x1="68" y1="65" x2="88" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="65%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </linearGradient>
        </defs>

        {/* Soft Rounded Base Tile Frame */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="22"
          fill="url(#fox-tile-gradient)"
          stroke="#E0E7FF"
          strokeWidth="1.2"
          className="dark:stroke-indigo-900/60 transition-colors"
        />

        {/* Subtle Ambient Sparks */}
        <path
          d="M20 22L21.2 25.5L25 26.5L21.2 27.5L20 31L18.8 27.5L15 26.5L18.8 25.5L20 22Z"
          fill="#34D399"
          opacity="0.85"
        />
        <circle cx="80" cy="24" r="2" fill="#818CF8" opacity="0.7" />
        <circle cx="18" cy="74" r="1.5" fill="#10B981" opacity="0.6" />

        {/* Fox Bushy Tail Curling on Right */}
        <path
          d="M58 72C68 74 84 76 86 62C88 50 78 44 74 48C70 52 70 58 68 64Z"
          fill="url(#fox-tail-indigo)"
          stroke="#4F46E5"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Tail Sage/Cream Tip */}
        <path
          d="M83 56C85 53 87 50 83 48C79 46 76 48 74 50C77 54 80 55 83 56Z"
          fill="#ECFDF5"
          stroke="#34D399"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Fox Main Body Base */}
        <path
          d="M34 50C34 44 40 40 50 40C60 40 66 44 66 50C66 62 64 76 50 76C36 76 34 62 34 50Z"
          fill="url(#fox-indigo-fur)"
          stroke="#4338CA"
          strokeWidth="1.2"
        />

        {/* Fox Chest Cream Patch */}
        <path
          d="M42 46C46 44 54 44 58 46C60 54 58 66 50 68C42 66 40 54 42 46Z"
          fill="url(#fox-cream-fur)"
          opacity="0.95"
        />

        {/* Fox Ears */}
        {/* Left Ear */}
        <path
          d="M35 34L28 16C34 17 40 22 43 28L35 34Z"
          fill="url(#fox-indigo-fur)"
          stroke="#4338CA"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M34 29L30 19C33 20 37 23 39 26L34 29Z"
          fill="url(#fox-ear-sage-fill)"
          opacity="0.9"
        />

        {/* Right Ear */}
        <path
          d="M65 34L72 16C66 17 60 22 57 28L65 34Z"
          fill="url(#fox-indigo-fur)"
          stroke="#4338CA"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M66 29L70 19C67 20 63 23 61 26L66 29Z"
          fill="url(#fox-ear-sage-fill)"
          opacity="0.9"
        />

        {/* Fox Head */}
        <path
          d="M30 35C30 26 38 20 50 20C62 20 70 26 70 35C70 42 64 47 50 47C36 47 30 42 30 35Z"
          fill="url(#fox-indigo-fur)"
          stroke="#4338CA"
          strokeWidth="1.2"
        />

        {/* Fox Cheeks / Soft Cream Mask */}
        <path
          d="M33 36C33 32 38 29 44 32C47 34 50 37 50 37C50 37 53 34 56 32C62 29 67 32 67 36C67 43 58 46 50 46C42 46 33 43 33 36Z"
          fill="url(#fox-cream-fur)"
        />

        {/* Serene / Mindful Closed Eye Arcs */}
        <path
          d="M39.5 33.5C39.5 33.5 41 35.5 43.5 35.5"
          stroke="#312E81"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M60.5 33.5C60.5 33.5 59 35.5 56.5 35.5"
          stroke="#312E81"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* Soft Fox Nose */}
        <path
          d="M48.8 38.5C48.8 38 49.3 37.5 50 37.5C50.7 37.5 51.2 38 51.2 38.5C51.2 39.2 50 40.2 50 40.2C50 40.2 48.8 39.2 48.8 38.5Z"
          fill="#1E1B4B"
        />

        {/* Gentle Rosy Cheeks */}
        <circle cx="37" cy="37" r="2.2" fill="#F472B6" opacity="0.38" />
        <circle cx="63" cy="37" r="2.2" fill="#F472B6" opacity="0.38" />

        {/* Mindfulness Sage Sprout on Head */}
        <path
          d="M50 20C50 20 52 14 57 15C57 19 53 20 50 20Z"
          fill="#34D399"
          stroke="#059669"
          strokeWidth="0.8"
        />

        {/* --- Fox Holding Journal --- */}
        <g id="fox-journal-item">
          {/* Journal Drop Shadow */}
          <rect
            x="39"
            y="54"
            width="22"
            height="19"
            rx="3"
            fill="#312E81"
            opacity="0.22"
          />

          {/* Journal Cover in Sage */}
          <rect
            x="38"
            y="52"
            width="24"
            height="20"
            rx="3.5"
            fill="url(#fox-journal-sage-grad)"
            stroke="#047857"
            strokeWidth="1.1"
          />

          {/* Journal Spine Crease */}
          <line
            x1="43"
            y1="52"
            x2="43"
            y2="72"
            stroke="#047857"
            strokeWidth="1"
            opacity="0.65"
          />

          {/* Journal Pages Edge */}
          <path
            d="M60 54.5V69.5"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Gold Bookmark Ribbon */}
          <path
            d="M48 52V62L50 60.5L52 62V52"
            fill="#FEF08A"
            stroke="#EAB308"
            strokeWidth="0.7"
          />

          {/* Embossed Star on Journal Cover */}
          <path
            d="M54 62L54.6 63.4L56 63.8L54.6 64.2L54 65.5L53.4 64.2L52 63.8L53.4 63.4L54 62Z"
            fill="#ECFDF5"
            opacity="0.95"
          />

          {/* Fox Paws Holding the Journal */}
          {/* Left Paw */}
          <circle
            cx="39"
            cy="58"
            r="3.2"
            fill="url(#fox-cream-fur)"
            stroke="#4338CA"
            strokeWidth="1.1"
          />
          {/* Right Paw */}
          <circle
            cx="61"
            cy="58"
            r="3.2"
            fill="url(#fox-cream-fur)"
            stroke="#4338CA"
            strokeWidth="1.1"
          />
        </g>
      </svg>
    </motion.div>
  );
};

export default ReflectMascot;
