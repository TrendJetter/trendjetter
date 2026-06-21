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

export default function TermsPage() {
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
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#111111', letterSpacing: '-0.03em', fontFamily: "'Inter Tight', Inter, sans-serif", marginBottom: 12 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: '#71717A' }}>Last updated: {LAST_UPDATED}</p>
        </div>

        <div style={{ fontSize: 15, color: '#3F3F46', lineHeight: 1.75 }}>
          <p style={{ marginBottom: 24 }}>
            These Terms of Service ("Terms") govern your access to and use of TrendJetter ("Service"), operated by TrendJetter ("we," "us," or "our") at trendjetter.io. By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
          </p>

          <Section title="1. The Service">
            <p>TrendJetter is an AI-powered hashtag intelligence platform that generates hashtag recommendations for social media content creators. We provide scoring, trend analysis, and content strategy suggestions based on AI-modeled signals.</p>
            <p style={{ marginTop: 12 }}><strong>Important:</strong> All hashtag scores, trend predictions, and recommendations are AI-generated estimates based on training data and platform signals. They are not real-time data feeds. TrendJetter does not guarantee any specific reach, engagement, or business outcome from using our recommendations.</p>
          </Section>

          <Section title="2. Accounts">
            <p>You must create an account to use TrendJetter. You agree to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}>Provide accurate and complete registration information</li>
              <li style={{ marginBottom: 8 }}>Keep your password secure and not share account access</li>
              <li style={{ marginBottom: 8 }}>Be responsible for all activity that occurs under your account</li>
              <li style={{ marginBottom: 8 }}>Notify us immediately at hi@trendjetter.io if you suspect unauthorized access</li>
            </ul>
            <p style={{ marginTop: 12 }}>You must be at least 13 years old to use TrendJetter. By creating an account, you represent that you meet this age requirement.</p>
          </Section>

          <Section title="3. Subscription Plans and Billing">
            <p>TrendJetter offers the following plans:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}><strong>Free:</strong> 5 hashtag generations per month, no charge</li>
              <li style={{ marginBottom: 8 }}><strong>Pro:</strong> 1,000 generations per month, $29/month</li>
              <li style={{ marginBottom: 8 }}><strong>Agency:</strong> 5,000 generations per month, $99/month</li>
            </ul>
            <p style={{ marginTop: 12 }}>Paid plans are billed monthly in advance. Billing is processed by Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis until you cancel.</p>
            <p style={{ marginTop: 12 }}><strong>Cancellation.</strong> You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. We do not provide prorated refunds for partial months.</p>
            <p style={{ marginTop: 12 }}><strong>Refunds.</strong> All sales are final unless required by applicable law. If you believe you were charged in error, contact us at hi@trendjetter.io within 7 days of the charge.</p>
            <p style={{ marginTop: 12 }}><strong>Generation limits.</strong> Unused generations do not roll over to the next month. Limits reset on your monthly billing anniversary date.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to use TrendJetter to:</p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <li style={{ marginBottom: 8 }}>Violate any applicable law or regulation</li>
              <li style={{ marginBottom: 8 }}>Attempt to circumvent generation limits through automation, scraping, or abuse of the API</li>
              <li style={{ marginBottom: 8 }}>Resell, redistribute, or sublicense access to the Service without written permission</li>
              <li style={{ marginBottom: 8 }}>Reverse engineer, decompile, or attempt to extract the source code of our AI models or platform</li>
              <li style={{ marginBottom: 8 }}>Upload or transmit malicious code, viruses, or harmful content</li>
              <li style={{ marginBottom: 8 }}>Impersonate another person or entity</li>
              <li style={{ marginBottom: 8 }}>Harass, abuse, or harm other users</li>
            </ul>
            <p style={{ marginTop: 12 }}>We reserve the right to suspend or terminate accounts that violate these terms without prior notice.</p>
          </Section>

          <Section title="5. Intellectual Property">
            <p><strong>Our content.</strong> The TrendJetter platform, including its design, code, brand, and AI models, is owned by TrendJetter and protected by intellectual property laws. You may not copy, modify, or distribute our platform without written permission.</p>
            <p style={{ marginTop: 12 }}><strong>Your content.</strong> You retain ownership of any content topics or inputs you provide to generate hashtags. You grant us a limited license to process your inputs through our AI systems solely to provide the Service to you.</p>
            <p style={{ marginTop: 12 }}><strong>AI outputs.</strong> Hashtag recommendations generated by TrendJetter are provided for your use. Because AI outputs cannot be fully protected by copyright, we make no ownership claims over the hashtag lists we generate for you.</p>
          </Section>

          <Section title="6. Disclaimer of Warranties">
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
            <p style={{ marginTop: 12 }}>We do not warrant that: (a) the Service will be uninterrupted or error-free; (b) hashtag recommendations will achieve any specific reach, engagement, or business result; (c) AI-generated scores reflect real-time platform data.</p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRENDJETTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR LOSS OF GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.</p>
            <p style={{ marginTop: 12 }}>OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM.</p>
          </Section>

          <Section title="8. Indemnification">
            <p>You agree to indemnify and hold harmless TrendJetter and its officers, employees, and agents from any claims, damages, or expenses (including legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights.</p>
          </Section>

          <Section title="9. Third-Party Services">
            <p>TrendJetter integrates with third-party services including Clerk (authentication), Stripe (payments), Supabase (database), and Anthropic (AI). Your use of these services is subject to their respective terms of service and privacy policies. We are not responsible for the conduct of these third-party services.</p>
          </Section>

          <Section title="10. Termination">
            <p>We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including Sections 5–8) will survive.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms are governed by the laws of the State of Oklahoma, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the state or federal courts located in Oklahoma City, Oklahoma.</p>
          </Section>

          <Section title="12. Changes to Terms">
            <p>We may update these Terms at any time. We will notify you of material changes by email or by posting a notice in the Service. Your continued use of TrendJetter after changes take effect constitutes your acceptance of the revised Terms.</p>
          </Section>

          <Section title="13. Contact">
            <p>Questions about these Terms? Contact us:</p>
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
