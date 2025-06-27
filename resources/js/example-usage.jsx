import React, { useEffect, useState } from 'react';
import apiClient from './utils/api';

// Example component showing how to use the API with CSRF protection
function CryptoMarkets() {
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMarkets();
    }, []);

    const fetchMarkets = async () => {
        try {
            setLoading(true);
            // The apiClient automatically handles CSRF tokens
            const data = await apiClient.getMarkets({
                vs_currency: 'usd',
                per_page: 10
            });
            setMarkets(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h2>Crypto Markets</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Price</th>
                        <th>24h Change</th>
                    </tr>
                </thead>
                <tbody>
                    {markets.map(coin => (
                        <tr key={coin.id}>
                            <td>{coin.name}</td>
                            <td>${coin.current_price.toLocaleString()}</td>
                            <td style={{ color: coin.price_change_percentage_24h > 0 ? 'green' : 'red' }}>
                                {coin.price_change_percentage_24h.toFixed(2)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default CryptoMarkets;