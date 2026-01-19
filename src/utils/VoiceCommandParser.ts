import { VoiceCommand } from '../types'

/**
 * Parses natural language voice commands into structured VoiceCommand objects
 */
export class VoiceCommandParser {
  private static readonly ACTION_KEYWORDS = {
    find: ['find', 'search', 'look for', 'get', 'show me', 'give me'],
    compare: ['compare', 'comparison', 'compare prices', 'compare the'],
    bestDeal: ['best deal', 'cheapest', 'lowest price', 'best price', 'best value'],
    search: ['search', 'look', 'find'],
  }

  private static readonly PLATFORM_KEYWORDS = {
    amazon: ['amazon', 'amzn'],
    jumia: ['jumia', 'jumea'],
    konga: ['konga', 'konga.com'],
    ebay: ['ebay', 'e bay'],
    aliexpress: ['aliexpress', 'ali express', 'alibaba'],
    all: ['all', 'everywhere', 'every platform', 'all platforms'],
  }

  private static readonly PRICE_KEYWORDS = {
    max: ['under', 'below', 'less than', 'maximum', 'max', 'at most', 'up to'],
    min: ['over', 'above', 'more than', 'minimum', 'min', 'at least'],
  }

  /**
   * Normalizes text by converting to lowercase and removing extra spaces
   */
  private static normalize(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  /**
   * Extracts price from text
   */
  private static extractPrice(text: string): number | null {
    // Match currency formats: $100, $100.50, 100 dollars, 100.50 USD, etc.
    const pricePatterns = [
      /\$?\s*(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|naira|ngn|us\s*dollars?)?/i,
      /(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|naira|ngn)/i,
      /\$(\d+(?:\.\d{2})?)/,
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) {
        return parseFloat(match[1])
      }
    }

    return null
  }

  /**
   * Detects action from text
   */
  private static detectAction(text: string): VoiceCommand['action'] {
    const normalized = this.normalize(text)

    // Check for compare first (more specific)
    if (this.ACTION_KEYWORDS.compare.some((keyword) => normalized.includes(keyword))) {
      return 'compare'
    }

    // Check for best deal
    if (this.ACTION_KEYWORDS.bestDeal.some((keyword) => normalized.includes(keyword))) {
      return 'bestDeal'
    }

    // Default to find/search
    if (
      this.ACTION_KEYWORDS.find.some((keyword) => normalized.includes(keyword)) ||
      this.ACTION_KEYWORDS.search.some((keyword) => normalized.includes(keyword))
    ) {
      return 'find'
    }

    return 'search'
  }

  /**
   * Detects platform from text
   */
  private static detectPlatform(text: string): VoiceCommand['platform'] {
    const normalized = this.normalize(text)

    for (const [platform, keywords] of Object.entries(this.PLATFORM_KEYWORDS)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        return platform as VoiceCommand['platform']
      }
    }

    return undefined
  }

  /**
   * Extracts product name from text
   */
  private static extractProduct(text: string, action: string): string {
    const normalized = this.normalize(text)
    let product = normalized

    // Remove action keywords
    const allActionKeywords = [
      ...this.ACTION_KEYWORDS.find,
      ...this.ACTION_KEYWORDS.compare,
      ...this.ACTION_KEYWORDS.bestDeal,
      ...this.ACTION_KEYWORDS.search,
    ]

    for (const keyword of allActionKeywords) {
      product = product.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '')
    }

    // Remove platform keywords
    for (const keywords of Object.values(this.PLATFORM_KEYWORDS)) {
      for (const keyword of keywords) {
        product = product.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '')
      }
    }

    // Remove price-related phrases
    for (const keywords of Object.values(this.PRICE_KEYWORDS)) {
      for (const keyword of keywords) {
        product = product.replace(new RegExp(`\\b${keyword}\\b.*?\\d+`, 'gi'), '')
      }
    }

    // Remove common filler words
    const fillers = ['the', 'a', 'an', 'on', 'for', 'in', 'at', 'to']
    for (const filler of fillers) {
      product = product.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '')
    }

    // Remove price patterns
    product = product.replace(/\$?\s*\d+(?:\.\d{2})?\s*(?:dollars?|usd|naira|ngn)?/gi, '')

    return product.trim()
  }

  /**
   * Extracts price constraints from text
   */
  private static extractPriceConstraints(text: string): {
    maxPrice?: number
    minPrice?: number
  } {
    const normalized = this.normalize(text)
    const constraints: { maxPrice?: number; minPrice?: number } = {}

    // Check for max price keywords
    for (const keyword of this.PRICE_KEYWORDS.max) {
      const regex = new RegExp(`${keyword}\\s+\\$?\\s*(\\d+(?:\\.\\d{2})?)`, 'i')
      const match = normalized.match(regex)
      if (match) {
        constraints.maxPrice = parseFloat(match[1])
        break
      }
    }

    // Check for min price keywords
    for (const keyword of this.PRICE_KEYWORDS.min) {
      const regex = new RegExp(`${keyword}\\s+\\$?\\s*(\\d+(?:\\.\\d{2})?)`, 'i')
      const match = normalized.match(regex)
      if (match) {
        constraints.minPrice = parseFloat(match[1])
        break
      }
    }

    // If no keyword found, try to extract standalone price (assume max)
    if (!constraints.maxPrice && !constraints.minPrice) {
      const price = this.extractPrice(text)
      if (price) {
        constraints.maxPrice = price
      }
    }

    return constraints
  }

  /**
   * Main parsing method
   */
  static parse(command: string): VoiceCommand | null {
    if (!command || !command.trim()) {
      return null
    }

    const normalized = this.normalize(command)
    const action = this.detectAction(normalized)
    const platform = this.detectPlatform(normalized)
    const product = this.extractProduct(normalized, action)
    const priceConstraints = this.extractPriceConstraints(normalized)

    if (!product) {
      return null
    }

    return {
      action,
      product,
      platform,
      ...priceConstraints,
    }
  }

  /**
   * Validates a parsed command
   */
  static validate(command: VoiceCommand): boolean {
    if (!command.product || command.product.trim().length === 0) {
      return false
    }

    if (command.maxPrice !== undefined && command.maxPrice < 0) {
      return false
    }

    if (command.minPrice !== undefined && command.minPrice < 0) {
      return false
    }

    if (
      command.maxPrice !== undefined &&
      command.minPrice !== undefined &&
      command.maxPrice < command.minPrice
    ) {
      return false
    }

    return true
  }
}

