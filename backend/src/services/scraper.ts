import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ProductListing } from '../types/index.js';
import { CacheService } from './cache.js';

interface ScraperConfig {
    timeout?: number;
    retries?: number;
    userAgent?: string;
}

const DEFAULT_CONFIG: ScraperConfig = {
    timeout: 10000,
    retries: 3,
    userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

// Platform registry for dynamic scraping
interface PlatformScraper {
    name: string;
    url: string;
    selector: string;
    currency: string;
    requiresJS?: boolean; // If true, use Puppeteer instead of axios+cheerio
    extractor: (element: any, $: any) => Partial<ProductListing> | null;
}

export class WebScraper {
    private static readonly PLATFORMS: { [key: string]: PlatformScraper } = {
        amazon: {
            name: 'amazon',
            url: 'https://www.amazon.com/s?k=',
            selector: '[data-component-type="s-search-result"]',
            currency: 'USD',
            requiresJS: false,
            extractor: WebScraper.extractAmazonProduct,
        },
        jumia: {
            name: 'jumia',
            url: 'https://www.jumia.com.ng/catalog/?q=',
            selector: '.prd',
            currency: 'NGN',
            requiresJS: false,
            extractor: WebScraper.extractJumiaProduct,
        },
        konga: {
            name: 'konga',
            url: 'https://www.konga.com/search?query=',
            selector: '.product-item, .productItem',
            currency: 'NGN',
            requiresJS: false,
            extractor: WebScraper.extractKongaProduct,
        },
        ebay: {
            name: 'ebay',
            url: 'https://www.ebay.com/sch/i.html?_nkw=',
            selector: '.s-item',
            currency: 'USD',
            requiresJS: false,
            extractor: WebScraper.extractEbayProduct,
        },
        aliexpress: {
            name: 'aliexpress',
            url: 'https://www.aliexpress.com/wholesale?SearchText=',
            selector: '.organic-item, .search-item-card',
            currency: 'USD',
            requiresJS: true, // AliExpress loads content with JavaScript
            extractor: WebScraper.extractAliExpressProduct,
        },
        walmart: {
            name: 'walmart',
            url: 'https://www.walmart.com/search/?query=',
            selector: '[data-item-id]',
            currency: 'USD',
            requiresJS: true, // Walmart uses dynamic loading
            extractor: WebScraper.extractWalmartProduct,
        },
        bestbuy: {
            name: 'bestbuy',
            url: 'https://www.bestbuy.com/site/searchpage.jsp?st=',
            selector: '.sku-item',
            currency: 'USD',
            requiresJS: true, // Best Buy has dynamic content
            extractor: WebScraper.extractBestBuyProduct,
        },
        etsy: {
            name: 'etsy',
            url: 'https://www.etsy.com/search?q=',
            selector: '.v2-listing-card',
            currency: 'USD',
            requiresJS: true, // Etsy uses JavaScript for content loading
            extractor: WebScraper.extractEtsyProduct,
        },
        target: {
            name: 'target',
            url: 'https://www.target.com/s?searchTerm=',
            selector: '[data-test="@web/ProductCard"]',
            currency: 'USD',
            requiresJS: true, // Target uses dynamic rendering
            extractor: WebScraper.extractTargetProduct,
        },
    };

    private static browser: any = null;

    
    private static async getBrowser() {
        if (!this.browser) {
            try {
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage', // Prevent memory issues
                        '--disable-gpu',
                    ],
                });
                console.log('🌐 Puppeteer browser initialized');
            } catch (error) {
                console.error('❌ Failed to initialize Puppeteer:', error);
                throw error;
            }
        }
        return this.browser;
    }

    
    static async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close();
                this.browser = null;
                console.log('✅ Puppeteer browser closed');
            } catch (error) {
                console.error('❌ Error closing browser:', error);
            }
        }
    }

    /**
     * Scrape with Puppeteer (for JavaScript-heavy sites)
     */
    private static async scrapeWithPuppeteer(
        url: string,
        selector: string,
        config: ScraperConfig = DEFAULT_CONFIG
    ): Promise<string> {
        let page: any = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();

            // Set user agent
            await page.setUserAgent(config.userAgent || DEFAULT_CONFIG.userAgent!);

            // Navigate with timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: config.timeout || 10000,
            });

            // Wait for selector to appear
            await page.waitForSelector(selector, { timeout: 5000 }).catch(() => {
                console.warn(`⚠️ Selector not found, using page content anyway`);
            });

            // Get page content
            const content = await page.content();
            return content;
        } catch (error: any) {
            console.error('❌ Puppeteer scraping error:', error.message);
            throw error;
        } finally {
            if (page) {
                await page.close().catch(() => {});
            }
        }
    }

    private static async fetchWithRetry(
        url: string,
        config: ScraperConfig = DEFAULT_CONFIG,
        retryCount = 0
    ): Promise<string> {
        try {
            const response = await axios.get(url, {
                timeout: config.timeout,
                headers: {
                    'User-Agent': config.userAgent,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    Connection: 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
            });
            return response.data;
        } catch (error: any) {
            if (retryCount < (config.retries || 3)) {
                console.log(`Retry ${retryCount + 1}/${config.retries} for ${url}`);
                await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.fetchWithRetry(url, config, retryCount + 1);
            }
            throw error;
        }
    }

    private static parsePrice(priceText: string): number {
        const cleaned = priceText
            .replace(/[^\d.,]/g, '')
            .replace(/,/g, '')
            .split('.')[0];

        const price = parseFloat(cleaned);
        return isNaN(price) ? 0 : price;
    }

    /**
     * Generic scraper for any platform
     */
    private static async genericScrape(
        platform: string,
        query: string,
        maxResults = 10
    ): Promise<ProductListing[]> {
        try {
            const config = this.PLATFORMS[platform.toLowerCase()];
            if (!config) {
                throw new Error(`Platform ${platform} not supported`);
            }

            // Check cache first
            const cached = await CacheService.getCachedSearch(query, platform);
            if (cached) {
                console.log(`📦 Using cached ${platform} results`);
                return cached.products;
            }

            console.log(`🔍 Scraping ${platform} for: ${query}`);

            const searchUrl = config.url + encodeURIComponent(query);
            
            // Choose scraping method based on platform requirements
            let html: string;
            if (config.requiresJS) {
                console.log(`  ↳ Using Puppeteer (JavaScript required)`);
                html = await this.scrapeWithPuppeteer(searchUrl, config.selector);
            } else {
                console.log(`  ↳ Using axios+cheerio (static HTML)`);
                html = await this.fetchWithRetry(searchUrl);
            }

            const $ = cheerio.load(html);

            const products: ProductListing[] = [];

            $(config.selector).each((index, element) => {
                if (products.length >= maxResults) return;

                try {
                    const product = config.extractor(element, $);
                    if (product && product.name && product.price) {
                        products.push({
                            name: product.name || '',
                            price: product.price || 0,
                            currency: config.currency,
                            seller: product.seller || config.name,
                            rating: product.rating || null,
                            reviewCount: product.reviewCount || 0,
                            availability: product.availability || 'in_stock',
                            shipping: product.shipping || null,
                            url: product.url || null,
                            platform: config.name,
                            imageUrl: product.imageUrl,
                            extractedAt: new Date(),
                        });
                    }
                } catch (error) {
                    console.error(`Error parsing ${platform} product:`, error);
                }
            });

            // Cache results
            if (products.length > 0) {
                await CacheService.cacheSearch(query, platform, products);
            }

            console.log(`✅ Scraped ${products.length} products from ${platform}`);
            return products;
        } catch (error: any) {
            console.error(`❌ ${platform} scraping error:`, error.message);
            return [];
        }
    }

    private static extractAmazonProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('h2 a span').text().trim();
            let priceText = $el.find('.a-price-whole').first().text().trim();
            const price = this.parsePrice(priceText);
            const ratingText = $el.find('.a-icon-star-small span').first().text().trim();
            const rating = parseFloat(ratingText) || null;
            const url = $el.find('h2 a').attr('href');

            return {
                name,
                price,
                rating,
                url: url ? `https://www.amazon.com${url}` : null,
                seller: 'Amazon',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractJumiaProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('.prd-name').text().trim();
            let priceText = $el.find('.prd-price .prc').text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a').attr('href');

            return {
                name,
                price,
                url: url ? (url.startsWith('http') ? url : `https://www.jumia.com.ng${url}`) : null,
                seller: $el.find('.seller-name').text().trim() || 'Jumia',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractKongaProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('.product-title, .productTitle').text().trim();
            let priceText = $el.find('.product-price, .productPrice').first().text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a').attr('href');

            return {
                name,
                price,
                url: url ? (url.startsWith('http') ? url : `https://www.konga.com${url}`) : null,
                seller: $el.find('[class*="seller"]').text().trim() || 'Konga',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractEbayProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('.s-item__title').text().trim();
            let priceText = $el.find('.s-item__price').first().text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a.s-item__link').attr('href');
            const ratingText = $el.find('.s-item__reviews-count').text().match(/\d+/)?.[0];
            const rating = ratingText ? parseFloat(ratingText) / 20 : null;

            return {
                name,
                price,
                rating,
                url,
                seller: $el.find('.s-item__seller').text().trim() || 'eBay',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractAliExpressProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('a.organic-item-offer').text().trim();
            let priceText = $el.find('.organic-price, .search-card-e-price-main').text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a').attr('href');
            const ratingText = $el.find('.organic-recommend, .search-card-e-starRating__rate').text().match(/\d+(?:\.\d+)?/)?.[0];
            const rating = ratingText ? parseFloat(ratingText) : null;

            return {
                name,
                price,
                rating,
                url: url ? (url.startsWith('http') ? url : `https://www.aliexpress.com${url}`) : null,
                seller: $el.find('[class*="seller"]').text().trim() || 'AliExpress',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractWalmartProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('[data-testid="productTitle"]').text().trim();
            let priceText = $el.find('[data-testid="listPrice"]').text().trim();
            if (!priceText) {
                priceText = $el.find('.pricing').text().trim();
            }
            const price = this.parsePrice(priceText);
            const url = $el.find('a[href*="/ip/"]').attr('href');

            return {
                name,
                price,
                url: url ? `https://www.walmart.com${url}` : null,
                seller: 'Walmart',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractBestBuyProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('[class*="title"]').text().trim();
            let priceText = $el.find('[aria-hidden="true"]').first().text().trim();
            if (!priceText) {
                priceText = $el.find('[data-testid*="price"]').text().trim();
            }
            const price = this.parsePrice(priceText);
            const url = $el.find('a[href*="/product/"]').attr('href');
            const ratingText = $el.find('[aria-label*="rating"]').text().match(/\d+(?:\.\d+)?/)?.[0];
            const rating = ratingText ? parseFloat(ratingText) : null;

            return {
                name,
                price,
                rating,
                url: url ? `https://www.bestbuy.com${url}` : null,
                seller: 'Best Buy',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractEtsyProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('a[data-etsy-link*="title"]').attr('title') || $el.find('a h2').text().trim();
            let priceText = $el.find('[data-etsy-link*="price"] .currency-symbol').parent().text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a[href*="/listing/"]').attr('href');
            const ratingText = $el.find('.star-rating').text().match(/\d+(?:\.\d+)?/)?.[0];
            const rating = ratingText ? parseFloat(ratingText) : null;

            return {
                name,
                price,
                rating,
                url: url ? (url.startsWith('http') ? url : `https://www.etsy.com${url}`) : null,
                seller: $el.find('[class*="shop"]').text().trim() || 'Etsy',
            };
        } catch (error) {
            return null;
        }
    }

    private static extractTargetProduct(element: any, $: any): Partial<ProductListing> | null {
        try {
            const $el = $(element);
            const name = $el.find('span[data-test="product-title"]').text().trim();
            let priceText = $el.find('[data-test*="price"]').first().text().trim();
            const price = this.parsePrice(priceText);
            const url = $el.find('a[href*="/p/"]').attr('href');
            const ratingText = $el.find('[data-test*="rating"]').text().match(/\d+(?:\.\d+)?/)?.[0];
            const rating = ratingText ? parseFloat(ratingText) : null;

            return {
                name,
                price,
                rating,
                url: url ? `https://www.target.com${url}` : null,
                seller: 'Target',
            };
        } catch (error) {
            return null;
        }
    }

    // ============ PUBLIC API METHODS ============

    /**
     * Scrape a specific platform
     */
    static async scrape(platform: string, query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape(platform, query, maxResults);
    }

    /**
     * Scrape Amazon
     */
    static async scrapeAmazon(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('amazon', query, maxResults);
    }

    /**
     * Scrape Jumia
     */
    static async scrapeJumia(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('jumia', query, maxResults);
    }

    /**
     * Scrape Konga
     */
    static async scrapeKonga(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('konga', query, maxResults);
    }

    /**
     * Scrape eBay
     */
    static async scrapeEbay(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('ebay', query, maxResults);
    }

    /**
     * Scrape AliExpress
     */
    static async scrapeAliExpress(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('aliexpress', query, maxResults);
    }

    /**
     * Scrape Walmart
     */
    static async scrapeWalmart(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('walmart', query, maxResults);
    }

    /**
     * Scrape Best Buy
     */
    static async scrapeBestBuy(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('bestbuy', query, maxResults);
    }

    /**
     * Scrape Etsy
     */
    static async scrapeEtsy(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('etsy', query, maxResults);
    }

    /**
     * Scrape Target
     */
    static async scrapeTarget(query: string, maxResults = 10): Promise<ProductListing[]> {
        return this.genericScrape('target', query, maxResults);
    }

    /**
     * Get all supported platforms
     */
    static getSupportedPlatforms(): string[] {
        return Object.keys(this.PLATFORMS);
    }

    /**
     * Scrape multiple platforms in parallel
     */
    static async scrapeMultiplePlatforms(
        query: string,
        platforms?: string[],
        maxResults = 10
    ): Promise<Map<string, ProductListing[]>> {
        const targetPlatforms = platforms || this.getSupportedPlatforms();
        const results = new Map<string, ProductListing[]>();

        const promises = targetPlatforms.map(async (platform) => {
            try {
                const products = await this.genericScrape(platform, query, maxResults);
                results.set(platform, products);
            } catch (error) {
                console.error(`Failed to scrape ${platform}:`, error);
                results.set(platform, []);
            }
        });

        await Promise.all(promises);

        return results;
    }
}
