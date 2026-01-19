# Blind Bargain

Voice-activated AI shopping agent that helps blind users (and all shoppers) find the best deals across multiple e-commerce platforms.

## Features

- 🎤 **Voice-Activated Shopping**: Speak your shopping requests naturally
- 🔍 **Multi-Platform Search**: Searches across Amazon, Jumia, Konga, eBay, AliExpress
- 💰 **Best Deal Finder**: Automatically finds and compares prices
- 🎟️ **Auto-Coupon Application**: Applies available coupons automatically
- 🔊 **Voice Feedback**: Results are spoken back to you
- ♿ **Accessibility First**: Full ARIA labels, keyboard navigation, screen reader compatible
- 🎨 **High Contrast Mode**: Enhanced visibility for users with vision impairments

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Voice**: Web Speech API (Speech Recognition & Synthesis)
- **PWA**: Service Worker for offline functionality
- **Code Quality**: ESLint + Prettier

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Modern browser with Web Speech API support (Chrome, Edge, Safari)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blind-bargain
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your keys:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_BACKEND_URL=http://localhost:3000
   VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here  # Optional
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

### Project Structure

```
src/
  components/     # React components
  hooks/          # Custom React hooks
  services/       # API calls, AI integration
  utils/          # Helper functions
  types/          # TypeScript interfaces
  assets/         # Images, icons
public/           # PWA manifest, icons
```

## Usage

### Voice Commands

The app supports natural language voice commands:

- **Find products**: "Find the cheapest iPhone 15"
- **Compare prices**: "Compare prices for Samsung Galaxy S24"
- **Platform-specific**: "Find iPhone 15 on Amazon"
- **Price filters**: "Find iPhone 15 under $1000"
- **Best deals**: "What's the best deal on iPhone 15?"

### Keyboard Navigation

- **Space/Enter**: Activate microphone
- **Tab**: Navigate between elements
- **Escape**: Cancel current operation

### Accessibility Features

- Full ARIA labels on all interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast mode toggle
- Visual feedback for all voice interactions

## Browser Compatibility

- ✅ Chrome/Edge (Full support)
- ✅ Safari (Full support)
- ⚠️ Firefox (Limited - may require polyfills)

## Testing

### Voice Commands Test

Test with these sample commands:

1. "Find the cheapest iPhone 15"
2. "Compare prices for Samsung Galaxy S24"
3. "What's the best deal on this page?"
4. "Find iPhone 15 on Amazon under $1000"
5. "Search for laptop on all platforms"
6. "Compare iPhone prices on Jumia and Konga"
7. "Find the best deal on Samsung TV"
8. "Show me cheap Android phones"
9. "Find MacBook Pro on eBay"
10. "What's the cheapest iPhone available?"

### Screen Reader Testing

Test with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### PWA Icons

The app requires PWA icons for installation. Currently, placeholder files are in `public/`. To generate proper icons:

1. Create a 512x512px icon with your app logo
2. Generate 192x192 and 512x512 versions
3. Replace `public/pwa-192x192.png` and `public/pwa-512x512.png`

You can use online tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## PWA Installation

The app is a Progressive Web App (PWA) and can be installed on:
- Desktop (Chrome, Edge)
- Mobile devices (iOS Safari, Android Chrome)

Look for the install prompt in your browser or use the browser's install option.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Roadmap

- [ ] Backend API integration
- [ ] Product scraping from e-commerce platforms
- [ ] GPT-4 Vision integration for product analysis
- [ ] Affiliate link generation
- [ ] User accounts and preferences
- [ ] Premium subscription features
- [ ] Mobile app (React Native)

