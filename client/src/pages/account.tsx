import { useQuery } from '@tanstack/react-query';
import { User, CreditCard, Bell, Shield, Key, LogOut, ChevronRight, Check, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as UserType } from '@shared/schema';

const PLANS = {
  free:   { name: 'Free',   price: '$0',  features: ['5 searches/month', '20 hashtags per search', 'Basic scoring', 'Instagram only'] },
  pro:    { name: 'Pro',    price: '$29', features: ['Unlimited searches', '30 hashtags per search', 'Full intelligence scores', 'All 6 platforms', 'Saved collections', 'Content assistant', 'CSV export'] },
  agency: { name: 'Agency', price: '$99', features: ['Everything in Pro', '5 team seats', 'White-label reports', 'API access', 'Priority support'] },
};

function PlanCard({ planKey, current }: { planKey: 'free'|'pro'|'agency'; current: boolean }) {
  const p = PLANS[planKey];
  return (
    <div className={`bento-tile p-5 flex flex-col gap-4 ${current ? 'border-[#111111]' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-semibold text-[#111111] mb-0.5" style={{ letterSpacing: '-0.01em' }}>{p.name}</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[22px] font-bold text-[#111111] tabular" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.03em' }}>{p.price}</span>
            <span className="text-[13px] text-[#A1A1AA]">/mo</span>
          </div>
        </div>
        {current && <span className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#111111] text-white">Current</span>}
      </div>
      <div className="flex-1 space-y-1.5">
        {p.features.map(f => (
          <div key={f} className="flex items-center gap-2">
            <Check size={11} className={current ? 'text-[#111111]' : 'text-[#D4D4D8]'} />
            <span className={`text-[12.5px] ${current ? 'text-[#52525B]' : 'text-[#A1A1AA]'}`}>{f}</span>
          </div>
        ))}
      </div>
      {!current && (
        <button data-testid={`button-upgrade-${planKey}`}
          className="w-full h-9 rounded-lg text-[13px] font-medium border border-[#E4E4E7] text-[#52525B] hover:border-[#A1A1AA] hover:text-[#111111] transition-all cursor-pointer flex items-center justify-center gap-1"
          style={{ fontFamily: 'Inter, sans-serif' }}>
          Upgrade <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function SettingRow({ icon: Icon, label, desc, action }: { icon: any; label: string; desc: string; action?: string }) {
  return (
    <button className="w-full flex items-center gap-3 py-3.5 text-left group cursor-pointer border-b border-[#F4F4F5] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0 group-hover:bg-[#EFEFEF] transition-colors">
        <Icon size={14} className="text-[#71717A]" />
      </div>
      <div className="flex-1">
        <p className="text-[13.5px] font-medium text-[#111111] leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>{label}</p>
        <p className="text-[12px] text-[#A1A1AA]">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        {action && <span className="text-[12px] text-[#A1A1AA]">{action}</span>}
        <ChevronRight size={13} className="text-[#D4D4D8] group-hover:text-[#A1A1AA] transition-colors" />
      </div>
    </button>
  );
}

export default function AccountPage() {
  const { data: user, isLoading } = useQuery<UserType>({ queryKey: ['/api/me'] });
  const plan = (user?.plan ?? 'free') as 'free'|'pro'|'agency';

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#111111] mb-1" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>Account</h1>
        <p className="text-[14px] text-[#71717A]">Manage your plan, preferences, and settings.</p>
      </div>

      {/* Profile */}
      <div className="bento-tile p-6 mb-4">
        {isLoading ? (
          <div className="flex items-center gap-4"><Skeleton className="w-12 h-12 rounded-full bg-[#F4F4F5]" /><div className="space-y-2"><Skeleton className="h-4 w-40 bg-[#F4F4F5]" /><Skeleton className="h-3 w-52 bg-[#F4F4F5]" /></div></div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
              style={{ background: '#111111', color: '#FFFFFF', fontFamily: 'Inter Tight, Inter, sans-serif' }}>
              {user?.name?.charAt(0) ?? 'W'}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111111] leading-none mb-1" style={{ letterSpacing: '-0.015em' }}>{user?.name ?? 'Creator'}</p>
              <p className="text-[13px] text-[#71717A]">{user?.email ?? 'you@trendjetter.com'}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#F4F4F5]">
          {[['Searches this month', '12'], ['Hashtags generated', '284'], ['Collections', '3']].map(([l, v]) => (
            <div key={l} className="bg-[#FAFAFA] rounded-lg px-4 py-3 border border-[#F4F4F5]">
              <p className="label-eyebrow mb-1">{l}</p>
              <p className="text-[20px] font-bold tabular text-[#111111]" style={{ fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.025em' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <p className="label-eyebrow mb-3 flex items-center gap-2"><CreditCard size={12} />Subscription</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <PlanCard planKey="free" current={plan === 'free'} />
        <PlanCard planKey="pro" current={plan === 'pro'} />
        <PlanCard planKey="agency" current={plan === 'agency'} />
      </div>

      {/* Settings */}
      <div className="bento-tile p-5 mb-4">
        <p className="label-eyebrow mb-4">Preferences</p>
        <SettingRow icon={Bell} label="Notifications" desc="Weekly trend digests and score alerts" action="On" />
        <SettingRow icon={Shield} label="Privacy" desc="Control your data and search history" />
        <SettingRow icon={Key} label="API Access" desc="Generate API keys for direct integration" action="Pro" />
      </div>
      <div className="bento-tile p-5">
        <SettingRow icon={LogOut} label="Sign Out" desc="Sign out of your TrendJetter account" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-[12px] text-[#D4D4D8]">TrendJetter v1.0</p>
        <div className="flex gap-4">
          {['Privacy', 'Terms', 'Support'].map(l => (
            <button key={l} className="text-[12px] text-[#A1A1AA] hover:text-[#52525B] transition-colors cursor-pointer">{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
