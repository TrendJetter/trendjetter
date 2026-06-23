import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Hash, TrendingUp, Bookmark, Sparkles, ArrowRight, ArrowUpRight, Clock, BarChart2, Zap, Target, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TiltCard } from '@/components/AppAnimations';
import type { User, Search } from '@shared/schema';

// ─── Score helpers ─────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 88) return '#B45309';
  if (s >= 75) return '#16A34A';
  if (s >= 62) return '#0891B2';
  if (s >= 48) return '#2563EB';
  if (s >= 35) return '#D97706';
  if (s >= 20) return '#EA580C';
  return '#DC2626';
}
function verdictLabel(s: number) {
  if (s >= 88) return '🔥 Viral Potential';
  if (s >= 75) return '⚡ Use Now';
  if (s >= 62) return '✓ Strong Pick';
  if (s >= 48) return '→ Good Filler';
  if (s >= 35) return '◎ Situational';
  if (s >= 20) return '↓ Low Reach';
  return '✕ Skip';
}
function verdictClass(s: number) {
  if (s >= 88) return 'verdict-viral';
  if (s >= 75) return 'verdict-use';
  if (s >= 62) return 'verdict-strong';
  if (s >= 48) return 'verdict-filler';
  if (s >= 35) return 'verdict-situational';
  if (s >= 20) return 'verdict-low';
  return 'verdict-skip';
}

// ─── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#0891B2' }: { data: number[]; color?: string }) {
  const w = 64, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

// ─── Platform color dot ─────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  instagram: { bg: '#FEE2E2', color: '#DC2626', label: 'IG' },
  tiktok:    { bg: '#111111', color: '#FFFFFF', label: 'TT' },
  youtube:   { bg: '#FEE2E2', color: '#DC2626', label: 'YT' },
  linkedin:  { bg: '#DBEAFE', color: '#1D4ED8', label: 'LI' },
  facebook:  { bg: '#DBEAFE', color: '#1D4ED8', label: 'FB' },
  twitter:   { bg: '#E0F2FE', color: '#0369A1', label: 'X'  },
  x:         { bg: '#111111', color: '#FFFFFF', label: 'X'  },
};

// ─── Metric card — colored accent ───────────────────────────────────────────
function MetricCard({ label, value, spark, icon: Icon, accent, sub }: {
  label: string; value: string; spark?: number[];
  icon: any; accent: string; sub?: string;
}) {
  return (
    <TiltCard intensity={10}>
      <div className="bento-tile h-full relative overflow-hidden">
        {/* Subtle accent glow top-right */}
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)` }} />
        <div className="flex items-start justify-between mb-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: accent + '15' }}>
            <Icon size={13} style={{ color: accent }} />
          </div>
          {spark && <Sparkline data={spark} color={accent} />}
        </div>
        <p className="text-[28px] font-bold tabular mb-0.5"
          style={{ fontFamily: 'Inter Tight, Inter, sans-serif', color: '#111111', letterSpacing: '-0.03em' }}>
          {value}
        </p>
        <p className="text-[11px] font-medium text-[#71717A] uppercase tracking-wide leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-[#A1A1AA] mt-0.5">{sub}</p>}
      </div>
    </TiltCard>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useQuery<User>({ queryKey: ['/api/me'] });
  const { data: searches, isLoading: searchesLoading } = useQuery<Search[]>({ queryKey: ['/api/searches'] });
  const { data: collections } = useQuery<any[]>({ queryKey: ['/api/collections'] });

  const recent = searches?.slice(0, 5) ?? [];

  // ── Real per-user stats ─────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const searchesThisMonth = (searches ?? []).filter(s => new Date((s as any).createdAt ?? 0) >= monthStart);
  const totalHashtags = (searches ?? []).reduce((acc, s) => acc + ((s as any).totalHashtags ?? 30), 0);
  const avgOppScore = (() => {
    const scores = (searches ?? []).map(s => (s as any).opportunityScore).filter((v: any) => typeof v === 'number' && v > 0);
    return scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
  })();
  const collectionsCount = (collections ?? []).length;

  const greeting = (() => {
    const h = now.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const plan = (user as any)?.plan ?? 'free';
  const planLabel = plan === 'agency' ? 'Agency' : plan === 'pro' ? 'Pro' : 'Free';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── Hero header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {userLoading
            ? <Skeleton className="h-8 w-52 mb-2 bg-[#F4F4F5]" />
            : <h1 className="text-[26px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.03em' }}>
                {greeting}, {firstName}
              </h1>
          }
          <p className="text-[13px] text-[#71717A]">
            {searches && searches.length > 0
              ? `You've generated ${totalHashtags.toLocaleString()} hashtags — keep the momentum going.`
              : "Let's find your winning hashtags for this week."}
          </p>
        </div>
        {/* Generate CTA */}
        <Link href="/generator">
          <a className="no-underline shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:scale-105 hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #111111 0%, #27272A 100%)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <Zap size={13} />
            Generate Now
          </a>
        </Link>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Searches this month"
          value={searchesLoading ? '—' : String(searchesThisMonth.length)}
          icon={Hash}
          accent="#0891B2"
          spark={searchesThisMonth.length > 1 ? searchesThisMonth.slice(-8).map((_, i) => i + 1) : undefined}
          sub="this billing period"
        />
        <MetricCard
          label="Hashtags generated"
          value={searchesLoading ? '—' : totalHashtags > 0 ? totalHashtags.toLocaleString() : '0'}
          icon={Sparkles}
          accent="#8B5CF6"
          spark={totalHashtags > 0 ? [0, totalHashtags * 0.2, totalHashtags * 0.5, totalHashtags * 0.8, totalHashtags] : undefined}
          sub="all time"
        />
        <MetricCard
          label="Avg opportunity score"
          value={searchesLoading ? '—' : avgOppScore !== null ? String(avgOppScore) : '—'}
          icon={Target}
          accent="#16A34A"
          spark={avgOppScore !== null ? [avgOppScore - 10, avgOppScore - 6, avgOppScore - 3, avgOppScore - 1, avgOppScore] : undefined}
          sub={avgOppScore !== null ? (avgOppScore >= 65 ? 'above average ↑' : 'room to grow') : 'run a search first'}
        />
        <MetricCard
          label="Collections saved"
          value={String(collectionsCount)}
          icon={Bookmark}
          accent="#D97706"
          sub={collectionsCount === 0 ? 'save your best sets' : `${collectionsCount} saved set${collectionsCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent searches — 2 cols */}
        <TiltCard className="lg:col-span-2 rounded-xl overflow-hidden" intensity={6}>
          <div className="bento-tile" style={{ height: "100%" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#F4F4F5] flex items-center justify-center">
                  <Clock size={12} className="text-[#52525B]" />
                </div>
                <span className="text-[12px] font-semibold text-[#111111] uppercase tracking-wide">Recent Searches</span>
              </div>
              <Link href="/generator">
                <a className="no-underline flex items-center gap-1 text-[12px] font-medium text-[#0891B2] hover:text-[#0E7490] transition-colors">
                  New search <ArrowRight size={11} />
                </a>
              </Link>
            </div>

            {searchesLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-[#F4F4F5]" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #0891B2 0%, #8B5CF6 100%)' }}>
                  <Zap size={20} className="text-white" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-[#111111] mb-1">Run your first search</p>
                  <p className="text-[12px] text-[#A1A1AA]">Get 30 scored hashtags for any niche in seconds</p>
                </div>
                <Link href="/generator">
                  <a className="no-underline btn-primary text-[13px] py-2.5 px-5 flex items-center gap-2">
                    <Zap size={12} /> Generate hashtags
                  </a>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recent.map(s => {
                  const plt = PLATFORM_COLORS[(s.platform ?? '').toLowerCase()] ?? { bg: '#F4F4F5', color: '#52525B', label: '#' };
                  return (
                    <Link key={s.id} href={`/results/${s.id}`}>
                      <a className="no-underline flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#F9F9F9] transition-colors group border border-transparent hover:border-[#E4E4E7]">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Platform badge */}
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                            style={{ background: plt.bg, color: plt.color }}>
                            {plt.label}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#111111] truncate leading-none mb-1" style={{ letterSpacing: '-0.01em' }}>
                              {s.contentTopic || s.industry || 'Search'}
                            </p>
                            <p className="text-[11px] text-[#A1A1AA] leading-none capitalize">
                              {s.platform}{s.locationCity ? ` · ${s.locationCity}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] text-[#D4D4D8]">
                            {new Date(s.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <ArrowUpRight size={13} className="text-[#D4D4D8] group-hover:text-[#0891B2] transition-colors" />
                        </div>
                      </a>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </TiltCard>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick actions */}
          <TiltCard intensity={8}>
            <div className="bento-tile">
              <span className="text-[11px] font-semibold text-[#111111] uppercase tracking-wide mb-3 block">Quick Actions</span>
              <div className="space-y-1">
                {[
                  { href: '/generator', icon: Hash,       label: 'Generate hashtags',   desc: 'New intelligence report',  accent: '#0891B2' },
                  { href: '/trends',    icon: TrendingUp, label: 'Browse trends',        desc: "What's hot this week",     accent: '#DC2626' },
                  { href: '/content',   icon: Sparkles,   label: 'Content assistant',    desc: 'AI caption + schedule',    accent: '#8B5CF6' },
                  { href: '/collections', icon: Bookmark, label: 'Collections',          desc: 'Saved hashtag sets',       accent: '#D97706' },
                ].map(({ href, icon: Icon, label, desc, accent }) => (
                  <Link key={href} href={href}>
                    <a className="no-underline flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F9F9F9] transition-colors group border border-transparent hover:border-[#E4E4E7]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                        style={{ background: accent + '15' }}>
                        <Icon size={13} style={{ color: accent }} />
                      </div>
                      <div>
                        <p className="text-[12.5px] font-semibold text-[#111111] leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>{label}</p>
                        <p className="text-[11px] text-[#A1A1AA] leading-none">{desc}</p>
                      </div>
                      <ArrowRight size={11} className="text-[#E4E4E7] group-hover:text-[#A1A1AA] transition-colors ml-auto" />
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Plan card */}
          <TiltCard intensity={8}>
            <div className="rounded-xl p-4 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #111111 0%, #1C1C1E 100%)', border: '1px solid #2C2C2E' }}>
              {/* Glow */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.12) 0%, transparent 70%)' }} />
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: 'rgba(8,145,178,0.2)' }}>
                  <Flame size={11} className="text-cyan-400" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {planLabel} Plan
                </span>
              </div>
              <p className="text-[13px] font-medium mb-3 leading-snug" style={{ color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                {plan === 'free'
                  ? 'Upgrade to unlock 1,000 searches/mo and all platforms.'
                  : plan === 'pro'
                  ? '1,000 searches/mo · all platforms · content assistant.'
                  : '5,000 searches/mo · all platforms · priority intelligence.'}
              </p>
              <Link href="/account">
                <a className="no-underline text-[12px] font-semibold flex items-center gap-1 transition-all hover:gap-2"
                  style={{ color: '#0891B2' }}>
                  {plan === 'free' ? 'Upgrade plan' : 'Manage plan'} <ArrowRight size={11} />
                </a>
              </Link>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
