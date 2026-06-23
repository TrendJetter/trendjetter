import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ── Welcome email HTML ────────────────────────────────────────────────────────
function welcomeHtml(name: string): string {
  const firstName = name.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to TrendJetter</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#111111;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#FFFFFF;font-size:18px;font-weight:800;line-height:36px;">#</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:20px;font-weight:800;color:#111111;letter-spacing:-0.03em;">trendjetter</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:16px;border:1px solid #E4E4E7;padding:40px 40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111111;letter-spacing:-0.03em;line-height:1.1;">
                Hey ${firstName},
              </p>
              <p style="margin:0 0 28px;font-size:16px;font-weight:700;color:#111111;letter-spacing:-0.01em;">
                Welcome to TrendJetter.
              </p>

              <!-- Body -->
              <p style="margin:0 0 16px;font-size:14px;color:#52525B;line-height:1.7;">
                You've just joined thousands of creators, brands, marketers, and business owners who use TrendJetter to stay ahead of what's gaining momentum online.
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#52525B;line-height:1.7;">
                Every day, new trends emerge, hashtags explode, and conversations take off across social platforms. The difference between getting noticed and getting left behind often comes down to timing.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#52525B;line-height:1.7;">
                That's where TrendJetter comes in.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #F4F4F5;margin:0 0 24px;" />

              <!-- Start here -->
              <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#111111;letter-spacing:0.06em;text-transform:uppercase;">
                Start here
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                ${[
                  ['Explore trending hashtags and topics in real time', '#/trends'],
                  ['Generate AI-scored hashtag sets for your next post', '#/generator'],
                  ['Save your best sets to Smart Collections', '#/collections'],
                  ['Track your usage and manage your plan', '#/account'],
                ].map(([label, path]) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #F4F4F5;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:20px;vertical-align:top;padding-top:1px;">
                          <span style="font-size:14px;color:#0891B2;">→</span>
                        </td>
                        <td style="padding-left:8px;">
                          <a href="https://www.trendjetter.io/${path}" style="font-size:14px;color:#111111;text-decoration:none;font-weight:500;">${label}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- Spacer -->
              <div style="height:28px;"></div>

              <!-- Quote -->
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#F9F9F9;border-left:3px solid #0891B2;border-radius:0 8px 8px 0;padding:16px 18px;margin-bottom:28px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:14px;color:#52525B;line-height:1.65;font-style:italic;">
                      "The creators winning right now aren't posting more. They're posting smarter."
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#A1A1AA;">— Gary Vaynerchuk</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://www.trendjetter.io/#/generator"
                      style="display:inline-block;background:#111111;color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:-0.01em;text-decoration:none;padding:13px 32px;border-radius:9px;">
                      Start generating →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Spacer -->
              <div style="height:28px;"></div>

              <!-- Sign off -->
              <p style="margin:0 0 4px;font-size:14px;color:#52525B;line-height:1.7;">
                We're excited to have you here and can't wait to see what you build.
              </p>
              <p style="margin:0;font-size:14px;color:#52525B;">
                See you inside,<br />
                <strong style="color:#111111;">The TrendJetter Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#A1A1AA;">
                TrendJetter · Find trends before they take off.
              </p>
              <p style="margin:0;font-size:11px;color:#D4D4D8;">
                <a href="https://www.trendjetter.io/#/privacy" style="color:#D4D4D8;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="https://www.trendjetter.io/#/terms" style="color:#D4D4D8;text-decoration:none;">Terms of Service</a>
                &nbsp;·&nbsp;
                <a href="mailto:hi@trendjetter.io" style="color:#D4D4D8;text-decoration:none;">hi@trendjetter.io</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send welcome email ────────────────────────────────────────────────────────
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not set — skipping welcome email for', email);
    return;
  }
  try {
    await resend.emails.send({
      from: 'TrendJetter <hi@trendjetter.io>',
      to: email,
      subject: 'Welcome to TrendJetter — find trends before they take off',
      html: welcomeHtml(name),
    });
    console.log('[email] Welcome email sent to', email);
  } catch (err: any) {
    // Non-fatal — never block sign-up because email failed
    console.error('[email] Failed to send welcome email:', err.message);
  }
}
