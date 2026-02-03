import { parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer-extra'; 
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 1. ENABLE STEALTH
puppeteer.use(StealthPlugin());

interface Strategy {
  container: string;
  name: string;
  price: string;
  link: string;
}

async function scrape() {
  const { platform, query } = workerData as { platform: string; query: string };
  let browser: any = null;
  let products: any[] = []; // <--- MOVED TO TOP SCOPE FOR SAFETY

  try {
    // 🚀 LAUNCH: Memory Only, Fast & Lightweight
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,800',
        '--disable-extensions'
      ]
    });

    const page = await browser.newPage();
    
    // Safety: 15s Max Timeout
    page.setDefaultNavigationTimeout(15000);
    
    // Standard User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ⚡ SPEED: Block Heavy Resources
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
       const rType = req.resourceType();
       const url = req.url();

       if (['image', 'media', 'font', 'stylesheet'].includes(rType)) {
         req.abort();
         return;
       }

       if (url.includes('google-analytics') || 
           url.includes('facebook') || 
           url.includes('doubleclick') || 
           url.includes('googletagmanager') || 
           url.includes('criteo') || 
           url.includes('hotjar')) {
         req.abort();
         return;
       }

       req.continue();
    });

    let url = '';
    let strategies: Strategy[] = [];

    switch (platform.toLowerCase()) {
      case 'jumia':
        url = `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(query)}`;
        strategies = [{ container: 'article.prd', name: '.name', price: '.prc', link: 'a.core' }];
        break;
      case 'konga':
        url = `https://www.konga.com/search?search=${encodeURIComponent(query)}`;
        strategies = [{ container: 'li.abt', name: 'div._4941f_1HCZm', price: 'span._4e81a_39Ehs', link: 'a' }];
        break;
      case 'amazon':
        url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
        strategies = [{ container: '[data-component-type="s-search-result"]', name: 'h2', price: '.a-price-whole', link: 'a.a-link-normal' }];
        break;
      case 'jiji':
        url = `https://jiji.ng/search?query=${encodeURIComponent(query)}`;
        strategies = [{ container: '.b-list-advert-base', name: '.b-advert-title-inner', price: '.qa-advert-price', link: 'a' }];
        break;
      case 'slot':
        url = `https://slot.ng/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        strategies = [{ container: '.product-item-info', name: '.product-item-link', price: '.price', link: '.product-item-link' }];
        break;
      case 'aliexpress':
        url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
        strategies = [{ container: '.search-item-card-wrapper-gallery', name: 'h1', price: 'span', link: 'a' }];
        break;
    }

    console.log(`🌐 [${platform}] Navigating...`);
    
    // 2. NAVIGATE (Soft Fail)
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch(e) {
        console.log(`⚠️ [${platform}] Navigation timeout/error. Attempting to scrape anyway.`);
    }

    // 3. SCRAPE
    for (const strategy of strategies) {
        try {
            try { await page.waitForSelector(strategy.container, { timeout: 4000 }); } catch(e) {}

            const items = await page.evaluate((strat: any, vendor: string) => {
                const doc = (globalThis as any).document;
                const els = Array.from(doc.querySelectorAll(strat.container)).slice(0, 10);
                
                return els.map((el: any) => {
                    const name = el.querySelector(strat.name)?.textContent?.trim() || 'Unknown';
                    const priceRaw = el.querySelector(strat.price)?.textContent?.trim() || '0';
                    let link = el.querySelector(strat.link)?.getAttribute('href') || '';
                    
                    if (link && !link.startsWith('http')) {
                         if (vendor === 'jumia') link = `https://www.jumia.com.ng${link.startsWith('/') ? '' : '/'}${link}`;
                         else if (vendor === 'konga') link = `https://www.konga.com${link.startsWith('/') ? '' : '/'}${link}`;
                         else if (vendor === 'slot') link = link; 
                         else if (vendor === 'jiji') link = `https://jiji.ng${link.startsWith('/') ? '' : '/'}${link}`;
                         else if (vendor === 'amazon') link = `https://www.amazon.com${link.startsWith('/') ? '' : '/'}${link}`;
                         else if (vendor === 'aliexpress') link = `https://www.aliexpress.com${link.startsWith('/') ? '' : '/'}${link}`;
                    }

                    const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;
                    return { name, price, url: link, vendor };
                });
            }, strategy, platform.toLowerCase());

            if (items.length > 0) {
                // 🛑 ACCESSORY FILTER
                const lowerQuery = query.toLowerCase();
                const wantsAccessory = lowerQuery.includes('case') || lowerQuery.includes('screen') || lowerQuery.includes('charger') || lowerQuery.includes('cover');

                products = items.filter((p: any) => {
                    if (p.price === 0 || p.name === 'Unknown') return false;
                    
                    if (!wantsAccessory) {
                        const name = p.name.toLowerCase();
                        if (name.includes('case') || name.includes('screen protector') || name.includes('cover') || name.includes('glass') || name.includes('pouch')) {
                            return false; 
                        }
                    }
                    return true;
                }).slice(0, 5); 

                break; // Found data, stop trying strategies
            }
        } catch (e) { }
    }

    console.log(`✅ [${platform}] Found ${products.length} items`);
    parentPort?.postMessage({ platform, products });

  } catch (error: any) {
    console.error(`❌ [${platform}] Error:`, error.message);
    parentPort?.postMessage({ platform, error: error.message, products: [] });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

scrape();