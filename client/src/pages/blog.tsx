import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { ArrowRight, Clock, Tag, ChevronLeft, Hash } from 'lucide-react';
import TrendJetterLogo from '@/components/TrendJetterLogo';
import { BLOG_POSTS, type BlogPost } from '@/data/blogPosts';

// ─── SEO Head updater ────────────────────────────────────────────────────────
function useSEO({ title, description, url }: { title: string; description: string; url: string }) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const prevDesc = meta.content;
    meta.content = description;

    // OG tags
    const setOg = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) { el = document.createElement('meta'); (el as any).property = property; document.head.appendChild(el); }
      el.content = content;
    };
    setOg('og:title', title);
    setOg('og:description', description);
    setOg('og:url', url);
    setOg('og:type', 'article');

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = url;

    return () => {
      document.title = prev;
      if (meta) meta.content = prevDesc;
    };
  }, [title, description, url]);
}

// ─── Category badge ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Instagram':      { bg: '#FDF2F8', color: '#9D174D' },
  'TikTok':         { bg: '#F0FDF4', color: '#166534' },
  'Creator Growth': { bg: '#EFF6FF', color: '#1E40AF' },
  'Strategy':       { bg: '#FFFBEB', color: '#92400E' },
};

function CategoryBadge({ category }: { category: string }) {
  const { bg, color } = CATEGORY_COLORS[category] ?? { bg: '#F4F4F5', color: '#52525B' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: bg, color, padding: '3px 9px', borderRadius: 20,
    }}>{category}</span>
  );
}

// ─── Blog navbar ─────────────────────────────────────────────────────────────
function BlogNav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #E4E4E7',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendJetterLogo height={28} color="#111111" />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/#/blog" style={{ fontSize: 14, color: '#111111', fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>Blog</a>
          <a href="/" style={{ fontSize: 14, color: '#52525B', textDecoration: 'none', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color='#111111')}
            onMouseLeave={e => (e.currentTarget.style.color='#52525B')}>Home</a>
          <a href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
            style={{ fontSize: 13, fontWeight: 600, background: '#111111', color: '#fff', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
            Try free
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Blog index page ─────────────────────────────────────────────────────────
function BlogIndex() {
  useSEO({
    title: 'Blog — Hashtag Strategy, Creator Growth & Instagram Tips | TrendJetter',
    description: 'Practical guides on hashtag strategy, Instagram growth, TikTok tips, and creator marketing. Written for serious creators in 2026.',
    url: 'https://www.trendjetter.io/blog',
  });

  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <BlogNav />

      {/* Hero */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E4E7', padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,32px) 0' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>TrendJetter Blog</p>
          <h1 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111111', marginBottom: 12, lineHeight: 1.08 }}>
            Strategies that actually move the needle
          </h1>
          <p style={{ fontSize: 16, color: '#71717A', maxWidth: 520, marginBottom: 40, lineHeight: 1.65, fontFamily: 'Inter, sans-serif' }}>
            Hashtag strategy, creator growth, and platform playbooks. No fluff, no recycled advice.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,32px)' }}>

        {/* Featured post */}
        {featured && (
          <a href={`/#/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 40 }}>
            <div
              style={{
                background: '#111111',
                borderRadius: 16,
                padding: 'clamp(28px,4vw,48px)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}
            >
              {/* Dot grid bg */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0891B2' }}>Featured</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>{featured.readTime}</span>
                </div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{featured.heroEmoji}</div>
                <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(20px,3vw,32px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', marginBottom: 12, lineHeight: 1.15, maxWidth: 640 }}>
                  {featured.title}
                </h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 560, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
                  {featured.excerpt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0891B2', fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                  Read article <ArrowRight size={14} strokeWidth={2.2} />
                </div>
              </div>
            </div>
          </a>
        )}

        {/* Post grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {rest.map(post => (
            <a key={post.slug} href={`/#/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{
                  background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E4E7',
                  padding: 24, height: '100%', boxSizing: 'border-box',
                  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#D4D4D8';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E4E4E7';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{post.heroEmoji}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <CategoryBadge category={post.category} />
                  <span style={{ fontSize: 11, color: '#A1A1AA', fontFamily: 'Inter, sans-serif' }}>{post.readTime}</span>
                </div>
                <h2 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#111111', marginBottom: 8, lineHeight: 1.25 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.6, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
                  {post.excerpt}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0891B2', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                  Read more <ArrowRight size={12} strokeWidth={2.2} />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* CTA banner */}
        <div style={{ marginTop: 56, background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16, padding: '36px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>Stop guessing</p>
          <h3 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#111111', marginBottom: 10 }}>
            Put the strategy on autopilot
          </h3>
          <p style={{ fontSize: 15, color: '#71717A', marginBottom: 24, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
            TrendJetter scores every hashtag across 7 dimensions and tells you exactly what to post in under 2 seconds.
          </p>
          <a href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111111', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 24px', borderRadius: 9, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
            Try TrendJetter free <ArrowRight size={14} strokeWidth={2.2} />
          </a>
          <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>No credit card needed.</p>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
}

// ─── Blog post page ───────────────────────────────────────────────────────────
function BlogPost({ slug }: { slug: string }) {
  const post = BLOG_POSTS.find(p => p.slug === slug);
  const [, navigate] = useHashLocation();

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 16, color: '#71717A', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>Post not found.</p>
        <button onClick={() => navigate('/blog')} style={{ fontSize: 14, color: '#0891B2', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
          Back to blog
        </button>
      </div>
    );
  }

  useSEO({
    title: post.metaTitle,
    description: post.metaDescription,
    url: `https://www.trendjetter.io/blog/${post.slug}`,
  });

  // Related posts (same category, not this post)
  const related = BLOG_POSTS.filter(p => p.slug !== slug && p.category === post.category).slice(0, 2);
  const fallbackRelated = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2);
  const relatedPosts = related.length >= 2 ? related : fallbackRelated;

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <BlogNav />

      {/* Article header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E4E7', padding: 'clamp(32px,5vw,64px) clamp(16px,4vw,32px) clamp(28px,4vw,48px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <a href="/#/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#71717A', textDecoration: 'none', marginBottom: 24, fontFamily: 'Inter, sans-serif', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color='#111111')}
            onMouseLeave={e => (e.currentTarget.style.color='#71717A')}>
            <ChevronLeft size={14} /> Back to blog
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CategoryBadge category={post.category} />
            <span style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} /> {post.readTime}
            </span>
            <span style={{ fontSize: 12, color: '#A1A1AA', fontFamily: 'Inter, sans-serif' }}>{post.publishDate}</span>
          </div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{post.heroEmoji}</div>
          <h1 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#111111', lineHeight: 1.1, marginBottom: 16 }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 17, color: '#52525B', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
            {post.excerpt}
          </p>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,4vw,32px)' }}>
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* In-article CTA */}
        <div style={{ margin: '48px 0', background: '#111111', borderRadius: 14, padding: '32px 36px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0891B2', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>Try it free</p>
            <h3 style={{ fontFamily: 'Inter Tight, Inter, sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', marginBottom: 8, lineHeight: 1.2 }}>
              Stop guessing. Start getting verdicts.
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 20, lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
              TrendJetter scores every hashtag across 7 dimensions and tells you exactly what to post. Free to try.
            </p>
            <a href="https://accounts.trendjetter.io/sign-up?redirect_url=https%3A%2F%2Fwww.trendjetter.io%2F%23%2Fdashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', color: '#111111', fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
              Try TrendJetter free <ArrowRight size={13} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>Keep reading</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {relatedPosts.map(p => (
                <a key={p.slug} href={`/#/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 12, padding: 20, transition: 'border-color 0.15s, transform 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor='#D4D4D8'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor='#E4E4E7'; (e.currentTarget as HTMLDivElement).style.transform='translateY(0)'; }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{p.heroEmoji}</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111111', fontFamily: 'Inter Tight, Inter, sans-serif', letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 6 }}>{p.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0891B2', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
                      Read <ArrowRight size={11} strokeWidth={2.2} />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <BlogFooter />
    </div>
  );
}

// ─── Blog footer ─────────────────────────────────────────────────────────────
function BlogFooter() {
  return (
    <footer style={{ background: '#111111', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '32px 32px 24px', marginTop: 40 }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hash size={11} color="#FFFFFF" />
          </div>
          <TrendJetterLogo height={18} color="#FFFFFF" />
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[{ label: 'Blog', href: '/#/blog' }, { label: 'Home', href: '/' }, { label: 'Privacy', href: '/#/privacy' }, { label: 'Terms', href: '/#/terms' }].map(({ label, href }) => (
            <a key={label} href={href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.15s', fontFamily: 'Inter, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.color='rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.35)')}>{label}</a>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter, sans-serif' }}>© 2026 TrendJetter</p>
      </div>
    </footer>
  );
}

// ─── Blog styles injected once ────────────────────────────────────────────────
const BLOG_STYLES = `
  .blog-content h2 {
    font-family: 'Inter Tight', Inter, sans-serif;
    font-size: clamp(19px, 2.2vw, 24px);
    font-weight: 800;
    letter-spacing: -0.025em;
    color: #111111;
    margin: 40px 0 14px;
    line-height: 1.2;
  }
  .blog-content h3 {
    font-family: 'Inter Tight', Inter, sans-serif;
    font-size: clamp(16px, 1.8vw, 19px);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #111111;
    margin: 28px 0 10px;
    line-height: 1.3;
  }
  .blog-content p {
    font-family: Inter, sans-serif;
    font-size: 16px;
    color: #3F3F46;
    line-height: 1.75;
    margin-bottom: 18px;
  }
  .blog-content ul, .blog-content ol {
    font-family: Inter, sans-serif;
    font-size: 15px;
    color: #3F3F46;
    line-height: 1.75;
    padding-left: 20px;
    margin-bottom: 18px;
  }
  .blog-content li {
    margin-bottom: 6px;
  }
  .blog-content strong {
    font-weight: 700;
    color: #111111;
  }
  .blog-content a {
    color: #0891B2;
    text-decoration: underline;
    text-decoration-color: rgba(8,145,178,0.3);
    text-underline-offset: 2px;
  }
  .blog-content a:hover {
    text-decoration-color: #0891B2;
  }
  .blog-content blockquote {
    border-left: 3px solid #0891B2;
    margin: 24px 0;
    padding: 12px 20px;
    background: #F0F9FF;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #1E40AF;
  }
`;

function BlogStyleInjector() {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'blog-styles';
    style.textContent = BLOG_STYLES;
    if (!document.getElementById('blog-styles')) {
      document.head.appendChild(style);
    }
    return () => { document.getElementById('blog-styles')?.remove(); };
  }, []);
  return null;
}

// ─── Router: /blog and /blog/:slug ───────────────────────────────────────────
export default function BlogRouter() {
  const [loc] = useHashLocation();

  // /blog or /blog/
  if (loc === '/blog' || loc === '/blog/') {
    return <><BlogStyleInjector /><BlogIndex /></>;
  }

  // /blog/:slug
  const match = loc.match(/^\/blog\/([^/]+)$/);
  if (match) {
    return <><BlogStyleInjector /><BlogPost slug={match[1]} /></>;
  }

  // Fallback to index
  return <><BlogStyleInjector /><BlogIndex /></>;
}
