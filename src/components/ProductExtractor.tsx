import { useState } from 'react';
import { ScreenshotCapture } from '../services/ScreenshotCapture';
import { AIAnalysisService } from '../services/AIAnalysisService';
import { ProductListing, ResultItem } from '../types'; 
import '../styles/ProductExtractor.css';

interface ProductExtractorProps {
  onDataExtracted: (products: ResultItem[] | null) => void;
}

export default function ProductExtractor({ onDataExtracted }: ProductExtractorProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [products, setProducts] = useState<ProductListing[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [processingTime, setProcessingTime] = useState<number>(0);
    const [cached, setCached] = useState(false);

    //Speak text using Web Speech API
    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    //Handle screenshot capture
    const handleCapture = async () => {
        try {
            setError(null);
            setProgress(10);

            const base64 = await ScreenshotCapture.captureScreen({
                maxWidth: 1280,
                quality: 0.8,
            });

            setProgress(30);
            setScreenshot(base64);

            if (!ScreenshotCapture.validateSize(base64, 20)) {
                throw new Error('Screenshot is too large. Please try a smaller image.');
            }

            setProgress(50);
            speak('Screenshot captured. Ready to analyze.');
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            speak(`Error: ${message}`);
            setProgress(0);
        }
    };

    //Handle analysis
    const handleAnalyze = async () => {
        if (!screenshot) {
            setError('Please capture a screenshot first');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setProgress(60);

            const response = await AIAnalysisService.analyzeProductPage(screenshot);

            setProgress(90);
            setProducts(response.products);
            setProcessingTime(response.processingTime);
            setCached(response.cached);

        
            onDataExtracted(response.products as unknown as ResultItem[]);

            const summary = AIAnalysisService.generateSummary(response.products);
            speak(summary);

            setProgress(100);
            setTimeout(() => setProgress(0), 1000);
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            speak(`Analysis failed: ${message}`);
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    //Handle paste from clipboard
    const handlePaste = async () => {
        try {
            setError(null);
            setProgress(10);

            const base64 = await ScreenshotCapture.captureFromClipboard();
            setProgress(30);
            setScreenshot(base64);

            speak('Image pasted from clipboard. Ready to analyze.');
            setProgress(0);
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            speak(`Paste failed: ${message}`);
            setProgress(0);
        }
    };

    //Retry/Clear
    const handleRetry = () => {
        setError(null);
        setProducts([]);
        setScreenshot(null);
        setCached(false);
        onDataExtracted(null); // Clear global results too
        speak('Ready to capture a new screenshot');
    };

    const announceProduct = (product: ProductListing) => {
        const text = AIAnalysisService.formatProductForVoice(product);
        speak(text);
    };

    return (
        <div className="product-extractor" role="main" aria-label="Product Extractor">
            <div className="extractor-header">
                <h2>AI Product Extractor</h2>
                <p>Capture any product page and let AI extract all the details</p>
            </div>

            <div className="action-buttons" role="group" aria-label="Capture options">
                <button
                    onClick={handleCapture}
                    disabled={loading}
                    className="btn btn-primary"
                >
                   Capture Screenshot
                </button>

                <button
                    onClick={handlePaste}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                  Paste from Clipboard
                </button>

                {screenshot && (
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="btn btn-success"
                    >
                        {loading ? 'Analyzing...' : 'Analyze This Page'}
                    </button>
                )}
            </div>

            {progress > 0 && (
                <div className="progress-container" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                        <span className="progress-text">{progress}%</span>
                    </div>
                </div>
            )}

            {screenshot && (
                <div className="screenshot-preview">
                    <h3>Preview</h3>
                    <img
                        src={ScreenshotCapture.createPreviewUrl(screenshot)}
                        alt="Screenshot preview"
                        className="preview-image"
                    />
                    {cached && <div className="cache-badge">Cached Result</div>}
                </div>
            )}

            {error && (
                <div className="error-message" role="alert">
                    <strong>Error:</strong> {error}
                    <button onClick={handleRetry} className="btn btn-small">Retry</button>
                </div>
            )}

            {products.length > 0 && (
                <div className="products-container">
                    <div className="products-header">
                        <h3>Found {products.length} Product{products.length > 1 ? 's' : ''}</h3>
                        {processingTime > 0 && (
                            <span className="processing-time">
                                Processed in {(processingTime / 1000).toFixed(2)}s
                            </span>
                        )}
                    </div>

                    <ul className="products-list" role="list">
                        {products.map((product, index) => (
                            <li
                                key={index}
                                className={`product-item ${product.availability}`}
                                onClick={() => announceProduct(product)}
                                tabIndex={0}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && announceProduct(product)}
                            >
                                <div className="product-header">
                                    <h4 className="product-name">{product.name}</h4>
                                    <span className={`availability-badge ${product.availability}`}>
                                        {product.availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>

                                <div className="product-details">
                                    <div className="price-section">
                                        <span className="price">
                                            <strong>{product.currency} {product.price.toLocaleString()}</strong>
                                        </span>
                                        {product.shipping !== null && (
                                            <span className="shipping">
                                                {product.shipping === 0 ? 'Free Shipping' : `+ ${product.currency} ${product.shipping} shipping`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="seller-section">
                                        <span className="seller">{product.seller}</span>
                                        {product.rating !== null && (
                                            <span className="rating">
                                                ★ {product.rating.toFixed(1)} {product.reviewCount && `(${product.reviewCount})`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-small announce-btn">Read Details</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!screenshot && !loading && (
                <div className="instructions">
                    <h3>How to use:</h3>
                    <ul>
                        <li>Capture a screenshot or paste from clipboard.</li>
                        <li>Click "Analyze This Page" to begin extraction.</li>
                        <li>Click any product card to hear details read aloud.</li>
                    </ul>
                </div>
            )}
        </div>
    );
}