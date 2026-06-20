import logoIcon from '@assets/trendjetter-icon.jpg';

interface LogoProps {
  color?: string;
  height?: number;
  iconOnly?: boolean;
}

export default function TrendJetterLogo({ color = '#111111', height = 32, iconOnly = false }: LogoProps) {
  const iconSize = height;

  if (iconOnly) {
    return (
      <img
        src={logoIcon}
        alt="TrendJetter"
        width={iconSize}
        height={iconSize}
        style={{ display: 'block', objectFit: 'contain', filter: color === '#FFFFFF' || color === 'white' ? 'invert(1)' : 'none' }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(height * 0.4) }}>
      <img
        src={logoIcon}
        alt=""
        width={iconSize}
        height={iconSize}
        style={{
          display: 'block',
          objectFit: 'contain',
          filter: color === '#FFFFFF' || color === 'white' ? 'invert(1)' : 'none',
          flexShrink: 0,
        }}
      />
      <span style={{
        fontFamily: "'Inter Tight', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        fontWeight: 800,
        fontSize: Math.round(height * 0.85),
        letterSpacing: '-0.03em',
        color: color,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}>
        trendjetter
      </span>
    </div>
  );
}
