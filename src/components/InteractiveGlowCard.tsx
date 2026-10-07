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
    emerald: 'rgba(0, 230, 118, 0.12)',
    cyan: 'rgba(6, 182, 212, 0.14)',
    amber: 'rgba(245, 158, 11, 0.14)'
  };

  const borderColorMap = {
    emerald: 'hover:border-[#00E676] hover:shadow-[0_10px_30px_-10px_rgba(0,230,118,0.2)]',
    cyan: 'hover:border-cyan-400 hover:shadow-[0_10px_30px_-10px_rgba(6,182,212,0.25)]',
    amber: 'hover:border-amber-400 hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.25)]'
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative rounded-2xl bg-[#10141D] border border-slate-800/90 transition-all duration-200 ease-out hover:scale-[1.015] overflow-hidden ${borderColorMap[glowColor]} ${className}`}
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
