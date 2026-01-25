// Declare chrome as a global variable for TypeScript (browser extension API)
declare const chrome: any;

/**
 * Screenshot Capture Service
 * Captures browser screenshots, optimizes them, and converts to base64
 */

export interface CaptureOptions {
    maxWidth?: number;
    quality?: number;
}

export class ScreenshotCapture {
    private static readonly DEFAULT_MAX_WIDTH = 1280;
    private static readonly DEFAULT_QUALITY = 0.8;

    /**
     * Capture screenshot using modern browser APIs
     * For PWA: Uses manual file upload
     * For extension: Would use chrome.tabs.captureVisibleTab
     */
    static async captureScreen(options: CaptureOptions = {}): Promise<string> {
        const maxWidth = options.maxWidth || this.DEFAULT_MAX_WIDTH;
        const quality = options.quality || this.DEFAULT_QUALITY;

        // Check if we're in a browser extension context
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            return this.captureFromExtension(maxWidth, quality);
        }

        // For PWA/web app, we need manual upload
        return this.captureFromFileInput(maxWidth, quality);
    }

    /**
     * Capture from browser extension (Chrome/Edge)
     */
    private static async captureFromExtension(
        maxWidth: number,
        quality: number
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!chrome.tabs) {
                reject(new Error('Browser extension API not available'));
                return;
            }

            chrome.tabs.captureVisibleTab(
                { format: 'png' },
                async (dataUrl: string) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    try {
                        const optimized = await this.optimizeImage(dataUrl, maxWidth, quality);
                        resolve(optimized);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Capture from file input (PWA/web app)
     */
    private static async captureFromFileInput(
        maxWidth: number,
        quality: number
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Use camera on mobile

            input.onchange = async (e: Event) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];

                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                try {
                    const dataUrl = await this.fileToDataUrl(file);
                    const optimized = await this.optimizeImage(dataUrl, maxWidth, quality);
                    resolve(optimized);
                } catch (error) {
                    reject(error);
                }
            };

            input.click();
        });
    }

    /**
     * Convert File to data URL
     */
    private static fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Optimize image: resize and compress
     */
    static async optimizeImage(
        dataUrl: string,
        maxWidth: number,
        quality: number
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    // Create canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    const optimized = canvas.toDataURL('image/jpeg', quality);

                    // Extract base64 without data URL prefix
                    const base64 = optimized.split(',')[1];
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = dataUrl;
        });
    }

    /**
     * Create preview URL from base64
     */
    static createPreviewUrl(base64: string): string {
        return `data:image/jpeg;base64,${base64}`;
    }

    /**
     * Validate image size
     */
    static validateSize(base64: string, maxSizeMB = 20): boolean {
        const sizeInBytes = (base64.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        return sizeInMB <= maxSizeMB;
    }

    /**
     * Get image dimensions from base64
     */
    static async getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = this.createPreviewUrl(base64);
        });
    }

    /**
     * Paste from clipboard (for desktop users)
     */
    static async captureFromClipboard(
        maxWidth: number = this.DEFAULT_MAX_WIDTH,
        quality: number = this.DEFAULT_QUALITY
    ): Promise<string> {
        try {
            const items = await navigator.clipboard.read();

            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const dataUrl = await this.blobToDataUrl(blob);
                        return this.optimizeImage(dataUrl, maxWidth, quality);
                    }
                }
            }

            throw new Error('No image found in clipboard');
        } catch (error) {
            throw new Error('Failed to read clipboard: ' + (error as Error).message);
        }
    }

    /**
     * Convert Blob to data URL
     */
    private static blobToDataUrl(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
