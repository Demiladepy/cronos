import express from 'express';
import { AIAnalysisService } from '../services/ai.js';
import { CacheService } from '../services/cache.js';
import { AnalyzeRequest, AnalyzeResponse } from '../types/index.js';
import pool from '../db/pool.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Analyze screenshot and extract product listings
 */
router.post('/', async (req, res, next) => {
    try {
        const { screenshot, platform }: AnalyzeRequest = req.body;

        // Validate request
        if (!screenshot) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Screenshot is required',
                statusCode: 400,
            });
        }

        // Validate screenshot format
        const validation = AIAnalysisService.validateScreenshot(screenshot);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Bad Request',
                message: validation.error,
                statusCode: 400,
            });
        }

        const startTime = Date.now();

        // Generate hash for caching
        const screenshotHash = CacheService.generateHash(screenshot);

        // Check cache first
        const cached = await CacheService.getCachedAnalysis(screenshotHash);
        if (cached) {
            const response: AnalyzeResponse = {
                products: cached.products,
                processingTime: Date.now() - startTime,
                cached: true,
                screenshotHash,
            };
            return res.json(response);
        }

        // Analyze with AI
        const products = await AIAnalysisService.analyzeProductPage(screenshot);

        // Cache the results
        await CacheService.cacheAnalysis(screenshotHash, { products });

        // Save to database (optional - for analytics)
        try {
            await pool.query(
                `INSERT INTO searches (query, results, platform, timestamp)
         VALUES ($1, $2, $3, NOW())`,
                ['screenshot_analysis', JSON.stringify(products), platform || 'unknown']
            );
        } catch (dbError) {
            console.error('⚠️ Failed to save to database:', dbError);
            // Don't fail the request if DB save fails
        }

        const processingTime = Date.now() - startTime;

        const response: AnalyzeResponse = {
            products,
            processingTime,
            cached: false,
            screenshotHash,
        };

        res.json(response);
    } catch (error: any) {
        next(error);
    }
});

export default router;
