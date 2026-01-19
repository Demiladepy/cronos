import express from 'express';
import { CacheService } from '../services/cache.js';

const router = express.Router();

/**
 * GET /api/admin/usage
 * Get API usage statistics for today
 */
router.get('/usage', async (req, res, next) => {
    try {
        const usage = await CacheService.getAPIUsage();

        res.json({
            timestamp: new Date().toISOString(),
            usage
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/clear-cache
 * Clear all Redis cache
 */
router.post('/clear-cache', async (req, res, next) => {
    try {
        await CacheService.clearCache();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
