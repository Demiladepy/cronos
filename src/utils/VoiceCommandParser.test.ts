import { VoiceCommandParser } from './VoiceCommandParser'
import { VoiceCommand } from '../types'

describe('VoiceCommandParser', () => {
  describe('parse', () => {
    it('should parse a simple find command', () => {
      const result = VoiceCommandParser.parse('Find the cheapest iPhone 15')
      expect(result).not.toBeNull()
      expect(result?.action).toBe('bestDeal')
      expect(result?.product).toContain('iPhone 15')
    })

    it('should parse a compare command', () => {
      const result = VoiceCommandParser.parse('Compare prices for Samsung Galaxy S24')
      expect(result).not.toBeNull()
      expect(result?.action).toBe('compare')
      expect(result?.product).toContain('Samsung Galaxy S24')
    })

    it('should parse platform-specific commands', () => {
      const result = VoiceCommandParser.parse('Find iPhone 15 on Amazon')
      expect(result).not.toBeNull()
      expect(result?.platform).toBe('amazon')
      expect(result?.product).toContain('iPhone 15')
    })

    it('should parse price constraints', () => {
      const result = VoiceCommandParser.parse('Find iPhone 15 under $1000')
      expect(result).not.toBeNull()
      expect(result?.maxPrice).toBe(1000)
    })

    it('should parse minimum price constraints', () => {
      const result = VoiceCommandParser.parse('Find iPhone 15 over $500')
      expect(result).not.toBeNull()
      expect(result?.minPrice).toBe(500)
    })

    it('should handle "all platforms" command', () => {
      const result = VoiceCommandParser.parse('Search for laptop on all platforms')
      expect(result).not.toBeNull()
      expect(result?.platform).toBe('all')
    })

    it('should handle best deal queries', () => {
      const result = VoiceCommandParser.parse("What's the best deal on iPhone 15?")
      expect(result).not.toBeNull()
      expect(result?.action).toBe('bestDeal')
    })

    it('should handle variations and typos', () => {
      const result = VoiceCommandParser.parse('find cheepest iphone 15')
      expect(result).not.toBeNull()
      expect(result?.product).toContain('iphone 15')
    })

    it('should return null for empty commands', () => {
      const result = VoiceCommandParser.parse('')
      expect(result).toBeNull()
    })

    it('should handle complex commands with multiple constraints', () => {
      const result = VoiceCommandParser.parse(
        'Find iPhone 15 on Amazon under $1000'
      )
      expect(result).not.toBeNull()
      expect(result?.platform).toBe('amazon')
      expect(result?.maxPrice).toBe(1000)
    })
  })

  describe('validate', () => {
    it('should validate a correct command', () => {
      const command: VoiceCommand = {
        action: 'find',
        product: 'iPhone 15',
      }
      expect(VoiceCommandParser.validate(command)).toBe(true)
    })

    it('should reject commands without product', () => {
      const command: VoiceCommand = {
        action: 'find',
        product: '',
      }
      expect(VoiceCommandParser.validate(command)).toBe(false)
    })

    it('should reject negative prices', () => {
      const command: VoiceCommand = {
        action: 'find',
        product: 'iPhone 15',
        maxPrice: -100,
      }
      expect(VoiceCommandParser.validate(command)).toBe(false)
    })

    it('should reject invalid price ranges', () => {
      const command: VoiceCommand = {
        action: 'find',
        product: 'iPhone 15',
        maxPrice: 500,
        minPrice: 1000,
      }
      expect(VoiceCommandParser.validate(command)).toBe(false)
    })

    it('should accept valid price ranges', () => {
      const command: VoiceCommand = {
        action: 'find',
        product: 'iPhone 15',
        maxPrice: 1000,
        minPrice: 500,
      }
      expect(VoiceCommandParser.validate(command)).toBe(true)
    })
  })
})

