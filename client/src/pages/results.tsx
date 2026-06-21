import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Hash, ArrowLeft, Copy, Check, Star, ChevronDown, ChevronUp, TrendingUp, Zap, Target, BarChart2, MapPin, Flame, Sparkles, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SearchResult, Hashtag } from '@shared/schema';

// ─── Score helpers ──────────────────────────────────────────────────────────
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

function verdictBg(s: number) {
  if (s >= 88) return { background: '#FEF3C7', color: '#B45309' };
  if (s >= 75) return { background: '#DCFCE7', color: '#15803D' };
  if (s >= 62) return { background: '#CFFAFE', color: '#0E7490' };
  if (s >= 48) return { background: '#DBEAFE', color: '#1D4ED8' };
  if (s >= 35) return { background: '#FEF9C3', color: '#A16207' };
  if (s >= 20) return { background: '#FFEDD5', color: '#C2410C' };
  return { background: '#FEE2E2', color: '#B91C1C' };
}

// Plain-English insight for the expanded view — replaces 4 raw score bars
function getInsight(tag: Hashtag): string {
  const pop = tag.popularityScore ?? 0;
  const comp = tag.competitionScore ?? 0;
  const opp = tag.opportunityScore ?? 0;
  const loc = tag.localRelevanceScore ?? 0;

  if (pop >= 85 && comp >= 80) return `Mega-popular but brutally competitive — your post will be buried within minutes. Use only alongside stronger niche tags.`;
  if (pop >= 85 && comp < 60) return `High reach with manageable competition — solid mainstream play for broad discovery.`;
  if (opp >= 75 && comp < 40) return `Low competition, high opportunity — this is a hidden gem. Early adopters win here.`;
  if (opp >= 65 && loc >= 70) return `Strong local signal for your area — ideal for geo-targeted reach and community visibility.`;
  if (opp >= 65) return `Good opportunity window — niche enough to be discoverable, relevant enough to convert.`;
  if (comp >= 75 && opp < 35) return `Oversaturated — millions of posts competing for the same eyeballs. Skip unless it's core to your brand.`;
  if (tag.trendDirection === 'rising' && opp >= 55) return `Trending upward this week — momentum is building. Getting in now gives you an early mover edge.`;
  if (tag.trendDirection === 'declining') return `Losing momentum — this tag was bigger before. Only use if directly relevant to your content.`;
  if (loc >= 80) return `Hyper-local tag — excellent for targeting your specific market and community.`;
  return `Mid-tier performer — reliable filler tag to round out your set without hurting reach.`;
}

// Action-oriented group labels
const GROUP_META: Record<string, { label: string; actionLabel: string; icon: any; desc: string; color: string }> = {
  high_volume:  { label: 'High Volume',    actionLabel: 'Cast a Wide Net',      icon: BarChart2,  desc: 'Max reach — brutal competition, use sparingly',  color: '#6366F1' },
  medium:       { label: 'Medium Reach',   actionLabel: 'Your Bread & Butter',  icon: Target,     desc: 'Best balance of reach and discoverability',       color: '#0891B2' },
  niche:        { label: 'Niche',          actionLabel: 'Own Your Corner',       icon: Hash,       desc: 'Targeted audience, low competition, high ROI',    color: '#16A34A' },
  local:        { label: 'Local',          actionLabel: 'Dominate Your Market',  icon: MapPin,     desc: 'Hyper-local reach for your specific area',        color: '#D97706' },
  trending:     { label: 'Trending Now',   actionLabel: 'Post These Today',      icon: TrendingUp, desc: 'Rising fast this week — window is open now',      color: '#DC2626' },
};

// ─── This Week's Kit ────────────────────────────────────────────────────────
function WeeklyKit({ tags }: { tags: Hashtag[] }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Pick the best kit: prioritize trending + niche + local, all score >= 48
  const kit = [...tags]
    .filter(t => (t.overallScore ?? 0) >= 48)
    .sort((a, b) => {
      // Boost trending and niche
      const aBoost = (a as any).groupType === 'trending' || (a as any).groupType === 'niche' ? 10 : 0;
      const bBoost = (b as any).groupType === 'trending' || (b as any).groupType === 'niche' ? 10 : 0;
      return ((b.overallScore ?? 0) + bBoost) - ((a.overallScore ?? 0) + aBoost);
    })
    .slice(0, 10);

  if (kit.length < 3) return null;

  function copyKit() {
    navigator.clipboard.writeText(kit.map(t => t.tag).join(' '));
    setCopied(true);
    toast({ title: `This week's kit copied — ${kit.length} tags ready to paste!` });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #111111 0%, #1a1a1e 100%)', border: '1px solid #2C2C2E' }}>
      {/* Glow */}
      <div className="absolute pointer-events-none w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(8,145,178,0.08) 0%, transparent 70%)', top: '-40px', right: '-40px', position: 'absolute' }} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(8,145,178,0.15)' }}>
              <Sparkles size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">This Week's Starter Kit</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Top {kit.length} tags optimized for right now — copy and paste directly</p>
            </div>
          </div>
          <button onClick={copyKit}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
            style={{ background: copied ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.1)', color: copied ? '#4ade80' : 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Kit'}
          </button>
        </div>
      </div>

      {/* Tags grid */}
      <div className="px-5 py-4 flex flex-wrap gap-2">
        {kit.map(tag => {
          const score = tag.overallScore ?? 0;
          const isTrending = tag.trendDirection === 'rising';
          return (
            <div key={tag.id}
              onClick={() => navigator.clipboard.writeText(tag.tag)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${isTrending ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
              {isTrending && <Zap size={9} className="text-amber-400 shrink-0" />}
              <span className="font-mono text-[12px] font-semibold text-white">{tag.tag}</span>
              <span className="text-[10px] font-bold ml-0.5" style={{ color: scoreColor(score) }}>{score}</span>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-5 pb-4 flex items-center gap-1.5">
        <Zap size={10} className="text-amber-400 shrink-0" />
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Powered by advanced AI signal analysis — synthesized across billions of platform data points each generation. Tap any tag to copy.
        </span>
      </div>
    </div>
  );
}

// ─── Hashtag row — redesigned ───────────────────────────────────────────────
function HashtagRow({ tag, rank, groupKey }: { tag: Hashtag; rank: number; groupKey: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const score = tag.overallScore ?? 0;
  const isExploding = tag.trendDirection === 'rising' && (tag.opportunityScore ?? 0) >= 65;
  const isTrending = tag.trendDirection === 'rising';
  const isSkip = score < 35;
  const momentum = (tag as any).momentum as string | undefined;
  const confidence = (tag as any).confidenceLevel as string | undefined;

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(tag.tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const leftBorderColor = scoreColor(score);

  return (
    <div className={`rounded-xl overflow-hidden mb-2 bg-white transition-all hover:shadow-sm ${isSkip ? 'opacity-60' : ''}`}
      style={{ border: '1px solid #E4E4E7', borderLeft: `3px solid ${leftBorderColor}` }}>

      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-[11px] font-medium text-[#A1A1AA] w-4 shrink-0 tabular">{rank}</span>

        {/* Tag + momentum badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[13px] font-semibold ${isSkip ? 'text-[#A1A1AA] line-through' : 'text-[#111111]'}`}>{tag.tag}</span>
            {isExploding && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                style={{ background: '#FEF3C7', color: '#B45309' }}>
                <Flame size={8} /> Exploding
              </span>
            )}
            {!isExploding && isTrending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                style={{ background: '#FEE2E2', color: '#DC2626' }}>
                <TrendingUp size={8} /> Rising
              </span>
            )}
            {isSkip && (
              <span className="inline-flex items-center gap-1 text-[9px] text-[#A1A1AA]">
                <AlertTriangle size={9} /> avoid
              </span>
            )}
          </div>
          {/* Momentum phrase — the "why" */}
          {momentum && (
            <p className="text-[10px] text-[#71717A] mt-0.5 leading-tight">{momentum}</p>
          )}
        </div>

        {/* Verdict badge + score */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[18px] font-bold tabular" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', color: leftBorderColor, letterSpacing: '-0.03em' }}>
            {score}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={verdictBg(score)}>
            {verdictLabel(score)}
          </span>
        </div>

        {/* Copy + expand */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={copy} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F4F4F5] transition-colors">
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-[#A1A1AA]" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F4F4F5] transition-colors">
            {open ? <ChevronUp size={12} className="text-[#A1A1AA]" /> : <ChevronDown size={12} className="text-[#A1A1AA]" />}
          </button>
        </div>
      </div>

      {/* Expanded: plain-English insight instead of raw bars */}
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-[#F4F4F5]">
          {/* Insight sentence */}
          <p className="text-[12px] text-[#52525B] mt-3 leading-relaxed">{getInsight(tag)}</p>

          {/* Quick stats row */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F4F4F5]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide font-medium">Reach</span>
              <span className="text-[11px] font-bold" style={{ color: scoreColor(tag.popularityScore ?? 0) }}>{tag.popularityScore ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide font-medium">Competition</span>
              <span className="text-[11px] font-bold" style={{ color: (tag.competitionScore ?? 0) > 65 ? '#DC2626' : '#16A34A' }}>
                {(tag.competitionScore ?? 0) > 65 ? 'High' : (tag.competitionScore ?? 0) > 40 ? 'Medium' : 'Low'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wide font-medium">Opportunity</span>
              <span className="text-[11px] font-bold" style={{ color: scoreColor(tag.opportunityScore ?? 0) }}>{tag.opportunityScore ?? 0}</span>
            </div>
            {(tag.estimatedPosts) && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-[#A1A1AA]">~{tag.estimatedPosts} posts</span>
              </div>
            )}
            {confidence && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ml-auto"
                style={confidence === 'high'
                  ? { background: '#DCFCE7', color: '#15803D' }
                  : confidence === 'medium'
                  ? { background: '#E0F2FE', color: '#0369A1' }
                  : { background: '#F4F4F5', color: '#71717A' }}>
                {confidence === 'high' ? '✓ High confidence' : confidence === 'medium' ? '~ Signal-based' : '≈ Estimated'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Group section ──────────────────────────────────────────────────────────
function GroupSection({ groupKey, tags }: { groupKey: string; tags: Hashtag[] }) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const meta = GROUP_META[groupKey] ?? { label: groupKey, actionLabel: groupKey, icon: Hash, desc: '', color: '#111111' };
  const Icon = meta.icon;
  const avgScore = Math.round(tags.reduce((s, t) => s + (t.overallScore ?? 0), 0) / tags.length);
  const explodingCount = tags.filter(t => t.trendDirection === 'rising' && (t.opportunityScore ?? 0) >= 65).length;
  const strongCount = tags.filter(t => (t.overallScore ?? 0) >= 62).length;

  function copyGroup() {
    // Only copy the usable tags (score >= 35)
    const usable = tags.filter(t => (t.overallScore ?? 0) >= 35);
    navigator.clipboard.writeText(usable.map(t => t.tag).join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-2.5">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2.5 flex-1 text-left group cursor-pointer">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '15' }}>
            <Icon size={13} style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Action label is the headline */}
              <span className="text-[13px] font-bold text-[#111111]">{meta.actionLabel}</span>
              <span className="text-[10px] text-[#A1A1AA] font-normal">{meta.label}</span>
              <span className="text-[11px] font-semibold" style={{ color: scoreColor(avgScore) }}>Avg {avgScore}</span>
              {explodingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: '#FEF3C7', color: '#B45309' }}>
                  <Flame size={8} /> {explodingCount} exploding
                </span>
              )}
              {strongCount > 0 && explodingCount === 0 && (
                <span className="text-[9px] text-[#16A34A] font-semibold">{strongCount} actionable</span>
              )}
            </div>
            <p className="text-[10px] text-[#A1A1AA]">{meta.desc}</p>
          </div>
          <div className="shrink-0">{open ? <ChevronUp size={13} className="text-[#A1A1AA]" /> : <ChevronDown size={13} className="text-[#A1A1AA]" />}</div>
        </button>
        <button onClick={copyGroup}
          className="flex items-center gap-1 text-[11px] text-[#A1A1AA] hover:text-[#111111] transition-colors px-2 py-1 rounded-md hover:bg-[#F4F4F5] shrink-0">
          {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
          <span>{copied ? 'Copied' : 'Copy usable'}</span>
        </button>
      </div>
      {open && [...tags].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)).map((tag, i) => <HashtagRow key={tag.id} tag={tag} rank={i + 1} groupKey={groupKey} />)}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ResultsPage({ id }: { id: string }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ['/api/searches', id],
    queryFn: () => apiRequest('GET', `/api/searches/${id}`).then(r => r.json()),
  });

  const allTags = data?.hashtagGroups ? Object.values(data.hashtagGroups).flat() : [];
  const explodingTags = allTags.filter(t => t.trendDirection === 'rising' && (t.opportunityScore ?? 0) >= 65)
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
  const actionableTags = allTags.filter(t => (t.overallScore ?? 0) >= 62);
  const skipTags = allTags.filter(t => (t.overallScore ?? 0) < 35);
  const avgScore = allTags.length ? Math.round(allTags.reduce((s, t) => s + (t.overallScore ?? 0), 0) / allTags.length) : 0;

  function copyAll() {
    const usable = allTags.filter(t => (t.overallScore ?? 0) >= 35);
    navigator.clipboard.writeText(usable.map(t => t.tag).join(' '));
    toast({ title: `${usable.length} usable hashtags copied (${skipTags.length} skipped tags excluded)` });
  }

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-[14px] text-[#DC2626]">Failed to load results.</p>
      <Link href="/generator"><a className="no-underline btn-primary mt-4 inline-flex">Try again</a></Link>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/generator">
        <a className="no-underline flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#111111] transition-colors mb-6">
          <ArrowLeft size={13} /> New search
        </a>
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl bg-[#F4F4F5]" />)}
        </div>
      ) : data && (
        <>
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
              {data.contentTopic}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-[#71717A] capitalize">{data.platform}</span>
              {(data.locationCity || data.locationState) && (
                <>
                  <span className="text-[#E4E4E7]">·</span>
                  <span className="text-[12px] text-[#71717A]">{[data.locationCity, data.locationState].filter(Boolean).join(', ')}</span>
                </>
              )}
              <span className="text-[#E4E4E7]">·</span>
              <span className="text-[12px] text-[#71717A]">{allTags.length} hashtags analyzed</span>
            </div>
          </div>

          {/* 4 quick-read stat tiles */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            {[
              { label: 'Actionable',  value: actionableTags.length, color: '#16A34A',  sub: 'score 62+' },
              { label: 'Exploding',   value: explodingTags.length,  color: '#B45309',  sub: 'this week' },
              { label: 'Avg Score',   value: avgScore,              color: scoreColor(avgScore), sub: 'out of 100' },
              { label: 'Skip These',  value: skipTags.length,       color: '#DC2626',  sub: 'hurts reach' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bento-tile text-center py-4">
                <p className="text-[24px] font-bold tabular" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', color, letterSpacing: '-0.03em' }}>{value}</p>
                <p className="text-[11px] font-semibold text-[#111111] mt-0.5">{label}</p>
                <p className="text-[9px] text-[#A1A1AA] uppercase tracking-wide">{sub}</p>
              </div>
            ))}
          </div>

          {/* This Week's Kit — the hero section */}
          <WeeklyKit tags={allTags} />

          {/* Copy all (usable only) */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[#111111]" style={{ letterSpacing: '-0.01em' }}>All Hashtags by Strategy</h2>
              {skipTags.length > 0 && (
                <p className="text-[11px] text-[#A1A1AA]">{skipTags.length} tags marked Skip are dimmed — included for reference only</p>
              )}
            </div>
            <button onClick={copyAll} className="btn-secondary text-[12px] py-1.5 px-3 flex items-center gap-1.5">
              <Copy size={12} /> Copy Usable ({allTags.length - skipTags.length})
            </button>
          </div>

          {/* Groups */}
          {data.hashtagGroups && Object.entries(data.hashtagGroups).map(([key, tags]) =>
            tags.length > 0 && <GroupSection key={key} groupKey={key} tags={tags} />
          )}
        </>
      )}
    </div>
  );
}
