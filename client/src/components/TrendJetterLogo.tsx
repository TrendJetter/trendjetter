import logoIcon from '@assets/trendjetter-icon.jpg';

interface LogoProps {
  color?: string;
  height?: number;
  iconOnly?: boolean;
}

export default function TrendJetterLogo({ color = '#111111', height = 28, iconOnly = false }: LogoProps) {
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

  // Full lockup — icon + SVG wordmark side by side
  const wordmarkHeight = height;
  const wordmarkWidth = wordmarkHeight * (260 / 48); // approx aspect ratio

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(height * 0.35) }}>
      <img
        src={logoIcon}
        alt=""
        width={iconSize}
        height={iconSize}
        style={{
          display: 'block',
          objectFit: 'contain',
          filter: color === '#FFFFFF' || color === 'white' ? 'invert(1)' : 'none',
        }}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 260 48"
        width={wordmarkWidth}
        height={wordmarkHeight}
        fill="none"
        aria-label="trendjetter"
      >
        <text
          x="0"
          y="38"
          fontFamily="'Inter Tight', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="42"
          letterSpacing="-2"
          fill={color}
        >
          trendjetter
        </text>
      </svg>
    </div>
  );
}
