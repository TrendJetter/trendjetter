import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Hash, TrendingUp, Bookmark, Sparkles, ArrowRight, ArrowUpRight, Clock, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TiltCard } from '@/components/AppAnimations';
import type { User, Search } from '@shared/schema';

// ─── Score helpers ─────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return '#16A34A';
  if (s >= 55) return '#0891B2';
  if (s >= 35) return '#D97706';
  return '#DC2626';
}
function verdictLabel(s: number) {
  if (s >= 75) return 'Use This Now';
  if (s >= 55) return 'Good Pick';
  if (s >= 35) return 'Situational';
  return 'Skip';
}
function verdictClass(s: number) {
  if (s >= 75) return 'verdict-use';
  if (s >= 55) return 'verdict-good';
  if (s >= 35) return 'verdict-situational';
  return 'verdict-skip';
}

// ─── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#0891B2' }: { data: number[]; color?: string }) {
  const w = 72, h = 24;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Metric card ────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, spark }: { label: string; value: string; delta?: string; spark?: number[] }) {
  return (
    <TiltCard intensity={10}>
      <div className="bento-tile h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="label-eyebrow">{label}</span>
          {delta && <span className="text-[12px] font-medium text-green-600">{delta}</span>}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-[28px] font-bold tabular tracking-display" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', color: '#111111', letterSpacing: '-0.03em' }}>{value}</span>
          {spark && <Sparkline data={spark} />}
        </div>
      </div>
    </TiltCard>
  );
}

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useQuery<User>({ queryKey: ['/api/me'] });
  const { data: searches, isLoading: searchesLoading } = useQuery<Search[]>({ queryKey: ['/api/searches'] });

  const recent = searches?.slice(0, 5) ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        {userLoading
          ? <Skeleton className="h-7 w-48 mb-1 bg-[#F4F4F5]" />
          : <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}, {user?.name?.split(' ')[0] ?? 'there'}
            </h1>
        }
        <p className="text-[14px] text-[#71717A]">Here's your hashtag intelligence overview.</p>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Searches this month" value="12" delta="+4" spark={[4,6,5,8,7,9,10,12]} />
        <MetricCard label="Hashtags generated" value="284" spark={[40,55,48,70,65,80,90,284]} />
        <MetricCard label="Avg opportunity score" value="76" delta="+3" spark={[68,70,72,71,74,73,75,76]} />
        <MetricCard label="Collections saved" value="3" />
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent searches — spans 2 cols */}
        <TiltCard className="lg:col-span-2" intensity={6}>
          <div className="bento-tile">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#A1A1AA]" />
                <span className="label-eyebrow">Recent Searches</span>
              </div>
              <Link href="/generator">
                <a className="no-underline flex items-center gap-1 text-[12px] font-medium text-[#111111] hover:text-[#52525B] transition-colors">
                  New search <ArrowRight size={12} />
                </a>
              </Link>
            </div>

            {searchesLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-[#F4F4F5]" />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F4F4F5] flex items-center justify-center">
                  <Hash size={18} className="text-[#A1A1AA]" />
                </div>
                <p className="text-[13px] text-[#A1A1AA]">No searches yet</p>
                <Link href="/generator">
                  <a className="no-underline btn-primary text-[13px] py-2 px-4">Generate hashtags</a>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recent.map(s => (
                  <Link key={s.id} href={`/results/${s.id}`}>
                    <a className="no-underline flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[#F4F4F5] transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                          <Hash size={12} className="text-[#52525B]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#111111] truncate leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>
                            {s.contentTopic || s.locationCity}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] leading-none">
                            {s.platform} · {s.locationCity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[#A1A1AA]">{new Date(s.createdAt!).toLocaleDateString()}</span>
                        <ArrowUpRight size={12} className="text-[#D4D4D8] group-hover:text-[#111111] transition-colors" />
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TiltCard>

        {/* Quick actions */}
        <div className="flex flex-col gap-4">
          <TiltCard intensity={8}>
            <div className="bento-tile">
              <span className="label-eyebrow mb-4 block">Quick Actions</span>
              <div className="space-y-2">
                {[
                  { href: '/generator', icon: Hash, label: 'Generate hashtags', desc: 'New intelligence report' },
                  { href: '/trends', icon: TrendingUp, label: 'Browse trends', desc: "What's hot right now" },
                  { href: '/content', icon: Sparkles, label: 'Content assistant', desc: 'AI caption + schedule' },
                  { href: '/collections', icon: Bookmark, label: 'Collections', desc: 'Saved hashtag sets' },
                ].map(({ href, icon: Icon, label, desc }) => (
                  <Link key={href} href={href}>
                    <a className="no-underline flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F4F4F5] transition-colors group">
                      <div className="w-7 h-7 rounded-md bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-white transition-colors">
                        <Icon size={13} className="text-[#52525B]" />
                      </div>
                      <div>
                        <p className="text-[12.5px] font-medium text-[#111111] leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>{label}</p>
                        <p className="text-[11px] text-[#A1A1AA] leading-none">{desc}</p>
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          </TiltCard>

          {/* Plan badge */}
          <TiltCard intensity={8}>
            <div className="bento-tile" style={{ background: '#111111', borderColor: '#111111' }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Pro Plan</span>
              </div>
              <p className="text-[13px] font-medium mb-3" style={{ color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                Unlimited searches, all platforms, content assistant.
              </p>
              <Link href="/account">
                <a className="no-underline text-[12px] font-medium flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Manage plan <ArrowRight size={11} />
                </a>
              </Link>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
