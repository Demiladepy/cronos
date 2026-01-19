import { AnalyzeRequest, AnalyzeResponse, ProductListing } from '../types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export class AIAnalysisService {
    /**
     * Analyze screenshot and extract products
     */
    static async analyzeProductPage(
        screenshotBase64: string,
        platform?: string
    ): Promise<AnalyzeResponse> {
        try {
            const request: AnalyzeRequest = {
                screenshot: screenshotBase64,
                platform,
            };

            const response = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to analyze screenshot');
            }

            const data: AnalyzeResponse = await response.json();

            // Convert date strings to Date objects
            data.products = data.products.map((product) => ({
                ...product,
                extractedAt: new Date(product.extractedAt),
            }));

            return data;
        } catch (error) {
            console.error('❌ AI Analysis error:', error);
            throw error;
        }
    }

    /**
     * Generate summary text for voice feedback
     */
    static generateSummary(products: ProductListing[]): string {
        if (products.length === 0) {
            return 'No products found in the screenshot. Please try a different image.';
        }

        const count = products.length;
        const prices = products.map((p) => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const cheapest = products.find((p) => p.price === minPrice);

        let summary = `I found ${count} product${count > 1 ? 's' : ''}. `;

        if (cheapest) {
            summary += `The cheapest is ${cheapest.name} at ${cheapest.currency} ${cheapest.price.toLocaleString()} from ${cheapest.seller}. `;
        }

        if (count > 1) {
            summary += `Prices range from ${products[0].currency} ${minPrice.toLocaleString()} to ${maxPrice.toLocaleString()}. `;
        }

        const inStock = products.filter((p) => p.availability === 'in_stock').length;
        if (inStock < count) {
            summary += `${inStock} of ${count} are currently in stock. `;
        }

        return summary;
    }

    /**
     * Format product for voice announcement
     */
    static formatProductForVoice(product: ProductListing): string {
        let text = `${product.name}. `;
        text += `Price: ${product.currency} ${product.price.toLocaleString()}. `;

        if (product.shipping) {
            text += `Shipping: ${product.currency} ${product.shipping.toLocaleString()}. `;
        } else {
            text += `Free shipping. `;
        }

        text += `Seller: ${product.seller}. `;

        if (product.rating) {
            text += `Rating: ${product.rating} out of 5 stars. `;
        }

        text += `${product.availability === 'in_stock' ? 'In stock' : 'Out of stock'}. `;

        return text;
    }
}
