// Supabase-backed storage — works in all serverless environments (no native binaries).
// Pure HTTP client: scales horizontally, persists across cold starts, handles concurrent users.

import type {
  User, InsertUser,
  Search, InsertSearch,
  Hashtag, InsertHashtag,
  Collection, InsertCollection,
  CollectionTag, InsertCollectionTag,
  TrendRecord,
  ContentGeneration, InsertContentGeneration,
  VoiceProfile, InsertVoiceProfile,
  SearchResult
} from '@shared/schema';
import supabase from './supabase';
import { sendWelcomeEmail } from './email';

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 1000, agency: 5000 };

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUserByClerkId(clerkId: string, email: string, name: string): Promise<User>;
  updateUserPlan(id: number, plan: string): Promise<User | undefined>;
  updateUserStripe(id: number, data: { stripeCustomerId?: string; stripeSubscriptionId?: string; stripePriceId?: string; stripeCurrentPeriodEnd?: string; plan?: string }): Promise<User | undefined>;
  incrementSearchCount(userId: number): Promise<void>;
  checkAndResetMonthlyUsage(userId: number): Promise<void>;
  getUsageForUser(userId: number): Promise<{ count: number; limit: number; plan: string }>;

  createSearch(search: InsertSearch): Promise<Search>;
  getSearch(id: number): Promise<Search | undefined>;
  getSearchesByUser(userId: number, limit?: number): Promise<Search[]>;
  getSearchResult(id: number): Promise<SearchResult | undefined>;
  deleteSearch(id: number): Promise<void>;

  createHashtags(tags: InsertHashtag[]): Promise<Hashtag[]>;
  getHashtagsBySearch(searchId: number): Promise<Hashtag[]>;
  getHashtagsByUser(userId: number, limit?: number): Promise<Hashtag[]>;

  createCollection(col: InsertCollection): Promise<Collection>;
  getCollectionsByUser(userId: number): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<void>;
  updateCollectionTagCount(id: number, delta: number): Promise<void>;

  addTagToCollection(ct: InsertCollectionTag): Promise<CollectionTag>;
  getTagsInCollection(collectionId: number): Promise<CollectionTag[]>;
  removeTagFromCollection(id: number): Promise<void>;

  getTrends(platform?: string, industry?: string, city?: string): Promise<TrendRecord[]>;
  getTrendsAge(platform: string, industry: string): Promise<Date | null>;
  upsertTrendBatch(records: Omit<TrendRecord, 'id' | 'createdAt'>[]): Promise<void>;

  createContentGeneration(gen: InsertContentGeneration): Promise<ContentGeneration>;
  getContentGenerationsByUser(userId: number, limit?: number): Promise<ContentGeneration[]>;

  getVoiceProfile(userId: number): Promise<VoiceProfile | undefined>;
  upsertVoiceProfile(profile: InsertVoiceProfile & { userId: number }): Promise<VoiceProfile>;
  deleteVoiceProfile(userId: number): Promise<void>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function toUser(row: any): User {
  return {
    id: row.id,
    clerkId: row.clerk_id ?? null,
    email: row.email,
    name: row.name,
    plan: row.plan,
    searchesThisMonth: row.searches_this_month,
    usageResetAt: row.usage_reset_at ?? new Date().toISOString(),
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    stripePriceId: row.stripe_price_id ?? null,
    stripeCurrentPeriodEnd: row.stripe_current_period_end ?? null,
    avatar: row.avatar ?? null,
    createdAt: row.created_at,
  };
}

function toSearch(row: any): Search {
  return {
    id: row.id,
    userId: row.user_id,
    locationCity: row.location_city,
    locationState: row.location_state ?? null,
    locationCountry: row.location_country,
    industry: row.industry,
    contentTopic: row.content_topic,
    platform: row.platform,
    goal: row.goal,
    totalHashtags: row.total_hashtags,
    strategyNotes: row.strategy_notes ?? null,
    platformTip: row.platform_tip ?? null,
    postingRecommendation: row.posting_recommendation ?? null,
    createdAt: row.created_at,
  };
}

function toHashtag(row: any): Hashtag {
  return {
    id: row.id,
    searchId: row.search_id,
    userId: row.user_id,
    tag: row.tag,
    groupType: row.group_type,
    popularityScore: row.popularity_score,
    competitionScore: row.competition_score,
    opportunityScore: row.opportunity_score,
    localRelevanceScore: row.local_relevance_score,
    overallScore: row.overall_score,
    estimatedPosts: row.estimated_posts ?? null,
    trendDirection: row.trend_direction,
  };
}

function toCollection(row: any): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? null,
    platform: row.platform ?? null,
    tagCount: row.tag_count,
    createdAt: row.created_at,
  };
}

function toCollectionTag(row: any): CollectionTag {
  return {
    id: row.id,
    collectionId: row.collection_id,
    hashtagId: row.hashtag_id,
    tag: row.tag,
    addedAt: row.added_at,
  };
}

function toTrendRecord(row: any): TrendRecord {
  return {
    id: row.id,
    tag: row.tag,
    platform: row.platform,
    industry: row.industry ?? null,
    locationCity: row.location_city ?? null,
    trendScore: row.trend_score,
    velocity: row.velocity,
    estimatedPosts: row.estimated_posts ?? null,
    recordedAt: row.recorded_at,
  };
}

function toContentGeneration(row: any): ContentGeneration {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    platform: row.platform,
    tone: row.tone,
    caption: row.caption ?? null,
    hashtags: row.hashtags ?? null,
    seoKeywords: row.seo_keywords ?? null,
    postingSchedule: row.posting_schedule ?? null,
    createdAt: row.created_at,
  };
}

// ── Storage class ─────────────────────────────────────────────────────────────

export class SupabaseStorage implements IStorage {

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_id: (user as any).clerkId ?? null,
        email: user.email,
        name: user.name,
        plan: user.plan ?? 'free',
        searches_this_month: user.searchesThisMonth ?? 0,
        usage_reset_at: new Date().toISOString(),
        avatar: user.avatar ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createUser failed: ${error?.message}`);
    return toUser(data);
  }

  // Create or update user from Clerk auth — called on every authenticated request
  async upsertUserByClerkId(clerkId: string, email: string, name: string): Promise<User> {
    const existing = await this.getUserByClerkId(clerkId);
    if (existing) return existing;
    // Check by email in case user existed before Clerk
    const byEmail = await this.getUserByEmail(email);
    if (byEmail) {
      await supabase.from('users').update({ clerk_id: clerkId }).eq('id', byEmail.id);
      return { ...byEmail, clerkId };
    }
    const newUser = await this.createUser({ email, name, plan: 'free', searchesThisMonth: 0, clerkId } as any);
    // Fire welcome email asynchronously — never block sign-up
    sendWelcomeEmail(email, name).catch(() => {});
    return newUser;
  }

  async updateUserPlan(id: number, plan: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update({ plan })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async updateUserStripe(id: number, stripeData: { stripeCustomerId?: string; stripeSubscriptionId?: string; stripePriceId?: string; stripeCurrentPeriodEnd?: string; plan?: string }): Promise<User | undefined> {
    const update: any = {};
    if (stripeData.stripeCustomerId !== undefined) update.stripe_customer_id = stripeData.stripeCustomerId;
    if (stripeData.stripeSubscriptionId !== undefined) update.stripe_subscription_id = stripeData.stripeSubscriptionId;
    if (stripeData.stripePriceId !== undefined) update.stripe_price_id = stripeData.stripePriceId;
    if (stripeData.stripeCurrentPeriodEnd !== undefined) update.stripe_current_period_end = stripeData.stripeCurrentPeriodEnd;
    if (stripeData.plan !== undefined) update.plan = stripeData.plan;
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) return undefined;
    return toUser(data);
  }

  async incrementSearchCount(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    await supabase
      .from('users')
      .update({ searches_this_month: user.searchesThisMonth + 1 })
      .eq('id', userId);
  }

  async checkAndResetMonthlyUsage(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    const resetAt = new Date(user.usageResetAt);
    const now = new Date();
    const daysSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReset >= 30) {
      await supabase.from('users').update({
        searches_this_month: 0,
        usage_reset_at: now.toISOString(),
      }).eq('id', userId);
    }
  }

  async getUsageForUser(userId: number): Promise<{ count: number; limit: number; plan: string }> {
    await this.checkAndResetMonthlyUsage(userId);
    const user = await this.getUser(userId);
    if (!user) return { count: 0, limit: 3, plan: 'free' };
    const limit = PLAN_LIMITS[user.plan] ?? 3;
    return { count: user.searchesThisMonth, limit, plan: user.plan };
  }

  // ── Searches ───────────────────────────────────────────────────────────────

  async createSearch(search: InsertSearch): Promise<Search> {
    const { data, error } = await supabase
      .from('searches')
      .insert({
        user_id: search.userId,
        location_city: search.locationCity,
        location_state: search.locationState ?? null,
        location_country: search.locationCountry ?? 'US',
        industry: search.industry,
        content_topic: search.contentTopic,
        platform: search.platform,
        goal: search.goal,
        total_hashtags: search.totalHashtags ?? 0,
        strategy_notes: search.strategyNotes ?? null,
        platform_tip: search.platformTip ?? null,
        posting_recommendation: search.postingRecommendation ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createSearch failed: ${error?.message}`);
    return toSearch(data);
  }

  async getSearch(id: number): Promise<Search | undefined> {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return toSearch(data);
  }

  async getSearchesByUser(userId: number, limit = 20): Promise<Search[]> {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(toSearch);
  }

  async getSearchResult(id: number): Promise<SearchResult | undefined> {
    const search = await this.getSearch(id);
    if (!search) return undefined;
    const tags = await this.getHashtagsBySearch(id);
    const groups: SearchResult['hashtagGroups'] = {
      high_volume: [],
      medium: [],
      niche: [],
      local: [],
      trending: [],
    };
    for (const t of tags) {
      const g = t.groupType as keyof typeof groups;
      if (groups[g]) groups[g].push(t);
    }
    return { ...search, hashtagGroups: groups };
  }

  async deleteSearch(id: number): Promise<void> {
    await supabase.from('searches').delete().eq('id', id);
  }

  // ── Hashtags ───────────────────────────────────────────────────────────────

  async createHashtags(tags: InsertHashtag[]): Promise<Hashtag[]> {
    if (tags.length === 0) return [];
    const rows = tags.map(tag => ({
      search_id: tag.searchId,
      user_id: tag.userId,
      tag: tag.tag,
      group_type: tag.groupType,
      popularity_score: tag.popularityScore ?? 50,
      competition_score: tag.competitionScore ?? 50,
      opportunity_score: tag.opportunityScore ?? 50,
      local_relevance_score: tag.localRelevanceScore ?? 50,
      overall_score: tag.overallScore ?? 50,
      estimated_posts: tag.estimatedPosts ?? null,
      trend_direction: tag.trendDirection ?? 'stable',
    }));
    const { data, error } = await supabase
      .from('hashtags')
      .insert(rows)
      .select();
    if (error || !data) throw new Error(`createHashtags failed: ${error?.message}`);
    return data.map(toHashtag);
  }

  async getHashtagsBySearch(searchId: number): Promise<Hashtag[]> {
    const { data, error } = await supabase
      .from('hashtags')
      .select('*')
      .eq('search_id', searchId);
    if (error || !data) return [];
    return data.map(toHashtag);
  }

  async getHashtagsByUser(userId: number, limit = 50): Promise<Hashtag[]> {
    const { data, error } = await supabase
      .from('hashtags')
      .select('*')
      .eq('user_id', userId)
      .limit(limit);
    if (error || !data) return [];
    return data.map(toHashtag);
  }

  // ── Collections ────────────────────────────────────────────────────────────

  async createCollection(col: InsertCollection): Promise<Collection> {
    const { data, error } = await supabase
      .from('collections')
      .insert({
        user_id: col.userId,
        name: col.name,
        description: col.description ?? null,
        platform: col.platform ?? null,
        tag_count: 0,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createCollection failed: ${error?.message}`);
    return toCollection(data);
  }

  async getCollectionsByUser(userId: number): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });
    if (error || !data) return [];
    return data.map(toCollection);
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return undefined;
    return toCollection(data);
  }

  async deleteCollection(id: number): Promise<void> {
    await supabase.from('collections').delete().eq('id', id);
  }

  async updateCollectionTagCount(id: number, delta: number): Promise<void> {
    const col = await this.getCollection(id);
    if (!col) return;
    await supabase
      .from('collections')
      .update({ tag_count: Math.max(0, col.tagCount + delta) })
      .eq('id', id);
  }

  // ── Collection Tags ────────────────────────────────────────────────────────

  async addTagToCollection(ct: InsertCollectionTag): Promise<CollectionTag> {
    const { data, error } = await supabase
      .from('collection_tags')
      .insert({
        collection_id: ct.collectionId,
        hashtag_id: ct.hashtagId,
        tag: ct.tag,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`addTagToCollection failed: ${error?.message}`);
    await this.updateCollectionTagCount(ct.collectionId, 1);
    return toCollectionTag(data);
  }

  async getTagsInCollection(collectionId: number): Promise<CollectionTag[]> {
    const { data, error } = await supabase
      .from('collection_tags')
      .select('*')
      .eq('collection_id', collectionId);
    if (error || !data) return [];
    return data.map(toCollectionTag);
  }

  async removeTagFromCollection(id: number): Promise<void> {
    const { data } = await supabase
      .from('collection_tags')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      await supabase.from('collection_tags').delete().eq('id', id);
      await this.updateCollectionTagCount(data.collection_id, -1);
    }
  }

  // ── Trends ─────────────────────────────────────────────────────────────────

  async getTrends(platform?: string, industry?: string, city?: string, limit = 20): Promise<TrendRecord[]> {
    let query = supabase
      .from('trend_records')
      .select('*')
      .order('trend_score', { ascending: false })
      .limit(limit);
    if (platform) query = query.eq('platform', platform);
    if (industry) query = query.eq('industry', industry);
    if (city)     query = query.eq('location_city', city);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(toTrendRecord);
  }

  async getTrendsAge(platform: string, industry: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('trend_records')
      .select('refreshed_at')
      .eq('platform', platform)
      .eq('industry', industry)
      .order('refreshed_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) return null;
    return new Date((data as any).refreshed_at);
  }

  async upsertTrendBatch(records: Omit<TrendRecord, 'id' | 'createdAt'>[]): Promise<void> {
    // Delete existing records for this platform+industry combo then insert fresh
    if (records.length === 0) return;
    const { platform, industry } = records[0];
    await supabase
      .from('trend_records')
      .delete()
      .eq('platform', platform)
      .eq('industry', industry ?? '');
    const rows = records.map(r => ({
      tag: r.tag,
      platform: r.platform,
      industry: r.industry ?? null,
      trend_score: r.trendScore,
      velocity: r.velocity ?? null,
      estimated_posts: r.estimatedPosts ?? null,
      location_city: r.locationCity ?? null,
      location_state: r.locationState ?? null,
      refreshed_at: new Date().toISOString(),
    }));
    // Insert new rows first, THEN delete old ones — avoids empty gap
    const { error } = await supabase.from('trend_records').insert(rows);
    if (error) throw new Error(`upsertTrendBatch failed: ${error.message}`);
    await supabase
      .from('trend_records')
      .delete()
      .eq('platform', platform)
      .eq('industry', industry ?? '')
      .lt('refreshed_at', new Date().toISOString().slice(0, 19));
  }

  // ── Content Generations ────────────────────────────────────────────────────

  async createContentGeneration(gen: InsertContentGeneration): Promise<ContentGeneration> {
    const { data, error } = await supabase
      .from('content_generations')
      .insert({
        user_id: gen.userId,
        topic: gen.topic,
        platform: gen.platform,
        tone: gen.tone ?? 'professional',
        caption: gen.caption ?? null,
        hashtags: gen.hashtags ?? null,
        seo_keywords: gen.seoKeywords ?? null,
        posting_schedule: gen.postingSchedule ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error(`createContentGeneration failed: ${error?.message}`);
    return toContentGeneration(data);
  }

  async getContentGenerationsByUser(userId: number, limit = 10): Promise<ContentGeneration[]> {
    const { data, error } = await supabase
      .from('content_generations')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map(toContentGeneration);
  }

  async getVoiceProfile(userId: number): Promise<VoiceProfile | undefined> {
    const { data, error } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return undefined;
    return toVoiceProfile(data);
  }

  async upsertVoiceProfile(profile: InsertVoiceProfile & { userId: number }): Promise<VoiceProfile> {
    const { data, error } = await supabase
      .from('voice_profiles')
      .upsert({
        user_id: profile.userId,
        sample_posts: profile.samplePosts,
        primary_platform: profile.primaryPlatform,
        content_style: profile.contentStyle,
        audience: profile.audience,
        vibe_word: profile.vibeWord,
        voice_summary: profile.voiceSummary ?? null,
        voice_traits: profile.voiceTraits ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error || !data) throw new Error(`upsertVoiceProfile failed: ${error?.message}`);
    return toVoiceProfile(data);
  }

  async deleteVoiceProfile(userId: number): Promise<void> {
    const { error } = await supabase
      .from('voice_profiles')
      .delete()
      .eq('user_id', userId);
    if (error) throw new Error(`deleteVoiceProfile failed: ${error.message}`);
  }
}

function toVoiceProfile(row: any): VoiceProfile {
  return {
    id: row.id,
    userId: row.user_id,
    samplePosts: row.sample_posts ?? '',
    primaryPlatform: row.primary_platform ?? 'instagram',
    contentStyle: row.content_style ?? 'mix',
    audience: row.audience ?? 'general',
    vibeWord: row.vibe_word ?? 'real',
    voiceSummary: row.voice_summary ?? null,
    voiceTraits: row.voice_traits ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const storage = new SupabaseStorage();
