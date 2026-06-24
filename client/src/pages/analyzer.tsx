import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@clerk/clerk-react';
import { Search, TrendingUp, TrendingDown, Minus, ChevronRight, X, Plus, Zap } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';
import type { User } from '@shared/schema';

// ── Types ────────────────────────────────────────────────────────────────────
interface AnalyzeResult {
  tag: string;
  popularityScore: number;
  competitionScore: number;
  opportunityScore: number;
  overallScore: number;
  verdict: 'Use Now' | 'Rising Fast' | 'Skip' | 'Niche Gem' | 'Oversaturated';
  reason: string;
  trendDirection: 'rising' | 'stable' | 'declining';
}

// ── Verdict config ────────────────────────────────────────────────────────────
const VERDICT_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Use Now':      { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0', dot: '#16A34A' },
  'Rising Fast':  { bg: '#F0FDFA', text: '#0891B2', border: '#99F6E4', dot: '#0891B2' },
  'Niche Gem':    { bg: '#FFF7ED', text: '#D97706', border: '#FDE68A', dot: '#D97706' },
  'Skip':         { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#DC2626' },
  'Oversaturated':{ bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#DC2626' },
};

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[#A1A1AA]" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <span className="text-[11px] font-semibold text-[#52525B]" style={{ fontFamily: 'Inter Tight, Inter, sans-serif' }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#F4F4F5] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result }: { result: AnalyzeResult }) {
  const [expanded, setExpanded] = useState(false);
  const vc = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG['Skip'];
  const TrendIcon = result.trendDirection === 'rising' ? TrendingUp
    : result.trendDirection === 'declining' ? TrendingDown : Minus;

  return (
    <div
      className="bento-tile p-4 cursor-pointer select-none transition-all"
      style={{ borderColor: expanded ? vc.border : undefined }}
      onClick={() => setExpanded(e => !e)}
      data-testid={`analyzer-result-${result.tag}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: tag + trend */}
        <div className="flex items-center gap-2 min-w-0">
          <TrendIcon size={13} style={{ color: vc.dot, flexShrink: 0 }} />
          <span
            className="text-[14px] font-semibold text-[#111111] truncate"
            style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.01em' }}
          >
            {result.tag}
          </span>
        </div>

        {/* Right: verdict + score + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
            style={{ background: vc.bg, color: vc.text, borderColor: vc.border, fontFamily: 'Inter, sans-serif' }}
          >
            {result.verdict}
          </span>
          <span
            className="text-[15px] font-bold tabular"
            style={{ color: '#111111', fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.02em', minWidth: 28, textAlign: 'right' }}
          >
            {result.overallScore}
          </span>
          <ChevronRight
            size={14}
            className="text-[#D4D4D8] transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#F4F4F5] space-y-3">
          <p className="text-[12px] text-[#52525B] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
            {result.reason}
          </p>
          <div className="space-y-2">
            <ScoreBar label="Popularity"   value={result.popularityScore}   color="#6366F1" />
            <ScoreBar label="Competition"  value={result.competitionScore}   color="#F59E0B" />
            <ScoreBar label="Opportunity"  value={result.opportunityScore}   color="#0891B2" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tag input pill ─────────────────────────────────────────────────────────────
function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#E4E4E7] bg-[#F4F4F5] text-[12px] font-medium text-[#111111]"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {tag.startsWith('#') ? tag : `#${tag}`}
      <button
        type="button"
        onClick={onRemove}
        className="text-[#A1A1AA] hover:text-[#111111] transition-colors cursor-pointer"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyzerPage() {
  const { isSignedIn } = useAuth();
  const [inputVal, setInputVal] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [results, setResults] = useState<AnalyzeResult[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: user } = useQuery<User>({ queryKey: ['/api/me'], enabled: !!isSignedIn });
  const plan = user?.plan ?? (isSignedIn ? 'free' : 'anonymous');
  const limit = plan === 'pro' || plan === 'agency' ? 30 : isSignedIn ? 5 : 1;

  const mutation = useMutation({
    mutationFn: async (hashtags: string[]) => {
      const res = await apiRequest('POST', '/api/analyze', { hashtags });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data.results ?? []);
    },
  });

  function addTag(raw: string) {
    const cleaned = raw.trim().replace(/^#+/, '').trim();
    if (!cleaned) return;
    const tag = `#${cleaned}`;
    if (tags.includes(tag)) return;
    if (tags.length >= limit) return;
    setTags(t => [...t, tag]);
    setInputVal('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      setTags(t => t.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags(t => t.filter(x => x !== tag));
  }

  function handleAnalyze() {
    if (tags.length === 0) return;
    mutation.mutate(tags);
  }

  const atLimit = tags.length >= limit;
  const isPaid = plan === 'pro' || plan === 'agency';

  return (
    <>
      {showUpgrade && <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} currentPlan={plan} reason="Upgrade to analyze more hashtags at once." />}
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[22px] font-bold text-[#111111] mb-1"
            style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}
          >
            Hashtag Analyzer
          </h1>
          <p className="text-[14px] text-[#71717A]">
            Paste any hashtags and get an instant verdict. Know what to use before you post.
          </p>
        </div>

        {/* Tier banner for anonymous/free */}
        {!isPaid && (
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl border mb-5"
            style={{ background: '#FAFAFA', borderColor: '#E4E4E7' }}
          >
            <p className="text-[12px] text-[#71717A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              {!isSignedIn
                ? 'Analyzing 1 hashtag at a time. Sign up free for 5.'
                : `Free plan — analyze up to 5 hashtags. Upgrade for 30.`}
            </p>
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="text-[12px] font-semibold text-[#0891B2] hover:opacity-75 transition-opacity cursor-pointer flex items-center gap-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Zap size={11} />
              Upgrade
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="bento-tile p-4 mb-4">
          <div
            className="flex flex-wrap gap-2 min-h-[44px] items-center"
            onClick={() => document.getElementById('tag-input')?.focus()}
          >
            {tags.map(tag => (
              <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
            ))}
            {!atLimit && (
              <input
                id="tag-input"
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputVal) addTag(inputVal); }}
                placeholder={tags.length === 0 ? 'Type a hashtag and press Enter…' : 'Add another…'}
                className="flex-1 min-w-[180px] text-[13px] text-[#111111] placeholder:text-[#A1A1AA] outline-none bg-transparent"
                style={{ fontFamily: 'Inter, sans-serif' }}
                data-testid="input-hashtag"
              />
            )}
            {atLimit && !isPaid && (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-1 text-[11px] text-[#0891B2] font-medium cursor-pointer hover:opacity-75"
              >
                <Plus size={11} /> Add more with Pro
              </button>
            )}
          </div>

          {/* hint */}
          {tags.length > 0 && (
            <p className="text-[11px] text-[#A1A1AA] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              {tags.length} / {limit} hashtags · Press Enter or comma to add more
            </p>
          )}
        </div>

        {/* Analyze button */}
        <button
          type="button"
          data-testid="button-analyze"
          onClick={handleAnalyze}
          disabled={tags.length === 0 || mutation.isPending}
          className="w-full h-11 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default mb-8"
          style={{ background: '#111111', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
        >
          {mutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Search size={15} />
              Analyze {tags.length > 0 ? `${tags.length} hashtag${tags.length > 1 ? 's' : ''}` : 'hashtags'}
            </>
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label-eyebrow">Results</p>
              <p className="text-[11px] text-[#A1A1AA]">Tap any row to expand</p>
            </div>
            <div className="space-y-2">
              {results
                .sort((a, b) => b.overallScore - a.overallScore)
                .map(r => <ResultCard key={r.tag} result={r} />)}
            </div>

            {/* Upsell to generator */}
            <div
              className="mt-6 flex items-center justify-between px-4 py-3.5 rounded-xl border"
              style={{ background: '#F8F8F9', borderColor: '#E4E4E7' }}
            >
              <div>
                <p className="text-[13px] font-semibold text-[#111111] mb-0.5" style={{ letterSpacing: '-0.01em' }}>
                  Want 30 optimized hashtags instead?
                </p>
                <p className="text-[12px] text-[#71717A]">The generator finds the best ones for you automatically.</p>
              </div>
              <a
                href="/#/generator"
                className="flex items-center gap-1 text-[12px] font-semibold text-white px-3 py-2 rounded-lg transition-opacity hover:opacity-80 shrink-0 ml-3"
                style={{ background: '#111111', fontFamily: 'Inter, sans-serif' }}
              >
                Try Generator <ChevronRight size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !mutation.isPending && tags.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] flex items-center justify-center mx-auto mb-4">
              <Search size={20} className="text-[#A1A1AA]" />
            </div>
            <p className="text-[14px] font-medium text-[#111111] mb-1" style={{ letterSpacing: '-0.01em' }}>
              Paste your hashtags above
            </p>
            <p className="text-[13px] text-[#A1A1AA]">Get a verdict on each one instantly.</p>
          </div>
        )}
      </div>
    </>
  );
}
