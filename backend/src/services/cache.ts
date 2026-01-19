import { createClient } from 'redis';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Connected to Redis'));

// Connect to Redis
await redisClient.connect();

export class CacheService {
    private static TTL = parseInt(process.env.SCREENSHOT_CACHE_TTL || '3600');

    /**
     * Generate SHA-256 hash of screenshot for cache key
     */
    static generateHash(screenshot: string): string {
        return crypto.createHash('sha256').update(screenshot).digest('hex');
    }

    /**
     * Cache AI analysis results
     */
    static async cacheAnalysis(screenshotHash: string, data: any): Promise<void> {
        try {
            const key = `analysis:${screenshotHash}`;
            await redisClient.setEx(key, this.TTL, JSON.stringify(data));
            console.log(`✅ Cached analysis for hash: ${screenshotHash.substring(0, 8)}...`);
        } catch (error) {
            console.error('❌ Cache write error:', error);
        }
    }

    /**
     * Retrieve cached analysis
     */
    static async getCachedAnalysis(screenshotHash: string): Promise<any | null> {
        try {
            const key = `analysis:${screenshotHash}`;
            const cached = await redisClient.get(key);

            if (cached) {
                console.log(`✅ Cache hit for hash: ${screenshotHash.substring(0, 8)}...`);
                return JSON.parse(cached);
            }

            console.log(`⚠️ Cache miss for hash: ${screenshotHash.substring(0, 8)}...`);
            return null;
        } catch (error) {
            console.error('❌ Cache read error:', error);
            return null;
        }
    }

    /**
     * Cache search results
     */
    static async cacheSearch(query: string, platform: string, data: any): Promise<void> {
        try {
            const key = `search:${platform}:${query.toLowerCase()}`;
            await redisClient.setEx(key, 1800, JSON.stringify(data)); // 30 minutes
            console.log(`✅ Cached search: ${query} on ${platform}`);
        } catch (error) {
            console.error('❌ Cache write error:', error);
        }
    }

    /**
     * Retrieve cached search
     */
    static async getCachedSearch(query: string, platform: string): Promise<any | null> {
        try {
            const key = `search:${platform}:${query.toLowerCase()}`;
            const cached = await redisClient.get(key);

            if (cached) {
                console.log(`✅ Cache hit for search: ${query} on ${platform}`);
                return JSON.parse(cached);
            }

            return null;
        } catch (error) {
            console.error('❌ Cache read error:', error);
            return null;
        }
    }

    /**
     * Track API usage for cost monitoring
     */
    static async trackAPIUsage(endpoint: string, tokensUsed: number, cost: number): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const key = `api_usage:${today}:${endpoint}`;

            await redisClient.hIncrBy(key, 'requests', 1);
            await redisClient.hIncrByFloat(key, 'tokens', tokensUsed);
            await redisClient.hIncrByFloat(key, 'cost', cost);
            await redisClient.expire(key, 86400 * 30); // Keep for 30 days
        } catch (error) {
            console.error('❌ API usage tracking error:', error);
        }
    }

    /**
     * Get API usage statistics
     */
    static async getAPIUsage(date?: string): Promise<any> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const pattern = `api_usage:${targetDate}:*`;
            const keys = await redisClient.keys(pattern);

            const usage: any = {};

            for (const key of keys) {
                const endpoint = key.split(':')[2];
                const data = await redisClient.hGetAll(key);
                usage[endpoint] = {
                    requests: parseInt(data.requests || '0'),
                    tokens: parseFloat(data.tokens || '0'),
                    cost: parseFloat(data.cost || '0'),
                };
            }

            return usage;
        } catch (error) {
            console.error('❌ API usage retrieval error:', error);
            return {};
        }
    }

    /**
     * Clear all cache
     */
    static async clearCache(): Promise<void> {
        try {
            await redisClient.flushDb();
            console.log('✅ Cache cleared');
        } catch (error) {
            console.error('❌ Cache clear error:', error);
        }
    }
}

export default redisClient;
