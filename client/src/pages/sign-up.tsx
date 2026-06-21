import { SignUp } from '@clerk/clerk-react';
import TrendJetterLogo from '@/components/TrendJetterLogo';

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: '#FAFAFA',
        backgroundImage: 'radial-gradient(circle, #D0D0D6 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="mb-8 flex flex-col items-center gap-3">
        <TrendJetterLogo height={36} color="#111111" />
        <p className="text-[14px] text-[#71717A]" style={{ fontFamily: 'Inter, sans-serif' }}>
          Create your free account
        </p>
      </div>

      <SignUp
        signInUrl="/#/sign-in"
        afterSignUpUrl="/#/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#111111',
            colorBackground: '#FFFFFF',
            colorText: '#111111',
            colorTextSecondary: '#71717A',
            colorInputBackground: '#FFFFFF',
            colorInputText: '#111111',
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
          },
          elements: {
            card: 'shadow-sm border border-[#E4E4E7] rounded-xl',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton: 'border border-[#E4E4E7] hover:bg-[#F4F4F5] transition-colors',
            formButtonPrimary: 'bg-[#111111] hover:bg-[#333333] text-white transition-colors',
            footerActionLink: 'text-[#111111] font-medium hover:underline',
          },
        }}
      />
    </div>
  );
}
