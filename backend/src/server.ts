import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import scrapeRouter from './routes/scrape.js';
import WebScraper  from './services/scraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// Enable CORS for your Vite frontend (Port 5173)
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:3000'], 
    credentials: true 
}));

// Request logging for debugging (morgan)
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---

// The dedicated router for your scraping logic
app.use('/api/scrape', scrapeRouter);

// Basic health check to verify server status
app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// --- Server Lifecycle & Cleanup ---

const server = app.listen(PORT, () => {
    console.log(`\n🚀 BlindBargain Backend is Live!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Endpoint: http://localhost:${PORT}/api/scrape/all/:query\n`);
});

/**
 * Graceful Shutdown Handler
 * This ensures Puppeteer and the Express server close cleanly.
 */
const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    // 1. Close the browser instance to release memory
    try {
        await WebScraper.closeBrowser();
        console.log('✅ Puppeteer browser closed.');
    } catch (err) {
        console.error('❌ Error closing Puppeteer:', err);
    }

    // 2. Stop accepting new HTTP requests
    server.close(() => {
        console.log('✅ HTTP server closed.');
        
        // 3. Exit the process (0 = success)
        process.exit(0);
    });

    // Forced shutdown if cleanup takes too long (e.g., 10 seconds)
    setTimeout(() => {
        console.error('⚠️  Forced shutdown: Cleanup took too long.');
        process.exit(1);
    }, 10000);
};

// Listen for termination signals (Ctrl+C or Process Kill)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;