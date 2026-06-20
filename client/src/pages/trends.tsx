import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { TrendingUp, Hash, ArrowUpRight, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { TiltCard } from '@/components/AppAnimations';
import type { TrendRecord } from '@shared/schema';

function scoreColor(s: number) {
  if (s >= 75) return '#16A34A';
  if (s >= 55) return '#0891B2';
  if (s >= 35) return '#D97706';
  return '#DC2626';
}
function verdictClass(s: number) {
  if (s >= 75) return 'verdict-use';
  if (s >= 55) return 'verdict-good';
  if (s >= 35) return 'verdict-situational';
  return 'verdict-skip';
}
function verdictLabel(s: number) {
  if (s >= 75) return 'Use This Now';
  if (s >= 55) return 'Good Pick';
  if (s >= 35) return 'Situational';
  return 'Skip';
}

const PLATFORMS = ['All', 'Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Facebook'];
const INDUSTRIES = ['All', 'Fitness', 'Food & Beverage', 'Beauty', 'Fashion', 'Travel', 'Photography', 'Technology', 'Marketing', 'Music', 'Gaming', 'Real Estate'];

function TrendCard({ trend }: { trend: TrendRecord }) {
  const score = trend.opportunityScore ?? 0;
  const growth = trend.growthRate ?? 0;
  return (
    <TiltCard intensity={10}>
    <div className="bento-tile group cursor-pointer" data-testid={`trend-${trend.id}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[13px] font-medium text-[#111111]">{trend.hashtag}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${verdictClass(score)}`}>
          {verdictLabel(score)}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-4">
        <span className="text-[28px] font-bold tabular leading-none" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', color: scoreColor(score), letterSpacing: '-0.03em' }}>
          {score}
        </span>
        <span className="text-[12px] text-[#A1A1AA] pb-0.5">opp. score</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="label-eyebrow mb-0.5">Growth</p>
          <p className={`text-[13px] font-semibold ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growth > 0 ? '+' : ''}{growth}%
          </p>
        </div>
        <div>
          <p className="label-eyebrow mb-0.5">Platform</p>
          <p className="text-[13px] font-medium text-[#52525B] capitalize">{trend.platform}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#F4F4F5] flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(trend.tags as string[] ?? []).slice(0, 2).map((t: string) => (
            <span key={t} className="tag-pill text-[11px]">{t}</span>
          ))}
        </div>
        <ArrowUpRight size={13} className="text-[#D4D4D8] group-hover:text-[#111111] transition-colors" />
      </div>
    </div>
    </TiltCard>
  );
}

export default function TrendsPage() {
  const [platform, setPlatform] = useState('All');
  const [industry, setIndustry] = useState('All');

  const params = new URLSearchParams();
  if (platform !== 'All') params.set('platform', platform.toLowerCase());
  if (industry !== 'All') params.set('industry', industry.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'));

  const { data: trends, isLoading } = useQuery<TrendRecord[]>({
    queryKey: ['/api/trends', platform, industry],
    queryFn: () => apiRequest('GET', `/api/trends?${params}`).then(r => r.json()),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
            Trending Hashtags
          </h1>
          <p className="text-[14px] text-[#71717A]">What's gaining momentum right now.</p>
        </div>
        <Link href="/generator">
          <a className="no-underline btn-primary">Generate for me</a>
        </Link>
      </div>

      {/* Filters */}
      <TiltCard intensity={5}>
      <div className="bento-tile p-4 mb-6">
        <div className="flex items-start gap-6">
          <div>
            <p className="label-eyebrow mb-2">Platform</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  data-testid={`filter-platform-${p.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer ${
                    platform === p
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label-eyebrow mb-2">Industry</p>
            <div className="flex flex-wrap gap-1.5">
              {INDUSTRIES.slice(0, 6).map(i => (
                <button
                  key={i}
                  onClick={() => setIndustry(i)}
                  data-testid={`filter-industry-${i.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer ${
                    industry === i
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA]'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </TiltCard>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl bg-[#F4F4F5]" />)}
        </div>
      ) : !trends || trends.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp size={32} className="mx-auto text-[#D4D4D8] mb-3" />
          <p className="text-[14px] text-[#A1A1AA]">No trends found for this filter combination.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {trends.map(t => <TrendCard key={t.id} trend={t} />)}
        </div>
      )}
    </div>
  );
}
