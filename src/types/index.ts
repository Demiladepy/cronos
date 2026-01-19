export interface VoiceCommand {
  action: 'find' | 'compare' | 'bestDeal' | 'search'
  product: string
  platform?: 'amazon' | 'jumia' | 'konga' | 'ebay' | 'aliexpress' | 'all'
  maxPrice?: number
  minPrice?: number
}

export interface ProductResult {
  name: string
  price: number
  platform: string
  url: string
  imageUrl?: string
  rating?: number
  couponAvailable?: boolean
}

export interface SearchResult {
  query: string
  products: ProductResult[]
  bestDeal: ProductResult | null
  timestamp: Date
}

