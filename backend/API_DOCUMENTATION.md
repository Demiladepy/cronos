# Blind Bargain Backend API Documentation

## Base URL
```
Development: http://localhost:3001
Production: https://api.blindbargain.com
```

## Authentication
Currently, the API does not require authentication. In production, implement JWT or API key authentication.

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-19T22:00:00.000Z",
  "uptime": 12345.67
}
```

---

### 2. Analyze Screenshot

**POST** `/api/analyze`

Analyze a screenshot and extract product listings using GPT-4 Vision.

**Request Body:**
```json
{
  "screenshot": "base64_encoded_image_string",
  "platform": "amazon" // optional
}
```

**Response:**
```json
{
  "products": [
    {
      "name": "iPhone 15 Pro 256GB",
      "price": 450000,
      "currency": "NGN",
      "seller": "TechStore Nigeria",
      "rating": 4.8,
      "reviewCount": 1234,
      "availability": "in_stock",
      "shipping": 2500,
      "url": null,
      "platform": "amazon",
      "extractedAt": "2024-01-19T22:00:00.000Z"
    }
  ],
  "processingTime": 3456,
  "cached": false,
  "screenshotHash": "abc123..."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid screenshot or missing required fields
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - AI analysis failed

**Notes:**
- Screenshots are cached for 1 hour using SHA-256 hash
- Maximum image size: 20MB
- Images are automatically optimized to 1280px width

---

### 3. Search Products

**POST** `/api/search`

Search for products across multiple platforms.

**Request Body:**
```json
{
  "productName": "iPhone 15",
  "platforms": ["amazon", "jumia", "konga"],
  "maxPrice": 500000, // optional
  "minRating": 4.0 // optional
}
```

**Response:**
```json
{
  "results": [
    {
      "platform": "amazon",
      "products": [...],
      "searchTime": 1234,
      "error": null
    }
  ],
  "bestDeal": {
    "name": "iPhone 15 Pro",
    "price": 445000,
    "currency": "NGN",
    ...
  },
  "totalProducts": 15
}
```

**Notes:**
- Search results are cached for 30 minutes
- Automatically scrapes all supported platforms
- Results are stored in database for analytics
- Supports: Amazon, eBay, AliExpress, Jumia, Konga, Walmart, Best Buy, Etsy, Target, and more

---

### 4. Get Supported Platforms

**GET** `/api/scrape/platforms`

Get list of all supported scraping platforms.

**Response:**
```json
{
  "platforms": ["amazon", "ebay", "aliexpress", "jumia", "konga", "walmart", "bestbuy", "etsy", "target"],
  "count": 9,
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

---

### 5. Scrape Platform (Direct)

**GET** `/api/scrape/:platform/:query`

Dynamically scrape any supported platform.

**URL Parameters:**
- `platform` - Platform name (amazon, ebay, jumia, konga, aliexpress, walmart, bestbuy, etsy, target)
- `query` - Search query

**Query Parameters:**
- `limit` (optional) - Maximum results (default: 20)

**Example Requests:**
```
GET /api/scrape/amazon/iPhone?limit=10
GET /api/scrape/ebay/laptops
GET /api/scrape/aliexpress/headphones?limit=15
GET /api/scrape/jumia/phones
GET /api/scrape/konga/keyboards
GET /api/scrape/walmart/monitors
GET /api/scrape/bestbuy/cameras
GET /api/scrape/etsy/vintage
GET /api/scrape/target/clothing
```

**Response:**
```json
{
  "platform": "amazon",
  "query": "iPhone 15",
  "products": [
    {
      "name": "iPhone 15 Pro 256GB",
      "price": 999.99,
      "currency": "USD",
      "seller": "Amazon",
      "rating": 4.8,
      "reviewCount": 1234,
      "availability": "in_stock",
      "shipping": 0,
      "url": "https://amazon.com/...",
      "platform": "amazon",
      "extractedAt": "2024-01-26T10:00:00.000Z"
    }
  ],
  "count": 5,
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

**Error Response (Unsupported Platform):**
```json
{
  "error": "Unsupported platform",
  "message": "Platform \"invalid\" is not supported. Available: amazon, ebay, aliexpress, jumia, konga, walmart, bestbuy, etsy, target",
  "supportedPlatforms": ["amazon", "ebay", "aliexpress", "jumia", "konga", "walmart", "bestbuy", "etsy", "target"]
}
```

**Platform Details:**

| Platform | Currency | Region | Type |
|----------|----------|--------|------|
| Amazon | USD | Global | Retail Giant |
| eBay | USD | Global | Marketplace |
| AliExpress | USD | China/Asia | Wholesale |
| Jumia | NGN | Nigeria/Africa | Regional |
| Konga | NGN | Nigeria | Regional |
| Walmart | USD | USA | Retail |
| Best Buy | USD | USA | Electronics |
| Etsy | USD | Global | Handmade/Vintage |
| Target | USD | USA | Retail |

---

### 6. Scrape Individual Platform Endpoints

**GET** `/api/scrape/amazon/:query`
**GET** `/api/scrape/ebay/:query`
**GET** `/api/scrape/konga/:query`
**GET** `/api/scrape/all/:query`

Directly scrape a specific platform or all platforms.

**Query Parameters:**
- `limit` (optional) - Maximum results per platform (default: 20)

**Response:**
```json
{
  "platform": "amazon",
  "query": "iPhone 15",
  "products": [
    {
      "name": "iPhone 15 Pro 256GB",
      "price": 999.99,
      "currency": "USD",
      "seller": "Amazon",
      "rating": 4.8,
      "reviewCount": 1234,
      "availability": "in_stock",
      "shipping": 0,
      "url": "https://amazon.com/...",
      "platform": "amazon",
      "extractedAt": "2024-01-26T10:00:00.000Z"
    }
  ],
  "count": 5,
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

**Example Requests:**
```
GET /api/scrape/amazon/iPhone?limit=10
GET /api/scrape/jumia/phones?limit=15
GET /api/scrape/konga/laptops
GET /api/scrape/all/headphones?limit=20
```

---

### 6. Scrape All Platforms

**GET** `/api/scrape/all/:query`
**POST** `/api/scrape/all/:query`

Scrape all supported platforms simultaneously.

**Query Parameters:**
- `limit` (optional) - Maximum results per platform (default: 20)
- `platforms` (optional) - Comma-separated list of platforms to scrape (default: all)

**POST Body (optional):**
```json
{
  "platforms": ["amazon", "ebay", "jumia"]
}
```

**Response:**
```json
{
  "query": "iPhone 15",
  "platforms": [
    {
      "platform": "amazon",
      "count": 10,
      "products": [...]
    },
    {
      "platform": "ebay",
      "count": 8,
      "products": [...]
    },
    {
      "platform": "jumia",
      "count": 5,
      "products": [...]
    }
  ],
  "totalProducts": 23,
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

**Example Requests:**
```
GET /api/scrape/all/iPhone?limit=10
GET /api/scrape/all/laptops?platforms=amazon,ebay,aliexpress
POST /api/scrape/all/phones with {"platforms": ["jumia", "konga", "amazon"]}
```

---

### 7. Get Recent Scraped Products

**GET** `/api/scrape/recent`

Get recently scraped products from all platforms.

**Query Parameters:**
- `limit` (optional) - Number of products to return (default: 50)
- `platform` (optional) - Filter by platform

**Response:**
```json
{
  "count": 50,
  "products": [
    {
      "id": "uuid",
      "product_name": "iPhone 15",
      "price": 999.99,
      "currency": "USD",
      "seller": "Amazon",
      "rating": 4.8,
      "review_count": 1234,
      "platform": "amazon",
      "product_url": "https://...",
      "scraped_at": "2024-01-26T10:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

**Example Requests:**
```
GET /api/scrape/recent?limit=100
GET /api/scrape/recent?platform=amazon
GET /api/scrape/recent?limit=50&platform=jumia
```

---

### 6. Get Scraping Statistics

**GET** `/api/scrape/stats`

Get platform scraping statistics.

**Response:**
```json
{
  "stats": [
    {
      "platform": "amazon",
      "total_products": 1250,
      "avg_price": 499.50,
      "min_price": 9.99,
      "max_price": 5999.99,
      "avg_rating": 4.3,
      "unique_sellers": 145,
      "last_scraped": "2024-01-26T10:00:00.000Z"
    },
    {
      "platform": "jumia",
      "total_products": 890,
      ...
    }
  ],
  "totalProducts": 3456,
  "timestamp": "2024-01-26T10:00:00.000Z"
}
```

---

### 7. Get Coupons

**GET** `/api/coupons/:store`

Get available coupons for a specific store.

**Parameters:**
- `store` (path) - Store name (e.g., "amazon", "jumia")

**Response:**
```json
{
  "store": "amazon",
  "coupons": [
    {
      "code": "SAVE20",
      "description": "20% off electronics",
      "discount": "20%",
      "expiresAt": "2024-02-01T00:00:00.000Z",
      "verified": true,
      "store": "amazon"
    }
  ],
  "count": 5
}
```

---

### 5. Add Coupon (Admin)

**POST** `/api/coupons`

Add a new coupon to the database.

**Request Body:**
```json
{
  "code": "SAVE20",
  "description": "20% off electronics",
  "discount": "20%",
  "store": "amazon",
  "expiresAt": "2024-02-01T00:00:00.000Z",
  "verified": true
}
```

**Response:**
```json
{
  "message": "Coupon added successfully",
  "coupon": { ... }
}
```

**Note:** This endpoint should be protected with authentication in production.

---

### 6. Track Affiliate Click

**POST** `/api/track-click`

Track an affiliate click and return the affiliate URL.

**Request Body:**
```json
{
  "productUrl": "https://amazon.com/product/123",
  "userId": "user-uuid", // optional
  "platform": "amazon",
  "productName": "iPhone 15", // optional
  "price": 450000 // optional
}
```

**Response:**
```json
{
  "affiliateUrl": "https://amazon.com/product/123?tag=blindbargain-20",
  "estimatedCommission": 13500,
  "tracked": true
}
```

**Commission Rates:**
- Amazon: 3%
- Jumia: 5%
- Konga: 4%
- eBay: 2.5%
- AliExpress: 8%

---

### 7. Get Affiliate Statistics

**GET** `/api/track-click/stats`

Get affiliate click statistics.

**Query Parameters:**
- `startDate` (optional) - Start date (ISO 8601)
- `endDate` (optional) - End date (ISO 8601)

**Response:**
```json
{
  "stats": [
    {
      "platform": "amazon",
      "clicks": 150,
      "total_commission": 45000,
      "avg_price": 300000
    }
  ],
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-19"
  }
}
```

---

## Rate Limiting

- **Window:** 1 hour
- **Max Requests:** 100 per IP address
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## Error Format

All errors follow this format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "statusCode": 400,
  "details": "Stack trace (development only)"
}
```

---

## Cost Optimization

### Caching Strategy
- **Screenshot Analysis:** 1 hour TTL (SHA-256 hash key)
- **Search Results:** 30 minutes TTL
- **API Usage Tracking:** 30 days retention

### Image Optimization
- Maximum width: 1280px
- JPEG quality: 80%
- Maximum size: 20MB

### OpenAI API Costs
- Model: GPT-4 Vision Preview
- Average cost per analysis: ~$0.02-0.05
- Token usage tracked per request
- Retry logic with exponential backoff

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  preferences JSONB,
  created_at TIMESTAMP
);
```

### Searches Table
```sql
CREATE TABLE searches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  query TEXT,
  results JSONB,
  platform VARCHAR(50),
  timestamp TIMESTAMP
);
```

### Affiliate Clicks Table
```sql
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_url TEXT,
  platform VARCHAR(50),
  product_name TEXT,
  price DECIMAL(10,2),
  estimated_commission DECIMAL(10,2),
  clicked_at TIMESTAMP
);
```

### Coupons Table
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code VARCHAR(100),
  description TEXT,
  discount VARCHAR(50),
  store VARCHAR(100),
  expires_at TIMESTAMP,
  verified BOOLEAN,
  created_at TIMESTAMP
);
```

---

## Testing with Postman

Import the Postman collection from `backend/postman_collection.json`.

Example requests are included for all endpoints.

---

## Development

### Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Run Migrations
```bash
npm run migrate
```

### Build for Production
```bash
npm run build
npm start
```

---

## Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Environment Variables
See `.env.example` for all required variables.

### Docker Deployment
```bash
docker-compose up -d
```

### Heroku Deployment
```bash
heroku create blindbargain-api
heroku addons:create heroku-postgresql:hobby-dev
heroku addons:create heroku-redis:hobby-dev
git push heroku main
```

---

## Support

For issues and questions, open an issue on GitHub.
