import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Sparkles, ChevronRight, ChevronLeft, Check, Mic2, Users, Zap, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrandVoiceModalProps {
  onClose: () => void;
  onComplete: () => void;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'both', label: 'Both' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X / Twitter' },
];

const CONTENT_STYLES = [
  { value: 'educational', label: 'Educational', desc: 'Teach and inform' },
  { value: 'entertaining', label: 'Entertaining', desc: 'Fun and engaging' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Motivate and uplift' },
  { value: 'promotional', label: 'Promotional', desc: 'Products and services' },
  { value: 'mix', label: 'Mix of all', desc: 'Depends on the post' },
];

const AUDIENCES = [
  { value: 'general', label: 'General consumers' },
  { value: 'creators', label: 'Other creators' },
  { value: 'businesses', label: 'Businesses / B2B' },
  { value: 'local', label: 'Local community' },
];

export default function BrandVoiceModal({ onClose, onComplete }: BrandVoiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [samplePosts, setSamplePosts] = useState('');
  const [primaryPlatform, setPrimaryPlatform] = useState('instagram');
  const [contentStyle, setContentStyle] = useState('mix');
  const [audience, setAudience] = useState('general');
  const [vibeWord, setVibeWord] = useState('');
  const [voiceSummary, setVoiceSummary] = useState('');

  const mutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/brand-voice', {
      samplePosts, primaryPlatform, contentStyle, audience, vibeWord,
    }).then(r => r.json()),
    onSuccess: (data) => {
      setVoiceSummary(data.profile?.voiceSummary ?? 'Voice profile saved.');
      queryClient.invalidateQueries({ queryKey: ['/api/brand-voice'] });
      setStep(4);
    },
    onError: (err: any) => {
      toast({ title: 'Something went wrong', description: err.message, variant: 'destructive' });
    },
  });

  const canProceedStep1 = samplePosts.trim().length >= 20;
  const canProceedStep2 = contentStyle && audience;
  const canProceedStep3 = vibeWord.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #F4F4F5' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#111111' }}>
              <Mic2 size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#111111]" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                Your Voice Setup
              </p>
              <p className="text-[11px] text-[#A1A1AA]">Step {Math.min(step, 3)} of 3</p>
            </div>
          </div>
          {step !== 4 && (
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
              <X size={14} className="text-[#71717A]" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div style={{ height: 3, background: '#F4F4F5' }}>
            <div
              style={{
                height: '100%',
                width: `${(step / 3) * 100}%`,
                background: 'linear-gradient(90deg, #111111, #52525B)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        )}

        <div className="p-6">
          {/* Step 1 — Paste posts */}
          {step === 1 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
                Paste your best posts
              </h2>
              <p className="text-[13px] text-[#71717A] mb-4">
                Paste 3 to 5 posts that sound most like you. Captions, tweets, LinkedIn posts — anything that represents your voice at its best.
              </p>
              <textarea
                value={samplePosts}
                onChange={e => setSamplePosts(e.target.value)}
                placeholder={"Post 1:\nYour caption here...\n\nPost 2:\nAnother caption..."}
                className="w-full rounded-xl text-[13px] text-[#111111] resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
                style={{
                  height: 200,
                  padding: '12px 14px',
                  background: '#F9F9F9',
                  border: '1px solid #E4E4E7',
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.6,
                }}
                data-testid="brand-voice-sample-posts"
              />
              <p className="text-[11px] text-[#A1A1AA] mt-2">
                {samplePosts.length} characters — paste at least a few sentences
              </p>
            </div>
          )}

          {/* Step 2 — Platform + Style + Audience */}
          {step === 2 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
                Tell us about your content
              </h2>
              <p className="text-[13px] text-[#71717A] mb-5">Quick answers help us calibrate your voice profile.</p>

              {/* Platform */}
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-[#111111] mb-2 uppercase tracking-wider">Primary platform</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPrimaryPlatform(p.value)}
                      data-testid={`platform-${p.value}`}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: primaryPlatform === p.value ? '#111111' : '#F4F4F5',
                        color: primaryPlatform === p.value ? '#FFFFFF' : '#52525B',
                        border: '1px solid transparent',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content style */}
              <div className="mb-5">
                <p className="text-[12px] font-semibold text-[#111111] mb-2 uppercase tracking-wider">Content style</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setContentStyle(s.value)}
                      data-testid={`style-${s.value}`}
                      className="text-left px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: contentStyle === s.value ? '#111111' : '#F9F9F9',
                        border: `1px solid ${contentStyle === s.value ? '#111111' : '#E4E4E7'}`,
                      }}
                    >
                      <p className="text-[12px] font-semibold" style={{ color: contentStyle === s.value ? '#FFFFFF' : '#111111' }}>{s.label}</p>
                      <p className="text-[11px]" style={{ color: contentStyle === s.value ? 'rgba(255,255,255,0.6)' : '#A1A1AA' }}>{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audience */}
              <div>
                <p className="text-[12px] font-semibold text-[#111111] mb-2 uppercase tracking-wider">Your audience</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map(a => (
                    <button
                      key={a.value}
                      onClick={() => setAudience(a.value)}
                      data-testid={`audience-${a.value}`}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                      style={{
                        background: audience === a.value ? '#111111' : '#F4F4F5',
                        color: audience === a.value ? '#FFFFFF' : '#52525B',
                        border: '1px solid transparent',
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Vibe word */}
          {step === 3 && (
            <div>
              <h2 className="text-[18px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
                One word that describes your vibe
              </h2>
              <p className="text-[13px] text-[#71717A] mb-5">
                If someone read your best posts, what one word would they use to describe how you come across?
              </p>
              <input
                type="text"
                value={vibeWord}
                onChange={e => setVibeWord(e.target.value)}
                placeholder='e.g. real, hype, calm, bold, expert...'
                maxLength={30}
                data-testid="vibe-word-input"
                className="w-full rounded-xl text-[15px] font-medium text-[#111111] focus:outline-none focus:ring-2 focus:ring-black/10"
                style={{
                  padding: '14px 16px',
                  background: '#F9F9F9',
                  border: '1px solid #E4E4E7',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <p className="text-[12px] text-[#A1A1AA] mt-3">
                This gets baked into every piece of content we generate for you. Be honest — "real" beats "professional" every time.
              </p>

              {mutation.isPending && (
                <div className="flex items-center gap-2 mt-5 p-3 rounded-xl" style={{ background: '#F9F9F9', border: '1px solid #E4E4E7' }}>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="text-[12px] text-[#52525B]">Analyzing your voice with Claude...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Confirmation */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#111111' }}>
                <Check size={22} className="text-white" />
              </div>
              <h2 className="text-[18px] font-bold text-[#111111] mb-2" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>
                Your voice is set
              </h2>
              <p className="text-[13px] text-[#71717A] mb-5">Here's what we learned about how you write:</p>

              {voiceSummary && (
                <div className="text-left p-4 rounded-xl mb-5" style={{ background: '#F9F9F9', border: '1px solid #E4E4E7' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={13} style={{ color: '#0891B2' }} />
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#0891B2' }}>Your voice profile</p>
                  </div>
                  <p className="text-[13px] text-[#111111] leading-relaxed">{voiceSummary}</p>
                </div>
              )}

              <p className="text-[12px] text-[#A1A1AA]">
                You can update this anytime in Settings. Every caption we write from here will sound like you.
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-[13px] font-medium transition-colors"
              style={{ background: '#F4F4F5', color: '#52525B' }}
            >
              <ChevronLeft size={14} />
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              data-testid="brand-voice-next"
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: (step === 1 ? canProceedStep1 : canProceedStep2) ? '#111111' : '#E4E4E7',
                color: (step === 1 ? canProceedStep1 : canProceedStep2) ? '#FFFFFF' : '#A1A1AA',
              }}
            >
              Continue
              <ChevronRight size={14} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={() => mutation.mutate()}
              disabled={!canProceedStep3 || mutation.isPending}
              data-testid="brand-voice-submit"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: canProceedStep3 && !mutation.isPending ? '#111111' : '#E4E4E7',
                color: canProceedStep3 && !mutation.isPending ? '#FFFFFF' : '#A1A1AA',
              }}
            >
              {mutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={13} />
                  Build my voice profile
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onComplete}
              data-testid="brand-voice-done"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold"
              style={{ background: '#111111', color: '#FFFFFF' }}
            >
              <Sparkles size={13} />
              Start creating content
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
