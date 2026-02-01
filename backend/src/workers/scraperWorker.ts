import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer';

async function scrape() {
  const { platform, query } = workerData;
  
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
        selector = '.prd';
        break;
      case 'konga':
        url = `https://www.konga.com/search?search=${encodeURIComponent(query)}`;
        selector = '._3e284_1_S_y';
        break;
      case 'amazon':
        url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
        selector = '[data-component-type="s-search-result"]';
        break;
      case 'slot':
        url = `https://slot.ng/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        selector = '.product-item';
        break;
      case 'jiji':
        url = `https://jiji.ng/search?query=${encodeURIComponent(query)}`;
        selector = '.b-list-advert-base'; 
        break;
      default:
        throw new Error(`Platform ${platform} not supported`);
    }

    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const products = await page.evaluate((sel: string, platformName: string) => {
      const doc = (globalThis as any).document;
      const items = Array.from(doc.querySelectorAll(sel)).slice(0, 4); 
      
      return items.map((item: any) => {
        let name = '', price = '0', link = '';

        if (platformName === 'jumia') {
          name = item.querySelector('.name')?.textContent || '';
          price = item.querySelector('.prc')?.textContent?.replace(/[^0-9]/g, '') || '0';
          link = item.querySelector('.core')?.href || '';
        } else if (platformName === 'konga') {
          name = item.querySelector('.afd4a_289ae')?.textContent || '';
          price = item.querySelector('._34c57_2I_92')?.textContent?.replace(/[^0-9]/g, '') || '0';
          const anchor = item.querySelector('a');
          link = anchor ? 'https://www.konga.com' + anchor.getAttribute('href') : '';
        } else if (platformName === 'slot') {
          name = item.querySelector('.product-item-link')?.textContent || '';
          price = item.querySelector('.price')?.textContent?.replace(/[^0-9]/g, '') || '0';
          link = item.querySelector('.product-item-link')?.href || '';
       } else if (platformName === 'jiji') {
    name = item.querySelector('.b-advert-title-inner')?.textContent || '';
    price = item.querySelector('.qa-advert-price')?.textContent?.replace(/[^0-9]/g, '') || '0';
    
    // FIX: Get the href and check if it needs the .ng prefix
    const rawLink = item.querySelector('a')?.getAttribute('href') || '';
    link = rawLink.startsWith('http') ? rawLink : `https://jiji.ng${rawLink}`;
} else if (platformName === 'amazon') {
          name = item.querySelector('h2')?.textContent || '';
          const pWhole = item.querySelector('.a-price-whole')?.textContent || '0';
          const pFrac = item.querySelector('.a-price-fraction')?.textContent || '00';
          price = pWhole.replace(/[^0-9]/g, '') + '.' + pFrac;
          link = item.querySelector('a')?.href || '';
        }

        

        return {
          name: name.trim(),
          price: parseFloat(price) || 0,
          url: link.startsWith('http') ? link : `https://${platformName}.com${link}`,
          vendor: platformName
        };
      });
    }, selector, platform);

    parentPort?.postMessage({ platform, products });
  } catch (error: any) {
    parentPort?.postMessage({ platform, error: error.message, products: [] });
  } finally {
    await browser.close();
  }
}

scrape();