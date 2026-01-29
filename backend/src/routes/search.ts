import express from 'express';
import { SearchRequest, SearchResponse, PlatformResult } from '../types/index.js';
import { PriceComparisonEngine } from '../services/priceComparison.js';
import { CacheService } from '../services/cache.js';
import { WebScraper } from '../services/scraper.js';
import pool from '../db/pool.js';
import crypto from 'crypto';

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

        // Scrape each platform
        for (const platform of platforms) {
            try {
                // Check cache first
                const cached = await CacheService.getCachedSearch(productName, platform);

                if (cached) {
                    console.log(`✅ Using cached results for ${platform}`);
                    results.push({
                        platform,
                        products: cached.products,
                        searchTime: 0,
                    });
                    continue;
                }

                // Perform live scraping based on platform
                let products: ProductListing[] = [];
                const platformStartTime = Date.now();

                switch (platform.toLowerCase()) {
                    case 'amazon':
                        products = await WebScraper.scrapeAmazon(productName);
                        break;
                    case 'jumia':
                        products = await WebScraper.scrapeJumia(productName);
                        break;
                    case 'konga':
                        products = await WebScraper.scrapeKonga(productName);
                        break;
                    case 'ebay':
                        products = await WebScraper.scrapeEbay(productName);
                        break;
                    case 'aliexpress':
                        products = await WebScraper.scrapeAliExpress(productName);
                        break;
                    case 'walmart':
                        products = await WebScraper.scrapeWalmart(productName);
                        break;
                    case 'bestbuy':
                        products = await WebScraper.scrapeBestBuy(productName);
                        break;
                    case 'etsy':
                        products = await WebScraper.scrapeEtsy(productName);
                        break;
                    case 'target':
                        products = await WebScraper.scrapeTarget(productName);
                        break;
                    default:
                        // Try generic scrape for any supported platform
                        products = await WebScraper.scrape(platform, productName);
                }

                const platformSearchTime = Date.now() - platformStartTime;

                // Store in database
                if (products.length > 0) {
                    await saveProductsToDatabase(products);
                }

                results.push({
                    platform,
                    products,
                    searchTime: platformSearchTime,
                });
            } catch (error: any) {
                console.error(`❌ Error scraping ${platform}:`, error);
                results.push({
                    platform,
                    products: [],
                    searchTime: Date.now() - startTime,
                    error: error.message || `Failed to scrape ${platform}`,
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
            const bestDealId = bestDeal ? await getProductIdByUrl(bestDeal.url) : null;
            await pool.query(
                `INSERT INTO search_history (search_query, platform, results_count, best_deal_product_id, searched_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [productName, platforms.join(','), filtered.length, bestDealId]
            );
        } catch (dbError) {
            console.error('⚠️ Failed to save search history:', dbError);
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

/**
 * Save products to database
 */
async function saveProductsToDatabase(products: ProductListing[]): Promise<void> {
    for (const product of products) {
        try {
            // Create hash for duplicate detection
            const hash = crypto
                .createHash('sha256')
                .update(`${product.name}${product.price}${product.platform}`)
                .digest('hex');

            await pool.query(
                `INSERT INTO scraped_products 
                 (product_name, price, currency, seller, rating, review_count, 
                  availability, shipping, product_url, platform, image_url, hash, scraped_at, last_updated)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                 ON CONFLICT (hash) DO UPDATE SET last_updated = NOW()`,
                [
                    product.name,
                    product.price,
                    product.currency,
                    product.seller,
                    product.rating,
                    product.reviewCount || 0,
                    product.availability,
                    product.shipping,
                    product.url,
                    product.platform,
                    product.imageUrl,
                    hash,
                ]
            );
        } catch (error: any) {
            console.error('⚠️ Failed to save product:', error.message);
        }
    }
}

/**
 * Get product ID by URL for best deal tracking
 */
async function getProductIdByUrl(url: string | null): Promise<string | null> {
    if (!url) return null;

    try {
        const result = await pool.query(
            `SELECT id FROM scraped_products WHERE product_url = $1 LIMIT 1`,
            [url]
        );
        return result.rows[0]?.id || null;
    } catch (error) {
        console.error('⚠️ Failed to get product ID:', error);
        return null;
    }
}

import { ProductListing } from '../types/index.js';

export default router;
