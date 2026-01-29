import express from 'express';
import { WebScraper } from '../services/scraper.js';
import pool from '../db/pool.js';

const router = express.Router();


router.get('/platforms', (req, res) => {
    const platforms = WebScraper.getSupportedPlatforms();
    res.json({
        platforms,
        count: platforms.length,
        timestamp: new Date(),
    });
});

router.get('/:platform/:query', async (req, res, next) => {
    try {
        const { platform, query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const supportedPlatforms = WebScraper.getSupportedPlatforms();

        if (!supportedPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                error: 'Unsupported platform',
                message: `Platform "${platform}" is not supported. Available: ${supportedPlatforms.join(', ')}`,
                supportedPlatforms,
            });
        }

        console.log(`🔍 Scraping ${platform} for: ${query}`);

        const products = await WebScraper.scrape(platform, decodeURIComponent(query), maxResults);

        res.json({
            platform,
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/amazon/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeAmazon(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'amazon',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});

router.get('/ebay/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeEbay(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'ebay',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/aliexpress/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeAliExpress(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'aliexpress',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});

router.get('/jumia/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeJumia(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'jumia',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/konga/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeKonga(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'konga',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/walmart/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeWalmart(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'walmart',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/bestbuy/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeBestBuy(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'bestbuy',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});

router.get('/etsy/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeEtsy(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'etsy',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/target/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const products = await WebScraper.scrapeTarget(decodeURIComponent(query), maxResults);

        res.json({
            platform: 'target',
            query,
            products,
            count: products.length,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.post('/all/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const { platforms: customPlatforms } = req.body || {};

        console.log(`🔍 Scraping all platforms for: ${query}`);

        const results = await WebScraper.scrapeMultiplePlatforms(
            decodeURIComponent(query),
            customPlatforms,
            maxResults
        );

        const response = {
            query,
            platforms: Array.from(results.entries()).map(([platform, products]) => ({
                platform,
                count: products.length,
                products,
            })),
            totalProducts: Array.from(results.values()).reduce((sum, products) => sum + products.length, 0),
            timestamp: new Date(),
        };

        res.json(response);
    } catch (error: any) {
        next(error);
    }
});


router.get('/all/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        const maxResults = parseInt(req.query.limit as string) || 20;
        const platformsParam = req.query.platforms as string;
        const customPlatforms = platformsParam ? platformsParam.split(',') : undefined;

        console.log(`🔍 Scraping all platforms for: ${query}`);

        const results = await WebScraper.scrapeMultiplePlatforms(
            decodeURIComponent(query),
            customPlatforms,
            maxResults
        );

        const response = {
            query,
            platforms: Array.from(results.entries()).map(([platform, products]) => ({
                platform,
                count: products.length,
                products,
            })),
            totalProducts: Array.from(results.values()).reduce((sum, products) => sum + products.length, 0),
            timestamp: new Date(),
        };

        res.json(response);
    } catch (error: any) {
        next(error);
    }
});


router.get('/recent', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const platform = req.query.platform as string | undefined;

        let query = `
            SELECT id, product_name, price, currency, seller, rating, 
                   review_count, platform, product_url, scraped_at
            FROM scraped_products
        `;

        const params: any[] = [];

        if (platform) {
            query += ` WHERE platform = $1`;
            params.push(platform);
        }

        query += ` ORDER BY scraped_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.json({
            count: result.rows.length,
            products: result.rows,
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});


router.get('/stats', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                platform,
                COUNT(*) as total_products,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(rating) as avg_rating,
                COUNT(DISTINCT seller) as unique_sellers,
                MAX(scraped_at) as last_scraped
            FROM scraped_products
            GROUP BY platform
            ORDER BY total_products DESC
        `);

        res.json({
            stats: result.rows,
            totalProducts: result.rows.reduce((sum, row) => sum + parseInt(row.total_products), 0),
            timestamp: new Date(),
        });
    } catch (error: any) {
        next(error);
    }
});

export default router;
