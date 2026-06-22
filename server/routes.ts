import type { Express } from 'express';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { storage } from './storage';
import { insertSearchSchema, insertCollectionSchema, insertCollectionTagSchema, insertContentGenerationSchema } from '@shared/schema';
import type { InsertHashtag } from '@shared/schema';
import { z } from 'zod';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-05-28.basil' as any })
  : null;

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRO_PRICE_ID         ?? 'price_pro']:          'pro',
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID  ?? 'price_pro_annual']:   'pro',
  [process.env.STRIPE_AGENCY_PRICE_ID      ?? 'price_agency']:       'agency',
  [process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID ?? 'price_agency_ann']: 'agency',
};

// ─────────────────────────────────────────────
// Claude AI Engine — primary hashtag generator
// ─────────────────────────────────────────────

interface GenerateInput {
  hashtagCount?: number;
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
  momentum: string;
  confidenceLevel: 'high' | 'medium' | 'estimated';
}

interface GenerateResult {
  hashtags: GeneratedHashtag[];
  strategyNotes: string;
  platformTip: string;
  postingRecommendation: string;
}

async function generateHashtagsWithAI(input: GenerateInput): Promise<GenerateResult> {
  const { locationCity, locationState, industry, contentTopic, platform, goal, hashtagCount = 30 } = input;
  const location = [locationCity, locationState].filter(Boolean).join(', ');

  // Platform-specific intelligence context
  const platformContext: Record<string, string> = {
    instagram: `Instagram (mid-2026): Reels dominate reach. Carousel posts (3–7 slides) outperform single images. Algorithm heavily favors saves and shares. Hashtag sweet spot is 5–10 per post. Avoid overused mega-tags (100M+ posts) — they bury content instantly. Niche and micro-community tags (10K–500K posts) are the highest-ROI play right now. Trending formats: aesthetic tutorials, day-in-the-life, transformation content, POV storytelling.`,
    tiktok: `TikTok (mid-2026): For You Page algorithm prioritizes watch-time and replays. Hashtags categorize content for seeding to the right feeds — 3–5 per video is optimal. Niche creator communities (#BookTok, #FoodTok, #FitTok) have massive engaged sub-audiences. Trending: silent vlogs, duet reactions, hot takes, before/after reveals, 60-second educational breakdowns. Trending sound + relevant hashtag = compound discovery.`,
    youtube: `YouTube (mid-2026): Hashtags appear above the title. 3 shown above title, up to 15 in description. They influence search and related video recommendations. Shorts hashtags work similarly to TikTok. Best practice: 1 broad category tag, 1 niche topic tag, 1 trending/timely tag.`,
    linkedin: `LinkedIn (mid-2026): 3–5 hashtags per post is the professional sweet spot. Trending: AI productivity, career pivots, remote work evolution, B2B SaaS, leadership. Algorithm favors posts that generate early comments within first hour. Niche industry hashtags (5K–50K followers) outperform mega-tags.`,
    facebook: `Facebook (mid-2026): Hashtags matter less here. 1–3 max. More important for Groups and Reels content. Focus on community and local discovery tags.`,
    twitter: `X/Twitter (mid-2026): 1–2 hashtags per tweet max. Most powerful for joining live conversations, trending topics, and events. Focus on timely, conversational tags over evergreen ones.`,
  };

  const platformGuide = platformContext[platform.toLowerCase()] || platformContext['instagram'];

  const prompt = `You are TrendJetter's AI scoring engine — a world-class social media hashtag intelligence system used by thousands of creators to decide which hashtags to use this week. Be accurate, specific, and opinionated.

CREATOR CONTEXT:
- Platform: ${platform}
- Industry: ${industry.replace(/_/g, ' ')}
- Content Topic: ${contentTopic}
- Goal: ${goal.replace(/_/g, ' ')}
${location ? `- Location: ${location}` : ''}

PLATFORM INTELLIGENCE (calibrate your scores to this):
${platformGuide}

SCORING METHODOLOGY:
- popularityScore (0-100): How widely used is this tag? 90+ = mega tag (100M+ posts), 70-89 = major (10M-100M), 50-69 = mid-tier (1M-10M), 30-49 = niche (100K-1M), <30 = micro/emerging (<100K)
- competitionScore (0-100): How hard is it to get discovered via this tag? High = post drowns fast. Factors: post volume velocity, influencer saturation, top content quality bar.
- opportunityScore (0-100): The real alpha. Low competition + growing interest + underserved niche = high opportunity. This is what separates smart creators from the pack.
- localRelevanceScore (0-100): Geographic specificity. 0 = global, 99 = hyper-local.
- overallScore = round((popularityScore*0.2) + ((100-competitionScore)*0.3) + (opportunityScore*0.3) + (localRelevanceScore*0.2))

CONFIDENCE LEVELS — be honest:
- "high": Established tag with clear usage patterns you can reason about confidently
- "medium": Recognizable patterns but momentum is harder to pin down precisely
- "estimated": Emerging or platform-specific tag where you're extrapolating from signals

MOMENTUM (3-6 words max): The specific reason this tag is moving RIGHT NOW. Be concrete and vivid:
- "viral transformation challenge format"
- "post-algorithm niche content spike"
- "summer listing season surge"
- "AI productivity conversation peak"
- "evergreen established community anchor"

Return ONLY valid JSON (no markdown, no explanation):
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
      "trendDirection": "rising",
      "momentum": "short reason phrase",
      "confidenceLevel": "high"
    }
  ],
  "strategyNotes": "2-3 sentence strategy tailored to this creator and platform",
  "platformTip": "one specific, actionable tip for this platform right now",
  "postingRecommendation": "best posting times and frequency for this platform"
}

SCORE DISTRIBUTION REQUIREMENT — this is critical:
You MUST produce hashtags that span all 7 verdict tiers. Use these overallScore targets as a guide:
- 2-3 tags should score 88-100 (Viral Potential) — only truly breakout tags earn this
- 4-5 tags should score 75-87 (Use Now) — strong, actionable picks
- 6-8 tags should score 62-74 (Strong Pick) — solid, recommended
- 6-8 tags should score 48-61 (Good Filler) — decent supporting tags
- 4-6 tags should score 35-47 (Situational) — use only if highly relevant
- 2-3 tags should score 20-34 (Low Reach) — real tags that are oversaturated or too obscure
- 1-2 tags should score 0-19 (Skip) — tags that genuinely hurt discoverability

Do NOT give everything scores of 40-70. Be opinionated. A mega-tag with 500M posts and brutal competition should score LOW (15-30 overallScore). A perfect niche tag with rising momentum should score HIGH (85-95).

Generate exactly ${hashtagCount} hashtags across 5 groups (${Math.floor(hashtagCount / 5)} per group):
- ${Math.floor(hashtagCount / 5)} high_volume: dominant industry tags with massive reach — brutal competition means most score 20-50 overallScore despite high popularity. Be honest about saturation.
- 6 medium: smart creator backbone — moderate everything, most score 48-68 overallScore
- 6 niche: hidden alpha — low competition + high opportunity = highest scores in the set, target 62-90 overallScore
- 6 local: ${location ? `hyper-local tags for ${location} — city name combos, neighborhood tags, local community tags` : 'tight creator community tags — creator sub-niches, topic communities, topic+tips combos. No year numbers in tags.'} Score varies widely 35-85 based on actual local community size.
- ${Math.floor(hashtagCount / 5)} trending: this week's fastest-rising tags for ${platform} in the ${industry.replace(/_/g, ' ')} space — platform-native, current, no year numbers. For Instagram/TikTok: viral formats, challenges, seasonal moments. For LinkedIn: professional conversation trends. All must have trendDirection "rising", opportunityScore 55-80, confidenceLevel "medium" or "estimated". Score 55-95 based on momentum strength.

trendDirection must be one of: "rising", "stable", "declining"
All tags start with #. No year numbers in hashtags. Use real hashtags creators actually use.`;

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
  if (platform === 'tiktok') trendPool.push('fyp', 'foryoupage', 'viral', 'tiktoktrend', 'trending2026', 'foryourpage');
  if (platform === 'instagram') trendPool.push('reels', 'instadaily', 'instagood', 'explore', 'instareels', 'trending');
  if (platform === 'linkedin') trendPool.push('linkedin', 'linkedinlearning', 'professionaldevelopment', 'careertips', 'leadership', 'innovation');
  if (platform === 'youtube') trendPool.push('youtube', 'youtubetrending', 'shorts', 'youtubecommunity', 'subscribe', 'newvideo');
  if (platform === 'facebook') trendPool.push('facebook', 'facebookreels', 'community', 'facebooklive', 'socialmedia', 'trending');
  if (platform === 'x') trendPool.push('trending', 'viral', 'twitter', 'xapp', 'thread', 'twittertrends');
  const trendTagSet = trendPool.slice(0, 6);
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
  const platformTags = platform === 'tiktok' ? ['#fyp', '#foryou', '#viral'] : platform === 'instagram' ? ['#reels', '#explore', '#instadaily'] : platform === 'linkedin' ? ['#linkedin', '#careertips', '#leadership'] : platform === 'youtube' ? ['#youtube', '#shorts', '#subscribe'] : platform === 'facebook' ? ['#facebook', '#community', '#facebookreels'] : ['#trending', '#viral', '#explore'];

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

// ── Rate limiters ────────────────────────────────────────────────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 generations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment before generating again.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,            // 120 general API calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
});

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
    // No Clerk ID — return null (no demo user fallback)
    return null;
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

  // ── Usage (lightweight, for generator pill) ──
  app.get('/api/usage', async (req, res) => {
    const resolved = await resolveUser(req);
    if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
    const usage = await storage.getUsageForUser(resolved.id);
    res.json(usage);
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

  app.post('/api/generate', generateLimiter, async (req, res) => {
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const usage = await storage.getUsageForUser(resolved.id);
      if (usage.count >= usage.limit) {
        return res.status(429).json({
          error: 'limit_reached',
          message: `You've used all ${usage.limit} searches this month. Upgrade to Pro for 1,000/month.`,
          plan: usage.plan,
          limit: usage.limit,
          count: usage.count,
        });
      }
      const body = generateSchema.parse(req.body);
      const hashtagCount = (usage.plan === 'free') ? 10 : 30;
      let gen: GenerateResult;
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          gen = await generateHashtagsWithAI({ ...body, hashtagCount });
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
        postingSchedule: {
          platform: body.platform,
          bestTimes: ['9:00 AM', '12:00 PM', '6:00 PM'],
          frequency: '3-5x per week',
          tips: content.postingSchedule,
        },
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
  app.post('/api/stripe/checkout', apiLimiter, async (req, res) => {
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
        success_url: `${process.env.APP_URL ?? 'https://www.trendjetter.io'}/#/dashboard`,
        cancel_url: `${process.env.APP_URL ?? 'https://www.trendjetter.io'}/#/dashboard`,
        subscription_data: { metadata: { userId: String(user.id) } },
      });
      res.json({ url: session.url });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Stripe: Customer portal ──
  app.post('/api/stripe/portal', apiLimiter, async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    try {
      const resolved = await resolveUser(req);
      if (!resolved) return res.status(401).json({ error: 'Unauthorized' });
      const user = await storage.getUser(resolved.id);
      if (!user?.stripeCustomerId) return res.status(400).json({ error: 'No active subscription' });
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.APP_URL ?? 'https://www.trendjetter.io'}/#/dashboard`,
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
    if (!webhookSecret || !sig) {
      return res.status(400).json({ error: 'Webhook signature missing — cannot process unsigned events.' });
    }
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
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
