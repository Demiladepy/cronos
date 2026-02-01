import express, { Request, Response } from 'express';
import WebScraper from '../services/scraper.js'; 

const router = express.Router();
const scraper = new WebScraper(); 

/**
 * @route   GET /api/scrape/all/:query
 * @desc    Scrapes multiple platforms in parallel and returns the top 5 results per platform.
 */
router.get('/all/:query', async (req: Request, res: Response) => {
    // 1. Extract and decode the query
    const { query } = req.params;
    const decodedQuery = decodeURIComponent(query);

    console.log(`🚀 BlindBargain Search Initiated: "${decodedQuery}"`);

    try {
        // 2. CALL THE SERVICE ORCHESTRATOR
        // Your WebScraper service handles the worker threads and Promise.all internally.
        const data = await scraper.scrapeMultiplePlatforms(decodedQuery);

        // 3. FILTER & CAP: Process results to only return the top 5 for the Voice Agent
        const platformResults = data.platforms.map((item: any) => ({
            platform: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
            count: Math.min(item.products.length, 4),
            products: item.products.slice(0, 4), 
        }));

        const totalFound = platformResults.reduce((acc, curr) => acc + curr.count, 0);

        console.log(`✅ Search complete for "${decodedQuery}". Found ${totalFound} items.`);

        // 4. Return the response
        return res.json({
            query: decodedQuery,
            totalResults: totalFound,
            platforms: platformResults,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error(`❌ Route Error for query "${decodedQuery}":`, error.message);
        
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: 'Scraping Failed', 
                message: error.message || 'An unexpected error occurred.' 
            });
        }
    }
});

export default router;