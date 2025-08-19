import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MarketRegime = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchRegimeData();
    }, []);

    const fetchRegimeData = async () => {
        try {
            setLoading(true);
            
            // Get CSRF token first
            const csrfResponse = await axios.get('/api/csrf-token');
            axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
            
            const response = await axios.get('/api/crypto/forecast/market-regime');
            setData(response.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch market regime data:', err);
            setError('Unable to load market regime');
        } finally {
            setLoading(false);
        }
    };

    const getRegimeColor = (regime) => {
        const colors = {
            'risk_on': 'success',
            'risk_off': 'danger',
            'transitional': 'warning',
            'neutral': 'secondary'
        };
        return colors[regime] || 'secondary';
    };

    const getRegimeIcon = (regime) => {
        const icons = {
            'risk_on': 'fas fa-arrow-trend-up',
            'risk_off': 'fas fa-arrow-trend-down',
            'transitional': 'fas fa-exchange-alt',
            'neutral': 'fas fa-minus'
        };
        return icons[regime] || 'fas fa-question';
    };

    const getRiskLevelColor = (riskLevel) => {
        const colors = {
            'very_low': 'success',
            'low': 'info',
            'medium': 'warning',
            'high': 'danger',
            'very_high': 'danger'
        };
        return colors[riskLevel] || 'secondary';
    };

    const formatDuration = (hours) => {
        if (hours < 24) {
            return `${Math.round(hours)}h`;
        } else if (hours < 168) {
            return `${Math.round(hours / 24)}d`;
        } else {
            return `${Math.round(hours / 168)}w`;
        }
    };

    const getTrendIcon = (direction) => {
        const icons = {
            'up': 'fas fa-arrow-up text-success',
            'down': 'fas fa-arrow-down text-danger',
            'sideways': 'fas fa-arrows-left-right text-warning'
        };
        return icons[direction] || 'fas fa-minus text-secondary';
    };

    if (loading) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-bar me-2"></i>
                        Market Regime
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Analyzing market conditions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-bar me-2"></i>
                        Market Regime
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="text-warning mb-3">
                        <i className="fas fa-exclamation-triangle fa-2x"></i>
                    </div>
                    <p className="text-muted">{error}</p>
                    <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchRegimeData}
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
                    <i className="fas fa-chart-bar me-2"></i>
                    Market Regime
                </h6>
                <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={fetchRegimeData}
                    title="Refresh data"
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
            </div>
            <div className="card-body">
                {/* Main Regime Status */}
                <div className="text-center mb-4">
                    <div className={`badge bg-${getRegimeColor(data.regime)} fs-6 px-3 py-2 mb-2`}>
                        <i className={`${getRegimeIcon(data.regime)} me-2`}></i>
                        {data.regime.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-muted small">
                        Confidence: <span className="text-light">{data.confidence ? (data.confidence * 100).toFixed(0) : '--'}%</span>
                    </div>
                </div>

                {/* Risk Level and Duration */}
                <div className="row mb-3">
                    <div className="col-6">
                        <div className="text-center">
                            <div className="text-muted small mb-1">Risk Level</div>
                            <span className={`badge bg-${getRiskLevelColor(data.risk_level)}`}>
                                {data.risk_level.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="text-center">
                            <div className="text-muted small mb-1">Duration</div>
                            <span className="text-light fw-bold">
                                {formatDuration(data.duration_hours)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Trend Direction */}
                <div className="text-center mb-3">
                    <div className="text-muted small mb-1">Trend Direction</div>
                    <i className={getTrendIcon(data.trend_direction)}></i>
                    <span className="ms-2 text-light">
                        {data.trend_direction.charAt(0).toUpperCase() + data.trend_direction.slice(1)}
                    </span>
                </div>

                {/* Description */}
                <div className="alert alert-dark border-secondary mb-3">
                    <div className="small text-muted">
                        {data.description}
                    </div>
                </div>

                {/* Key Indicators */}
                {data.indicators && data.indicators.length > 0 && (
                    <div className="mb-3">
                        <div className="text-muted small mb-2">Key Indicators:</div>
                        <div className="d-flex flex-wrap gap-1">
                            {data.indicators.map((indicator, index) => (
                                <span key={index} className="badge bg-secondary bg-opacity-50 text-light small">
                                    {indicator.replace('_', ' ')}
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

export default MarketRegime;