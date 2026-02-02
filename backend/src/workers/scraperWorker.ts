import { parentPort, workerData } from 'worker_threads';
import puppeteer, { Browser, Page } from 'puppeteer';

type Product = {
  name: string;
  price: number;
  url: string;
  vendor: string;
};

async function scrape() {
  const { platform, query } = workerData as { platform: string; query: string };
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page: Page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let url = '';
    let selector = '';

    // Configuration for each platform
    switch (platform.toLowerCase()) {
      case 'jumia':
        url = `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(query)}`;
        selector = 'article.prd';
        break;
      case 'konga':
        url = `https://www.konga.com/search?search=${encodeURIComponent(query)}`;
        selector = 'li.abt';
        break;
      case 'amazon':
        url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
        selector = '[data-component-type="s-search-result"]';
        break;
      case 'slot':
        url = `https://slot.ng/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        selector = '.product-item-info';
        break;
      case 'jiji':
        url = `https://jiji.ng/search?query=${encodeURIComponent(query)}`;
        selector = '.b-list-advert-base';
        break;
      case 'aliexpress':
        url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
        selector = '[data-product-id]';
        break;
      default:
        parentPort?.postMessage({ platform, products: [] });
        return;
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    // Use a reasonable timeout for dynamic content
    await page.waitForSelector(selector, { timeout: 7000 });

    // FIX: Passing a standard arrow function to evaluate
    const products = await page.evaluate((sel, vendorName) => {
      const normalizeUrl = (link: string | null, base: string) => {
        if (!link) return '';
        if (link.startsWith('http')) return link;
        if (link.startsWith('//')) return 'https:' + link;
        return base + (link.startsWith('/') ? link : '/' + link);
      };

      const items = Array.from((globalThis as any).document.querySelectorAll(sel)).slice(0, 5);

      return items.map((item: any) => {
        let name = '';
        let priceText = '';
        let link = '';

        try {
          if (vendorName === 'jumia') {
            name = item.querySelector('.name')?.textContent || '';
            priceText = item.querySelector('.prc')?.textContent || '';
            link = normalizeUrl(item.querySelector('a.core')?.getAttribute('href'), 'https://www.jumia.com.ng');
          } else if (vendorName === 'konga') {
            name = item.querySelector('div._4941f_1HCZm')?.textContent || '';
            priceText = item.querySelector('span._4e81a_39Ehs')?.textContent || '';
            link = normalizeUrl(item.querySelector('a')?.getAttribute('href'), 'https://www.konga.com');
          } else if (vendorName === 'amazon') {
            name = item.querySelector('h2 span')?.textContent || '';
            priceText = item.querySelector('.a-price-whole')?.textContent || '';
            link = normalizeUrl(item.querySelector('h2 a')?.getAttribute('href'), 'https://www.amazon.com');
          } else if (vendorName === 'slot') {
            name = item.querySelector('.product-item-link')?.textContent || '';
            priceText = item.querySelector('.price')?.textContent || '';
            link = normalizeUrl(item.querySelector('.product-item-link')?.getAttribute('href'), 'https://slot.ng');
          } else if (vendorName === 'jiji') {
            name = item.querySelector('.b-advert-title-inner')?.textContent || '';
            priceText = item.querySelector('.qa-advert-price')?.textContent || '';
            link = normalizeUrl(item.querySelector('a')?.getAttribute('href'), 'https://jiji.ng');
          } else if (vendorName === 'aliexpress') {
            name = item.querySelector('h1')?.textContent || item.innerText.split('\n')[0] || '';
            priceText = item.innerText.match(/₦[\d,]+/)?.[0] || '';
            link = normalizeUrl(item.querySelector('a')?.getAttribute('href'), 'https://www.aliexpress.com');
          }
        } catch (e) {}

        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

        return {
          name: name.trim(),
          price,
          url: link,
          vendor: vendorName
        };
      }).filter((p) => p.price > 0 && p.name.length > 2);
    }, selector, platform.toLowerCase());

    parentPort?.postMessage({ platform, products });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    parentPort?.postMessage({ platform, products: [], error: message });
  } finally {
    if (browser) {
      await (browser as Browser).close().catch(() => {});
    }
  }
}

scrape();