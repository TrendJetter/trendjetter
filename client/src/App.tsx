import { Switch, Route, Router, Link, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import TrendJetterLogo from '@/components/TrendJetterLogo';
import { useGlobalCursorSpotlight } from '@/components/AppAnimations';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  Hash, LayoutDashboard, TrendingUp, Bookmark,
  FileText, ChevronRight, Menu, LogOut
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useAuth, useUser, UserButton, SignOutButton, RedirectToSignIn } from '@clerk/clerk-react';
import type { User as UserType } from '@shared/schema';

import LandingPage     from '@/pages/landing';
import DashboardPage   from '@/pages/dashboard';
import GeneratorPage   from '@/pages/generator';
import ResultsPage     from '@/pages/results';
import TrendsPage      from '@/pages/trends';
import CollectionsPage from '@/pages/collections';
import ContentPage     from '@/pages/content';
import AccountPage     from '@/pages/account';
import SignInPage      from '@/pages/sign-in';
import SignUpPage      from '@/pages/sign-up';
import PrivacyPage     from '@/pages/privacy';
import TermsPage       from '@/pages/terms';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/generator',   label: 'Generate',   icon: Hash },
  { href: '/trends',      label: 'Trends',     icon: TrendingUp },
  { href: '/collections', label: 'Collections',icon: Bookmark },
  { href: '/content',     label: 'Content',    icon: FileText },
];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, navigate] = useHashLocation();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAFA' }}>
        <div className="w-5 h-5 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    // Send to Clerk hosted sign-in, come back to dashboard after
    window.location.href = 'https://accounts.trendjetter.io/sign-in?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard';
    return null;
  }

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [loc] = useHashLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user: clerkUser } = useUser();

  // Set Clerk user info synchronously so API headers are ready before first query
  if (clerkUser) {
    (window as any).__CLERK_USER_ID__ = clerkUser.id;
    (window as any).__CLERK_USER_EMAIL__ = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    (window as any).__CLERK_USER_NAME__ = clerkUser.fullName ?? clerkUser.firstName ?? '';
  }

  // Activate the global cursor glow effect inside the app shell
  useGlobalCursorSpotlight();

  const { data: user } = useQuery<UserType>({ queryKey: ['/api/me'], staleTime: 0, refetchOnMount: true });

  return (
    <div
      className="flex h-screen"
      style={{
        background: '#FAFAFA',
        backgroundImage: 'radial-gradient(circle, #D0D0D6 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-56 flex flex-col
          bg-white border-r border-[#E4E4E7]
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="flex items-center px-4 h-14 border-b border-[#E4E4E7] shrink-0">
          <TrendJetterLogo height={32} color="#111111" />
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = loc === href || loc.startsWith(href + '/');
            return (
              <Link key={href} href={href}>
                <a
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] font-medium
                    transition-all duration-100 mb-0.5 no-underline
                    ${active
                      ? 'bg-[#F4F4F5] text-[#111111]'
                      : 'text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#111111]'
                    }
                  `}
                  style={{ letterSpacing: '-0.01em' }}
                  data-testid={`nav-${href.slice(1)}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-[#E4E4E7] px-3 py-3">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <UserButton
              afterSignOutUrl="/#/"
              appearance={{
                variables: { colorPrimary: '#111111', borderRadius: '8px' },
                elements: { avatarBox: 'w-6 h-6' },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-[#111111] truncate leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>
                {clerkUser?.firstName ?? clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ?? 'Creator'}
              </p>
              <p className="text-[11px] text-[#A1A1AA] truncate leading-none capitalize">{user?.plan ?? 'free'} plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-[#E4E4E7] bg-white shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-[#F4F4F5] transition-colors"
          >
            <Menu size={18} className="text-[#52525B]" />
          </button>
          <TrendJetterLogo height={30} color="#111111" />
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={LandingPage} />
        {/* sign-in/up handled by Clerk hosted pages — these catch any stray hash routes */}
        <Route path="/sign-in">{() => { window.location.href = "https://accounts.trendjetter.io/sign-in?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"; return null; }}</Route>
        <Route path="/sign-up">{() => { window.location.href = "https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"; return null; }}</Route>

        {/* Protected app shell routes */}
        <Route path="/dashboard">
          <AuthGuard><AppShell><DashboardPage /></AppShell></AuthGuard>
        </Route>
        <Route path="/generator">
          <AuthGuard><AppShell><GeneratorPage /></AppShell></AuthGuard>
        </Route>
        <Route path="/results/:id">
          {(params) => <AuthGuard><AppShell><ResultsPage id={params.id} /></AppShell></AuthGuard>}
        </Route>
        <Route path="/trends">
          <AuthGuard><AppShell><TrendsPage /></AppShell></AuthGuard>
        </Route>
        <Route path="/collections">
          <AuthGuard><AppShell><CollectionsPage /></AppShell></AuthGuard>
        </Route>
        <Route path="/content">
          <AuthGuard><AppShell><ContentPage /></AppShell></AuthGuard>
        </Route>
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/account">
          <AuthGuard><AppShell><AccountPage /></AppShell></AuthGuard>
        </Route>
      </Switch>
      <Toaster />
    </Router>
  );
}
