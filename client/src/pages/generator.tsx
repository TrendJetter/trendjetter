import { useState } from 'react';
import { useLocation } from 'wouter';
import UpgradeModal from '@/components/UpgradeModal';
import { useMutation } from '@tanstack/react-query';
import { TiltCard } from '@/components/AppAnimations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hash, Loader2, MapPin, Target, Layers, Globe, Zap, TrendingUp, Users, Megaphone, Linkedin, Youtube, Instagram } from 'lucide-react';
import { SiTiktok, SiX } from 'react-icons/si';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { SearchResult } from '@shared/schema';

const schema = z.object({
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  industry: z.string().min(1),
  contentTopic: z.string().min(1, 'Topic is required'),
  platform: z.string().min(1),
  goal: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

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

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'tiktok',    label: 'TikTok',    SiIcon: SiTiktok },
  { value: 'facebook',  label: 'Facebook',  Icon: Globe },
  { value: 'linkedin',  label: 'LinkedIn',  Icon: Linkedin },
  { value: 'youtube',   label: 'YouTube',   Icon: Youtube },
  { value: 'x',         label: 'X',         SiIcon: SiX },
] as any[];

const GOALS = [
  { value: 'viral_reach',    label: 'Viral Reach',    icon: Zap,       desc: 'Maximize impressions' },
  { value: 'local_reach',    label: 'Local Reach',    icon: MapPin,    desc: 'Target your city' },
  { value: 'engagement',     label: 'Engagement',     icon: TrendingUp,desc: 'Drive interactions' },
  { value: 'lead_generation',label: 'Lead Gen',       icon: Target,    desc: 'Capture intent' },
  { value: 'brand_awareness',label: 'Brand Awareness',icon: Megaphone, desc: 'Build recognition' },
  { value: 'community',      label: 'Community',      icon: Users,     desc: 'Grow audience' },
];

const TOPICS: Record<string, string[]> = {
  real_estate: ['Just Listed', 'Open House', 'Investment Properties', 'First-Time Buyers', 'Market Update', 'New Construction'],
  music: ['New Single', 'Behind the Scenes', 'Live Show', 'Studio Session', 'Fan Q&A'],
  gaming: ['Gameplay Highlights', 'Game Review', 'Tips & Tricks', 'Stream Clips', 'New Release'],
  food_beverage: ['New Menu Items', 'Daily Specials', 'Behind the Scenes', "Chef's Picks", 'Seasonal Drinks'],
  fitness: ['Morning Workouts', 'Wellness Lifestyle', 'Supplement Stack', 'HIIT Training', 'Transformation'],  
  beauty: ['Skincare Routine', 'Makeup Tutorial', 'Product Review', 'Natural Beauty'],
  fashion: ['New Arrivals', 'Outfit of the Day', 'Style Tips', 'Accessories'],
  technology: ['Product Launch', 'Tutorial', 'AI Tools', 'Dev Tips'],
  photography: ['Landscape', 'Portrait', 'Golden Hour', 'Editing Tips'],
  travel: ['Hidden Gems', 'Travel Tips', 'Budget Travel', 'Luxury Stays'],
  marketing: ['Growth Hacks', 'Case Study', 'Ad Strategy', 'Content Tips'],
  default: ['Tips & Tricks', 'Behind the Scenes', 'Customer Stories', 'Product Launch'],
};

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <TiltCard intensity={7}>
      <div className="bento-tile p-6">
        <div className="flex items-center gap-2 mb-5">
          <Icon size={14} className="text-[#A1A1AA]" />
          <span className="label-eyebrow">{title}</span>
        </div>
        {children}
      </div>
    </TiltCard>
  );
}

export default function GeneratorPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationCity: '',
      locationState: '',
      industry: '',
      contentTopic: '',
      platform: 'instagram',
      goal: 'local_reach',
    },
  });

  const industry = form.watch('industry');
  const platform = form.watch('platform');
  const goal = form.watch('goal');
  const suggestions = industry ? (TOPICS[industry] ?? TOPICS.default) : [];

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest('POST', '/api/generate', data);
      const json = await res.json();
      return json as SearchResult;
    },
    onSuccess: (result) => navigate(`/results/${result.id}`),
    onError: (err: any) => {
      try {
        const parsed = JSON.parse(err.message.replace(/^\d+: /, ''));
        if (parsed.error === 'limit_reached') {
          setUpgradeReason(parsed.message);
          setShowUpgrade(true);
          return;
        }
      } catch {}
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
          Hashtag Generator
        </h1>
        <p className="text-[14px] text-[#71717A]">Generate scored hashtag intelligence for your content.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-4">

          {/* Location */}
          <SectionCard title="Location (optional)" icon={MapPin}>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="locationCity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] text-[#71717A] font-normal">City</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="e.g. Austin, New York, London"
                      data-testid="input-city"
                      className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="locationState" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] text-[#71717A] font-normal">State</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="OK"
                      data-testid="input-state"
                      className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
                    />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </SectionCard>

          {/* Industry & Topic */}
          <SectionCard title="Industry & Topic" icon={Layers}>
            <div className="space-y-4">
              <FormField control={form.control} name="industry" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] text-[#71717A] font-normal">Industry *</FormLabel>
                  <FormControl>
                    <select
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      data-testid="select-industry"
                      className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] focus:outline-none focus:border-[#111111] transition-colors appearance-none cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="contentTopic" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[12px] text-[#71717A] font-normal">Content Topic *</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="e.g. Morning Workout Routines, Sourdough Bread Tips"
                      data-testid="input-topic"
                      className="w-full h-9 px-3 rounded-lg border border-[#E4E4E7] bg-white text-[14px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {suggestions.map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => form.setValue('contentTopic', s)}
                        data-testid={`suggestion-${s.toLowerCase().replace(/\s/g, '-')}`}
                        className={`text-[12px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          field.value === s
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#111111]'
                        }`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )} />
            </div>
          </SectionCard>

          {/* Platform */}
          <SectionCard title="Platform" icon={Globe}>
            <FormField control={form.control} name="platform" render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-6 gap-2">
                  {PLATFORMS.map((p: any) => {
                    const Icon = p.Icon;
                    const SiIcon = p.SiIcon;
                    const sel = field.value === p.value;
                    return (
                      <button
                        key={p.value} type="button"
                        onClick={() => field.onChange(p.value)}
                        data-testid={`platform-${p.value}`}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all cursor-pointer ${
                          sel
                            ? 'bg-[#111111] border-[#111111] text-white'
                            : 'bg-white border-[#E4E4E7] text-[#71717A] hover:border-[#A1A1AA] hover:text-[#111111]'
                        }`}
                      >
                        <span className="leading-none">
                          {Icon ? <Icon size={16} /> : SiIcon ? <SiIcon size={14} /> : null}
                        </span>
                        <span className="text-[10px] font-medium leading-none">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )} />
          </SectionCard>

          {/* Goal */}
          <SectionCard title="Goal" icon={Target}>
            <FormField control={form.control} name="goal" render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map(g => {
                    const Icon = g.icon;
                    const sel = field.value === g.value;
                    return (
                      <button
                        key={g.value} type="button"
                        onClick={() => field.onChange(g.value)}
                        data-testid={`goal-${g.value}`}
                        className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-left transition-all cursor-pointer ${
                          sel
                            ? 'bg-[#111111] border-[#111111] text-white'
                            : 'bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#A1A1AA] hover:text-[#111111]'
                        }`}
                      >
                        <Icon size={13} className="shrink-0" />
                        <div>
                          <p className="text-[12px] font-medium leading-none mb-0.5">{g.label}</p>
                          <p className={`text-[11px] leading-none ${sel ? 'text-white/60' : 'text-[#A1A1AA]'}`}>{g.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </FormItem>
            )} />
          </SectionCard>

          {/* CTA */}
          <button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-generate"
            className="w-full h-11 rounded-lg font-medium text-[14px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            style={{
              background: mutation.isPending ? '#E4E4E7' : '#111111',
              color: mutation.isPending ? '#A1A1AA' : '#FFFFFF',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            {mutation.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Analyzing hashtags…</>
              : <><Hash size={15} /> Generate Intelligence Report</>
            }
          </button>
          <p className="text-center text-[12px] text-[#A1A1AA]">20+ scored hashtags across 5 strategic groups · ~2 seconds</p>
        </form>
      </Form>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
