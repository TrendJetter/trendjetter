import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Bell, Shield, Key, LogOut, ChevronRight, Check, ArrowRight, ExternalLink, Zap, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import BrandVoiceSettings from '@/components/BrandVoiceSettings';
import type { User as UserType } from '@shared/schema';

// ── Price IDs ────────────────────────────────────────────────────────────────
const PRICE_IDS = {
  proMonthly:    import.meta.env.VITE_STRIPE_PRO_PRICE_ID           ?? '',
  proAnnual:     import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID    ?? '',
  agencyMonthly: import.meta.env.VITE_STRIPE_AGENCY_PRICE_ID        ?? '',
  agencyAnnual:  import.meta.env.VITE_STRIPE_AGENCY_ANNUAL_PRICE_ID ?? '',
};

// ── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = {
  free: {
    name: 'Free',
    icon: null,
    monthlyPrice: '$0',
    annualPrice: '$0',
    annualNote: '',
    savings: '',
    features: ['3 searches/month', '10 hashtags per search', 'Basic scoring', 'All 6 platforms'],
  },
  pro: {
    name: 'Pro',
    icon: Zap,
    monthlyPrice: '$29',
    annualPrice: '$23',
    annualNote: 'billed $276/yr',
    savings: 'Save $72/yr',
    features: ['1,000 searches/month', '30 hashtags per search', 'Full intelligence scores', 'All 6 platforms', 'Saved collections', 'Content assistant', 'Priority support'],
  },
  agency: {
    name: 'Agency',
    icon: Building2,
    monthlyPrice: '$99',
    annualPrice: '$79',
    annualNote: 'billed $948/yr',
    savings: 'Save $240/yr',
    features: ['5,000 searches/month', '30 hashtags per search', 'Everything in Pro', 'White-label reports', 'API access', 'Dedicated support'],
  },
};

const PLAN_ORDER = { free: 0, pro: 1, agency: 2 };

// ── Helpers ──────────────────────────────────────────────────────────────────
function clerkHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-clerk-user-id':    (window as any).__CLERK_USER_ID__    ?? '',
    'x-clerk-user-email': (window as any).__CLERK_USER_EMAIL__ ?? '',
    'x-clerk-user-name':  (window as any).__CLERK_USER_NAME__  ?? '',
  };
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
  planKey, currentPlan, annual,
}: {
  planKey: 'free' | 'pro' | 'agency';
  currentPlan: 'free' | 'pro' | 'agency';
  annual: boolean;
}) {
  const p = PLANS[planKey];
  const current = planKey === currentPlan;
  const isUpgrade = PLAN_ORDER[planKey] > PLAN_ORDER[currentPlan];
  const isDowngrade = PLAN_ORDER[planKey] < PLAN_ORDER[currentPlan];
  const [loading, setLoading] = useState(false);
  const PlanIcon = p.icon;

  const price = annual ? p.annualPrice : p.monthlyPrice;

  async function handlePlanChange() {
    if (current) return;

    // Downgrade / cancel → Stripe portal
    if (isDowngrade || planKey === 'free') {
      setLoading(true);
      try {
        const res = await fetch('/api/stripe/portal', { method: 'POST', headers: clerkHeaders() });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } finally { setLoading(false); }
      return;
    }

    // Upgrade → Stripe Checkout with correct price ID
    let priceId = '';
    if (planKey === 'pro')    priceId = annual ? PRICE_IDS.proAnnual    : PRICE_IDS.proMonthly;
    if (planKey === 'agency') priceId = annual ? PRICE_IDS.agencyAnnual : PRICE_IDS.agencyMonthly;

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: clerkHeaders(),
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setLoading(false); }
  }

  const btnLabel = current
    ? 'Current Plan'
    : isDowngrade
    ? planKey === 'free' ? 'Downgrade to Free' : 'Switch Plan'
    : `Upgrade to ${p.name}`;

  return (
    <div
      className={`bento-tile p-5 flex flex-col gap-4 transition-all ${current ? 'border-[#111111]' : ''}`}
      data-testid={`plan-card-${planKey}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {PlanIcon && (
            <div className="w-6 h-6 rounded-md bg-[#F4F4F5] flex items-center justify-center">
              <PlanIcon size={12} className="text-[#111111]" />
            </div>
          )}
          <p className="text-[14px] font-semibold text-[#111111]" style={{ letterSpacing: '-0.01em' }}>{p.name}</p>
        </div>
        {current && (
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#111111] text-white">
            Current
          </span>
        )}
      </div>

      {/* Price */}
      <div>
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-[26px] font-bold text-[#111111] tabular"
            style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.03em' }}
          >
            {price}
          </span>
          <span className="text-[13px] text-[#A1A1AA]">/mo</span>
        </div>
        {annual && p.annualNote && (
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">{p.annualNote}</p>
        )}
        {annual && p.savings && (
          <span className="inline-block text-[10px] font-semibold text-[#0891B2] bg-[#F0FDFA] border border-[#99F6E4] px-1.5 py-0.5 rounded-full mt-1">
            {p.savings}
          </span>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 space-y-1.5">
        {p.features.map(f => (
          <div key={f} className="flex items-center gap-2">
            <Check size={11} className={current ? 'text-[#111111]' : 'text-[#D4D4D8]'} />
            <span className={`text-[12px] ${current ? 'text-[#52525B]' : 'text-[#A1A1AA]'}`}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        data-testid={`button-plan-${planKey}`}
        onClick={handlePlanChange}
        disabled={current || loading}
        className={`w-full h-9 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-1 ${
          current
            ? 'border border-[#E4E4E7] text-[#A1A1AA] cursor-default'
            : isUpgrade
            ? 'bg-[#111111] text-white hover:opacity-90 cursor-pointer'
            : 'border border-[#E4E4E7] text-[#52525B] hover:border-[#A1A1AA] hover:text-[#111111] cursor-pointer'
        }`}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {loading ? 'Loading…' : <>{btnLabel}{isUpgrade && !loading && <ArrowRight size={12} />}</>}
      </button>
    </div>
  );
}

// ── Setting row ──────────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, label, desc, action, onClick }: {
  icon: any; label: string; desc: string; action?: string; onClick?: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 py-3.5 text-left group cursor-pointer border-b border-[#F4F4F5] last:border-0"
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-[#EFEFEF] transition-colors">
        <Icon size={14} className="text-[#71717A]" />
      </div>
      <div className="flex-1">
        <p className="text-[13.5px] font-medium text-[#111111] leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>{label}</p>
        <p className="text-[12px] text-[#A1A1AA]">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        {action && <span className="text-[12px] text-[#A1A1AA]">{action}</span>}
        <ChevronRight size={13} className="text-[#D4D4D8] group-hover:text-[#A1A1AA] transition-colors" />
      </div>
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const [annual, setAnnual] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ['/api/me'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: usageData } = useQuery<{ count: number; limit: number; plan: string }>({
    queryKey: ['/api/usage'],
    staleTime: 0,
  });

  const { data: collections } = useQuery<any[]>({ queryKey: ['/api/collections'] });

  const plan = (user?.plan ?? 'free') as 'free' | 'pro' | 'agency';
  const isPaid = plan !== 'free';

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST', headers: clerkHeaders() });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setPortalLoading(false); }
  }

  // Real stats
  const searchesThisMonth = usageData?.count ?? user?.searchesThisMonth ?? 0;
  const searchLimit       = usageData?.limit ?? 3;
  const collectionCount   = collections?.length ?? 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-[22px] font-bold text-[#111111] mb-1"
          style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}
        >
          Account
        </h1>
        <p className="text-[14px] text-[#71717A]">Manage your plan, preferences, and settings.</p>
      </div>

      {/* ── Profile card ── */}
      <div className="bento-tile p-6 mb-4">
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full bg-[#F4F4F5]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 bg-[#F4F4F5]" />
              <Skeleton className="h-3 w-52 bg-[#F4F4F5]" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
                style={{ background: '#111111', color: '#FFFFFF', fontFamily: 'Inter Tight, Inter, sans-serif' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() ?? 'C'}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#111111] leading-none mb-1" style={{ letterSpacing: '-0.015em' }}>
                  {user?.name ?? 'Creator'}
                </p>
                <p className="text-[13px] text-[#71717A]">{user?.email ?? ''}</p>
              </div>
            </div>

            {/* Manage billing — paid users only */}
            {isPaid && (
              <button
                data-testid="button-manage-billing"
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-[13px] font-medium text-[#52525B] hover:border-[#A1A1AA] hover:text-[#111111] transition-all cursor-pointer disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ExternalLink size={12} />
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#F4F4F5]">
          {[
            ['Searches this month', `${searchesThisMonth}${plan === 'free' ? ` / ${searchLimit}` : ''}`],
            ['Plan', PLANS[plan].name],
            ['Collections', String(collectionCount)],
          ].map(([l, v]) => (
            <div key={l} className="bg-[#FAFAFA] rounded-lg px-4 py-3 border border-[#F4F4F5]">
              <p className="label-eyebrow mb-1">{l}</p>
              <p
                className="text-[18px] font-bold tabular text-[#111111]"
                style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subscription ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="label-eyebrow flex items-center gap-2"><CreditCard size={12} />Subscription</p>

        {/* Monthly / Annual toggle */}
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {[false, true].map(isAnnual => (
            <button
              key={String(isAnnual)}
              type="button"
              data-testid={isAnnual ? 'toggle-annual' : 'toggle-monthly'}
              onClick={() => setAnnual(isAnnual)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                annual === isAnnual
                  ? 'bg-white text-[#111111] shadow-sm border border-[#E4E4E7]'
                  : 'text-[#A1A1AA] hover:text-[#71717A]'
              }`}
            >
              {isAnnual ? (
                <span className="flex items-center gap-1.5">
                  Annual
                  <span className="text-[10px] font-semibold text-[#0891B2]">Save 20%</span>
                </span>
              ) : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <PlanCard planKey="free"   currentPlan={plan} annual={annual} />
        <PlanCard planKey="pro"    currentPlan={plan} annual={annual} />
        <PlanCard planKey="agency" currentPlan={plan} annual={annual} />
      </div>

      {/* ── Your Voice (Pro only) ── */}
      {isPaid && <BrandVoiceSettings />}

      {/* ── Settings ── */}
      <div className="bento-tile p-5 mb-4">
        <p className="label-eyebrow mb-4">Preferences</p>
        <SettingRow icon={Bell}   label="Notifications" desc="Weekly trend digests and score alerts" action="On" />
        <SettingRow icon={Shield} label="Privacy"       desc="Control your data and search history" />
        <SettingRow icon={Key}    label="API Access"    desc="Generate API keys for direct integration" action={isPaid ? '' : 'Pro'} />
      </div>
      <div className="bento-tile p-5">
        <SettingRow icon={LogOut} label="Sign Out" desc="Sign out of your TrendJetter account" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-[12px] text-[#D4D4D8]">TrendJetter v1.0</p>
        <div className="flex gap-4">
          {['Privacy', 'Terms', 'Support'].map(l => (
            <button key={l} className="text-[12px] text-[#A1A1AA] hover:text-[#52525B] transition-colors cursor-pointer">{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
