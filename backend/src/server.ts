import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import WebScraper from './services/scraper.js';
import { Worker } from 'worker_threads'; 
import path from 'path';
import { fileURLToPath } from 'url'; // <--- NEW IMPORT

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ⚡ FIX: Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://cronos-lzv9i9eop-david-s-projects-29110316.vercel.app'], 
    credentials: true 
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---

app.get('/api/scrape/all/:query', async (req: Request, res: Response) => {
    const query = req.params.query;
    console.log(`Received search for: ${query}`);

    const platforms = ['jumia', 'amazon', 'jiji', 'konga', 'slot'];
    
    const workerPromises = platforms.map(platform => {
        return new Promise((resolve) => {
            
            const workerPath = path.resolve(__dirname, 'workers', 'scraperWorker.ts');

            const worker = new Worker(workerPath, { 
                workerData: { platform, query },
                // ⚡ FIX: Allow Worker to read TypeScript files directly
                execArgv: ['-r', 'ts-node/register/transpile-only'] 
            });

            worker.on('message', (data) => resolve(data));
            worker.on('error', (err) => {
                console.error(`Worker error on ${platform}:`, err);
                resolve({ platform, products: [] }); 
            });
            worker.on('exit', (code) => {
                if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
            });
        });
    });

    try {
        const results = await Promise.all(workerPromises);
        res.json({ platforms: results });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

// --- Server Lifecycle ---

const server = app.listen(PORT, () => {
    console.log(`\n🚀 BlindBargain Backend is Live!`);
    console.log(`📡 Port: ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutdown...`);
    try { await WebScraper.closeBrowser(); } catch (err) {}
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;