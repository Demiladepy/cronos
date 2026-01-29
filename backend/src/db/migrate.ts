import pool from './pool.js';

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Searches table
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  platform VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Affiliate clicks table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  product_name TEXT,
  price DECIMAL(10,2),
  estimated_commission DECIMAL(10,2) DEFAULT 0,
  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL,
  description TEXT,
  discount VARCHAR(50),
  store VARCHAR(100) NOT NULL,
  expires_at TIMESTAMP,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  processing_time INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Scraped products table
CREATE TABLE IF NOT EXISTS scraped_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  seller VARCHAR(255),
  rating DECIMAL(3,1),
  review_count INTEGER DEFAULT 0,
  availability VARCHAR(20) DEFAULT 'in_stock',
  shipping DECIMAL(10,2),
  product_url TEXT,
  platform VARCHAR(50) NOT NULL,
  image_url TEXT,
  scraped_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  hash VARCHAR(64) UNIQUE -- To prevent duplicates
);

-- Search history table (for analytics)
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query VARCHAR(255) NOT NULL,
  platform VARCHAR(50),
  results_count INTEGER,
  best_deal_product_id UUID REFERENCES scraped_products(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  searched_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_timestamp ON searches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_user_id ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_timestamp ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_store ON coupons(store);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_products_platform ON scraped_products(platform);
CREATE INDEX IF NOT EXISTS idx_scraped_products_price ON scraped_products(price);
CREATE INDEX IF NOT EXISTS idx_scraped_products_rating ON scraped_products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_products_scraped_at ON scraped_products(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_products_hash ON scraped_products(hash);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(search_query);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(searched_at DESC);
`;

export async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('🔄 Running database migrations...');
        await client.query(migrations);
        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations()
        .then(() => {
            console.log('✅ All migrations complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration error:', error);
            process.exit(1);
        });
}
