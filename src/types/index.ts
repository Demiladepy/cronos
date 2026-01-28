
export interface AnalyzingModalProps {
  isOpen: boolean;
  progress: number; 
  onCancel: () => void;
}

export interface ResultItem {
  id: string;
  name: string;
  image: string;
  price: number;
  vendor: string;
  url: string;
}

export interface HomeHeroProps {
  onResult: (results: ResultItem[]) => void;
}

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
  screenshot: string;
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

export interface VoiceCommand {
  action: 'bestDeal' | 'compare' | 'search' | 'find';
  product: string;
  platform?: string;
  maxPrice?: number;
  minPrice?: number;
}
