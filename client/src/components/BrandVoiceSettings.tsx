import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mic, Pencil, Check, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { VoiceProfile } from '@shared/schema';

// ── Constants ────────────────────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',   label: 'TikTok' },
  { value: 'youtube',  label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x',        label: 'X / Twitter' },
  { value: 'threads',  label: 'Threads' },
];

const STYLE_OPTIONS = [
  { value: 'educational', label: 'Educational', desc: 'Teach and inform' },
  { value: 'entertaining', label: 'Entertaining', desc: 'Fun and engaging' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Motivate and uplift' },
  { value: 'mix',          label: 'Mix it up',    desc: 'All of the above' },
];

const VIBE_OPTIONS = [
  'real', 'funny', 'bold', 'calm', 'expert', 'raw', 'hype', 'soft', 'sharp', 'warm',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function clerkHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-clerk-user-id':    (window as any).__CLERK_USER_ID__    ?? '',
    'x-clerk-user-email': (window as any).__CLERK_USER_EMAIL__ ?? '',
    'x-clerk-user-name':  (window as any).__CLERK_USER_NAME__  ?? '',
  };
}

// ── VibePill ─────────────────────────────────────────────────────────────────
function VibePill({ word, selected, onClick }: { word: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid={`vibe-pill-${word}`}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer border ${
        selected
          ? 'bg-[#111111] text-white border-[#111111]'
          : 'bg-[#FAFAFA] text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#111111]'
      }`}
    >
      {word}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BrandVoiceSettings() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved]     = useState(false);

  // Local form state
  const [samplePosts,     setSamplePosts]     = useState('');
  const [primaryPlatform, setPrimaryPlatform] = useState('instagram');
  const [contentStyle,    setContentStyle]    = useState('mix');
  const [audience,        setAudience]        = useState('');
  const [vibeWord,        setVibeWord]        = useState('real');

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: voiceData, isLoading } = useQuery<{ profile: VoiceProfile | null }>({
    queryKey: ['/api/brand-voice'],
    staleTime: 0,
  });
  const profile = voiceData?.profile ?? null;

  // Seed edit form when opening
  function openEdit() {
    if (profile) {
      setSamplePosts(profile.samplePosts ?? '');
      setPrimaryPlatform(profile.primaryPlatform ?? 'instagram');
      setContentStyle(profile.contentStyle ?? 'mix');
      setAudience(profile.audience ?? '');
      setVibeWord(profile.vibeWord ?? 'real');
    } else {
      setSamplePosts('');
      setPrimaryPlatform('instagram');
      setContentStyle('mix');
      setAudience('');
      setVibeWord('real');
    }
    setEditing(true);
    setSaved(false);
  }

  // ── Mutation ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/brand-voice', {
        method: 'POST',
        headers: clerkHeaders(),
        body: JSON.stringify({ samplePosts, primaryPlatform, contentStyle, audience, vibeWord }),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-voice'] });
      setSaved(true);
      setTimeout(() => {
        setEditing(false);
        setSaved(false);
      }, 1200);
    },
  });

  // ── Reset mutation ─────────────────────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/brand-voice/reset', {
        method: 'POST',
        headers: clerkHeaders(),
      });
      if (!res.ok) throw new Error('Reset failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-voice'] });
      setEditing(false);
    },
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bento-tile p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Mic size={12} className="text-[#A1A1AA]" />
          <p className="label-eyebrow">Your Voice</p>
        </div>
        <div className="h-16 bg-[#F4F4F5] rounded-lg animate-pulse" />
      </div>
    );
  }

  // ── View mode (profile exists) ─────────────────────────────────────────────
  if (!editing && profile) {
    return (
      <div className="bento-tile p-5 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic size={12} className="text-[#A1A1AA]" />
            <p className="label-eyebrow">Your Voice</p>
          </div>
          <button
            data-testid="button-edit-voice"
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[12px] font-medium text-[#52525B] hover:border-[#A1A1AA] hover:text-[#111111] transition-all cursor-pointer"
          >
            <Pencil size={11} />
            Edit voice
          </button>
        </div>

        {/* Voice summary card */}
        <div className="bg-[#FAFAFA] border border-[#F4F4F5] rounded-xl p-4 mb-3">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles size={12} className="text-[#0891B2] mt-0.5 shrink-0" />
            <p className="text-[12px] font-semibold text-[#111111]" style={{ letterSpacing: '-0.01em' }}>
              Your voice is active
            </p>
          </div>
          {profile.voiceSummary && (
            <p className="text-[12px] text-[#52525B] leading-relaxed pl-[20px]">
              {profile.voiceSummary}
            </p>
          )}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            PLATFORM_OPTIONS.find(p => p.value === profile.primaryPlatform)?.label ?? profile.primaryPlatform,
            STYLE_OPTIONS.find(s => s.value === profile.contentStyle)?.label ?? profile.contentStyle,
            profile.vibeWord,
            profile.audience ? `For: ${profile.audience}` : null,
          ].filter(Boolean).map(chip => (
            <span
              key={chip}
              className="px-2.5 py-1 rounded-full bg-[#F4F4F5] text-[11px] font-medium text-[#52525B]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state (no profile) ───────────────────────────────────────────────
  if (!editing && !profile) {
    return (
      <div className="bento-tile p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Mic size={12} className="text-[#A1A1AA]" />
          <p className="label-eyebrow">Your Voice</p>
        </div>

        <div
          className="rounded-xl border border-dashed border-[#E4E4E7] p-5 flex flex-col items-center text-center cursor-pointer hover:border-[#A1A1AA] hover:bg-[#FAFAFA] transition-all"
          onClick={openEdit}
          data-testid="brand-voice-empty-state"
        >
          <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] flex items-center justify-center mb-3">
            <Mic size={16} className="text-[#A1A1AA]" />
          </div>
          <p className="text-[13px] font-semibold text-[#111111] mb-1" style={{ letterSpacing: '-0.01em' }}>
            No voice set up yet
          </p>
          <p className="text-[12px] text-[#A1A1AA] mb-3">
            Set up your voice and every caption will sound like you.
          </p>
          <button
            type="button"
            data-testid="button-setup-voice"
            className="px-4 py-2 bg-[#111111] text-white text-[12px] font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Set up voice
          </button>
        </div>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  return (
    <div className="bento-tile p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Mic size={12} className="text-[#A1A1AA]" />
          <p className="label-eyebrow">Your Voice</p>
        </div>
        <button
          data-testid="button-cancel-voice-edit"
          onClick={() => setEditing(false)}
          className="text-[12px] text-[#A1A1AA] hover:text-[#52525B] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-5">
        {/* Step 1 — Sample posts */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111111] mb-1" style={{ letterSpacing: '-0.01em' }}>
            Sample posts
          </label>
          <p className="text-[11px] text-[#A1A1AA] mb-2">Paste 2-3 captions you've written. The more real they are, the better.</p>
          <textarea
            data-testid="input-sample-posts"
            value={samplePosts}
            onChange={e => setSamplePosts(e.target.value)}
            placeholder="Paste your best captions here..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-[13px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors resize-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Step 2 — Platform */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111111] mb-2" style={{ letterSpacing: '-0.01em' }}>
            Primary platform
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                data-testid={`platform-${opt.value}`}
                onClick={() => setPrimaryPlatform(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer border ${
                  primaryPlatform === opt.value
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-[#FAFAFA] text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#111111]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2b — Content style */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111111] mb-2" style={{ letterSpacing: '-0.01em' }}>
            Content style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                data-testid={`style-${opt.value}`}
                onClick={() => setContentStyle(opt.value)}
                className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  contentStyle === opt.value
                    ? 'bg-[#111111] border-[#111111]'
                    : 'bg-[#FAFAFA] border-[#E4E4E7] hover:border-[#A1A1AA]'
                }`}
              >
                <span className={`text-[12px] font-semibold ${contentStyle === opt.value ? 'text-white' : 'text-[#111111]'}`}>
                  {opt.label}
                </span>
                <span className={`text-[11px] ${contentStyle === opt.value ? 'text-[rgba(255,255,255,0.65)]' : 'text-[#A1A1AA]'}`}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111111] mb-1" style={{ letterSpacing: '-0.01em' }}>
            Who's your audience?
          </label>
          <input
            type="text"
            data-testid="input-audience"
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder="e.g. first-time homebuyers, fitness beginners, small business owners"
            className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] text-[13px] text-[#111111] placeholder:text-[#D4D4D8] focus:outline-none focus:border-[#111111] transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {/* Step 3 — Vibe word */}
        <div>
          <label className="block text-[12px] font-semibold text-[#111111] mb-1" style={{ letterSpacing: '-0.01em' }}>
            Pick your vibe
          </label>
          <p className="text-[11px] text-[#A1A1AA] mb-2">One word that captures how you show up.</p>
          <div className="flex flex-wrap gap-1.5">
            {VIBE_OPTIONS.map(word => (
              <VibePill
                key={word}
                word={word}
                selected={vibeWord === word}
                onClick={() => setVibeWord(word)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {profile && (
            <button
              type="button"
              data-testid="button-reset-voice"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="flex items-center gap-1.5 text-[12px] text-[#A1A1AA] hover:text-[#EF4444] transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              {resetMutation.isPending ? 'Clearing...' : 'Clear voice profile'}
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            data-testid="button-save-voice"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !samplePosts.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#111111] text-white text-[13px] font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
          >
            {saveMutation.isPending ? (
              <><Loader2 size={13} className="animate-spin" /> Analyzing...</>
            ) : saved ? (
              <><Check size={13} /> Saved</>
            ) : (
              'Save voice'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
