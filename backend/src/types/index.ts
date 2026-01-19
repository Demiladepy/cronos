export interface ProductListing {
    name: string;
    price: number;
    currency: string;
    seller: string;
    rating: number | null;
    reviewCount?: number;
    availability: 'in_stock' | 'out_of_stock' | 'preorder';
    shipping: number | null;
    url: string | null;
    platform?: string;
    imageUrl?: string;
    extractedAt: Date;
}

export interface AnalyzeRequest {
    screenshot: string; // base64 encoded
    platform?: string;
}

export interface AnalyzeResponse {
    products: ProductListing[];
    processingTime: number;
    cached: boolean;
    screenshotHash?: string;
}

export interface SearchRequest {
    productName: string;
    platforms: string[];
    maxPrice?: number;
    minRating?: number;
}

export interface PlatformResult {
    platform: string;
    products: ProductListing[];
    searchTime: number;
    error?: string;
}

export interface SearchResponse {
    results: PlatformResult[];
    bestDeal: ProductListing | null;
    totalProducts: number;
}

export interface CouponData {
    code: string;
    description: string;
    discount: string;
    expiresAt: Date | null;
    verified: boolean;
    store: string;
}

export interface TrackClickRequest {
    productUrl: string;
    userId?: string;
    platform: string;
    productName?: string;
    price?: number;
}

export interface TrackClickResponse {
    affiliateUrl: string;
    estimatedCommission: number;
    tracked: boolean;
}

export interface User {
    id: string;
    email: string | null;
    preferences: UserPreferences;
    createdAt: Date;
}

export interface UserPreferences {
    preferredPlatforms?: string[];
    maxPrice?: number;
    minRating?: number;
    currency?: string;
    notifications?: boolean;
}

export interface Search {
    id: string;
    userId: string | null;
    query: string;
    results: ProductListing[];
    platform: string;
    timestamp: Date;
}

export interface AffiliateClick {
    id: string;
    userId: string | null;
    productUrl: string;
    platform: string;
    estimatedCommission: number;
    clickedAt: Date;
}

export interface APIError {
    error: string;
    message: string;
    statusCode: number;
    details?: any;
}
