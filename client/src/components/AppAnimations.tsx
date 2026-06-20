/**
 * AppAnimations.tsx — Shared animation hooks & components for TrendJetter app interior
 * Mirrors the landing page aesthetic: cursor spotlight, 3D tilt cards
 */
import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Global cursor spotlight (updates CSS vars on :root) ──────────────────────
// Only needs to run ONCE — AppShell mounts it. The CSS body::before in index.css
// picks it up automatically everywhere.
export function useGlobalCursorSpotlight() {
  useEffect(() => {
    function move(e: MouseEvent) {
      document.documentElement.style.setProperty('--glow-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--glow-y', `${e.clientY}px`);
    }
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
}

// ─── 3D Tilt Card ─────────────────────────────────────────────────────────────
// Drop-in wrapper for any card. Adds perspective tilt on hover + shadow lift.
export function TiltCard({
  children,
  className = '',
  style: extraStyle = {},
  intensity = 12,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number;
  disabled?: boolean;
}) {
  const [transform, setTransform] = useState('');

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 … 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform(
        `perspective(600px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateY(-6px) scale(1.018)`
      );
    },
    [disabled, intensity]
  );

  const onMouseLeave = useCallback(() => setTransform(''), []);

  return (
    <div
      className={className}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        transform: transform || 'perspective(600px) rotateY(0deg) rotateX(0deg) translateY(0) scale(1)',
        transition: transform
          ? 'transform 0.08s linear, box-shadow 0.08s linear'
          : 'transform 0.45s cubic-bezier(0.22,1,0.36,1), box-shadow 0.45s cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        boxShadow: transform
          ? '0 20px 56px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)'
          : undefined,
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}
