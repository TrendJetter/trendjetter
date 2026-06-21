import type { Express } from 'express';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { storage } from './storage';
import { insertSearchSchema, insertCollectionSchema, insertCollectionTagSchema, insertContentGenerationSchema } from '@shared/schema';
import type { InsertHashtag } from '@shared/schema';
import { z } from 'zod';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' as any })
  : null;

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRO_PRICE_ID ?? 'price_pro']: 'pro',
  [process.env.STRIPE_AGENCY_PRICE_ID ?? 'price_agency']: 'agency',
};

// ─────────────────────────────────────────────
// Claude AI Engine — primary hashtag generator
// ─────────────────────────────────────────────

interface GenerateInput {
  locationCity?: string;
  locationState?: string;
  industry: string;
  contentTopic: string;
  platform: string;
  goal: string;
}

interface GeneratedHashtag {
  tag: string;
  groupType: string;
  popularityScore: number;
  competitionScore: number;
  opportunityScore: number;
  localRelevanceScore: number;
  overallScore: number;
  estimatedPosts: string;
  trendDirection: string;
}

interface GenerateResult {
  hashtags: GeneratedHashtag[];
  strategyNotes: string;
  platformTip: string;
  postingRecommendation: string;
}

async function generateHashtagsWithAI(input: GenerateInput): Promise<GenerateResult> {
  const { locationCity, locationState, industry, contentTopic, platform, goal } = input;
  const location = [locationCity, locationState].filter(Boolean).join(', ');

  const prompt = `You are a social media hashtag intelligence expert. Generate a strategic hashtag set for:

- Location: ${location}
- Industry: ${industry.replace(/_/g, ' ')}
- Content Topic: ${contentTopic}
- Platform: ${platform}
- Goal: ${goal.replace(/_/g, ' ')}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "hashtags": [
    {
      "tag": "#example",
      "groupType": "high_volume",
      "popularityScore": 0-100,
      "competitionScore": 0-100,
      "opportunityScore": 0-100,
      "localRelevanceScore": 0-100,
      "overallScore": 0-100,
      "estimatedPosts": "1.2M",
      "trendDirection": "rising"
    }
  ],
  "strategyNotes": "2-3 sentence strategy for this market",
  "platformTip": "specific tip for this platform",
  "postingRecommendation": "best posting times and frequency"
}

Generate exactly 30 hashtags across 5 groups (6 per group):
- 6 high_volume: broad industry tags with massive reach (popularityScore 80-99, competitionScore 75-95, opportunityScore 20-45)
- 6 medium: solid mid-tier tags with good engagement (popularityScore 50-75, competitionScore 45-70, opportunityScore 45-65)
- 6 niche: highly specific topic tags that attract ideal audience (popularityScore 15-45, competitionScore 15-40, opportunityScore 65-90)
- 6 local: ${location ? `hyper-local city/region/neighborhood tags for ${location}` : 'tight niche community tags (e.g. #[topic]community, #[topic]creator, #[topic]2026, #[topic]tips)'} (localRelevanceScore 75-99, competitionScore 10-35, opportunityScore 70-92)
- 6 trending: fast-rising platform-specific tags aligned to goal and current 2026 trends (trendDirection "rising", opportunityScore 55-80)

overallScore = round((popularityScore*0.2) + ((100-competitionScore)*0.3) + (opportunityScore*0.3) + (localRelevanceScore*0.2))

trendDirection must be one of: "rising", "stable", "declining"
All tags start with #. Local tags must reference ${location} geography. Use real hashtags people actually use.`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as any).text.trim();
  // Strip markdown code fences if present
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  
  let parsed: GenerateResult;
  try {
    parsed = JSON.parse(jsonStr) as GenerateResult;
  } catch (parseErr) {
    // Fallback: try to extract the JSON object portion if truncated
    const objStart = jsonStr.indexOf('{');
    const objEnd = jsonStr.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      parsed = JSON.parse(jsonStr.slice(objStart, objEnd + 1)) as GenerateResult;
    } else {
      throw new Error(`Claude returned invalid JSON. stop_reason: ${message.stop_reason}`);
    }
  }
  return parsed;
}

async function generateContentWithAI(topic: string, platform: string, industry: string, tone: string): Promise<{
  caption: string;
  hashtags: string[];
  seoKeywords: string[];
  postingSchedule: string;
}> {
  const prompt = `You are a social media content expert. Write a high-performing ${platform} post for:

Topic: ${topic}
Industry: ${industry.replace(/_/g, ' ')}
Tone: ${tone}

Return ONLY valid JSON (no markdown):
{
  "caption": "complete post caption with emojis, 2-4 sentences, ends with a CTA",
  "hashtags": ["#tag1", "#tag2"],
  "seoKeywords": ["keyword1", "keyword2"],
  "postingSchedule": "best times and frequency in 1-2 sentences"
}

Include 12-15 hashtags relevant to topic, industry, and ${platform}. Include 7 SEO keywords.`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as any).text.trim();
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(jsonStr);
}


// ─────────────────────────────────────────────
// Smart AI Hashtag Engine (no external API needed)
// ─────────────────────────────────────────────

const INDUSTRY_HASHTAGS: Record<string, string[]> = {
  real_estate: [
    'realestate', 'realestateagent', 'homeforsale', 'realtor', 'househunting',
    'newlisting', 'justlisted', 'openhouse', 'dreamhome', 'homebuying',
    'realestateinvesting', 'luxuryhomes', 'milliondollarlisting', 'propertyforsale',
    'homeselling', 'realestatephotography', 'firsttimehomebuyer', 'investment',
    'propertymanagement', 'commercialrealestate'
  ],
  food_beverage: [
    'foodie', 'instafood', 'foodphotography', 'yummy', 'delicious',
    'foodblogger', 'foodlover', 'homemade', 'cooking', 'chef',
    'restaurant', 'eeeeeats', 'feedfeed', 'foodstagram', 'tasty'
  ],
  fitness: [
    'fitness', 'workout', 'gym', 'fitnessmotivation', 'health',
    'exercise', 'bodybuilding', 'weightloss', 'personaltrainer', 'fitlife',
    'healthylifestyle', 'training', 'crossfit', 'yoga', 'cardio'
  ],
  beauty: [
    'beauty', 'makeup', 'skincare', 'beautytips', 'cosmetics',
    'beautyinfluencer', 'selfcare', 'glam', 'eyeshadow', 'lipstick',
    'skincareroutine', 'beautyproducts', 'makeuptutorial', 'glow', 'nailart'
  ],
  fashion: [
    'fashion', 'style', 'ootd', 'fashionista', 'outfitoftheday',
    'streetstyle', 'fashionblogger', 'clothing', 'accessories', 'luxury',
    'vintage', 'sustainablefashion', 'mensfashion', 'womensfashion', 'designer'
  ],
  technology: [
    'tech', 'technology', 'innovation', 'startup', 'software',
    'coding', 'programming', 'developer', 'techstartup', 'artificialintelligence',
    'machinelearning', 'saas', 'cloud', 'cybersecurity', 'ux'
  ],
  photography: [
    'photography', 'photo', 'photographer', 'canon', 'nikon',
    'portrait', 'landscape', 'streetphotography', 'naturephotography', 'lightroom',
    'photooftheday', 'picoftheday', 'snapseed', 'mobilephotography', 'filmphotography'
  ],
  travel: [
    'travel', 'wanderlust', 'travelgram', 'vacation', 'adventure',
    'travelblogger', 'explore', 'tourism', 'roadtrip', 'backpacking',
    'travelphoto', 'holiday', 'destination', 'travelphotography', 'instatravel'
  ],
  marketing: [
    'marketing', 'digitalmarketing', 'socialmedia', 'socialmediamarketing', 'branding',
    'contentmarketing', 'seo', 'emailmarketing', 'marketingstrategy', 'advertising',
    'growthhacking', 'entrepreneur', 'smallbusiness', 'business', 'startup'
  ],
  music: [
    'musicproducer', 'newmusic', 'indieartist', 'musicvideo', 'songwriter',
    'hiphop', 'rnb', 'pop', 'musiclife', 'beatmaker',
    'unsignedartist', 'musicstudio', 'recordingartist', 'livemusic', 'musician'
  ],
  gaming: [
    'gamingtok', 'gamingcommunity', 'gamer', 'videogames', 'pcgaming',
    'consolegaming', 'twitch', 'streamer', 'esports', 'gamingsetup',
    'gamedev', 'rpg', 'fps', 'indiegame', 'gaminglifestyle'
  ],
  default: [
    'instagood', 'follow', 'like', 'photooftheday', 'love',
    'trending', 'viral', 'explore', 'content', 'creator',
    'lifestyle', 'motivation', 'inspiration', 'tips', 'business'
  ]
};

const CITY_HASHTAGS: Record<string, string[]> = {
  'oklahoma city': ['oklahomacity', 'okc', 'oklahoma', 'okcmetro', 'visitokc', 'tulsaok'],
  'tulsa': ['tulsa', 'tulsaok', 'tulsaoklahoma', 'greenandgolden', 'tulsacreative'],
  'dallas': ['dallas', 'dfw', 'dfwmetro', 'dallastx', 'northtexas'],
  'houston': ['houston', 'htx', 'houstontx', 'houstonlife', 'bayoucity'],
  'los angeles': ['losangeles', 'la', 'socal', 'losangeleslife', 'lala'],
  'new york': ['nyc', 'newyork', 'newyorkcity', 'thebigapple', 'nyclife'],
  'chicago': ['chicago', 'chi', 'chitown', 'chicagolife', 'windycity'],
  'miami': ['miami', 'miamibeach', 'southflorida', 'miamilife', 'magic305'],
  'austin': ['austin', 'atx', 'austintexas', 'austinlife', 'keepaustinweird'],
  'nashville': ['nashville', 'nash', 'nashvilletn', 'musiccity', 'nashvillelife'],
  'denver': ['denver', 'denvco', 'denver303', 'denvercolorado', 'mileHigh'],
  'seattle': ['seattle', 'seattlewa', 'seattlelife', 'emeraldcity', 'pnw'],
  'phoenix': ['phoenix', 'phx', 'phoenixaz', 'arizonarealestate', 'valleysun'],
  'atlanta': ['atlanta', 'atl', 'atlantaga', 'atlantalife', 'hotlanta'],
};

const PLATFORM_TIPS: Record<string, string> = {
  instagram: 'Use 20-30 hashtags per post. Mix high-volume with niche tags. Put them in the first comment to keep your caption clean.',
  tiktok: 'Use 3-5 focused hashtags. TikTok\'s algorithm is topic-driven — prioritize niche and trending tags over high-volume generic ones.',
  facebook: 'Use 2-5 hashtags max. Facebook users engage with specific community tags more than generic ones.',
  linkedin: 'Use 3-5 professional hashtags. Focus on industry and skill-based tags. Avoid generic tags like #love or #instagood.',
  youtube: 'Use hashtags in your description and title. 3-5 is ideal. YouTube shows them above the video title.',
  x: 'Use 1-2 hashtags per tweet. More than 2 drops engagement by 17%. Use trending tags for discovery.',
};

const GOAL_HASHTAGS: Record<string, string[]> = {
  viral_reach: ['viral', 'trending', 'fyp', 'foryou', 'explore', 'discoverunder10k'],
  local_reach: [], // filled by city tags
  engagement: ['tips', 'tutorial', 'howto', 'didyouknow', 'questionoftheday', 'community'],
  lead_generation: ['linkInBio', 'dmForInfo', 'freeconsultation', 'inquirenow', 'availableNow'],
  brand_awareness: ['brand', 'entrepreneur', 'founder', 'behindthescenes', 'myjourney'],
};

const POSTING_RECOMMENDATIONS: Record<string, string> = {
  instagram: 'Best times: Tue–Fri 10am–2pm, plus Wed 11am. Post 4–5x per week for consistent growth.',
  tiktok: 'Best times: Tue, Thu, Fri 6–10pm. Post daily if possible — TikTok rewards consistency.',
  facebook: 'Best times: Wed 11am–1pm, Thu 8–10pm. Post 3–5x per week.',
  linkedin: 'Best times: Tue–Thu 8–10am. Post 3–4x per week. Articles perform better than short posts.',
  youtube: 'Best time: Fri–Sun 2–4pm. Upload 1–2x per week. Consistency matters more than frequency.',
  x: 'Best times: Mon–Thu 9am–4pm. Tweet 3–7x per day. Engage with replies within the first hour.',
};

function calcOverall(pop: number, comp: number, opp: number, local: number): number {
  return Math.round((pop * 0.2) + ((100 - comp) * 0.3) + (opp * 0.3) + (local * 0.2));
}

function postCountForGroup(group: string): string {
  const ranges: Record<string, [number, number]> = {
    high_volume: [1_000_000, 25_000_000],
    medium: [100_000, 999_999],
    niche: [5_000, 99_999],
    local: [1_000, 50_000],
    trending: [50_000, 500_000],
  };
  const [min, max] = ranges[group] ?? [10_000, 100_000];
  const count = Math.floor(Math.random() * (max - min) + min);
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return `${count}`;
}

function generateHashtags(input: GenerateInput): GenerateResult {
  const { locationCity, industry, contentTopic, platform, goal } = input;
  const city = (locationCity ?? '').toLowerCase().trim();
  const citySlug = city.replace(/\s+/g, '');
  const topicSlug = contentTopic.toLowerCase().replace(/[^a-z0-9]/g, '');

  const industryTags = INDUSTRY_HASHTAGS[industry] ?? INDUSTRY_HASHTAGS.default;
  const cityTags = city
    ? (CITY_HASHTAGS[city] ?? [`${citySlug}`, `${citySlug}life`, `${citySlug}content`])
    : [];
  const goalTags = GOAL_HASHTAGS[goal] ?? [];

  const result: GeneratedHashtag[] = [];

  // HIGH VOLUME (4 tags) — broad industry, 1M+ posts
  const hvTags = industryTags.slice(0, 4);
  for (const tag of hvTags) {
    const pop = 85 + Math.floor(Math.random() * 15);
    const comp = 80 + Math.floor(Math.random() * 18);
    const opp = 30 + Math.floor(Math.random() * 20);
    const local = 20 + Math.floor(Math.random() * 20);
    result.push({
      tag: `#${tag}`,
      groupType: 'high_volume',
      popularityScore: pop,
      competitionScore: comp,
      opportunityScore: opp,
      localRelevanceScore: local,
      overallScore: calcOverall(pop, comp, opp, local),
      estimatedPosts: postCountForGroup('high_volume'),
      trendDirection: 'stable',
    });
  }

  // MEDIUM (4 tags) — industry middle tier
  const medTags = industryTags.slice(4, 8);
  for (const tag of medTags) {
    const pop = 55 + Math.floor(Math.random() * 20);
    const comp = 50 + Math.floor(Math.random() * 20);
    const opp = 50 + Math.floor(Math.random() * 20);
    const local = 30 + Math.floor(Math.random() * 25);
    result.push({
      tag: `#${tag}`,
      groupType: 'medium',
      popularityScore: pop,
      competitionScore: comp,
      opportunityScore: opp,
      localRelevanceScore: local,
      overallScore: calcOverall(pop, comp, opp, local),
      estimatedPosts: postCountForGroup('medium'),
      trendDirection: 'stable',
    });
  }

  // NICHE (4 tags) — topic + content-specific
  const nicheTags = [
    topicSlug,
    `${topicSlug}tips`,
    `${topicSlug}life`,
    industryTags[industryTags.length - 1] ?? `${topicSlug}expert`,
  ];
  for (const tag of nicheTags) {
    if (!tag) continue;
    const pop = 20 + Math.floor(Math.random() * 30);
    const comp = 20 + Math.floor(Math.random() * 25);
    const opp = 65 + Math.floor(Math.random() * 25);
    const local = 35 + Math.floor(Math.random() * 30);
    result.push({
      tag: `#${tag}`,
      groupType: 'niche',
      popularityScore: pop,
      competitionScore: comp,
      opportunityScore: opp,
      localRelevanceScore: local,
      overallScore: calcOverall(pop, comp, opp, local),
      estimatedPosts: postCountForGroup('niche'),
      trendDirection: 'rising',
    });
  }

  // LOCAL (5 tags) — city-specific if provided, else bonus niche/topic tags
  const localPool = city
    ? [...cityTags]
    : [`${topicSlug}community`, `${topicSlug}creator`, `${topicSlug}2026`, `${topicSlug}inspo`, `${topicSlug}coach`];
  const localTagSet = localPool.slice(0, 5);
  for (const tag of localTagSet) {
    const pop = 25 + Math.floor(Math.random() * 35);
    const comp = 15 + Math.floor(Math.random() * 25);
    const opp = 70 + Math.floor(Math.random() * 20);
    const local = 80 + Math.floor(Math.random() * 18);
    result.push({
      tag: `#${tag}`,
      groupType: 'local',
      popularityScore: pop,
      competitionScore: comp,
      opportunityScore: opp,
      localRelevanceScore: local,
      overallScore: calcOverall(pop, comp, opp, local),
      estimatedPosts: postCountForGroup('local'),
      trendDirection: 'rising',
    });
  }

  // TRENDING (4 tags) — goal-based + platform-specific trending
  const trendPool = [...goalTags];
  if (platform === 'tiktok') trendPool.push('fyp', 'foryoupage', 'viral');
  if (platform === 'instagram') trendPool.push('reels', 'instadaily', 'instagood');
  if (platform === 'linkedin') trendPool.push('thoughtleadership', 'networkingtips', 'careergrowth');
  const trendTagSet = trendPool.slice(0, 4);
  for (const tag of trendTagSet) {
    const pop = 60 + Math.floor(Math.random() * 30);
    const comp = 45 + Math.floor(Math.random() * 30);
    const opp = 55 + Math.floor(Math.random() * 30);
    const local = 20 + Math.floor(Math.random() * 25);
    result.push({
      tag: `#${tag}`,
      groupType: 'trending',
      popularityScore: pop,
      competitionScore: comp,
      opportunityScore: opp,
      localRelevanceScore: local,
      overallScore: calcOverall(pop, comp, opp, local),
      estimatedPosts: postCountForGroup('trending'),
      trendDirection: 'rising',
    });
  }

  const industryLabel = industry.replace(/_/g, ' ');
  const goalLabel = goal.replace(/_/g, ' ');

  return {
    hashtags: result,
    strategyNotes: `Your ${result.length}-hashtag strategy is optimized for ${goalLabel} in the ${industryLabel} space${locationCity ? ` (${locationCity})` : ''}. Niche tags reduce competition while local tags add geographic precision. Post consistently for best results.`,
    platformTip: PLATFORM_TIPS[platform] ?? PLATFORM_TIPS.instagram,
    postingRecommendation: POSTING_RECOMMENDATIONS[platform] ?? POSTING_RECOMMENDATIONS.instagram,
  };
}

// ─────────────────────────────────────────────
// Content Assistant Engine
// ─────────────────────────────────────────────

const TONES: Record<string, string> = {
  professional: 'authoritative and knowledgeable',
  casual: 'friendly and conversational',
  inspirational: 'motivational and uplifting',
  educational: 'informative and helpful',
  humorous: 'light-hearted and witty',
};

const CAPTION_TEMPLATES: Record<string, string[]> = {
  real_estate: [
    "🏡 Just listed! {topic} — this one checks every box. DM me for a private showing before it's gone.",
    "The market moves fast. Here's what you need to know about {topic} right now. 👇",
    "Dream homes don't wait. Take a look at this incredible {topic}. Link in bio for full details.",
    "Thinking about {topic}? Here are 3 things every buyer should know before making an offer. 🔑",
  ],
  default: [
    "Here's what you need to know about {topic}. Save this for later! 💡",
    "Let's talk about {topic} — because this is something everyone should understand. 👇",
    "Breaking down {topic} in the simplest way possible. Share this with someone who needs to see it!",
    "{topic} — are you making the most of it? Here's how to level up. 🚀",
  ],
};

function generateContent(topic: string, platform: string, industry: string, tone: string): {
  caption: string;
  hashtags: string[];
  seoKeywords: string[];
  postingSchedule: string;
} {
  const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
  const templates = CAPTION_TEMPLATES[industry] ?? CAPTION_TEMPLATES.default;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const caption = template.replace(/{topic}/g, topic);

  const industryTags = (INDUSTRY_HASHTAGS[industry] ?? INDUSTRY_HASHTAGS.default).slice(0, 6);
  const topicTags = [`#${topicSlug}`, `#${topicSlug}tips`, `#${topicSlug}101`];
  const platformTags = platform === 'tiktok' ? ['#fyp', '#foryou'] : platform === 'instagram' ? ['#reels', '#explore'] : ['#trending'];

  const allHashtags = [...new Set([...topicTags, ...industryTags.map(t => `#${t}`), ...platformTags])].slice(0, 15);

  const seoKeywords = [
    topic,
    `${topic} tips`,
    `${topic} for beginners`,
    `best ${topic}`,
    `how to ${topic}`,
    `${topic} guide`,
    `${topic} strategy`,
  ];

  const schedule = POSTING_RECOMMENDATIONS[platform] ?? POSTING_RECOMMENDATIONS.instagram;

  return { caption, hashtags: allHashtags, seoKeywords, postingSchedule: schedule };
}

// ─────────────────────────────────────────────
// Express Routes
// ─────────────────────────────────────────────

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ── Auth: resolve Clerk user to DB user ──
  async function resolveUser(req: any): Promise<{ id: number } | null> {
    const clerkId = req.headers['x-clerk-user-id'] as string | undefined;
    const email = req.headers['x-clerk-user-email'] as string | undefined;
    const name = req.headers['x-clerk-user-name'] as string | undefined;
    if (clerkId && email) {
      const user = await storage.upsertUserByClerkId(clerkId, email, name ?? email.split('@')[0]);
      return { id: user.id };
    }
    return { id: 1 }; // fallback demo user
  }

  // ── Current user ──
  app.get('/api/me', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const user = await storage.getUser(resolved.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const usage = await storage.getUsageForUser(resolved.id);
    res.json({ ...user, usage });
  });

  // ── Generate hashtags ──
  const generateSchema = z.object({
    locationCity: z.string().optional().default(''),
    locationState: z.string().optional(),
    locationCountry: z.string().default('US'),
    industry: z.string().min(1),
    contentTopic: z.string().min(1),
    platform: z.string().min(1),
    goal: z.string().min(1),
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const usage = await storage.getUsageForUser(resolved.id);
      if (usage.count >= usage.limit) {
        return res.status(429).json({
          error: 'limit_reached',
          message: `You've used all ${usage.limit} generations this month.`,
          plan: usage.plan,
          limit: usage.limit,
          count: usage.count,
        });
      }
      const body = generateSchema.parse(req.body);
      let gen: GenerateResult;
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          gen = await generateHashtagsWithAI(body);
        } catch (aiErr: any) {
          console.warn('AI generation failed, using static fallback:', aiErr.message);
          gen = generateHashtags(body);
        }
      } else {
        gen = generateHashtags(body);
      }

      // Save search
      const search = await storage.createSearch({
        userId: resolved.id,
        locationCity: body.locationCity,
        locationState: body.locationState,
        locationCountry: body.locationCountry,
        industry: body.industry,
        contentTopic: body.contentTopic,
        platform: body.platform,
        goal: body.goal,
        totalHashtags: gen.hashtags.length,
        strategyNotes: gen.strategyNotes,
        platformTip: gen.platformTip,
        postingRecommendation: gen.postingRecommendation,
      });

      // Save hashtags
      const hashtagInserts: InsertHashtag[] = gen.hashtags.map(h => ({
        searchId: search.id,
        userId: resolved.id,
        tag: h.tag,
        groupType: h.groupType,
        popularityScore: h.popularityScore,
        competitionScore: h.competitionScore,
        opportunityScore: h.opportunityScore,
        localRelevanceScore: h.localRelevanceScore,
        overallScore: h.overallScore,
        estimatedPosts: h.estimatedPosts,
        trendDirection: h.trendDirection,
      }));
      const savedHashtags = await storage.createHashtags(hashtagInserts);

      await storage.incrementSearchCount(resolved.id);

      const result = await storage.getSearchResult(search.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Get search result by id ──
  app.get('/api/searches/:id', async (req, res) => {
    const id = Number(req.params.id);
    const result = await storage.getSearchResult(id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  });

  // ── List past searches ──
  app.get('/api/searches', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const searches = await storage.getSearchesByUser(resolved.id, 20);
    res.json(searches);
  });

  // ── Delete a search ──
  app.delete('/api/searches/:id', async (req, res) => {
    await storage.deleteSearch(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Trends ──
  app.get('/api/trends', async (req, res) => {
    const { platform, industry, city } = req.query as Record<string, string>;
    const trends = await storage.getTrends(platform, industry, city);
    res.json(trends);
  });

  // ── Collections ──
  app.get('/api/collections', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const cols = await storage.getCollectionsByUser(resolved.id);
    res.json(cols);
  });

  app.post('/api/collections', async (req, res) => {
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const body = insertCollectionSchema.parse({ ...req.body, userId: resolved.id });
      const col = await storage.createCollection(body);
      res.json(col);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/collections/:id', async (req, res) => {
    await storage.deleteCollection(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get('/api/collections/:id/tags', async (req, res) => {
    const tags = await storage.getTagsInCollection(Number(req.params.id));
    res.json(tags);
  });

  app.post('/api/collections/:id/tags', async (req, res) => {
    try {
      const body = insertCollectionTagSchema.parse({
        ...req.body,
        collectionId: Number(req.params.id),
      });
      const ct = await storage.addTagToCollection(body);
      res.json(ct);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/collection-tags/:id', async (req, res) => {
    await storage.removeTagFromCollection(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Content Assistant ──
  const contentSchema = z.object({
    topic: z.string().min(1),
    platform: z.string().min(1),
    industry: z.string().default('default'),
    tone: z.string().default('professional'),
  });

  app.post('/api/content', async (req, res) => {
    try {
      const body = contentSchema.parse(req.body);
      let content: { caption: string; hashtags: string[]; seoKeywords: string[]; postingSchedule: string };
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          content = await generateContentWithAI(body.topic, body.platform, body.industry, body.tone);
        } catch (aiErr: any) {
          console.warn('AI content generation failed, using static fallback:', aiErr.message);
          content = generateContent(body.topic, body.platform, body.industry, body.tone);
        }
      } else {
        content = generateContent(body.topic, body.platform, body.industry, body.tone);
      }

      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const gen = await storage.createContentGeneration({
        userId: resolved.id,
        topic: body.topic,
        platform: body.platform,
        tone: body.tone,
        caption: content.caption,
        hashtags: JSON.stringify(content.hashtags),
        seoKeywords: JSON.stringify(content.seoKeywords),
        postingSchedule: content.postingSchedule,
      });

      res.json({
        ...gen,
        hashtags: content.hashtags,
        seoKeywords: content.seoKeywords,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/content', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const gens = await storage.getContentGenerationsByUser(resolved.id, 10);
    res.json(gens.map(g => ({
      ...g,
      hashtags: g.hashtags ? JSON.parse(g.hashtags) : [],
      seoKeywords: g.seoKeywords ? JSON.parse(g.seoKeywords) : [],
    })));
  });


  // ── Stripe: Create checkout session ──
  app.post('/api/stripe/checkout', async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const { priceId } = z.object({ priceId: z.string() }).parse(req.body);
      const user = await storage.getUser(resolved.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: String(user.id) },
        });
        customerId = customer.id;
        await storage.updateUserStripe(user.id, { stripeCustomerId: customerId });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL ?? 'https://trendjetter.io'}/#/dashboard?upgrade=success`,
        cancel_url: `${process.env.APP_URL ?? 'https://trendjetter.io'}/#/dashboard?upgrade=cancelled`,
        subscription_data: { metadata: { userId: String(user.id) } },
      });
      res.json({ url: session.url });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Stripe: Customer portal ──
  app.post('/api/stripe/portal', async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const user = await storage.getUser(resolved.id);
      if (!user?.stripeCustomerId) return res.status(400).json({ error: 'No active subscription' });
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.APP_URL ?? 'https://trendjetter.io'}/#/dashboard`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Stripe: Get usage ──
  app.get('/api/usage', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const usage = await storage.getUsageForUser(resolved.id);
    res.json(usage);
  });

  // ── Stripe: Webhook ──
  app.post('/api/stripe/webhook', async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event: Stripe.Event;
    try {
      event = webhookSecret && sig
        ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
        : (req.body as Stripe.Event);
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = (session as any).subscription_data?.metadata?.userId ?? session.metadata?.userId;
          if (userId && session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            const priceId = sub.items.data[0]?.price.id ?? '';
            const plan = PRICE_TO_PLAN[priceId] ?? 'pro';
            await storage.updateUserStripe(Number(userId), {
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
              plan,
            });
          }
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const user = await storage.getUserByStripeCustomerId(sub.customer as string);
          if (user) {
            const priceId = sub.items.data[0]?.price.id ?? '';
            const plan = sub.status === 'active' ? (PRICE_TO_PLAN[priceId] ?? 'pro') : 'free';
            await storage.updateUserStripe(user.id, {
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              stripeCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
              plan,
            });
          }
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const user = await storage.getUserByStripeCustomerId(sub.customer as string);
          if (user) {
            await storage.updateUserStripe(user.id, {
              stripeSubscriptionId: '',
              stripePriceId: '',
              stripeCurrentPeriodEnd: '',
              plan: 'free',
            });
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
