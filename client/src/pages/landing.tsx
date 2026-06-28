import { useEffect, useRef, useState, useCallback } from 'react';
import TrendJetterLogo from '@/components/TrendJetterLogo';
import { Link, useLocation } from 'wouter';
import { Hash, Check, Zap, TrendingUp, MapPin, Target, Sparkles, Crown, ChevronDown, Menu, X, Building2, ArrowRight, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
      // Section is 200vh. First 100vh = scrolling into view (entry phase, no fill).
      // Second 100vh = locked on screen (fill phase).
      // sectionRect.top goes from 0 to -100vh during the fill phase.
      // So: scrolledPastLock = -sectionRect.top, clamped to the fill window (0 → winH).
      const scrolledPastLock = Math.max(0, -sectionRect.top);
      const fillWindow = winH; // exactly 100vh of post-lock scroll
      const sectionProgress = Math.max(0, Math.min(1, scrolledPastLock / fillWindow));
      const n = words.length;
      const newP = words.map((_, i) => {
        // words fill evenly across 0 → 1 of the fill window
        const start = (i / n) * 0.70;
        const end = start + 0.30;
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
function FeatureCard({ icon: Icon, title, desc, accent, example, delay = 0 }: {
  icon: any; title: string; desc: string; accent: string;
  example: { label: string; score: number | null; verdict: string };
  delay?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeCard delay={delay} tilt style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{ flex: 1 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: hovered ? accent : `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14, transition: 'background 0.2s ease',
        }}>
          <Icon size={16} style={{ color: hovered ? '#FFFFFF' : accent, transition: 'color 0.2s ease' }} />
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em', marginBottom: 8 }}>{title}</h3>

        {/* Description */}
        <p style={{ fontSize: 13.5, color: '#52525B', lineHeight: 1.65, marginBottom: 16 }}>{desc}</p>

        {/* Example pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#F4F4F5', borderRadius: 999, padding: '5px 12px',
          border: '1px solid #E4E4E7',
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#111111', fontFamily: 'ui-monospace, monospace' }}>
            {example.label}
          </span>
          {example.score !== null && (
            <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>{example.score}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 999,
            background: `${accent}18`, color: accent,
          }}>{example.verdict}</span>
        </div>
      </div>
    </FadeCard>
  );
}

// ─── Landing Pricing Card ────────────────────────────────────────────────────
function LandingPricingCard({ plan, annual }: { plan: typeof LANDING_PLANS[number]; annual: boolean }) {
  const isDark  = plan.dark;
  const textPri = isDark ? '#FFFFFF' : '#111111';
  const textSec = isDark ? '#A1A1AA' : '#52525B';
  const btnBg   = isDark ? '#FFFFFF' : '#111111';
  const btnFg   = isDark ? '#111111' : '#FFFFFF';
  const price   = annual ? plan.annualPrice  : plan.monthlyPrice;
  const period  = annual ? plan.annualPeriod : plan.period;
  const isPro = plan.key === 'pro';
  return (
    <div style={{
      background: isDark ? '#111111' : '#FFFFFF',
      border: isPro ? '2px solid #0891B2' : `1.5px solid ${isDark ? '#2A2A2A' : '#E4E4E7'}`,
      borderRadius: 14,
      padding: isPro ? '28px 22px 24px' : '24px 20px 20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', flex: 1, minWidth: 0,
      boxShadow: isPro ? '0 8px 40px rgba(8,145,178,0.13), 0 2px 12px rgba(0,0,0,0.07)' : isDark ? '0 8px 32px rgba(0,0,0,0.22)' : '0 1px 8px rgba(0,0,0,0.04)',
      transform: isPro ? 'translateY(-6px)' : 'none',
      zIndex: isPro ? 2 : 1,
    }}>
      {plan.badge && (
        <div style={{ position: 'absolute', top: 13, right: 13 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 999, background: plan.badgeBg ?? '#111111', color: '#FFFFFF' }}>
            {plan.badge}
          </span>
        </div>
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <plan.icon size={13} color={isDark ? '#6B7280' : '#0891B2'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: textPri, letterSpacing: '-0.01em' }}>{plan.name}</span>
        </div>
        <p style={{ fontSize: 11, color: textSec, margin: 0 }}>{plan.desc}</p>
      </div>
      <div>
        {isPro ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 16, fontWeight: 600,
              color: '#A1A1AA', letterSpacing: '-0.02em', textDecoration: 'line-through' }}>
              {annual ? '$23' : '$29'}
            </span>
            <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 30, fontWeight: 800,
              color: '#111111', letterSpacing: '-0.04em', lineHeight: 1 }}>{price}</span>
            <span style={{ fontSize: 12, color: textSec }}>{period}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 30, fontWeight: 800,
              color: textPri, letterSpacing: '-0.04em', lineHeight: 1 }}>{price}</span>
            <span style={{ fontSize: 12, color: textSec }}>{period}</span>
          </div>
        )}
        {isPro && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0891B2' }}>⚡ 67 of 100 founder seats claimed</span>
              <span style={{ fontSize: 10, color: '#A1A1AA' }}>or Jul 15</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: '#E4E4E7', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '67%', borderRadius: 999,
                background: 'linear-gradient(90deg, #0891B2, #06B6D4)' }} />
            </div>
          </div>
        )}
        {plan.key === 'trial' ? (
          <p style={{ fontSize: 11, color: textSec, marginTop: 4 }}>{plan.thenNote}</p>
        ) : !isPro && annual && plan.annualNote ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 11, color: textSec }}>{plan.annualNote}</span>
            {plan.savings && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: isDark ? 'rgba(8,145,178,0.25)' : 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                {plan.savings}
              </span>
            )}
          </div>
        ) : isPro && annual && plan.annualNote ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 11, color: textSec }}>{plan.annualNote}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>Save $48/yr</span>
          </div>
        ) : null}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <Check size={11} style={{ color: '#0891B2', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: textSec, lineHeight: 1.45 }}>{f}</span>
          </li>
        ))}
      </ul>
      <MagneticBtn
        href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
        data-testid={`pricing-cta-${plan.key}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', height: 40, borderRadius: 9,
          background: btnBg, color: btnFg,
          fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
          textDecoration: 'none',
        }}
      >
        {plan.cta}
      </MagneticBtn>
      {isPro && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#A1A1AA', margin: 0 }}>
          Price goes to $29 when seats fill
        </p>
      )}
    </div>
  );
}

// ─── Landing Pricing Section (stateful toggle) ────────────────────────────────

// ─── Landing Analyzer Embed ──────────────────────────────────────────────────
function AnalyzerEmbed() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { verdict: string; score: number; reason: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    const tag = input.replace(/^#/, '').trim();
    if (!tag) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiRequest('POST', '/api/analyze', { hashtags: [tag] });
      const data = await res.json();
      const r = data.results?.[0];
      if (r) setResult({ verdict: r.verdict, score: r.score ?? r.overallScore ?? 0, reason: r.reason ?? r.summary ?? '' });
      else setError('No results returned.');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }, [input]);

  const verdictColor = result?.verdict === 'Use Now'
    ? '#059669'
    : result?.verdict === 'Rising Fast'
    ? '#0891B2'
    : result?.verdict === 'Oversaturated' || result?.verdict === 'Skip'
    ? '#DC2626'
    : '#71717A';

  const VerdictIcon = result?.verdict === 'Use Now'
    ? CheckCircle2
    : result?.verdict === 'Rising Fast'
    ? TrendingUp
    : result?.verdict === 'Oversaturated' || result?.verdict === 'Skip'
    ? AlertTriangle
    : MinusCircle;

  return (
    <section id="analyzer" style={{ padding: '80px 32px', background: '#FFFFFF', borderTop: '1px solid #E4E4E7' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 12 }}>Free Analyzer</p>
        <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(26px,3vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111111', marginBottom: 12, lineHeight: 1.1 }}>
          Is your hashtag worth using?
        </h2>
        <p style={{ fontSize: 15, color: '#71717A', marginBottom: 36, lineHeight: 1.6 }}>
          Drop any hashtag below and get a verdict in seconds. No signup.
        </p>

        <div style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto 24px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', fontSize: 16, fontWeight: 600, pointerEvents: 'none' }}>#</span>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="realestate"
              maxLength={60}
              style={{
                width: '100%',
                padding: '12px 14px 12px 28px',
                border: '1px solid #E4E4E7',
                borderRadius: 10,
                fontSize: 15,
                color: '#111111',
                background: '#FAFAFA',
                outline: 'none',
                boxSizing: 'border-box' as const,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 22px',
              background: loading || !input.trim() ? '#D4D4D8' : '#111111',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap' as const,
              fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {loading ? (
              <span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            ) : null}
            {loading ? 'Checking...' : 'Check it'}
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              background: '#FAFAFA',
              border: `1.5px solid ${verdictColor}33`,
              borderRadius: 12,
              padding: '24px 28px',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 28,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <VerdictIcon size={20} color={verdictColor} strokeWidth={2.2} />
              <span style={{ fontSize: 18, fontWeight: 800, color: verdictColor, fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                {result.verdict}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#111111', background: '#F4F4F5', padding: '4px 10px', borderRadius: 20 }}>
                Score: {typeof result.score === 'number' ? Math.round(result.score) : result.score}/100
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#52525B', lineHeight: 1.6, margin: 0 }}>{result.reason}</p>
          </div>
        )}

        <a
          href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fanalyzer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: '#0891B2',
            textDecoration: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Get unique, optimized hashtags and reach the audience you want <ArrowRight size={14} strokeWidth={2.2} />
        </a>
        <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 6 }}>No credit card needed. Free to start.</p>
      </div>
    </section>
  );
}

function LandingPricingSection() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" style={{ padding: '80px 32px', background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p className="label-eyebrow" style={{ marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(32px,3vw,42px)',
            fontWeight: 700, letterSpacing: '-0.025em', color: '#111111', marginBottom: 12 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 16, color: '#71717A', marginBottom: 24 }}>Start free. Upgrade when you need more.</p>

          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0,
            background: '#E8E8EA', borderRadius: 999, padding: 3 }}>
            <button onClick={() => setAnnual(false)} style={{
              padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              background: !annual ? '#111111' : 'transparent',
              color: !annual ? '#FFFFFF' : '#71717A',
              transition: 'all 0.18s',
            }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{
              padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              background: annual ? '#111111' : 'transparent',
              color: annual ? '#FFFFFF' : '#71717A',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Annual
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 999, background: '#0891B2', color: '#FFFFFF' }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="pricing-cards-grid" style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
          {LANDING_PLANS.map(plan => (
            <LandingPricingCard key={plan.key} plan={plan} annual={annual} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Zap,
    title: 'Opportunity Scoring',
    desc: 'Every hashtag is graded across 7 dimensions: reach, competition, engagement rate, trend velocity, audience fit, platform weight, and local relevance. You get a single actionable score — not a wall of data.',
    accent: '#0891B2',
    example: { label: '#luxurytravel', score: 94, verdict: 'Use Now' },
  },
  {
    icon: MapPin,
    title: 'Local Intelligence',
    desc: "#austinfoodie outperforms #foodie by 3\u00d7 for Austin creators. TrendJetter factors in your city and market so you're not competing against global volume with a local audience.",
    accent: '#7C3AED',
    example: { label: '#okchomes', score: 91, verdict: 'Use Now' },
  },
  {
    icon: TrendingUp,
    title: 'Trend Velocity',
    desc: 'Popularity is a lagging indicator. Velocity shows you which hashtags are accelerating this week — before the crowd catches on. First-mover advantage built into every search.',
    accent: '#059669',
    example: { label: '+47% this week', score: null, verdict: 'Rising Fast' },
  },
  {
    icon: Target,
    title: 'Goal-Aligned Groups',
    desc: 'Results land in five action-ready groups: Post These Today, Own Your Corner, Rising Fast, Your Backyard, and Filler Pack. Your full 30-tag strategy is pre-sorted — just copy and post.',
    accent: '#D97706',
    example: { label: '30 tags in 3 tiers', score: null, verdict: 'Ready to Copy' },
  },
  {
    icon: Sparkles,
    title: 'Content Assistant',
    desc: 'Get an AI-written caption, your full hashtag set, SEO keywords, and the optimal posting window — all in one click. Everything you need to publish, packaged and ready.',
    accent: '#0891B2',
    example: { label: 'Caption + tags + time', score: null, verdict: 'One Click' },
  },
  {
    icon: Crown,
    title: 'Smart Collections',
    desc: 'Save your top-performing hashtag sets by campaign, niche, or client. Collections update with fresh scores weekly so your saved sets never go stale.',
    accent: '#7C3AED',
    example: { label: 'Auto-refreshed weekly', score: null, verdict: 'Always Fresh' },
  },
];

const LANDING_PLANS = [
  {
    key: 'free', name: 'Free', badge: null as string | null, badgeBg: undefined as string | undefined,
    monthlyPrice: '$0', annualPrice: '$0', period: '/month', annualPeriod: '/month',
    annualNote: null as string | null, savings: null as string | null, thenNote: '',
    desc: 'For creators just getting started', dark: false, icon: Zap,
    features: ['3 searches/month', '10 hashtags per search', 'Basic verdicts only', '2 platforms'],
    cta: 'Get started free',
  },
  {
    key: 'pro', name: 'Pro', badge: '⭐ FOUNDER PRICING', badgeBg: '#0891B2',
    monthlyPrice: '$19', annualPrice: '$15', period: '/mo', annualPeriod: '/mo',
    annualNote: 'billed $180/yr', savings: 'Save $48/yr', thenNote: '',
    desc: 'For serious creators who want real reach', dark: false, icon: Zap,
    features: ['1,000 searches/month', '30 hashtags with full verdicts', 'Use Now. Rising Fast. Skip.', 'All 6 platforms', 'Trend analytics + collections', 'Content assistant', 'Priority support'],
    cta: 'Start growing now',
  },
  {
    key: 'agency', name: 'Agency', badge: 'BEST VALUE', badgeBg: '#0891B2',
    monthlyPrice: '$99', annualPrice: '$79', period: '/mo', annualPeriod: '/mo',
    annualNote: 'billed $948/yr', savings: 'Save $240/yr', thenNote: '',
    desc: 'For teams & agencies', dark: true, icon: Building2,
    features: ['5,000 searches/month', 'Everything in Pro', 'White-label reports', 'API access', 'Bulk export', 'Dedicated support'],
    cta: 'Get started',
  },
];

const dotGrid = (bg = '#FFFFFF'): React.CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: 'radial-gradient(circle, #DADADF 1px, transparent 1px)',
  backgroundSize: '20px 20px',
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
    <div className="landing-overflow-lock" style={{ backgroundColor: '#FFFFFF', color: '#111111', fontFamily: 'Inter, sans-serif' }}>

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
              {(['Features','Analyzer','Pricing'] as const).map(label => (
                <a key={label} href={`#${label.toLowerCase()}`}
                  onClick={e => { e.preventDefault(); document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' }); }}
                  style={{ fontSize: 15, color: '#52525B', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color='#111111')}
                  onMouseLeave={e => (e.currentTarget.style.color='#52525B')}
                >{label}</a>
              ))}
              <a href="/#/blog" style={{ fontSize: 15, color: '#52525B', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color='#111111')}
                onMouseLeave={e => (e.currentTarget.style.color='#52525B')}>Blog</a>
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
              {(['Features','Analyzer','Pricing'] as const).map(label => (
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
              AI Hashtag Generator &amp; Trend Intelligence
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
              Find the best hashtags for Instagram, TikTok, YouTube, and more. TrendJetter scores every tag by reach, competition, trend velocity, and local relevance — so you always know exactly what to post.
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
        <section style={{ padding: 'clamp(40px,5vw,64px) clamp(16px,4vw,32px)', borderTop: '1px solid #E4E4E7', borderBottom: '1px solid #E4E4E7', background: '#FAFAFA' }}>
          <div className="stats-bar-grid" style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
            {[
              { val: 50000, suf: '+', label: 'Hashtags analyzed',     sub: 'across IG, TikTok & more' },
              { val: 7,     suf: '',  label: 'Scoring dimensions',    sub: 'per hashtag, per platform' },
              { val: 6,     suf: '',  label: 'Platforms supported',   sub: 'IG · TT · YT · X · FB · LI' },
              { val: 2,     suf: 's', label: 'Avg generation time',   sub: 'full AI analysis, instant' },
            ].map(({ val, suf, label, sub }, i) => (
              <div key={label} className={`stats-bar-cell stats-bar-cell-${i}`} style={{
                textAlign: 'center',
                padding: '0 24px',
                borderRight: i < 3 ? '1px solid #E4E4E7' : 'none',
              }}>
                <p style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(32px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#111111', lineHeight: 1, marginBottom: 6 }}>
                  <AnimNum target={val} suffix={suf} />
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 11, color: '#A1A1AA', letterSpacing: '0.01em' }}>{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quote reveal: slides into view, locks, words fill ── */}
        {/* Section is 200vh: first 100vh = section scrolls up from below (entry).
            Second 100vh = fully locked on screen, words fill word by word. */}
        <section
          ref={sectionRef}
          style={{
            ...dotGrid('#F8F8F9'),
            height: '200vh',
            position: 'relative',
            borderTop: '1px solid #E4E4E7',
            borderBottom: '1px solid #E4E4E7',
          }}
        >
          <div style={{
            position: 'sticky', top: 0, height: '100vh', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', padding: '0 clamp(28px, 6vw, 80px)',
          }}>
            <ScrollRevealQuote sectionRef={sectionRef}>
              {"“The creators winning right now aren’t posting more. They’re posting smarter.”"}
            </ScrollRevealQuote>
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <p style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 15, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em', marginBottom: 4 }}>Gary Vaynerchuk</p>
              <p style={{ fontSize: 12, color: '#A1A1AA', letterSpacing: '0.01em' }}>Entrepreneur · Chairman of VaynerX</p>
            </div>

          </div>
        </section>

        {/* ── Comparison ── */}
        <section style={{ padding: '80px 32px', background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p className="label-eyebrow" style={{ marginBottom: 12 }}>The Intelligence Difference</p>
              <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(32px,3vw,42px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111', marginBottom: 12 }}>Other hashtag tools vs. TrendJetter</h2>
              <p style={{ fontSize: 16, color: '#71717A', maxWidth: 400, margin: '0 auto' }}>Most tools show you numbers. TrendJetter tells you what to do.</p>
            </div>
            <div className="comparison-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
              <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(32px,3vw,42px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#111111' }}>Everything you need to find the best hashtags</h2>
            </div>
            <div className="features-grid">
              {FEATURES.map(({ icon, title, desc, accent, example }, i) => (
                <FeatureCard key={title} icon={icon} title={title} desc={desc} accent={accent} example={example} delay={i * 60} />
              ))}
            </div>
          </div>
        </SpotlightSection>

        {/* ── Analyzer ── */}
        <AnalyzerEmbed />

        {/* ── Pricing ── */}
        <LandingPricingSection />

        {/* ── Final CTA — spotlight dot grid ── */}
        <SpotlightSection style={{ padding: '96px 32px', textAlign: 'center', borderTop: '1px solid #E4E4E7' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
            <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111111', marginBottom: 16, lineHeight: 1.08 }}>
              Your competitors are guessing.<br />
              <span style={{ color: '#0891B2' }}>You don&apos;t have to.</span>
            </h2>
            <p style={{ fontSize: 16, color: '#71717A', marginBottom: 32, lineHeight: 1.65 }}>TrendJetter scores every hashtag across 7 dimensions and tells you exactly what to post — in under 2 seconds.</p>
            <MagneticBtn href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard" className="btn-primary" style={{ fontSize: 15, padding: '12px 32px' }} data-testid="final-cta">
              <Hash size={16} /> Start for free
            </MagneticBtn>
            <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 16 }}>No credit card required · 3 free searches every month</p>
          </div>
        </SpotlightSection>

        {/* ── Footer ── */}
        <footer style={{ background: '#111111', color: '#FFFFFF' }}>
          {/* Main footer */}
          <div className="footer-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 32px 40px', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40 }}>
            {/* Brand column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={13} color="#FFFFFF" />
                </div>
                <TrendJetterLogo height={20} color="#FFFFFF" />
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 240 }}>
                The hashtag intelligence platform for serious creators. Score, rank, and post with confidence — every time.
              </p>
              <a href="mailto:hi@trendjetter.io"
                style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.35)')}>
                hi@trendjetter.io
              </a>
            </div>

            {/* Product */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Product</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Features',  href: '/#features' },
                  { label: 'Pricing',   href: '/#pricing' },
                  { label: 'Blog',      href: '/#/blog' },
                  { label: 'Dashboard', href: '/#/dashboard' },
                  { label: 'Generator', href: '/#/generator' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.5)')}>{label}</a>
                ))}
              </div>
            </div>

            {/* Platforms */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Platforms</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'Facebook', 'LinkedIn'].map(p => (
                  <span key={p} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{p}</span>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Company</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Privacy Policy', href: '/#/privacy' },
                  { label: 'Terms of Service', href: '/#/terms' },
                  { label: 'Support', href: 'mailto:hi@trendjetter.io' },
                  { label: 'Contact', href: 'mailto:hi@trendjetter.io' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.9)')}
                    onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.5)')}>{label}</a>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px' }}>
            <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2026 TrendJetter · Built for serious creators.</p>

              {/* Social icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {[
                  { label: 'Instagram', href: 'https://instagram.com/trendjetter.io', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  )},
                  { label: 'TikTok', href: 'https://tiktok.com/@trendjetter.io', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.19a8.16 8.16 0 0 0 4.77 1.52V7.27a4.85 4.85 0 0 1-1-.58z"/>
                    </svg>
                  )},
                  { label: 'X', href: 'https://x.com/trendjetterapp', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                    </svg>
                  )},
                  { label: 'YouTube', href: 'https://youtube.com/@trendjetter', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  )},
                  { label: 'LinkedIn', href: 'https://linkedin.com/company/109657645', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  )},
                  { label: 'Pinterest', href: 'https://pinterest.com/trendjetterapp', icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                    </svg>
                  )},
                ].map(({ label, href, icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    aria-label={label}
                    style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.8)')}
                    onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.3)')}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
    </div>
  );
}
