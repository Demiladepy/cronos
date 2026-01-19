/**
 * API service for backend communication
 * TODO: Implement actual API calls when backend is ready
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export interface SearchProductsRequest {
  query: string
  platform?: string
  maxPrice?: number
  minPrice?: number
}

export interface SearchProductsResponse {
  products: Array<{
    name: string
    price: number
    platform: string
    url: string
    imageUrl?: string
    rating?: number
    couponAvailable?: boolean
  }>
  bestDeal: {
    name: string
    price: number
    platform: string
    url: string
  } | null
}

export async function searchProducts(
  request: SearchProductsRequest
): Promise<SearchProductsResponse> {
  // TODO: Implement actual API call
  const response = await fetch(`${API_BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

export async function applyCoupon(productUrl: string): Promise<{ couponApplied: boolean; newPrice?: number }> {
  // TODO: Implement actual API call
  const response = await fetch(`${API_BASE_URL}/api/apply-coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: productUrl }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }

  return response.json()
}

