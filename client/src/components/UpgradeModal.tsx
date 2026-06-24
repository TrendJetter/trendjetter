import { useState } from 'react';
import { X, Check, Zap, Building2, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// ── Price IDs from env ────────────────────────────────────────────────────────
const PRICE_IDS = {
  proMonthly:   import.meta.env.VITE_STRIPE_PRO_PRICE_ID          ?? '',
  proAnnual:    import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID   ?? '',
  agencyMonthly:import.meta.env.VITE_STRIPE_AGENCY_PRICE_ID       ?? '',
  agencyAnnual: import.meta.env.VITE_STRIPE_AGENCY_ANNUAL_PRICE_ID?? '',
};

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'pro',
    name: 'Pro',
    badge: 'Founder Pricing',
    monthlyPrice: '$19',
    annualPrice: '$15',
    period: '/mo',
    annualPeriod: '/mo',
    annualNote: 'billed $180/yr',
    savings: 'Save $48/yr',
    originalMonthly: null,
    desc: 'For serious creators',
    icon: Zap,
    dark: false,
    highlight: false,
    features: [
      '1,000 generations/month',
      'AI-powered hashtag intelligence',
      'Trend analytics dashboard',
      'Collections & saved sets',
      'Content assistant',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'agency',
    name: 'Agency',
    badge: 'BEST VALUE',
    badgeBg: '#111111',
    monthlyPrice: '$99',
    annualPrice: '$79',
    period: '/mo',
    annualPeriod: '/mo',
    annualNote: 'billed $948/yr',
    savings: 'Save $240/yr',
    originalMonthly: null,
    desc: 'For teams & agencies',
    icon: Building2,
    dark: true,
    highlight: true,
    features: [
      '5,000 generations/month',
      'Everything in Pro',
      'Team seats',
      'Client management',
      'Bulk export',
      'Dedicated support',
    ],
    cta: 'Upgrade to Agency',
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function getPriceId(key: string, annual: boolean): string {
  if (key === 'pro')   return annual ? PRICE_IDS.proAnnual   : PRICE_IDS.proMonthly;
  if (key === 'agency')return annual ? PRICE_IDS.agencyAnnual: PRICE_IDS.agencyMonthly;
  return '';
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface CardProps {
  plan: typeof TRIAL_PLAN | typeof PLANS[number];
  annual: boolean;
  loading: string | null;
  currentPlan: string;
  onUpgrade: (key: string, name: string) => void;
}

function PlanCard({ plan, annual, loading, currentPlan, onUpgrade }: CardProps) {
  const isCurrent = currentPlan === plan.key;
  const isDark = plan.dark;
  const isLoading = loading === plan.key;

  const displayPrice  = annual ? plan.annualPrice  : plan.monthlyPrice;
  const displayPeriod = annual ? plan.annualPeriod  : plan.period;

  const bg     = isDark ? '#111111' : '#FFFFFF';
  const border  = isDark ? '#222222' : '#E4E4E7';
  const textPri = isDark ? '#FFFFFF' : '#111111';
  const textSec = isDark ? '#A1A1AA' : '#52525B';
  const checkC  = isDark ? '#0891B2' : '#0891B2';
  const btnBg   = isDark ? '#FFFFFF' : '#111111';
  const btnText = isDark ? '#111111' : '#FFFFFF';

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 14,
        padding: '20px 20px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Badge */}
      {'badge' in plan && plan.badge && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 999,
            background: plan.badgeBg ?? '#111111',
            color: '#FFFFFF',
          }}>{plan.badge}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <plan.icon size={15} color={isDark ? '#A1A1AA' : '#0891B2'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: textPri, letterSpacing: '-0.01em' }}>{plan.name}</span>
        </div>
        <p style={{ fontSize: 11, color: textSec, margin: 0 }}>{plan.desc}</p>
      </div>

      {/* Price */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 30, fontWeight: 800, color: textPri, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {displayPrice}
          </span>
          <span style={{ fontSize: 12, color: textSec, marginBottom: 1 }}>{displayPeriod}</span>
        </div>

        {/* Annual note or "then" note */}
        {plan.key === 'trial' ? (
          <p style={{ fontSize: 11, color: textSec, marginTop: 4 }}>{annual ? plan.annualThenNote : plan.thenNote}</p>
        ) : (
          annual && 'annualNote' in plan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: textSec }}>{plan.annualNote}</span>
              {'savings' in plan && plan.savings && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: isDark ? 'rgba(8,145,178,0.25)' : 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                  {plan.savings}
                </span>
              )}
            </div>
          )
        )}
      </div>

      {/* Features */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <Check size={12} style={{ color: checkC, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: textSec, lineHeight: 1.4 }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={() => onUpgrade(plan.key, plan.name)}
        disabled={!!loading || isCurrent}
        data-testid={`upgrade-btn-${plan.key}`}
        style={{
          width: '100%',
          padding: '10px 0',
          borderRadius: 8,
          border: 'none',
          background: isCurrent ? (isDark ? 'rgba(255,255,255,0.1)' : '#F4F4F5') : btnBg,
          color: isCurrent ? textSec : btnText,
          fontSize: 13,
          fontWeight: 700,
          cursor: loading || isCurrent ? 'not-allowed' : 'pointer',
          opacity: loading && !isLoading ? 0.5 : 1,
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          letterSpacing: '-0.01em',
        }}
      >
        {isLoading ? (
          'Redirecting...'
        ) : isCurrent ? (
          'Current plan'
        ) : (
          <>
            {plan.cta}
            <ArrowRight size={13} />
          </>
        )}
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  reason?: string;
}

export default function UpgradeModal({ isOpen, onClose, currentPlan = 'free', reason }: UpgradeModalProps) {
  const [loading, setLoading]   = useState<string | null>(null);
  const [annual, setAnnual]     = useState(false);
  const { toast }               = useToast();

  if (!isOpen) return null;

  const handleUpgrade = async (key: string, name: string) => {
    const priceId = getPriceId(key, annual);
    if (!priceId) {
      toast({ title: 'Configuration error', description: 'Price ID not set — contact support.', variant: 'destructive' });
      return;
    }
    setLoading(key);
    try {
      const res = await apiRequest('POST', '/api/stripe/checkout', { priceId });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(null);
    }
  };

  const allCards = [...PLANS];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#FAFAFA',
          border: '1px solid #E4E4E7',
          borderRadius: 18,
          width: '100%',
          maxWidth: 780,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 20, fontWeight: 800, color: '#111111', letterSpacing: '-0.025em', marginBottom: 4 }}>
              Choose your plan
            </h2>
            {reason && <p style={{ fontSize: 13, color: '#71717A' }}>{reason}</p>}
          </div>
          <button
            onClick={onClose}
            data-testid="modal-close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: 4, lineHeight: 1, marginTop: -2 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Monthly / Annual toggle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 24px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#EBEBEB', borderRadius: 999, padding: 3 }}>
            <button
              onClick={() => setAnnual(false)}
              data-testid="toggle-monthly"
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                background: !annual ? '#111111' : 'transparent',
                color: !annual ? '#FFFFFF' : '#71717A',
                transition: 'all 0.18s',
                letterSpacing: '-0.01em',
              }}
            >Monthly</button>
            <button
              onClick={() => setAnnual(true)}
              data-testid="toggle-annual"
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                background: annual ? '#111111' : 'transparent',
                color: annual ? '#FFFFFF' : '#71717A',
                transition: 'all 0.18s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '-0.01em',
              }}
            >
              Annual
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: '#0891B2', color: '#FFFFFF' }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* ── Cards ── */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', alignItems: 'stretch' }}>
          {allCards.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              annual={annual}
              loading={loading}
              currentPlan={currentPlan}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#A1A1AA', paddingBottom: 14 }}>
          Secure payment via Stripe · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
