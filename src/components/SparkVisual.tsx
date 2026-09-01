import React from 'react';
import { Sparkles, Sparkle } from 'lucide-react';

interface SparkLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'indigo' | 'sage';
  label?: string;
  className?: string;
}

export const SparkLoader: React.FC<SparkLoaderProps> = ({
  size = 'sm',
  variant = 'indigo',
  label,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const containerSizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2.5',
    lg: 'p-3.5',
  };

  const colorClasses = variant === 'sage'
    ? {
        icon: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200/70 dark:border-emerald-900/50',
        glow: 'from-emerald-500/10 to-teal-500/10',
        text: 'text-emerald-800 dark:text-emerald-300',
      }
    : {
        icon: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200/70 dark:border-indigo-900/50',
        glow: 'from-indigo-500/10 to-purple-500/10',
        text: 'text-indigo-800 dark:text-indigo-300',
      };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`relative inline-flex items-center justify-center rounded-xl border ${colorClasses.bg} ${containerSizes[size]} transition-transform`}
        aria-hidden="true"
      >
        <Sparkles className={`${sizeClasses[size]} ${colorClasses.icon} animate-spark-glimmer`} />
      </div>
      {label && (
        <span className={`text-xs font-medium font-sans ${colorClasses.text} animate-fade-in`}>
          {label}
        </span>
      )}
    </div>
  );
};

interface SparkMotifProps {
  variant?: 'indigo' | 'sage';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const SparkMotif: React.FC<SparkMotifProps> = ({
  variant = 'indigo',
  size = 'md',
  animated = false,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const boxSizes = {
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-9 h-9 rounded-2xl',
    lg: 'w-12 h-12 rounded-3xl',
  };

  const styles = variant === 'sage'
    ? {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        border: 'border-emerald-200/80 dark:border-emerald-800/60',
        icon: 'text-emerald-600 dark:text-emerald-400',
        shadow: 'shadow-emerald-500/5',
      }
    : {
        bg: 'bg-indigo-50 dark:bg-indigo-950/60',
        border: 'border-indigo-200/80 dark:border-indigo-800/60',
        icon: 'text-indigo-600 dark:text-indigo-400',
        shadow: 'shadow-indigo-500/5',
      };

  return (
    <div
      className={`inline-flex items-center justify-center border shadow-xs ${boxSizes[size]} ${styles.bg} ${styles.border} ${styles.shadow} ${className}`}
      aria-hidden="true"
    >
      <Sparkles className={`${iconSizes[size]} ${styles.icon} ${animated ? 'animate-spark-glimmer' : ''}`} />
    </div>
  );
};

interface SparkEncouragementProps {
  message: string;
  subtext?: string;
  variant?: 'indigo' | 'sage';
  className?: string;
  iconType?: 'sparkles' | 'sparkle';
}

export const SparkEncouragement: React.FC<SparkEncouragementProps> = ({
  message,
  subtext,
  variant = 'indigo',
  className = '',
  iconType = 'sparkles',
}) => {
  const isSage = variant === 'sage';
  const IconComponent = iconType === 'sparkle' ? Sparkle : Sparkles;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border backdrop-blur-xs transition-all ${
        isSage
          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200'
          : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200'
      } ${className}`}
    >
      <IconComponent
        className={`w-3.5 h-3.5 flex-shrink-0 animate-spark-glimmer ${
          isSage ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
        }`}
      />
      <div className="text-left">
        <span className="text-xs font-medium leading-tight block">{message}</span>
        {subtext && (
          <span className="text-[11px] opacity-75 leading-tight block font-sans">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
