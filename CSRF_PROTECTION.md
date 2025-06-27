# CSRF Protection in Crypto Graph

This application uses Laravel's built-in CSRF protection for all API endpoints to ensure requests come from the authorized frontend.

## How It Works

1. **CSRF Token Generation**: Laravel generates a unique CSRF token for each session
2. **Token Distribution**: The token is made available to the frontend in two ways:
   - As a meta tag: `<meta name="csrf-token" content="{{ csrf_token() }}">`
   - As a JavaScript variable: `window.csrfToken`
3. **Token Validation**: All API requests must include the CSRF token in the `X-CSRF-TOKEN` header

## Frontend Implementation

The `apiClient` utility (`/resources/js/utils/api.js`) automatically handles CSRF tokens:

```javascript
// The apiClient automatically fetches and includes the CSRF token
import apiClient from './utils/api';

// Making API calls - CSRF token is handled automatically
const data = await apiClient.getMarkets({ vs_currency: 'usd' });
```

## Security Benefits

- Prevents cross-site request forgery attacks
- Ensures API requests come from your authorized frontend
- No need for complex authentication for a read-only crypto dashboard
- Session-based security without user logins

## Testing CSRF Protection

```bash
# Get CSRF token
curl -s http://crypto-graph.localhost/api/csrf-token -c cookies.txt

# Use token in API request
curl -s http://crypto-graph.localhost/api/crypto/markets \
  -H "X-CSRF-TOKEN: your-token-here" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b cookies.txt
```

## Configuration

CSRF protection is enabled in `/bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->validateCsrfTokens();
    $middleware->statefulApi();
})
```

All API routes use the 'web' middleware group to enable sessions and CSRF protection.