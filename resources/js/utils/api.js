// API utility functions with CSRF token support

class ApiClient {
    constructor() {
        this.baseURL = '/api';
        this.csrfToken = null;
    }

    async getCsrfToken() {
        if (!this.csrfToken) {
            try {
                const response = await fetch(`${this.baseURL}/csrf-token`, {
                    credentials: 'same-origin'
                });
                const data = await response.json();
                this.csrfToken = data.csrf_token;
                
                // Also get it from meta tag if available
                const metaToken = document.querySelector('meta[name="csrf-token"]');
                if (metaToken && metaToken.content) {
                    this.csrfToken = metaToken.content;
                }
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
            }
        }
        return this.csrfToken;
    }

    async request(url, options = {}) {
        const csrfToken = await this.getCsrfToken();
        
        const defaultOptions = {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        const response = await fetch(`${this.baseURL}${url}`, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return response.json();
    }

    // Market data methods
    async getMarkets(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/crypto/markets${queryString ? '?' + queryString : ''}`);
    }

    async getPrice(ids, vsCurrencies = 'usd') {
        return this.request(`/crypto/price/${ids}?vs_currencies=${vsCurrencies}`);
    }

    async getTrending() {
        return this.request('/crypto/trending');
    }

    async search(query) {
        return this.request(`/crypto/search?q=${encodeURIComponent(query)}`);
    }

    // Chart data methods
    async getOHLC(id, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/crypto/ohlc/${id}${queryString ? '?' + queryString : ''}`);
    }

    async getBullMarketBand(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/crypto/bull-market-band${queryString ? '?' + queryString : ''}`);
    }

    // Indicator methods
    async getFearGreedIndex(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/crypto/fear-greed${queryString ? '?' + queryString : ''}`);
    }
}

// Export singleton instance
export default new ApiClient();