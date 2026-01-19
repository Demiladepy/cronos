import express from 'express';
import { SearchRequest, SearchResponse, PlatformResult } from '../types/index.js';
import { PriceComparisonEngine } from '../services/priceComparison.js';
import { CacheService } from '../services/cache.js';
import pool from '../db/pool.js';

const router = express.Router();

/**
 * POST /api/search
 * Search for products across multiple platforms
 */
router.post('/', async (req, res, next) => {
    try {
        const { productName, platforms, maxPrice, minRating }: SearchRequest = req.body;

        // Validate request
        if (!productName || !platforms || platforms.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'productName and platforms are required',
                statusCode: 400,
            });
        }

        const startTime = Date.now();
        const results: PlatformResult[] = [];

        // Search each platform
        for (const platform of platforms) {
            try {
                // Check cache first
                const cached = await CacheService.getCachedSearch(productName, platform);

                if (cached) {
                    results.push({
                        platform,
                        products: cached.products,
                        searchTime: 0,
                    });
                    continue;
                }

                // TODO: Implement actual scraping for each platform
                // For now, return mock data
                const platformResult: PlatformResult = {
                    platform,
                    products: [],
                    searchTime: Date.now() - startTime,
                    error: 'Scraping not yet implemented for this platform',
                };

                results.push(platformResult);
            } catch (error: any) {
                results.push({
                    platform,
                    products: [],
                    searchTime: Date.now() - startTime,
                    error: error.message,
                });
            }
        }

        // Combine all products
        const allProducts = results.flatMap((r) => r.products);

        // Apply filters
        let filtered = allProducts;
        if (maxPrice) {
            filtered = filtered.filter((p) => p.price <= maxPrice);
        }
        if (minRating) {
            filtered = filtered.filter((p) => (p.rating || 0) >= minRating);
        }

        // Find best deal
        const bestDeal = PriceComparisonEngine.findBestDeal(filtered);

        // Save search to database
        try {
            await pool.query(
                `INSERT INTO searches (query, results, platform, timestamp)
         VALUES ($1, $2, $3, NOW())`,
                [productName, JSON.stringify(filtered), platforms.join(',')]
            );
        } catch (dbError) {
            console.error('⚠️ Failed to save search:', dbError);
        }

        const response: SearchResponse = {
            results,
            bestDeal,
            totalProducts: filtered.length,
        };

        res.json(response);
    } catch (error: any) {
        next(error);
    }
});

export default router;
