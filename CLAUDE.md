# Claude Development Guidelines for Crypto Graph Dashboard

## Critical Rules

### 1. NEVER Use Vite Dev Server
- **DO NOT** run `npm run dev` - it creates a hot file that breaks production
- **ALWAYS** use Traefik reverse proxy to access the application
- The app runs at `http://crypto-graph.localhost/`
- Build assets with `npm run build` inside the Docker container

### 2. API Architecture
- **ALL external API calls MUST go through Laravel backend**
- **NEVER** make direct API calls from React components
- Use the `useApi` hook for all API calls
- All API endpoints should be prefixed with `/api/crypto/`

### 3. Development Workflow
- Always run commands inside the Docker container: `docker exec crypto-graph-php <command>`
- Clear caches when needed: `php artisan cache:clear`, `php artisan config:clear`
- If you see a `/app/public/hot` file, remove it immediately
- Environment should be set to production for normal operation

## Project Structure

### Backend (Laravel)
- Controllers: `/app/Http/Controllers/Api/`
- Services: `/app/Services/` (CoinGeckoService, AlphaVantageService, etc.)
- Routes: `/routes/api.php`
- All external API integrations are handled here

### Frontend (React with Inertia.js)
- Components: `/resources/js/Components/` (uppercase C)
- Pages: `/resources/js/Pages/`
- Hooks: `/resources/js/hooks/`
- Utils: `/resources/js/utils/`

## Common Issues & Solutions

### Issue: Page shows blank or tries to connect to localhost:5173
**Solution:** Remove the hot file: `docker exec crypto-graph-php rm /app/public/hot`

### Issue: CORS errors when calling external APIs
**Solution:** Create a Laravel endpoint to proxy the request

### Issue: "toFixed is not a function" errors
**Solution:** Add null checks: `(value || 0).toFixed(2)`

## API Endpoints

### Market Data
- `/api/crypto/markets` - Get market data
- `/api/crypto/price/{ids}` - Get simple price
- `/api/crypto/trending` - Get trending coins
- `/api/crypto/exchange-rates` - Get exchange rates

### Charts
- `/api/crypto/bull-market-band` - Bull market support band data
- `/api/crypto/ohlc/{id}` - OHLC data

### Indicators
- `/api/crypto/fear-greed` - Fear & Greed index
- `/api/crypto/indicators/{symbol}` - Technical indicators
- `/api/crypto/economic-calendar` - Economic calendar
- `/api/crypto/news-feed` - News aggregation

### Market Metrics
- `/api/crypto/market-metrics/global` - Global market stats
- `/api/crypto/market-metrics/breadth` - Market breadth
- `/api/crypto/market-metrics/volatility` - Volatility metrics

## Code Style
- Use existing patterns and conventions
- All API calls use CSRF tokens
- Components handle loading, error, and empty states
- Use Bootstrap classes for styling
- Format prices and percentages using utility functions

## Testing Commands
```bash
# Check if the app is running
curl http://crypto-graph.localhost/

# Test an API endpoint
curl http://crypto-graph.localhost/api/crypto/markets?per_page=10

# Clear all caches
docker exec crypto-graph-php php artisan optimize:clear

# Build production assets
docker exec crypto-graph-php npm run build
```

## Caching Architecture

### Redis Cache Configuration
- Uses Redis as the primary cache store (`CACHE_STORE=redis`)
- Redis database 1 is dedicated to caching (`REDIS_CACHE_DB=1`)
- Cache prefix: `{app_name}_cache_` (e.g., `laravel_cache_`)

### Cache Keys are GLOBAL (Not User-Specific)
All coin prices and market data are cached globally for all users:
- Market data: `coingecko_markets_{currency}_{perPage}_{ids}`
- Simple price: `price_{ids}_{vsCurrencies}`
- Individual coins: `coin_data_{coinId}`
- OHLC/Chart data: `ohlc_{id}_{vsCurrency}_{days}`

### Cache Durations
- **Fresh cache**: 60 seconds (1 minute)
- **Stale cache**: 86,400 seconds (24 hours)
- **Individual coins**: 300 seconds (5 minutes) when fetched as wallet data

### CacheService Features
1. **Metadata tracking**: Each cache entry has a `{key}_meta` entry with timestamp
2. **Fallback mechanism**: Primary API → Fallback API → Stale cache → Empty
3. **Historical data caching**: Intelligent gap-filling for chart data
4. **Statistics tracking**: Cache hits, API failures, rate limits

### User-Specific Data (Browser localStorage)
- Portfolio balances: `portfolio`
- Favorite coins: `favorites`
- Cached wallet data: `cachedWalletData`

### Wallet Component Caching (Recent Update)
Both desktop and mobile wallet components now implement client-side caching:
- Uses localStorage key `cachedWalletData` shared between desktop/mobile
- Shows cached data with visual indicators when API fails
- Loading placeholders for newly added coins
- Stale data shown with reduced opacity and warning icon