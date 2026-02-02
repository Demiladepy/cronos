import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Worker } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class WebScraper {
    // Note: No 'static' here
    public async scrapeMultiplePlatforms(query: string) {
        // Fast Nigerian platforms for speed
        const platforms = ['jumia', 'konga', 'jiji', 'slot'];
        
        const results = await Promise.all(
          platforms.map(async (platform) => {
            try {
              const data: any = await this.runWorker(platform, query);
              return {
                platform,
                products: Array.isArray(data.products) ? data.products : []
              };
            } catch (error) {
              console.error(`❌ Error scraping ${platform}:`, error);
              return { platform, products: [] };
            }
          })
        );
      
        return { platforms: results };
    }

    private runWorker(platform: string, query: string) {
    return new Promise((resolve, reject) => {
        const workerPath = join(__dirname, '../workers/scraperWorker.ts');

        const worker = new Worker(workerPath, {
            workerData: { platform, query },
            execArgv: [
                '--import', 'tsx' // This replaces the buggy ts-node loader
            ]
        });

        worker.on('message', resolve);
        worker.on('error', (err) => {
            console.error(`❌ Worker Error (${platform}):`, err);
            reject(err);
        });
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

    public static async closeBrowser(): Promise<void> {
        console.log("🧹 BlindBargain: Cleaning up global scraper resources...");
        return Promise.resolve();
    }

    
public findCheapestAcrossAll(platformsData: any[]) {
    const allProducts = platformsData.flatMap(p => p.products);
    
    if (allProducts.length === 0) return null;

    // Sort by price ascending
    const sorted = allProducts.sort((a, b) => a.price - b.price);
    
    return {
        winner: sorted[0],
        savings: sorted.length > 1 ? sorted[1].price - sorted[0].price : 0
    };
}
}