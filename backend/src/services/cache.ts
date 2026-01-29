import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// In-memory storage
const memoryCache = new Map<string, { value: any; expiresAt: number }>();
const apiUsageData = new Map<string, Map<string, number>>();

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
            const expiresAt = Date.now() + this.TTL * 1000;
            memoryCache.set(key, { value: data, expiresAt });
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
            const cached = memoryCache.get(key);

            if (!cached) {
                console.log(`⚠️ Cache miss for hash: ${screenshotHash.substring(0, 8)}...`);
                return null;
            }

            // Check if expired
            if (Date.now() > cached.expiresAt) {
                memoryCache.delete(key);
                console.log(`⚠️ Cache expired for hash: ${screenshotHash.substring(0, 8)}...`);
                return null;
            }

            console.log(`✅ Cache hit for hash: ${screenshotHash.substring(0, 8)}...`);
            return cached.value;
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
            const expiresAt = Date.now() + 1800 * 1000; // 30 minutes
            memoryCache.set(key, { value: data, expiresAt });
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
            const cached = memoryCache.get(key);

            if (!cached) {
                return null;
            }

            // Check if expired
            if (Date.now() > cached.expiresAt) {
                memoryCache.delete(key);
                return null;
            }

            console.log(`✅ Cache hit for search: ${query} on ${platform}`);
            return cached.value;
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

            if (!apiUsageData.has(key)) {
                apiUsageData.set(key, new Map());
            }

            const usage = apiUsageData.get(key)!;
            usage.set('requests', (usage.get('requests') || 0) + 1);
            usage.set('tokens', (usage.get('tokens') || 0) + tokensUsed);
            usage.set('cost', (usage.get('cost') || 0) + cost);

            console.log(`📊 API Usage tracked: ${endpoint}`);
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
            const usage: any = {};

            for (const [key, data] of apiUsageData.entries()) {
                if (key.includes(targetDate)) {
                    const endpoint = key.split(':')[2];
                    usage[endpoint] = {
                        requests: data.get('requests') || 0,
                        tokens: data.get('tokens') || 0,
                        cost: data.get('cost') || 0,
                    };
                }
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
            memoryCache.clear();
            apiUsageData.clear();
            console.log('✅ Cache cleared');
        } catch (error) {
            console.error('❌ Cache clear error:', error);
        }
    }

    /**
     * Get cache stats (for debugging)
     */
    static getStats(): { cacheSize: number; apiUsageRecords: number; cacheKeys: string[] } {
        return {
            cacheSize: memoryCache.size,
            apiUsageRecords: apiUsageData.size,
            cacheKeys: Array.from(memoryCache.keys())
        };
    }
}

// Default export for compatibility
export default CacheService;