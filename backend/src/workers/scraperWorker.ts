import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer';

async function scrape() {
  const { platform, query } = workerData;
  
  console.log(`🔄 [${platform}] Starting scrape for: "${query}"`);
  
  const browser = await puppeteer.launch({
    headless: "new", 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  });

  try {
    const page = await browser.newPage();
    // Set a reasonable timeout so the voice agent doesn't wait forever
    page.setDefaultNavigationTimeout(30000);
    
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let url = '';
    let selector = '';

    switch (platform.toLowerCase()) {
      case 'jumia':
        url = `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(query)}`;
        selector = 'article.prd';  // Updated selector
        break;
      case 'konga':
        url = `https://www.konga.com/search?search=${encodeURIComponent(query)}`;
        selector = '[data-testid="product-card"], .product-card, .af885';  // Multiple fallback selectors
        break;
      case 'amazon':
        url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
        selector = '[data-component-type="s-search-result"]';
        break;
      case 'aliexpress':
        url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
        selector = '.search-item-card-wrapper-gallery';
        break;
      case 'slot':
        url = `https://slot.ng/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        selector = '.product-item';
        break;
      case 'jiji':
        url = `https://jiji.ng/search?query=${encodeURIComponent(query)}`;
        selector = '.b-list-advert-base, [data-testid="advert-card"]';  // Multiple fallback selectors
        break;
      default:
        console.log(`⚠️ [${platform}] Platform not supported, skipping`);
        parentPort?.postMessage({ platform, products: [] });
        await browser.close();
        return;
    }

    console.log(`🌐 [${platform}] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`✅ [${platform}] Page loaded`);

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const products = await page.evaluate((sel: string, platformName: string) => {
      const doc = (globalThis as any).document;
      
      // Try multiple selectors if comma-separated
      const selectors = sel.split(',').map(s => s.trim());
      let items: any[] = [];
      
      for (const s of selectors) {
        items = Array.from(doc.querySelectorAll(s));
        if (items.length > 0) break;
      }
      
      items = items.slice(0, 4);
      console.log(`Found ${items.length} items for ${platformName}`);
      
      return items.map((item: any) => {
        let name = '', price = '0', link = '', image = '';

        if (platformName === 'jumia') {
          name = item.querySelector('.name, .info .name, h3.name')?.textContent || '';
          price = item.querySelector('.prc, .price .prc')?.textContent?.replace(/[^0-9]/g, '') || '0';
          link = item.querySelector('a.core, a')?.href || '';
          image = item.querySelector('img')?.src || '';
        } else if (platformName === 'konga') {
          name = item.querySelector('[class*="name"], [class*="title"], h3, .product-name')?.textContent || '';
          price = item.querySelector('[class*="price"], .amount')?.textContent?.replace(/[^0-9]/g, '') || '0';
          const anchor = item.querySelector('a');
          link = anchor ? (anchor.href.startsWith('http') ? anchor.href : 'https://www.konga.com' + anchor.getAttribute('href')) : '';
          image = item.querySelector('img')?.src || '';
        } else if (platformName === 'slot') {
          name = item.querySelector('.product-item-link, .product-name')?.textContent || '';
          price = item.querySelector('.price, .special-price')?.textContent?.replace(/[^0-9]/g, '') || '0';
          link = item.querySelector('.product-item-link, a')?.href || '';
          image = item.querySelector('img')?.src || '';
        } else if (platformName === 'jiji') {
          name = item.querySelector('.b-advert-title-inner, [class*="title"]')?.textContent || '';
          price = item.querySelector('.qa-advert-price, [class*="price"]')?.textContent?.replace(/[^0-9]/g, '') || '0';
          const rawLink = item.querySelector('a')?.getAttribute('href') || '';
          link = rawLink.startsWith('http') ? rawLink : `https://jiji.ng${rawLink}`;
          image = item.querySelector('img')?.src || '';
        } else if (platformName === 'amazon') {
          name = item.querySelector('h2 span, h2')?.textContent || '';
          const pWhole = item.querySelector('.a-price-whole')?.textContent || '0';
          const pFrac = item.querySelector('.a-price-fraction')?.textContent || '00';
          price = pWhole.replace(/[^0-9]/g, '') + '.' + pFrac;
          link = item.querySelector('a.a-link-normal')?.href || item.querySelector('a')?.href || '';
          image = item.querySelector('img')?.src || '';
        } else if (platformName === 'aliexpress') {
          name = item.querySelector('[class*="title"], h3')?.textContent || '';
          price = item.querySelector('[class*="price"]')?.textContent?.replace(/[^0-9.]/g, '') || '0';
          link = item.querySelector('a')?.href || '';
          image = item.querySelector('img')?.src || '';
        }

        return {
          name: name.trim(),
          price: parseFloat(price) || 0,
          url: link.startsWith('http') ? link : `https://${platformName}.com${link}`,
          vendor: platformName,
          image: image
        };
      });
    }, selector, platform);

    console.log(`📦 [${platform}] Found ${products.length} products:`, products.map(p => ({ name: p.name?.slice(0, 30), price: p.price })));
    parentPort?.postMessage({ platform, products });
  } catch (error: any) {
    console.error(`❌ [${platform}] Scrape error:`, error.message);
    parentPort?.postMessage({ platform, error: error.message, products: [] });
  } finally {
    await browser.close();
  }
}

scrape();