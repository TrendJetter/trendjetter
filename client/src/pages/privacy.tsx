import { useLocation } from 'wouter';
import { ArrowLeft, Hash } from 'lucide-react';

function TrendJetterLogo({ height = 20, color = '#111111' }: { height?: number; color?: string }) {
  return (
    <svg height={height} viewBox="0 0 140 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="TrendJetter">
      <text x="0" y="19" fontFamily="'Inter Tight', Inter, sans-serif" fontWeight="800" fontSize="20" fill={color} letterSpacing="-0.03em">TrendJetter</text>
    </svg>
  );
}

const LAST_UPDATED = 'June 21, 2026';

export default function PrivacyPage() {
  const [, navigate] = useLocation();

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E4E7', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hash size={13} color="#FFFFFF" />
          </div>
          <TrendJetterLogo height={17} color="#111111" />
        </button>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#71717A', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={13} /> Back to home
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 32px 96px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, color: '#0891B2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Legal</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111111', letterSpacing: '-0.03em', fontFamily: "'Inter Tight', Inter, sans-serif", marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: '#71717A' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={{ fontSize: 15, color: '#3F3F46', lineHeight: 1.75 }}>
          <p style={{ marginBottom: 24 }}>
            TrendJetter ("we," "us," or "our") operates trendjetter.io. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. Please read this carefully. By using TrendJetter, you agree to the practices described here.
          </p>

          <Section title="1. Information We Collect">
            <p><strong>Account information.</strong> When you create an account we collect your name, email address, and password (hashed). Authentication is handled by Clerk.</p>
            <p style={{ marginTop: 12 }}><strong>Usage data.</strong> We track the hashtag searches you perform, the platforms and industries you select, and how many generations you use each billing period. This is necessary to enforce plan limits and improve our AI models.</p>
            <p style={{ marginTop: 12 }}><strong>Payment information.</strong> Billing is handled entirely by Stripe. We never store your credit card number, CVV, or full card details on our servers. We store only your Stripe customer ID, subscription plan, and billing status.</p>
            <p style={{ marginTop: 12 }}><strong>Technical data.</strong> We collect standard server logs including IP addresses, browser type, operating system, referring URLs, and timestamps. This data is used for security, debugging, and analytics.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}>Provide, operate, and improve the TrendJetter service</li>
              <li style={{ marginBottom: 8 }}>Process payments and manage your subscription</li>
              <li style={{ marginBottom: 8 }}>Enforce plan generation limits</li>
              <li style={{ marginBottom: 8 }}>Send transactional emails (receipts, plan confirmations, usage alerts)</li>
              <li style={{ marginBottom: 8 }}>Respond to support requests</li>
              <li style={{ marginBottom: 8 }}>Detect and prevent fraud or abuse</li>
              <li style={{ marginBottom: 8 }}>Comply with legal obligations</li>
            </ul>
            <p style={{ marginTop: 12 }}>We do not sell your personal information to third parties. We do not use your data to train external AI models.</p>
          </Section>

          <Section title="3. AI-Generated Content">
            <p>TrendJetter uses the Anthropic Claude API to generate hashtag recommendations. Your search inputs (industry, platform, content topic, location) are sent to Anthropic's API to generate results. Anthropic's use of this data is governed by <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#0891B2' }}>Anthropic's Privacy Policy</a>.</p>
            <p style={{ marginTop: 12 }}>Hashtag scores and recommendations are AI-modeled estimates based on platform signals and training data. They are not real-time scraped data. TrendJetter makes no guarantees about the accuracy or performance of any recommended hashtag.</p>
          </Section>

          <Section title="4. Data Sharing and Third Parties">
            <p>We share data only with the following service providers necessary to operate TrendJetter:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}><strong>Clerk</strong> — authentication and user management</li>
              <li style={{ marginBottom: 8 }}><strong>Stripe</strong> — payment processing and subscription management</li>
              <li style={{ marginBottom: 8 }}><strong>Supabase</strong> — database and data storage</li>
              <li style={{ marginBottom: 8 }}><strong>Anthropic</strong> — AI content generation</li>
              <li style={{ marginBottom: 8 }}><strong>Vercel</strong> — hosting and infrastructure</li>
            </ul>
            <p style={{ marginTop: 12 }}>We may disclose your information if required by law, court order, or government authority, or to protect the rights, property, or safety of TrendJetter, our users, or the public.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your account data for as long as your account is active. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g., Stripe transaction records, which we retain for 7 years per financial regulations).</p>
          </Section>

          <Section title="6. Cookies and Tracking">
            <p>We use essential cookies and session tokens required to operate authentication and maintain your logged-in session. We do not use advertising cookies or sell your browsing data to advertisers.</p>
            <p style={{ marginTop: 12 }}>We may use privacy-respecting analytics (such as aggregate pageview counts) to understand how the product is used. These do not track individual users across sites.</p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your location, you may have rights to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}>Access the personal data we hold about you</li>
              <li style={{ marginBottom: 8 }}>Correct inaccurate data</li>
              <li style={{ marginBottom: 8 }}>Delete your account and associated data</li>
              <li style={{ marginBottom: 8 }}>Export your data in a portable format</li>
              <li style={{ marginBottom: 8 }}>Opt out of marketing communications</li>
            </ul>
            <p style={{ marginTop: 12 }}>To exercise any of these rights, email us at <a href="mailto:hi@trendjetter.io" style={{ color: '#0891B2' }}>hi@trendjetter.io</a>.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>TrendJetter is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately at <a href="mailto:hi@trendjetter.io" style={{ color: '#0891B2' }}>hi@trendjetter.io</a>.</p>
          </Section>

          <Section title="9. Security">
            <p>We implement industry-standard security measures including HTTPS encryption, hashed passwords, and access controls. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of TrendJetter after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <p style={{ marginTop: 12 }}>
              <strong>TrendJetter</strong><br />
              Email: <a href="mailto:hi@trendjetter.io" style={{ color: '#0891B2' }}>hi@trendjetter.io</a><br />
              Website: <a href="https://trendjetter.io" style={{ color: '#0891B2' }}>trendjetter.io</a>
            </p>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#111111', padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 TrendJetter · <a href="/#/privacy" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Privacy</a> · <a href="/#/terms" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Terms</a></p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111111', letterSpacing: '-0.01em', marginBottom: 12, fontFamily: "'Inter Tight', Inter, sans-serif" }}>{title}</h2>
      {children}
    </div>
  );
}
