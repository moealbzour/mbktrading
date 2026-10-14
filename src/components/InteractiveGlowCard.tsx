import React, { useRef, useState } from 'react';

interface InteractiveGlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'emerald' | 'cyan' | 'amber';
  onClick?: () => void;
}

export const InteractiveGlowCard: React.FC<InteractiveGlowCardProps> = ({
  children,
  className = '',
  glowColor = 'emerald',
  onClick
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const glowColorMap = {
    emerald: 'rgba(16, 185, 129, 0.08)',
    cyan: 'rgba(56, 189, 248, 0.09)',
    amber: 'rgba(245, 158, 11, 0.09)'
  };

  const borderColorMap = {
    emerald: 'hover:border-emerald-500/60 hover:shadow-[0_8px_20px_-10px_rgba(16,185,129,0.15)]',
    cyan: 'hover:border-sky-400/60 hover:shadow-[0_8px_20px_-10px_rgba(56,189,248,0.15)]',
    amber: 'hover:border-amber-400/60 hover:shadow-[0_8px_20px_-10px_rgba(245,158,11,0.15)]'
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative rounded-2xl border border-slate-800/80 transition-all duration-200 ease-out hover:scale-[1.01] overflow-hidden ${borderColorMap[glowColor]} ${className}`}
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      {/* Ambient Radial Hover Glow following cursor */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColorMap[glowColor]}, transparent 80%)`
          }}
        />
      )}

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
