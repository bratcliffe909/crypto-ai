import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CorrelationMatrix = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchCorrelationData();
    }, []);

    const fetchCorrelationData = async () => {
        try {
            setLoading(true);
            
            // Get CSRF token first
            const csrfResponse = await axios.get('/api/csrf-token');
            axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
            
            const response = await axios.get('/api/crypto/forecast/correlation-matrix');
            setData(response.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch correlation data:', err);
            setError('Unable to load correlation data');
        } finally {
            setLoading(false);
        }
    };

    const getCorrelationColor = (value) => {
        if (value > 0.7) return 'bg-success text-white';
        if (value > 0.3) return 'bg-success bg-opacity-25 text-success';
        if (value > -0.3) return 'bg-secondary bg-opacity-25 text-secondary';
        if (value > -0.7) return 'bg-danger bg-opacity-25 text-danger';
        return 'bg-danger text-white';
    };

    const formatCorrelation = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '--';
        return (value > 0 ? '+' : '') + Number(value).toFixed(2);
    };

    const getCorrelationLabel = (key) => {
        const labels = {
            'vix_btc': 'VIX-BTC',
            'dxy_btc': 'DXY-BTC',
            'spy_btc': 'SPY-BTC',
            'nasdaq_eth': 'NASDAQ-ETH',
            'yields_btc': '10Y-BTC',
            'gold_btc': 'GOLD-BTC'
        };
        return labels[key] || key.toUpperCase();
    };

    const getCorrelationDescription = (key, value) => {
        const descriptions = {
            'vix_btc': value > 0.5 ? 'Bitcoin moving with fear' : 'Bitcoin diverging from VIX',
            'dxy_btc': value < -0.5 ? 'Strong dollar hurting Bitcoin' : 'Weak correlation with dollar',
            'spy_btc': value > 0.5 ? 'Risk-on sentiment' : 'Decoupled from stocks',
            'nasdaq_eth': value > 0.5 ? 'Tech correlation strong' : 'ETH independent of tech',
            'yields_btc': value < -0.5 ? 'Rising rates pressuring BTC' : 'Rates having little impact',
            'gold_btc': value > 0.5 ? 'Both seen as store of value' : 'Different inflation hedges'
        };
        return descriptions[key] || '';
    };

    if (loading) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-line me-2"></i>
                        TradFi Correlation Matrix
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Loading correlation data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-line me-2"></i>
                        TradFi Correlation Matrix
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="text-warning mb-3">
                        <i className="fas fa-exclamation-triangle fa-2x"></i>
                    </div>
                    <p className="text-muted">{error}</p>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchCorrelationData}
                    >
                        <i className="fas fa-redo me-1"></i>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-light">
                    <i className="fas fa-chart-line me-2"></i>
                    TradFi Correlation Matrix
                </h6>
                <div className="d-flex align-items-center">
                    <span className="badge bg-info me-2">
                        Confidence: {data.confidence ? (data.confidence * 100).toFixed(0) : '--'}%
                    </span>
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={fetchCorrelationData}
                        title="Refresh data"
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            <div className="card-body">
                <div className="row g-2">
                    {Object.entries(data)
                        .filter(([key]) => key.includes('_'))
                        .map(([key, value]) => (
                            <div key={key} className="col-6 col-lg-4">
                                <div className={`p-3 rounded text-center ${getCorrelationColor(value)}`}>
                                    <div className="fw-bold small mb-1">
                                        {getCorrelationLabel(key)}
                                    </div>
                                    <div className="h5 mb-1">
                                        {formatCorrelation(value)}
                                    </div>
                                    <div className="small opacity-75">
                                        {getCorrelationDescription(key, value)}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>

                <div className="row mt-3">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center text-muted small">
                            <span>
                                Sources: {data.data_sources?.join(', ') || 'Multiple APIs'}
                            </span>
                            <span>
                                {data.period_days}d period
                            </span>
                        </div>
                        {lastUpdated && (
                            <div className="text-muted small mt-1">
                                Updated: {lastUpdated.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="row mt-2">
                    <div className="col-12">
                        <div className="text-muted small">
                            <strong>Legend:</strong>
                            <span className="ms-2 badge bg-success">Strong +</span>
                            <span className="ms-1 badge bg-success bg-opacity-25 text-success">Weak +</span>
                            <span className="ms-1 badge bg-secondary bg-opacity-25 text-secondary">Neutral</span>
                            <span className="ms-1 badge bg-danger bg-opacity-25 text-danger">Weak -</span>
                            <span className="ms-1 badge bg-danger">Strong -</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CorrelationMatrix;