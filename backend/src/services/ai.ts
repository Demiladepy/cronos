import OpenAI from 'openai';
import dotenv from 'dotenv';
import { ProductListing } from '../types/index.js';
import { CacheService } from './cache.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const VISION_MODEL = process.env.OPENAI_MODEL || 'gpt-4-vision-preview';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class AIAnalysisService {
    /**
     * Analyze product page screenshot using GPT-4 Vision
     */
    static async analyzeProductPage(
        screenshotBase64: string,
        retryCount = 0
    ): Promise<ProductListing[]> {
        try {
            console.log(`🔍 Analyzing screenshot (attempt ${retryCount + 1}/${MAX_RETRIES})...`);

            const prompt = `Extract ALL product listings from this screenshot. For each product:
- name: Full product name
- price: Numeric value only (extract the number)
- currency: Currency code (NGN, USD, EUR, etc.)
- seller: Seller name or store
- rating: Star rating as a number (0-5), or null if not visible
- availability: "in_stock" or "out_of_stock" or "preorder"
- shipping: Shipping cost as a number, or null if not visible

Return ONLY a valid JSON array with no additional text. If you're unsure about any field, use null.
Be precise with prices - extract exact values shown.

Example format:
[
  {
    "name": "iPhone 15 Pro 256GB",
    "price": 450000,
    "currency": "NGN",
    "seller": "TechStore Nigeria",
    "rating": 4.8,
    "availability": "in_stock",
    "shipping": 2500,
    "url": null
  }
]`;

            const startTime = Date.now();

            const response = await openai.chat.completions.create({
                model: VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${screenshotBase64}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 2000,
                temperature: 0.1, // Low temperature for consistent extraction
            });

            const processingTime = Date.now() - startTime;
            const content = response.choices[0]?.message?.content;

            if (!content) {
                throw new Error('No content in OpenAI response');
            }

            // Parse the JSON response
            let products: ProductListing[];
            try {
                // Remove markdown code blocks if present
                const cleanedContent = content
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();

                products = JSON.parse(cleanedContent);
            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', content);
                throw new Error('Invalid JSON response from AI');
            }

            // Validate and enrich products
            products = products.map((product) => ({
                ...product,
                extractedAt: new Date(),
                url: product.url || null,
                rating: product.rating || null,
                shipping: product.shipping || null,
            }));

            // Track API usage
            const tokensUsed = response.usage?.total_tokens || 0;
            const cost = this.calculateCost(tokensUsed);
            await CacheService.trackAPIUsage('analyze', tokensUsed, cost);

            console.log(`✅ Extracted ${products.length} products in ${processingTime}ms`);
            console.log(`💰 Tokens used: ${tokensUsed}, Cost: $${cost.toFixed(4)}`);

            return products;
        } catch (error: any) {
            console.error(`❌ AI Analysis error (attempt ${retryCount + 1}):`, error.message);

            // Handle rate limits (429 errors)
            if (error.status === 429 && retryCount < MAX_RETRIES - 1) {
                const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
                console.log(`⏳ Rate limited. Retrying in ${delay}ms...`);
                await this.sleep(delay);
                return this.analyzeProductPage(screenshotBase64, retryCount + 1);
            }

            // Handle other retryable errors
            if (retryCount < MAX_RETRIES - 1 && this.isRetryableError(error)) {
                await this.sleep(RETRY_DELAY);
                return this.analyzeProductPage(screenshotBase64, retryCount + 1);
            }

            throw new Error(`AI analysis failed: ${error.message}`);
        }
    }

    /**
     * Calculate cost based on tokens used
     * GPT-4 Vision pricing (as of 2024): ~$0.01 per 1K tokens
     */
    private static calculateCost(tokens: number): number {
        const costPer1kTokens = 0.01;
        return (tokens / 1000) * costPer1kTokens;
    }

    /**
     * Check if error is retryable
     */
    private static isRetryableError(error: any): boolean {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(error.status);
    }

    /**
     * Sleep utility for retries
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Validate screenshot format and size
     */
    static validateScreenshot(base64: string): { valid: boolean; error?: string } {
        // Check if it's a valid base64 string
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!base64Regex.test(base64)) {
            return { valid: false, error: 'Invalid base64 format' };
        }

        // Check size (max 20MB for OpenAI)
        const sizeInBytes = (base64.length * 3) / 4;
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (sizeInBytes > maxSize) {
            return { valid: false, error: 'Screenshot too large (max 20MB)' };
        }

        return { valid: true };
    }
}
