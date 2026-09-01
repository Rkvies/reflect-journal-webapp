import React from 'react';
import { motion } from 'motion/react';

interface StreakParticlesProps {
  count: number;
  className?: string;
  variant?: 'indigo' | 'teal';
}

export const StreakParticles: React.FC<StreakParticlesProps> = ({ count, className = "rounded-full", variant = 'indigo' }) => {
  // Cap particles to keep it subtle
  const particleCount = Math.min(Math.max(count, 3), 12);
  const particles = Array.from({ length: particleCount });
  
  const colorClass = variant === 'teal' 
    ? "bg-teal-400/50 dark:bg-teal-300/40" 
    : "bg-indigo-400/50 dark:bg-indigo-300/40";

  return (
    <div className={`absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible ${className}`} aria-hidden="true">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-[3px] h-[3px] rounded-full ${colorClass}`}
          initial={{ 
            opacity: 0, 
            y: '0%', 
            x: '0%',
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [-5, -25 - Math.random() * 15],
            x: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 30],
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  );
};
