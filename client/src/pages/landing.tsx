import { useEffect, useRef, useState, useCallback } from 'react';
import TrendJetterLogo from '@/components/TrendJetterLogo';
import { Link, useLocation } from 'wouter';
import { Hash, Check, Zap, TrendingUp, MapPin, Target, Sparkles, Crown, ChevronDown, Menu, X } from 'lucide-react';

// ─── Lenis smooth scroll ──────────────────────────────────────────────────────
// Initialised once at module level, destroyed on HMR via cleanup
let lenisInstance: any = null;

function useLenis() {
  useEffect(() => {
    let raf: number;
    async function init() {
      const { default: Lenis } = await import('@studio-freight/lenis');
      if (lenisInstance) { lenisInstance.destroy(); lenisInstance = null; }
      lenisInstance = new Lenis({ lerp: 0.08, smoothWheel: true });
      function tick(time: number) {
        lenisInstance?.raf(time);
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    init();
    return () => {
      cancelAnimationFrame(raf);
      lenisInstance?.destroy();
      lenisInstance = null;
    };
  }, []);
}

// ─── Global cursor spotlight (follows mouse everywhere on the page) ───────────
function useGlobalCursorSpotlight() {
  useEffect(() => {
    function move(e: MouseEvent) {
      document.documentElement.style.setProperty('--glow-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--glow-y', `${e.clientY}px`);
    }
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
}

// ─── Scoped spotlight (kept for SpotlightSection sections) ───────────────────
function useCursorSpotlight(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function move(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el!.style.setProperty('--cx', `${x}px`);
      el!.style.setProperty('--cy', `${y}px`);
    }
    el.addEventListener('mousemove', move);
    return () => el.removeEventListener('mousemove', move);
  }, []);
}

// ─── Scroll-scrubbed word reveal ─────────────────────────────────────────────
function ScrollRevealQuote({ children, sectionRef }: { children: string; sectionRef: React.RefObject<HTMLElement> }) {
  const words = children.split(' ');
  const [progresses, setProgresses] = useState<number[]>(() => words.map(() => 0));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    function compute() {
      const winH = window.innerHeight;
      const sectionRect = section!.getBoundingClientRect();
      const sectionH = section!.offsetHeight;
      const sectionProgress = Math.max(0, Math.min(1,
        (winH - sectionRect.top) / (sectionH + winH)
      ));
      const n = words.length;
      const newP = words.map((_, i) => {
        const start = (i / n) * 0.55;
        const end = start + 0.28;
        const p = Math.max(0, Math.min(1, (sectionProgress - start) / (end - start)));
        return p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      });
      setProgresses(newP);
    }
    function onScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(compute);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    compute();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafRef.current); };
  }, [children]);

  return (
    <p style={{
      fontFamily: 'Inter Tight, Inter, sans-serif',
      fontSize: 'clamp(30px, 4.2vw, 56px)',
      fontWeight: 800, letterSpacing: '-0.03em',
      lineHeight: 1.12, textAlign: 'center', margin: 0,
    }}>
      {words.map((word, i) => {
        const p = progresses[i] ?? 0;
        const r = Math.round(185 + (17-185)*p);
        const g = Math.round(185 + (17-185)*p);
        const b = Math.round(192 + (17-192)*p);
        return (
          <span key={i} data-word style={{ color: `rgb(${r},${g},${b})`, display: 'inline' }}>
            {word}{i < words.length-1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
}

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimNum({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const duration = 1400;
      const start = performance.now();
      function step(now: number) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Scroll-entrance card with 3D tilt ───────────────────────────────────────
function FadeCard({ children, delay = 0, highlight = false, tilt = true, style: extraStyle = {} }: {
  children: React.ReactNode; delay?: number; highlight?: boolean; tilt?: boolean; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [transform, setTransform] = useState('');

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 … 0.5
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    setTransform(`perspective(500px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-8px) scale(1.022)`);  
  }, [tilt]);

  const onMouseLeave = useCallback(() => setTransform(''), []);

  const baseTransform = visible
    ? transform || (highlight ? 'translateY(-2px)' : 'translateY(0) scale(1)')
    : 'translateY(22px)';

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        opacity: visible ? 1 : 0,
        transform: baseTransform,
        transition: `opacity 0.55s ease ${delay}ms, transform ${transform ? '0.08s' : `0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`}, box-shadow 0.2s ease, border-color 0.2s ease`,
        background: '#FFFFFF',
        border: `1px solid ${highlight ? '#111111' : '#E4E4E7'}`,
        borderRadius: 12,
        boxShadow: transform
          ? '0 24px 64px rgba(0,0,0,0.18)'
          : highlight ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
        willChange: 'transform',
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}

// ─── Magnetic button ─────────────────────────────────────────────────────────
function MagneticBtn({ children, className, style: extraStyle, href, onClick, 'data-testid': testId }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; href?: string; onClick?: () => void; 'data-testid'?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.28;
    const dy = (e.clientY - cy) * 0.28;
    setOffset({ x: dx, y: dy });
  }, []);

  const onMouseLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const handleClick = useCallback(() => {
    if (onClick) { onClick(); return; }
    if (href) {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        window.location.href = href;
      } else {
        navigate(href);
      }
    }
  }, [href, onClick, navigate]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      data-testid={testId}
      className={`no-underline ${className ?? ''}`}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        ...extraStyle,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 && offset.y === 0
          ? 'transform 0.5s cubic-bezier(0.22,1,0.36,1)'
          : 'transform 0.1s linear',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      {children}
    </div>
  );
}

// ─── Floating ambient card ────────────────────────────────────────────────────
function FloatCard({ style: extraStyle, slot = 1, children }: {
  style?: React.CSSProperties; slot?: 1|2|3|4; children: React.ReactNode;
}) {
  return (
    <div className={`float-card float-card-${slot}`} style={extraStyle}>
      {children}
    </div>
  );
}

// ─── Demo intelligence card ───────────────────────────────────────────────────
function DemoCard({ tag, score, competition, growth, relevance, verdict, delay = 0 }: {
  tag: string; score: number; competition: string; growth: string; relevance: string; verdict: string; delay?: number;
}) {
  const verdictCls: Record<string, string> = {
    'Use This Now': 'verdict-use',
    'Good Pick': 'verdict-good',
    'Skip': 'verdict-skip',
  };
  const scoreCol = score >= 75 ? '#16A34A' : score >= 55 ? '#0891B2' : '#DC2626';
  return (
    <FadeCard delay={delay} tilt style={{ padding: 20 }}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[13px] font-semibold text-[#111111]">{tag}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${verdictCls[verdict] ?? 'verdict-situational'}`}>{verdict}</span>
      </div>
      <div className="flex items-end gap-2 mb-4">
        <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 32, fontWeight: 700, color: scoreCol, letterSpacing: '-0.03em', lineHeight: 1 }}>{score}</span>
        <span className="text-[12px] text-[#A1A1AA] pb-1">opp. score</span>
      </div>
      <div className="space-y-2">
        {[['Competition', competition, competition === 'Low' ? '#16A34A' : competition === 'Medium' ? '#D97706' : '#DC2626'],
          ['Growth', growth, '#16A34A'],
          ['Local Fit', relevance, '#0891B2'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="flex items-center justify-between">
            <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wide font-medium">{l}</p>
            <p className="text-[12px] font-semibold" style={{ color: c as string }}>{v}</p>
          </div>
        ))}
      </div>
    </FadeCard>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, delay = 0 }: { icon: any; title: string; desc: string; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeCard delay={delay} tilt style={{ padding: 24 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: hovered ? '#111111' : '#F4F4F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, transition: 'background 0.2s ease',
        }}>
          <Icon size={15} style={{ color: hovered ? '#FFFFFF' : '#52525B', transition: 'color 0.2s ease' }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111111', letterSpacing: '-0.01em', marginBottom: 6 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.6 }}>{desc}</p>
      </div>
    </FadeCard>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
function PricingCard({ plan, delay = 0 }: { plan: typeof PLANS[number]; delay?: number }) {
  return (
    <FadeCard delay={delay} highlight={plan.highlight} tilt style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {plan.highlight && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: '#111111', color: '#FFFFFF' }}>Most Popular</span>
        </div>
      )}
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111111', letterSpacing: '-0.01em', marginBottom: 4 }}>{plan.name}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 28, fontWeight: 700, color: '#111111', letterSpacing: '-0.03em' }}>{plan.price}</span>
          <span style={{ fontSize: 13, color: '#A1A1AA' }}>{plan.period}</span>
        </div>
        <p style={{ fontSize: 12, color: '#A1A1AA' }}>{plan.desc}</p>
      </div>
      <div style={{ flex: 1 }} className="space-y-2">
        {plan.features.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={11} style={{ color: plan.highlight ? '#111111' : '#D4D4D8', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: plan.highlight ? '#52525B' : '#A1A1AA' }}>{f}</span>
          </div>
        ))}
      </div>
      <MagneticBtn
        href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
        data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
        className={`w-full h-10 rounded-lg text-[13px] font-medium transition-all ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}
        style={{ justifyContent: 'center' }}
      >{plan.cta}</MagneticBtn>
    </FadeCard>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Zap,        title: 'Opportunity Scoring',  desc: 'Every hashtag scored by popularity, competition, opportunity, and local relevance — weighted to your goal.' },
  { icon: MapPin,     title: 'Local Intelligence',   desc: '#austinfoodie outperforms #foodie for Austin creators every time. We score for your market, city, and niche.' },
  { icon: TrendingUp, title: 'Trend Velocity',       desc: 'See which hashtags are accelerating right now, not just popular. Catch momentum before competitors.' },
  { icon: Target,     title: 'Goal-Aligned Groups',  desc: 'Five strategic groups per search: High Volume, Medium, Niche, Local, and Trending.' },
  { icon: Sparkles,   title: 'Content Assistant',    desc: 'AI-written captions, hashtag sets, SEO keywords, and optimal posting schedules in one package.' },
  { icon: Crown,      title: 'Smart Collections',    desc: 'Save your best hashtag sets by campaign. Your library grows smarter over time.' },
];

const PLANS = [
  { name: 'Free',   price: '$0',  period: '/month', desc: 'For creators just getting started', highlight: false,
    features: ['5 searches/month', '20 hashtags per search', 'Basic scoring', 'Instagram only'], cta: 'Get started free' },
  { name: 'Pro',    price: '$29', period: '/month', desc: 'For serious creators and brands',   highlight: true,
    features: ['Unlimited searches', '30 hashtags per search', 'Full intelligence scores', 'All 6 platforms', 'Saved collections', 'Content assistant', 'CSV export'], cta: 'Start free trial' },
  { name: 'Agency', price: '$99', period: '/month', desc: 'For teams and agencies',            highlight: false,
    features: ['Everything in Pro', '5 team seats', 'White-label reports', 'API access', 'Priority support'], cta: 'Contact sales' },
];

const dotGrid = (bg = '#FFFFFF'): React.CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: 'radial-gradient(circle, #D0D0D6 1px, transparent 1px)',
  backgroundSize: '16px 16px',
});

// ─── Spotlight section wrapper ────────────────────────────────────────────────
function SpotlightSection({ children, style: extraStyle }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useCursorSpotlight(ref);
  return (
    <section
      ref={ref}
      className="spotlight-section"
      style={{
        ...dotGrid('#FFFFFF'),
        position: 'relative',
        overflow: 'hidden',
        ...extraStyle,
      }}
    >
      {/* Spotlight overlay */}
      <div className="spotlight-overlay" />
      {/* Radial fade to keep center readable */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.75) 30%, transparent 70%)',
      }} />
      {children}
    </section>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useLenis();
  useGlobalCursorSpotlight();

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: '#111111', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Nav ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #E4E4E7',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Main bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60 }}>
            <TrendJetterLogo height={36} color="#111111" />
            {/* Desktop links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hide-mobile">
              {(['Features','Pricing'] as const).map(label => (
                <a key={label} href={`#${label.toLowerCase()}`}
                  onClick={e => { e.preventDefault(); document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ fontSize: 15, color: '#52525B', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color='#111111')}
                  onMouseLeave={e => (e.currentTarget.style.color='#52525B')}
                >{label}</a>
              ))}
              <MagneticBtn href="https://accounts.trendjetter.io/sign-in?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" style={{ fontSize: 15, color: '#52525B' }}>Sign in</MagneticBtn>
              <MagneticBtn href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" className="btn-primary" style={{ fontSize: 14, padding: '8px 18px' }} data-testid="hero-cta-nav">Try free</MagneticBtn>
            </div>
            {/* Mobile hamburger */}
            <button
              className="show-mobile"
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#111111' }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
          {/* Mobile dropdown menu */}
          {menuOpen && (
            <div style={{
              borderTop: '1px solid #E4E4E7',
              background: '#FFFFFF',
              padding: '16px 24px 20px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {(['Features','Pricing'] as const).map(label => (
                <a key={label} href={`#${label.toLowerCase()}`}
                  onClick={e => { e.preventDefault(); setMenuOpen(false); document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ fontSize: 16, color: '#111111', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid #F4F4F5' }}
                >{label}</a>
              ))}
              <a onClick={() => { setMenuOpen(false); }} style={{ padding: '10px 0', borderBottom: '1px solid #F4F4F5', fontSize: 16, color: '#111111', cursor: 'pointer' }}
                href="https://accounts.trendjetter.io/sign-in?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
              >Sign in</a>
              <a href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" onClick={() => setMenuOpen(false)}
                style={{ marginTop: 12, textAlign: 'center', fontSize: 15, fontWeight: 600, padding: '12px 0', borderRadius: 10, background: '#111111', color: '#FFFFFF', textDecoration: 'none' }}
              >Try free →</a>
            </div>
          )}
        </nav>

        {/* ── Hero — pure white + floating ambient cards ── */}
        <section style={{ backgroundColor: '#FFFFFF', padding: 'clamp(48px,8vw,96px) clamp(16px,4vw,32px) clamp(40px,6vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>

          <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
            <div className="hero-fade-1" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              border: '1px solid #E4E4E7', background: '#FFFFFF',
              fontSize: 12, fontWeight: 500, color: '#52525B', marginBottom: 24,
            }}>
              <Sparkles size={11} color="#0891B2" />
              Social Intelligence Platform
            </div>
            <h1 className="hero-fade-2" style={{
              fontFamily: 'Inter Tight, Inter, sans-serif',
              fontSize: 'clamp(38px, 5.5vw, 68px)',
              fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.03em',
              color: '#111111', marginBottom: 20,
            }}>
              Stop counting posts.<br />
              <span style={{ color: '#0891B2' }}>Start using intelligence.</span>
            </h1>
            <p className="hero-fade-3" style={{
              fontSize: 18, color: '#71717A', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.65, letterSpacing: '-0.01em',
            }}>
              TrendJetter scores every hashtag by opportunity, competition, growth, and local relevance — then tells you exactly which ones to use.
            </p>
            <div className="hero-fade-4" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 64,
            }}>
              <MagneticBtn href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" className="btn-primary" style={{ fontSize: 15, padding: '12px 28px' }} data-testid="hero-cta-primary">
                <Hash size={15} /> Try it free
              </MagneticBtn>
              <a href="#features"
                onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="no-underline btn-secondary" style={{ fontSize: 15, padding: '12px 28px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                See how it works <ChevronDown size={14} />
              </a>
            </div>
            {/* Demo cards */}
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <p className="label-eyebrow" style={{ marginBottom: 16, textAlign: 'center' }}>Live intelligence — not post counts</p>
              <div className="demo-cards-grid">
                <DemoCard tag="#luxurytravel" score={94} competition="Low"       growth="+47%" relevance="Very High" verdict="Use This Now" delay={0}   />
                <DemoCard tag="#wellnesslifestyle2026" score={88} competition="Low"       growth="+34%" relevance="High"      verdict="Use This Now" delay={120}  />
                <DemoCard tag="#travel"        score={29} competition="Very High" growth="+1%"  relevance="Low"       verdict="Skip"         delay={240}  />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section style={{ padding: 'clamp(32px,5vw,48px) clamp(16px,4vw,32px)', borderTop: '1px solid #E4E4E7', borderBottom: '1px solid #E4E4E7', background: '#FAFAFA' }}>
          <div className="stats-grid" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            {[
              { val: 50000, suf: '+', label: 'Hashtags analyzed' },
              { val: 94,    suf: '',  label: 'Avg opportunity score' },
              { val: 6,     suf: '',  label: 'Platforms supported' },
              { val: 2,     suf: 's', label: 'Avg generation time' },
            ].map(({ val, suf, label }) => (
              <div key={label}>
                <p style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#111111', marginBottom: 2 }}>
                  <AnimNum target={val} suffix={suf} />
                </p>
                <p className="label-eyebrow">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scroll-PINNED quote reveal ── */}
        <section
          ref={sectionRef}
          style={{
            ...dotGrid('#FFFFFF'),
            height: '300vh',
            position: 'relative',
            borderTop: '1px solid #E4E4E7',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <div style={{
            position: 'sticky', top: 0, height: '100vh', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: '0 48px',
          }}>
            <ScrollRevealQuote sectionRef={sectionRef}>
              {"\"Nobody cares how many posts exist. They care whether the hashtag is worth using.\""}
            </ScrollRevealQuote>
            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111111', marginBottom: 4 }}>TrendJetter</p>
              <p style={{ fontSize: 13, color: '#A1A1AA' }}>The intelligence platform for serious creators</p>
            </div>
          </div>
        </section>

        {/* ── Comparison ── */}
        <section style={{ padding: '80px 32px', background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p className="label-eyebrow" style={{ marginBottom: 12 }}>The Intelligence Difference</p>
              <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111', marginBottom: 12 }}>Data vs. Intelligence</h2>
              <p style={{ fontSize: 16, color: '#71717A', maxWidth: 400, margin: '0 auto' }}>Most tools show you numbers. TrendJetter tells you what to do.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="bento-tile p-6" style={{ opacity: 0.6 }}>
                <p className="label-eyebrow" style={{ marginBottom: 16 }}>Generic Analytics Tool</p>
                {[['#travel','8.4M posts'],['#luxurytravel','3.2M posts'],['#wellness','6.1M posts'],['#skincare','9.8M posts']].map(([tag,posts]) => (
                  <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F4F4F5' }}>
                    <span className="font-mono" style={{ fontSize: 13, color: '#52525B' }}>{tag}</span>
                    <span style={{ fontSize: 12, color: '#A1A1AA' }}>{posts}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 16, fontStyle: 'italic' }}>So… what do I do with this?</p>
              </div>
              <FadeCard tilt style={{ padding: 24, borderColor: '#111111' }}>
                <p className="label-eyebrow" style={{ marginBottom: 16, color: '#0891B2' }}>TrendJetter Intelligence</p>
                {[
                  ['#luxurytravel2026',   94, 'Use This Now', 'verdict-use'],
                  ['#wellnesslifestyle',  88, 'Use This Now', 'verdict-use'],
                  ['#travelblogger',      61, 'Good Pick',    'verdict-good'],
                  ['#travel',            29, 'Skip',         'verdict-skip'],
                ].map(([tag, score, verdict, cls]) => (
                  <div key={tag as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F4F4F5' }}>
                    <span className="font-mono" style={{ fontSize: 13, color: '#111111' }}>{tag}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 13, fontWeight: 700 }}>{score}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{verdict}</span>
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 12, fontWeight: 600, color: '#111111', marginTop: 16 }}>Clear action. Every time.</p>
              </FadeCard>
            </div>
          </div>
        </section>

        {/* ── Features — spotlight dot grid ── */}
        <SpotlightSection style={{ padding: '80px 32px', borderTop: '1px solid #E4E4E7' }}>
          <div id="features" style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p className="label-eyebrow" style={{ marginBottom: 12 }}>Features</p>
              <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111' }}>Built for serious creators</h2>
            </div>
            <div className="features-grid">
              {FEATURES.map(({ icon, title, desc }, i) => (
                <FeatureCard key={title} icon={icon} title={title} desc={desc} delay={i * 60} />
              ))}
            </div>
          </div>
        </SpotlightSection>

        {/* ── Pricing ── */}
        <section id="pricing" style={{ padding: '80px 32px', background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p className="label-eyebrow" style={{ marginBottom: 12 }}>Pricing</p>
              <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111', marginBottom: 12 }}>Simple, transparent pricing</h2>
              <p style={{ fontSize: 16, color: '#71717A' }}>Start free. Upgrade when you need more.</p>
            </div>
            <div className="pricing-grid">
              {PLANS.map((plan, i) => <PricingCard key={plan.name} plan={plan} delay={i * 80} />)}
            </div>
          </div>
        </section>

        {/* ── Final CTA — spotlight dot grid ── */}
        <SpotlightSection style={{ padding: '96px 32px', textAlign: 'center', borderTop: '1px solid #E4E4E7' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(24px,3vw,38px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111', marginBottom: 16 }}>
              Ready to use real intelligence?
            </h2>
            <p style={{ fontSize: 16, color: '#71717A', marginBottom: 32, lineHeight: 1.65 }}>Stop guessing which hashtags work. TrendJetter scores, ranks, and tells you exactly what to post.</p>
            <MagneticBtn href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" className="btn-primary" style={{ fontSize: 15, padding: '12px 32px' }} data-testid="final-cta">
              <Hash size={16} /> Start for free
            </MagneticBtn>
            <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 16 }}>No credit card required · 5 searches free every month</p>
          </div>
        </SpotlightSection>

        {/* ── Footer ── */}
        <footer style={{ background: '#111111', padding: '40px 32px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hash size={11} color="#FFFFFF" />
              </div>
              <TrendJetterLogo height={18} color="rgba(255,255,255,0.7)" />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 TrendJetter. Built for serious creators.</p>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Support'].map(l => (
                <button key={l} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.4)')}
                >{l}</button>
              ))}
            </div>
          </div>
        </footer>
    </div>
  );
}
