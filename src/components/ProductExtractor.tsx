import React, { useState } from 'react';
import { ScreenshotCapture } from '../services/ScreenshotCapture';
import { AIAnalysisService } from '../services/AIAnalysisService';
import { ProductListing } from '../types';
import '../styles/ProductExtractor.css';

export const ProductExtractor: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [products, setProducts] = useState<ProductListing[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [processingTime, setProcessingTime] = useState<number>(0);
    const [cached, setCached] = useState(false);

    /**
     * Handle screenshot capture
     */
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

            // Validate size
            if (!ScreenshotCapture.validateSize(base64, 20)) {
                throw new Error('Screenshot is too large. Please try a smaller image.');
            }

            setProgress(50);
            speak('Screenshot captured. Analyzing...');
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            speak(`Error: ${message}`);
            setProgress(0);
        }
    };

    /**
     * Handle analysis
     */
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

            // Generate and speak summary
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

    /**
     * Handle paste from clipboard
     */
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

    /**
     * Retry analysis
     */
    const handleRetry = () => {
        setError(null);
        setProducts([]);
        setScreenshot(null);
        setCached(false);
        speak('Ready to capture a new screenshot');
    };

    /**
     * Speak text using Web Speech API
     */
    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    /**
     * Announce product details
     */
    const announceProduct = (product: ProductListing) => {
        const text = AIAnalysisService.formatProductForVoice(product);
        speak(text);
    };

    return (
        <div className="product-extractor" role="main" aria-label="Product Extractor">
            <div className="extractor-header">
                <h2>📸 AI Product Extractor</h2>
                <p>Capture any product page and let AI extract all the details</p>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons" role="group" aria-label="Capture options">
                <button
                    onClick={handleCapture}
                    disabled={loading}
                    className="btn btn-primary"
                    aria-label="Capture screenshot"
                >
                    📷 Capture Screenshot
                </button>

                <button
                    onClick={handlePaste}
                    disabled={loading}
                    className="btn btn-secondary"
                    aria-label="Paste from clipboard"
                >
                    📋 Paste from Clipboard
                </button>

                {screenshot && (
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="btn btn-success"
                        aria-label="Analyze screenshot"
                    >
                        {loading ? '⏳ Analyzing...' : '🔍 Analyze This Page'}
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
                <div className="progress-container" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                        <span className="progress-text">{progress}%</span>
                    </div>
                </div>
            )}

            {/* Screenshot Preview */}
            {screenshot && (
                <div className="screenshot-preview">
                    <h3>Preview</h3>
                    <img
                        src={ScreenshotCapture.createPreviewUrl(screenshot)}
                        alt="Screenshot preview"
                        className="preview-image"
                    />
                    {cached && (
                        <div className="cache-badge" aria-label="Results from cache">
                            ⚡ Cached Result
                        </div>
                    )}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="error-message" role="alert" aria-live="assertive">
                    <strong>❌ Error:</strong> {error}
                    <button onClick={handleRetry} className="btn btn-small" aria-label="Retry">
                        🔄 Retry
                    </button>
                </div>
            )}

            {/* Products List */}
            {products.length > 0 && (
                <div className="products-container">
                    <div className="products-header">
                        <h3>
                            Found {products.length} Product{products.length > 1 ? 's' : ''}
                        </h3>
                        {processingTime > 0 && (
                            <span className="processing-time">
                                ⏱️ Processed in {(processingTime / 1000).toFixed(2)}s
                            </span>
                        )}
                    </div>

                    <ul className="products-list" role="list" aria-label="Extracted products">
                        {products.map((product, index) => (
                            <li
                                key={index}
                                className={`product-item ${product.availability}`}
                                role="listitem"
                                tabIndex={0}
                                onClick={() => announceProduct(product)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        announceProduct(product);
                                    }
                                }}
                                aria-label={`Product ${index + 1}: ${product.name}`}
                            >
                                <div className="product-header">
                                    <h4 className="product-name">{product.name}</h4>
                                    <span
                                        className={`availability-badge ${product.availability}`}
                                        aria-label={`Availability: ${product.availability.replace('_', ' ')}`}
                                    >
                                        {product.availability === 'in_stock' ? '✅ In Stock' : '❌ Out of Stock'}
                                    </span>
                                </div>

                                <div className="product-details">
                                    <div className="price-section">
                                        <span className="price" aria-label={`Price: ${product.currency} ${product.price}`}>
                                            <strong>{product.currency} {product.price.toLocaleString()}</strong>
                                        </span>
                                        {product.shipping !== null && (
                                            <span className="shipping" aria-label={`Shipping: ${product.currency} ${product.shipping}`}>
                                                {product.shipping === 0 ? '🚚 Free Shipping' : `+ ${product.currency} ${product.shipping} shipping`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="seller-section">
                                        <span className="seller" aria-label={`Seller: ${product.seller}`}>
                                            🏪 {product.seller}
                                        </span>
                                        {product.rating !== null && (
                                            <span className="rating" aria-label={`Rating: ${product.rating} out of 5 stars`}>
                                                ⭐ {product.rating.toFixed(1)}
                                                {product.reviewCount && ` (${product.reviewCount} reviews)`}
                                            </span>
                                        )}
                                    </div>

                                    {product.platform && (
                                        <span className="platform" aria-label={`Platform: ${product.platform}`}>
                                            🌐 {product.platform}
                                        </span>
                                    )}
                                </div>

                                <button
                                    className="btn btn-small announce-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        announceProduct(product);
                                    }}
                                    aria-label={`Read details for ${product.name}`}
                                >
                                    🔊 Read Details
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Instructions */}
            {!screenshot && !loading && (
                <div className="instructions" role="region" aria-label="Instructions">
                    <h3>How to use:</h3>
                    <ol>
                        <li>📸 Capture a screenshot of any product listing page</li>
                        <li>📋 Or paste an image from your clipboard</li>
                        <li>🔍 Click "Analyze This Page" to extract product information</li>
                        <li>🔊 Click on any product to hear its details</li>
                    </ol>
                </div>
            )}
        </div>
    );
};