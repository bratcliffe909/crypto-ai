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