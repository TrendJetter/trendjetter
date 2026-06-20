import { Switch, Route, Router, Link } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import TrendJetterLogo from '@/components/TrendJetterLogo';
import { useGlobalCursorSpotlight } from '@/components/AppAnimations';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Hash, LayoutDashboard, Sparkles, TrendingUp, Bookmark,
  FileText, User, ChevronRight, Menu, X
} from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import type { User as UserType } from '@shared/schema';

import LandingPage   from '@/pages/landing';
import DashboardPage from '@/pages/dashboard';
import GeneratorPage from '@/pages/generator';
import ResultsPage   from '@/pages/results';
import TrendsPage    from '@/pages/trends';
import CollectionsPage from '@/pages/collections';
import ContentPage   from '@/pages/content';
import AccountPage   from '@/pages/account';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/generator',   label: 'Generate',   icon: Hash },
  { href: '/trends',      label: 'Trends',     icon: TrendingUp },
  { href: '/collections', label: 'Collections',icon: Bookmark },
  { href: '/content',     label: 'Content',    icon: FileText },
];

function AppShell({ children }: { children: React.ReactNode }) {
  const [loc] = useHashLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Activate the global cursor glow effect inside the app shell
  useGlobalCursorSpotlight();

  const { data: user } = useQuery<UserType>({ queryKey: ['/api/me'] });

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
          <Link href="/account">
            <a
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-md transition-all no-underline w-full
                ${loc === '/account' ? 'bg-[#F4F4F5]' : 'hover:bg-[#F4F4F5]'}
              `}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{ background: '#111111', color: '#FFFFFF' }}
              >
                {user?.name?.charAt(0) ?? 'W'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[#111111] truncate leading-none mb-0.5" style={{ letterSpacing: '-0.01em' }}>
                  {user?.name ?? 'Creator'}
                </p>
                <p className="text-[11px] text-[#A1A1AA] truncate leading-none">Pro plan</p>
              </div>
              <ChevronRight size={12} className="text-[#D4D4D8] shrink-0" />
            </a>
          </Link>
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
        {/* Landing — no shell */}
        <Route path="/" component={LandingPage} />

        {/* App shell routes */}
        <Route path="/dashboard">
          <AppShell><DashboardPage /></AppShell>
        </Route>
        <Route path="/generator">
          <AppShell><GeneratorPage /></AppShell>
        </Route>
        <Route path="/results/:id">
          {(params) => <AppShell><ResultsPage id={params.id} /></AppShell>}
        </Route>
        <Route path="/trends">
          <AppShell><TrendsPage /></AppShell>
        </Route>
        <Route path="/collections">
          <AppShell><CollectionsPage /></AppShell>
        </Route>
        <Route path="/content">
          <AppShell><ContentPage /></AppShell>
        </Route>
        <Route path="/account">
          <AppShell><AccountPage /></AppShell>
        </Route>
      </Switch>
      <Toaster />
    </Router>
  );
}
