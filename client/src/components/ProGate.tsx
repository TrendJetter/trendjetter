import { useState } from 'react';
import { Lock, Sparkles, TrendingUp, Zap } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';

interface ProGateProps {
  children: React.ReactNode;
  isPaid: boolean;
  currentPlan?: string;
  featureName: string;
  featureDesc: string;
  bullets: string[];
}

export default function ProGate({ children, isPaid, currentPlan = 'free', featureName, featureDesc, bullets }: ProGateProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isPaid) return <>{children}</>;

  return (
    <>
      {showUpgrade && (
        <UpgradeModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          currentPlan={currentPlan}
          reason={`Unlock ${featureName} and more with Pro.`}
        />
      )}

      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-[22px] font-bold text-[#111111]"
              style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}
            >
              {featureName}
            </h1>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: '#111111', color: '#FFFFFF', letterSpacing: '0.08em' }}
            >
              Pro
            </span>
          </div>
          <p className="text-[14px] text-[#71717A]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {featureDesc}
          </p>
        </div>

        {/* Gate card */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: '#E4E4E7', background: '#FFFFFF' }}
        >
          {/* Top locked preview — blurred mockup feel */}
          <div
            className="relative flex items-center justify-center"
            style={{
              height: 220,
              background: 'linear-gradient(160deg, #F9F9F9 0%, #F0F0F1 100%)',
              borderBottom: '1px solid #E4E4E7',
            }}
          >
            {/* Decorative blurred pills */}
            <div className="absolute inset-0 flex flex-wrap gap-2 p-6 overflow-hidden opacity-30 pointer-events-none select-none">
              {['#photography', '#travel2026', '#contentcreator', '#smallbusiness', '#growthhacking', '#instagramtips', '#reels', '#trendjetter', '#socialmediatips', '#hashtagstrategy', '#creatortips', '#tiktok2026'].map((t, i) => (
                <span
                  key={i}
                  className="text-[12px] font-medium px-3 py-1 rounded-full border"
                  style={{ background: '#FFFFFF', borderColor: '#D4D4D8', color: '#52525B', filter: 'blur(2px)' }}
                >
                  {t}
                </span>
              ))}
            </div>
            {/* Lock icon */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: '#111111' }}
              >
                <Lock size={22} className="text-white" />
              </div>
              <p
                className="text-[13px] font-semibold text-[#111111]"
                style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.015em' }}
              >
                Pro feature
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <p
              className="text-[15px] font-bold text-[#111111] mb-1"
              style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.02em' }}
            >
              Unlock {featureName}
            </p>
            <p className="text-[13px] text-[#71717A] mb-5" style={{ fontFamily: 'Inter, sans-serif' }}>
              Upgrade to Pro to access this feature and everything below.
            </p>

            <ul className="space-y-2.5 mb-6">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(8,145,178,0.12)' }}
                  >
                    <Sparkles size={9} style={{ color: '#0891B2' }} />
                  </div>
                  <span className="text-[13px] text-[#52525B]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowUpgrade(true)}
              data-testid="progate-upgrade-btn"
              className="w-full h-11 rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-85 cursor-pointer"
              style={{ background: '#111111', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}
            >
              <Zap size={15} />
              Upgrade to Pro — $19/mo
            </button>

            <p className="text-center text-[11px] text-[#A1A1AA] mt-3">
              Cancel anytime · Secure payment via Stripe
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
