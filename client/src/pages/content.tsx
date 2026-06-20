import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Copy, Check, Hash, FileText, Calendar, Globe, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TiltCard } from '@/components/AppAnimations';

interface ContentResult {
  caption: string;
  hashtags: string[];
  seoKeywords: string[];
  postingSchedule: { platform: string; bestTimes: string[]; frequency: string; tips: string };
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' }, { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' }, { value: 'youtube', label: 'YouTube Shorts' },
  { value: 'facebook', label: 'Facebook' }, { value: 'x', label: 'X' },
];
const TONES = ['Energetic', 'Casual', 'Professional', 'Inspirational', 'Educational', 'Luxury'];
const INDUSTRIES = [
  { value: 'fitness', label: 'Fitness & Wellness' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'travel', label: 'Travel & Tourism' },
  { value: 'photography', label: 'Photography' },
  { value: 'technology', label: 'Technology' },
  { value: 'marketing', label: 'Marketing & Business' },
  { value: 'music', label: 'Music & Entertainment' },
  { value: 'gaming', label: 'Gaming & Esports' },
  { value: 'real_estate', label: 'Real Estate' },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[12px] text-[#A1A1AA] hover:text-[#111111] transition-colors cursor-pointer">
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ResultSection({ result }: { result: ContentResult }) {
  return (
    <div className="space-y-3 mt-6">
      <TiltCard intensity={7}><div className="bento-tile p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><FileText size={13} className="text-[#A1A1AA]" /><span className="label-eyebrow">Caption</span></div>
          <CopyBtn text={result.caption} />
        </div>
        <p className="text-[14px] text-[#111111] leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif' }}>{result.caption}</p>
      </div></TiltCard>
      <TiltCard intensity={7}><div className="bento-tile p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Hash size={13} className="text-[#A1A1AA]" /><span className="label-eyebrow">Hashtags ({result.hashtags.length})</span></div>
          <CopyBtn text={result.hashtags.join(' ')} />
        </div>
        <div className="flex flex-wrap gap-1.5">{result.hashtags.map((t, i) => <span key={i} className="tag-pill">{t}</span>)}</div>
      </div></TiltCard>
      <div className="grid grid-cols-2 gap-3">
        <TiltCard intensity={8}><div className="bento-tile p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Globe size={13} className="text-[#A1A1AA]" /><span className="label-eyebrow">SEO Keywords</span></div>
            <CopyBtn text={result.seoKeywords.join(', ')} />
          </div>
          <div className="space-y-1.5">
            {result.seoKeywords.map((kw, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#D4D4D8] shrink-0" />
                <span className="text-[13px] text-[#52525B]">{kw}</span>
              </div>
            ))}
          </div>
        </div></TiltCard>
        <TiltCard intensity={8}><div className="bento-tile p-5">
          <div className="flex items-center gap-2 mb-3"><Calendar size={13} className="text-[#A1A1AA]" /><span className="label-eyebrow">Best Times</span></div>
          <div className="space-y-2">
            <div>
              <p className="text-[11px] text-[#A1A1AA] mb-1">Post at</p>
              <div className="flex flex-wrap gap-1">
                {result.postingSchedule.bestTimes.map((t, i) => (
                  <span key={i} className="text-[12px] font-medium text-[#52525B] bg-[#F4F4F5] px-2 py-0.5 rounded-md">{t}</span>
                ))}
              </div>
            </div>
            <div><p className="text-[11px] text-[#A1A1AA] mb-0.5">Frequency</p><p className="text-[13px] text-[#52525B]">{result.postingSchedule.frequency}</p></div>
            <div><p className="text-[11px] text-[#A1A1AA] mb-0.5">Tip</p><p className="text-[12px] text-[#71717A] leading-relaxed">{result.postingSchedule.tips}</p></div>
          </div>
        </div></TiltCard>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const { toast } = useToast();
  const [topic, setTopic] = useState('Morning Workout Routine Tips');
  const [platform, setPlatform] = useState('instagram');
  const [industry, setIndustry] = useState('fitness');
  const [tone, setTone] = useState('Energetic');
  const [result, setResult] = useState<ContentResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/content', { topic, platform, industry, tone: tone.toLowerCase() }).then(r => r.json()),
    onSuccess: (data: ContentResult) => setResult(data),
    onError: () => toast({ title: 'Generation failed', variant: 'destructive' }),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>Content Assistant</h1>
          <p className="text-[14px] text-[#71717A]">AI-crafted captions, hashtags, SEO keywords, and posting schedules.</p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]">Pro</span>
      </div>

      <TiltCard intensity={5}><div className="bento-tile p-6 space-y-5">
        <div>
          <label className="label-eyebrow mb-2 block">Content Topic</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Describe what you're posting about…"
            data-testid="input-content-topic"
            className="w-full h-10 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-eyebrow mb-2 block">Platform</label>
            <div className="relative">
              <select value={platform} onChange={e => setPlatform(e.target.value)} data-testid="select-content-platform"
                className="w-full h-10 px-3 pr-8 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] appearance-none focus:outline-none focus:border-[#111111] cursor-pointer"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label-eyebrow mb-2 block">Industry</label>
            <div className="relative">
              <select value={industry} onChange={e => setIndustry(e.target.value)} data-testid="select-content-industry"
                className="w-full h-10 px-3 pr-8 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] appearance-none focus:outline-none focus:border-[#111111] cursor-pointer"
                style={{ fontFamily: 'Inter, sans-serif' }}>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
            </div>
          </div>
        </div>
        <div>
          <label className="label-eyebrow mb-2 block">Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map(t => (
              <button key={t} type="button" onClick={() => setTone(t)} data-testid={`tone-${t.toLowerCase()}`}
                className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  tone === t ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA]'
                }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !topic.trim()}
          data-testid="button-generate-content"
          className="w-full h-11 rounded-lg font-medium text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          style={{ background: mutation.isPending ? '#E4E4E7' : '#111111', color: mutation.isPending ? '#A1A1AA' : '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
          {mutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
            : result ? <><RefreshCw size={15} /> Regenerate</>
            : <><Sparkles size={15} /> Generate Content Package</>}
        </button>
      </div></TiltCard>

      {result && <ResultSection result={result} />}
      {!result && !mutation.isPending && (
        <p className="text-center text-[13px] text-[#A1A1AA] mt-8">Your caption, hashtags, SEO keywords, and posting schedule will appear here.</p>
      )}
    </div>
  );
}
