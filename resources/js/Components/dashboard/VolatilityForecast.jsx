import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VolatilityForecast = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchVolatilityData();
    }, []);

    const fetchVolatilityData = async () => {
        try {
            setLoading(true);
            
            // Get CSRF token first
            const csrfResponse = await axios.get('/api/csrf-token');
            axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
            
            const response = await axios.get('/api/crypto/forecast/volatility-forecast');
            setData(response.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch volatility data:', err);
            setError('Unable to load volatility forecast');
        } finally {
            setLoading(false);
        }
    };

    const getVolatilityColor = (level) => {
        if (level === 'very_low') return 'success';
        if (level === 'low') return 'info';
        if (level === 'medium') return 'warning';
        if (level === 'high') return 'danger';
        if (level === 'very_high') return 'danger';
        return 'secondary';
    };

    const getVolatilityIcon = (level) => {
        if (level === 'very_low') return 'fas fa-chart-line';
        if (level === 'low') return 'fas fa-chart-line';
        if (level === 'medium') return 'fas fa-chart-area';
        if (level === 'high') return 'fas fa-chart-bar';
        if (level === 'very_high') return 'fas fa-exclamation-triangle';
        return 'fas fa-chart-line';
    };

    const formatVolatility = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '--';
        return `${(Number(value) * 100).toFixed(1)}%`;
    };

    const formatConfidenceBand = (lower, upper) => {
        return `${formatVolatility(lower)} - ${formatVolatility(upper)}`;
    };

    if (loading) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-area me-2"></i>
                        Volatility Forecast
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Calculating volatility forecast...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-area me-2"></i>
                        Volatility Forecast
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="text-warning mb-3">
                        <i className="fas fa-exclamation-triangle fa-2x"></i>
                    </div>
                    <p className="text-muted">{error}</p>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchVolatilityData}
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
                    <i className="fas fa-chart-area me-2"></i>
                    Volatility Forecast
                </h6>
                <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={fetchVolatilityData}
                    title="Refresh data"
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>
            <div className="card-body">
                {/* 24h Forecast */}
                {data.forecast_24h && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">24h Forecast</span>
                            <span className={`badge bg-${getVolatilityColor(data.forecast_24h.level)}`}>
                                <i className={`${getVolatilityIcon(data.forecast_24h.level)} me-1`}></i>
                                {data.forecast_24h.level.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div className="row">
                            <div className="col-6">
                                <div className="text-center">
                                    <div className="h4 text-light mb-1">
                                        {formatVolatility(data.forecast_24h.expected)}
                                    </div>
                                    <div className="small text-muted">Expected</div>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="text-center">
                                    <div className="small text-light mb-1">
                                        {formatConfidenceBand(
                                            data.forecast_24h.confidence_band.lower,
                                            data.forecast_24h.confidence_band.upper
                                        )}
                                    </div>
                                    <div className="small text-muted">
                                        {data.forecast_24h.confidence ? (data.forecast_24h.confidence * 100).toFixed(0) : '--'}% Confidence
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7d Forecast */}
                {data.forecast_7d && (
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">7d Forecast</span>
                            <span className={`badge bg-${getVolatilityColor(data.forecast_7d.level)}`}>
                                <i className={`${getVolatilityIcon(data.forecast_7d.level)} me-1`}></i>
                                {data.forecast_7d.level.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <div className="row">
                            <div className="col-6">
                                <div className="text-center">
                                    <div className="h4 text-light mb-1">
                                        {formatVolatility(data.forecast_7d.expected)}
                                    </div>
                                    <div className="small text-muted">Expected</div>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="text-center">
                                    <div className="small text-light mb-1">
                                        {formatConfidenceBand(
                                            data.forecast_7d.confidence_band.lower,
                                            data.forecast_7d.confidence_band.upper
                                        )}
                                    </div>
                                    <div className="small text-muted">
                                        {data.forecast_7d.confidence ? (data.forecast_7d.confidence * 100).toFixed(0) : '--'}% Confidence
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Model Info */}
                {data.model_info && (
                    <div className="alert alert-dark border-secondary mb-3">
                        <div className="small">
                            <div className="text-muted mb-1">
                                <strong>Model:</strong> {data.model_info.type || 'Ensemble'}
                            </div>
                            {data.model_info.description && (
                                <div className="text-muted">
                                    {data.model_info.description}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Market Context */}
                {data.market_context && (
                    <div className="mb-3">
                        <div className="text-muted small mb-2">Market Context:</div>
                        <div className="d-flex flex-wrap gap-1">
                            {Object.entries(data.market_context).map(([key, value]) => (
                                <span key={key} className="badge bg-secondary bg-opacity-50 text-light small">
                                    {key.replace('_', ' ')}: {typeof value === 'number' && !isNaN(value) ? Number(value).toFixed(2) : value || '--'}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Updated */}
                {lastUpdated && (
                    <div className="text-center text-muted small">
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VolatilityForecast;