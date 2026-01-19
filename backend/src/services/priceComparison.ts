import { ProductListing } from '../types/index.js';

interface ScoringWeights {
    price: number;
    trust: number;
    shipping: number;
    availability: number;
}

export class PriceComparisonEngine {
    private static readonly DEFAULT_WEIGHTS: ScoringWeights = {
        price: 0.5,
        trust: 0.3,
        shipping: 0.15,
        availability: 0.05,
    };

    /**
     * Find the best deal from a list of products
     */
    static findBestDeal(listings: ProductListing[]): ProductListing | null {
        if (listings.length === 0) return null;

        // Filter out unavailable products
        const available = this.filterAvailable(listings);
        if (available.length === 0) return null;

        // Remove scam listings
        const legitimate = this.detectScams(available);
        if (legitimate.length === 0) return available[0]; // Return best available if all flagged

        // Calculate scores for each listing
        const scored = legitimate.map((listing) => ({
            listing,
            score: this.calculateScore(listing, legitimate),
        }));

        // Sort by score (higher is better)
        scored.sort((a, b) => b.score - a.score);

        return scored[0].listing;
    }

    /**
     * Calculate score for a product listing
     * Higher score = better deal
     */
    static calculateScore(
        listing: ProductListing,
        allListings: ProductListing[] = []
    ): number {
        const weights = this.DEFAULT_WEIGHTS;

        // Price score (normalized, inverted - lower price = higher score)
        const priceScore = this.calculatePriceScore(listing, allListings);

        // Trust score (based on rating and review count)
        const trustScore = this.calculateTrustScore(listing);

        // Shipping score (lower shipping = higher score)
        const shippingScore = this.calculateShippingScore(listing, allListings);

        // Availability score
        const availabilityScore = this.calculateAvailabilityScore(listing);

        const totalScore =
            priceScore * weights.price +
            trustScore * weights.trust +
            shippingScore * weights.shipping +
            availabilityScore * weights.availability;

        return totalScore;
    }

    /**
     * Calculate price score (0-100)
     */
    private static calculatePriceScore(
        listing: ProductListing,
        allListings: ProductListing[]
    ): number {
        if (allListings.length === 0) return 50;

        const prices = allListings.map((l) => l.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        if (minPrice === maxPrice) return 100;

        // Invert: lower price = higher score
        const normalized = (maxPrice - listing.price) / (maxPrice - minPrice);
        return normalized * 100;
    }

    /**
     * Calculate trust score based on rating and reviews (0-100)
     */
    private static calculateTrustScore(listing: ProductListing): number {
        const rating = listing.rating || 0;
        const reviewCount = listing.reviewCount || 0;

        // Rating component (0-5 -> 0-70)
        const ratingScore = (rating / 5) * 70;

        // Review count component (0-30)
        // Logarithmic scale: more reviews = better, but diminishing returns
        const reviewScore = Math.min(30, Math.log10(reviewCount + 1) * 10);

        return ratingScore + reviewScore;
    }

    /**
     * Calculate shipping score (0-100)
     */
    private static calculateShippingScore(
        listing: ProductListing,
        allListings: ProductListing[]
    ): number {
        const shipping = listing.shipping || 0;

        // Free shipping = 100
        if (shipping === 0) return 100;

        if (allListings.length === 0) return 50;

        const shippingCosts = allListings
            .map((l) => l.shipping || 0)
            .filter((s) => s > 0);

        if (shippingCosts.length === 0) return 100;

        const maxShipping = Math.max(...shippingCosts);
        const minShipping = Math.min(...shippingCosts);

        if (minShipping === maxShipping) return 50;

        // Invert: lower shipping = higher score
        const normalized = (maxShipping - shipping) / (maxShipping - minShipping);
        return normalized * 100;
    }

    /**
     * Calculate availability score (0-100)
     */
    private static calculateAvailabilityScore(listing: ProductListing): number {
        switch (listing.availability) {
            case 'in_stock':
                return 100;
            case 'preorder':
                return 50;
            case 'out_of_stock':
                return 0;
            default:
                return 0;
        }
    }

    /**
     * Detect and filter out suspicious listings
     */
    static detectScams(listings: ProductListing[]): ProductListing[] {
        if (listings.length === 0) return [];

        const prices = listings.map((l) => l.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = this.calculateStdDev(prices, avgPrice);

        return listings.filter((listing) => {
            // Flag 1: Price too good to be true (more than 2 std dev below average)
            const priceTooLow = listing.price < avgPrice - 2 * stdDev && avgPrice > 0;

            // Flag 2: No rating or very low rating with high price
            const suspiciousRating =
                (!listing.rating || listing.rating < 2) && listing.price > avgPrice;

            // Flag 3: Perfect rating with no reviews
            const fakeRating =
                listing.rating === 5 && (!listing.reviewCount || listing.reviewCount < 5);

            // Flag 4: Seller name contains suspicious keywords
            const suspiciousSeller = this.hasSuspiciousSellerName(listing.seller);

            const scamScore =
                (priceTooLow ? 1 : 0) +
                (suspiciousRating ? 1 : 0) +
                (fakeRating ? 1 : 0) +
                (suspiciousSeller ? 1 : 0);

            // Filter out if 2 or more red flags
            return scamScore < 2;
        });
    }

    /**
     * Check for suspicious seller names
     */
    private static hasSuspiciousSellerName(seller: string): boolean {
        const suspiciousKeywords = [
            'wholesale',
            'dropship',
            'replica',
            'fake',
            'copy',
            'imitation',
            'clone',
        ];

        const lowerSeller = seller.toLowerCase();
        return suspiciousKeywords.some((keyword) => lowerSeller.includes(keyword));
    }

    /**
     * Calculate standard deviation
     */
    private static calculateStdDev(values: number[], mean: number): number {
        const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
        const avgSquaredDiff =
            squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    /**
     * Filter available products only
     */
    static filterAvailable(listings: ProductListing[]): ProductListing[] {
        return listings.filter((listing) => listing.availability === 'in_stock');
    }

    /**
     * Sort listings by various criteria
     */
    static sortBy(
        listings: ProductListing[],
        criteria: 'price' | 'rating' | 'total_cost'
    ): ProductListing[] {
        const sorted = [...listings];

        switch (criteria) {
            case 'price':
                return sorted.sort((a, b) => a.price - b.price);

            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            case 'total_cost':
                return sorted.sort((a, b) => {
                    const totalA = a.price + (a.shipping || 0);
                    const totalB = b.price + (b.shipping || 0);
                    return totalA - totalB;
                });

            default:
                return sorted;
        }
    }

    /**
     * Calculate total cost including shipping
     */
    static calculateTotalCost(listing: ProductListing): number {
        return listing.price + (listing.shipping || 0);
    }

    /**
     * Compare two products and explain the difference
     */
    static compareProducts(
        product1: ProductListing,
        product2: ProductListing
    ): string {
        const total1 = this.calculateTotalCost(product1);
        const total2 = this.calculateTotalCost(product2);
        const savings = Math.abs(total1 - total2);

        const cheaper = total1 < total2 ? product1 : product2;
        const expensive = total1 < total2 ? product2 : product1;

        let explanation = `${cheaper.seller} is ${cheaper.currency} ${savings.toFixed(2)} cheaper than ${expensive.seller}. `;

        if (cheaper.rating && expensive.rating) {
            const ratingDiff = Math.abs(cheaper.rating - expensive.rating);
            if (ratingDiff > 0.5) {
                explanation += `However, ${expensive.seller} has a ${ratingDiff.toFixed(1)} point higher rating. `;
            }
        }

        return explanation;
    }

    /**
     * Get summary statistics for a list of products
     */
    static getSummaryStats(listings: ProductListing[]): {
        count: number;
        avgPrice: number;
        minPrice: number;
        maxPrice: number;
        avgRating: number;
        inStock: number;
    } {
        if (listings.length === 0) {
            return {
                count: 0,
                avgPrice: 0,
                minPrice: 0,
                maxPrice: 0,
                avgRating: 0,
                inStock: 0,
            };
        }

        const prices = listings.map((l) => l.price);
        const ratings = listings.map((l) => l.rating || 0).filter((r) => r > 0);

        return {
            count: listings.length,
            avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            avgRating: ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : 0,
            inStock: listings.filter((l) => l.availability === 'in_stock').length,
        };
    }
}
