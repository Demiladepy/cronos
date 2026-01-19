import express from 'express';
import { TrackClickRequest, TrackClickResponse } from '../types/index.js';
import pool from '../db/pool.js';

const router = express.Router();

// Affiliate commission rates by platform (%)
const COMMISSION_RATES: Record<string, number> = {
    amazon: 3.0,
    jumia: 5.0,
    konga: 4.0,
    ebay: 2.5,
    aliexpress: 8.0,
};

/**
 * POST /api/track-click
 * Track affiliate click and return affiliate URL
 */
router.post('/', async (req, res, next) => {
    try {
        const { productUrl, userId, platform, productName, price }: TrackClickRequest = req.body;

        if (!productUrl || !platform) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'productUrl and platform are required',
                statusCode: 400,
            });
        }

        // Generate affiliate URL
        const affiliateUrl = generateAffiliateUrl(productUrl, platform);

        // Calculate estimated commission
        const commissionRate = COMMISSION_RATES[platform.toLowerCase()] || 0;
        const estimatedCommission = price ? (price * commissionRate) / 100 : 0;

        // Track click in database
        try {
            await pool.query(
                `INSERT INTO affiliate_clicks 
         (user_id, product_url, platform, product_name, price, estimated_commission, clicked_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [userId || null, productUrl, platform, productName || null, price || null, estimatedCommission]
            );
        } catch (dbError) {
            console.error('⚠️ Failed to track click:', dbError);
            // Don't fail the request if tracking fails
        }

        const response: TrackClickResponse = {
            affiliateUrl,
            estimatedCommission,
            tracked: true,
        };

        res.json(response);
    } catch (error: any) {
        next(error);
    }
});

/**
 * GET /api/track-click/stats
 * Get affiliate click statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let query = `
      SELECT 
        platform,
        COUNT(*) as clicks,
        SUM(estimated_commission) as total_commission,
        AVG(price) as avg_price
      FROM affiliate_clicks
      WHERE 1=1
    `;

        const params: any[] = [];

        if (startDate) {
            params.push(startDate);
            query += ` AND clicked_at >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND clicked_at <= $${params.length}`;
        }

        query += ` GROUP BY platform ORDER BY total_commission DESC`;

        const result = await pool.query(query, params);

        res.json({
            stats: result.rows,
            period: {
                start: startDate || 'all time',
                end: endDate || 'now',
            },
        });
    } catch (error: any) {
        next(error);
    }
});

/**
 * Generate affiliate URL based on platform
 */
function generateAffiliateUrl(productUrl: string, platform: string): string {
    const affiliateIds: Record<string, string> = {
        amazon: process.env.AMAZON_AFFILIATE_ID || 'blindbargain-20',
        jumia: process.env.JUMIA_AFFILIATE_ID || 'blindbargain',
    };

    const affiliateId = affiliateIds[platform.toLowerCase()];

    if (!affiliateId) {
        return productUrl; // Return original URL if no affiliate ID
    }

    try {
        const url = new URL(productUrl);

        switch (platform.toLowerCase()) {
            case 'amazon':
                url.searchParams.set('tag', affiliateId);
                break;
            case 'jumia':
                url.searchParams.set('affid', affiliateId);
                break;
            default:
                // For other platforms, append as generic parameter
                url.searchParams.set('ref', affiliateId);
        }

        return url.toString();
    } catch (error) {
        console.error('❌ Invalid URL:', productUrl);
        return productUrl;
    }
}

export default router;
