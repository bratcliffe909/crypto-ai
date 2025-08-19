import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MobileSectionHeader from '../common/MobileSectionHeader';
import MobileForecastCharts from './MobileForecastCharts';

const MobileForecast = () => {
    const [correlationData, setCorrelationData] = useState(null);
    const [regimeData, setRegimeData] = useState(null);
    const [volatilityData, setVolatilityData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');
    const [viewMode, setViewMode] = useState('text'); // 'text' or 'charts'

    useEffect(() => {
        fetchForecastData();
    }, []);

    const fetchForecastData = async () => {
        try {
            setLoading(true);
            
            // Get CSRF token first
            const csrfResponse = await axios.get('/api/csrf-token');
            axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfResponse.data.csrf_token;
            
            // Fetch all forecast data in parallel
            const [correlationResponse, regimeResponse, volatilityResponse] = await Promise.all([
                axios.get('/api/crypto/forecast/correlation-matrix'),
                axios.get('/api/crypto/forecast/market-regime'),
                axios.get('/api/crypto/forecast/volatility-forecast')
            ]);
            
            setCorrelationData(correlationResponse.data);
            setRegimeData(regimeResponse.data);
            setVolatilityData(volatilityResponse.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch forecast data:', err);
            setError('Unable to load forecast data');
        } finally {
            setLoading(false);
        }
    };

    const getMarketSentiment = () => {
        if (!regimeData || !correlationData) return null;

        const vixCorr = correlationData.vix_btc || 0;
        const dxyCorr = correlationData.dxy_btc || 0;
        const regime = regimeData.regime;

        if (regime === 'risk_on' || (vixCorr < 0 && dxyCorr > -0.3)) {
            return {
                emoji: '🚀',
                title: 'Bullish Conditions',
                description: 'Markets are showing positive momentum. Good time for crypto.',
                color: 'success'
            };
        }
        
        if (regime === 'risk_off' || (vixCorr > 0.7 && dxyCorr < -0.6)) {
            return {
                emoji: '⚠️',
                title: 'Bearish Conditions',
                description: 'Markets are showing stress signals. Exercise caution.',
                color: 'danger'
            };
        }

        return {
            emoji: '⚖️',
            title: 'Mixed Signals',
            description: 'Markets are showing conflicting signals. Stay alert for changes.',
            color: 'warning'
        };
    };

    const getVolatilityLevel = () => {
        if (!volatilityData?.forecast_24h?.expected) return null;
        
        const vol = volatilityData.forecast_24h.expected * 100;
        
        if (vol < 2) return { level: 'Low', emoji: '😌', color: 'success', description: 'Calm markets expected' };
        if (vol < 4) return { level: 'Medium', emoji: '🤔', color: 'warning', description: 'Some price swings expected' };
        return { level: 'High', emoji: '😰', color: 'danger', description: 'Expect significant price movements' };
    };

    const getInfluenceFactors = () => {
        if (!correlationData) return [];
        
        const factors = [];
        
        if (Math.abs(correlationData.vix_btc) > 0.5) {
            factors.push({
                name: 'Fear Index (VIX)',
                impact: correlationData.vix_btc > 0 ? 'negative' : 'positive',
                strength: Math.abs(correlationData.vix_btc),
                explanation: correlationData.vix_btc > 0 
                    ? 'When investors are fearful, Bitcoin tends to fall'
                    : 'Bitcoin is moving independently of market fear'
            });
        }
        
        if (Math.abs(correlationData.dxy_btc) > 0.5) {
            factors.push({
                name: 'US Dollar Strength',
                impact: correlationData.dxy_btc < 0 ? 'negative' : 'positive',
                strength: Math.abs(correlationData.dxy_btc),
                explanation: correlationData.dxy_btc < 0
                    ? 'Strong dollar is pressuring Bitcoin lower'
                    : 'Dollar strength is supporting Bitcoin'
            });
        }
        
        if (Math.abs(correlationData.spy_btc) > 0.4) {
            factors.push({
                name: 'Stock Market (S&P 500)',
                impact: correlationData.spy_btc > 0 ? 'positive' : 'negative',
                strength: Math.abs(correlationData.spy_btc),
                explanation: correlationData.spy_btc > 0
                    ? 'Bitcoin is following stock market trends'
                    : 'Bitcoin is moving opposite to stocks'
            });
        }
        
        return factors.sort((a, b) => b.strength - a.strength);
    };

    if (loading) {
        return (
            <div className="mobile-section">
                <MobileSectionHeader 
                    title="Market Forecast" 
                    subtitle="Loading market analysis..."
                />
                <div className="p-4 text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Analyzing market conditions...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mobile-section">
                <MobileSectionHeader 
                    title="Market Forecast" 
                    subtitle="Unable to load analysis"
                />
                <div className="p-4 text-center">
                    <div className="text-warning mb-3">
                        <i className="fas fa-exclamation-triangle fa-3x"></i>
                    </div>
                    <h5 className="text-muted mb-3">Something went wrong</h5>
                    <p className="text-muted mb-3">{error}</p>
                    <button 
                        className="btn btn-primary"
                        onClick={fetchForecastData}
                    >
                        <i className="fas fa-redo me-2"></i>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const sentiment = getMarketSentiment();
    const volatility = getVolatilityLevel();
    const influences = getInfluenceFactors();

    // If charts mode is selected, render the charts component
    if (viewMode === 'charts') {
        return <MobileForecastCharts />;
    }

    return (
        <div className="mobile-section">
            <MobileSectionHeader 
                title="Market Forecast" 
                subtitle="AI-powered crypto market analysis"
                lastUpdated={lastUpdated}
            />
            
            {/* View Mode Toggle */}
            <div className="px-3 pt-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="btn-group" role="group">
                        <button 
                            className={`btn btn-sm ${viewMode === 'text' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setViewMode('text')}
                        >
                            📝 Text
                        </button>
                        <button 
                            className={`btn btn-sm ${viewMode === 'charts' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setViewMode('charts')}
                        >
                            📊 Charts
                        </button>
                    </div>
                    <small className="text-muted">Choose your view</small>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="px-3 pt-3">
                <div className="btn-group w-100 mb-3" role="group">
                    <button 
                        className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        📊 Summary
                    </button>
                    <button 
                        className={`btn ${activeTab === 'details' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        🔍 Details
                    </button>
                    <button 
                        className={`btn ${activeTab === 'explain' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('explain')}
                    >
                        💡 Learn
                    </button>
                </div>
            </div>

            <div className="px-3 pb-3">
                {activeTab === 'summary' && (
                    <>
                        {/* Market Sentiment Card */}
                        {sentiment && (
                            <div className={`card border-${sentiment.color} mb-3`} style={{background: 'rgba(var(--bs-dark-rgb), 0.8)'}}>
                                <div className="card-body text-center">
                                    <div className="display-4 mb-2">{sentiment.emoji}</div>
                                    <h5 className={`text-${sentiment.color} mb-2`}>{sentiment.title}</h5>
                                    <p className="text-muted mb-3">{sentiment.description}</p>
                                    
                                    {regimeData.confidence && (
                                        <div className="progress mb-2" style={{height: '6px'}}>
                                            <div 
                                                className={`progress-bar bg-${sentiment.color}`}
                                                style={{width: `${regimeData.confidence * 100}%`}}
                                            ></div>
                                        </div>
                                    )}
                                    <small className="text-muted">
                                        Confidence: {regimeData.confidence ? (regimeData.confidence * 100).toFixed(0) : '--'}%
                                    </small>
                                </div>
                            </div>
                        )}

                        {/* Volatility Forecast */}
                        {volatility && (
                            <div className="row mb-3">
                                <div className="col-12">
                                    <div className={`card border-${volatility.color}`} style={{background: 'rgba(var(--bs-dark-rgb), 0.8)'}}>
                                        <div className="card-body">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div>
                                                    <h6 className="card-title mb-1">
                                                        Expected Price Movement (24h)
                                                    </h6>
                                                    <p className="text-muted small mb-0">{volatility.description}</p>
                                                </div>
                                                <div className="text-center">
                                                    <div className="display-6">{volatility.emoji}</div>
                                                    <div className={`fw-bold text-${volatility.color}`}>
                                                        {volatility.level}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Key Influences */}
                        {influences.length > 0 && (
                            <div className="card bg-dark border-secondary mb-3">
                                <div className="card-header">
                                    <h6 className="mb-0">🎯 What's Moving the Market</h6>
                                </div>
                                <div className="card-body">
                                    {influences.slice(0, 2).map((factor, index) => (
                                        <div key={index} className="d-flex align-items-center mb-3">
                                            <div className="me-3">
                                                <i className={`fas fa-circle text-${factor.impact === 'positive' ? 'success' : 'danger'}`}></i>
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold text-light">{factor.name}</div>
                                                <div className="small text-muted">{factor.explanation}</div>
                                            </div>
                                            <div className="text-end">
                                                <div className={`badge bg-${factor.impact === 'positive' ? 'success' : 'danger'}`}>
                                                    {factor.impact === 'positive' ? '📈' : '📉'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'details' && (
                    <>
                        {/* Detailed Market Regime */}
                        {regimeData && (
                            <div className="card bg-dark border-secondary mb-3">
                                <div className="card-header">
                                    <h6 className="mb-0">📈 Current Market Regime</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row text-center mb-3">
                                        <div className="col-4">
                                            <div className="text-muted small">Status</div>
                                            <div className="fw-bold text-warning">
                                                {regimeData.regime?.replace('_', ' ').toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="text-muted small">Risk Level</div>
                                            <div className="fw-bold text-info">
                                                {regimeData.risk_level?.replace('_', ' ').toUpperCase() || '--'}
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="text-muted small">Trend</div>
                                            <div className="fw-bold text-light">
                                                {regimeData.trend_direction?.charAt(0).toUpperCase() + regimeData.trend_direction?.slice(1) || '--'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {regimeData.description && (
                                        <div className="alert alert-info">
                                            <small>{regimeData.description}</small>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Detailed Correlations */}
                        {correlationData && (
                            <div className="card bg-dark border-secondary mb-3">
                                <div className="card-header">
                                    <h6 className="mb-0">🔗 Market Relationships</h6>
                                </div>
                                <div className="card-body">
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <div className="bg-secondary bg-opacity-25 rounded p-3 text-center">
                                                <div className="small text-muted mb-1">Fear vs Bitcoin</div>
                                                <div className="fw-bold text-warning">
                                                    {correlationData.vix_btc ? (correlationData.vix_btc > 0 ? '+' : '') + (correlationData.vix_btc * 100).toFixed(0) + '%' : '--'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-secondary bg-opacity-25 rounded p-3 text-center">
                                                <div className="small text-muted mb-1">USD vs Bitcoin</div>
                                                <div className="fw-bold text-danger">
                                                    {correlationData.dxy_btc ? (correlationData.dxy_btc > 0 ? '+' : '') + (correlationData.dxy_btc * 100).toFixed(0) + '%' : '--'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-secondary bg-opacity-25 rounded p-3 text-center">
                                                <div className="small text-muted mb-1">Stocks vs Bitcoin</div>
                                                <div className="fw-bold text-info">
                                                    {correlationData.spy_btc ? (correlationData.spy_btc > 0 ? '+' : '') + (correlationData.spy_btc * 100).toFixed(0) + '%' : '--'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-secondary bg-opacity-25 rounded p-3 text-center">
                                                <div className="small text-muted mb-1">Tech vs Ethereum</div>
                                                <div className="fw-bold text-success">
                                                    {correlationData.nasdaq_eth ? (correlationData.nasdaq_eth > 0 ? '+' : '') + (correlationData.nasdaq_eth * 100).toFixed(0) + '%' : '--'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-center mt-3">
                                        <small className="text-muted">
                                            Data confidence: {correlationData.confidence ? (correlationData.confidence * 100).toFixed(0) : '--'}%
                                        </small>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'explain' && (
                    <div className="card bg-dark border-secondary">
                        <div className="card-header">
                            <h6 className="mb-0">🎓 Understanding Market Forecasts</h6>
                        </div>
                        <div className="card-body">
                            <div className="accordion accordion-flush" id="explainAccordion">
                                <div className="accordion-item bg-transparent border-secondary">
                                    <h2 className="accordion-header">
                                        <button 
                                            className="accordion-button collapsed bg-dark text-light border-0" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#explain1"
                                        >
                                            What is Market Regime?
                                        </button>
                                    </h2>
                                    <div id="explain1" className="accordion-collapse collapse" data-bs-parent="#explainAccordion">
                                        <div className="accordion-body text-muted">
                                            Market regime tells us if investors are generally buying risky assets (like crypto) or 
                                            selling them for safer options. "Risk On" means people are optimistic and buying. 
                                            "Risk Off" means people are scared and selling.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="accordion-item bg-transparent border-secondary">
                                    <h2 className="accordion-header">
                                        <button 
                                            className="accordion-button collapsed bg-dark text-light border-0" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#explain2"
                                        >
                                            Why do correlations matter?
                                        </button>
                                    </h2>
                                    <div id="explain2" className="accordion-collapse collapse" data-bs-parent="#explainAccordion">
                                        <div className="accordion-body text-muted">
                                            Correlations show how Bitcoin moves compared to other markets. High positive correlation 
                                            (+70%+) means they move together. High negative correlation (-70%+) means they move opposite. 
                                            This helps predict Bitcoin's direction based on traditional markets.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="accordion-item bg-transparent border-secondary">
                                    <h2 className="accordion-header">
                                        <button 
                                            className="accordion-button collapsed bg-dark text-light border-0" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#explain3"
                                        >
                                            What is volatility forecasting?
                                        </button>
                                    </h2>
                                    <div id="explain3" className="accordion-collapse collapse" data-bs-parent="#explainAccordion">
                                        <div className="accordion-body text-muted">
                                            Volatility forecasting predicts how much Bitcoin's price might swing up or down. 
                                            Low volatility = small price changes. High volatility = big price swings (both up and down). 
                                            This helps you prepare for potential price movements.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="accordion-item bg-transparent border-secondary">
                                    <h2 className="accordion-header">
                                        <button 
                                            className="accordion-button collapsed bg-dark text-light border-0" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#explain4"
                                        >
                                            How accurate are these forecasts?
                                        </button>
                                    </h2>
                                    <div id="explain4" className="accordion-collapse collapse" data-bs-parent="#explainAccordion">
                                        <div className="accordion-body text-muted">
                                            These are statistical predictions based on historical patterns and current market conditions. 
                                            They're useful for understanding trends but not guarantees. Markets can be unpredictable, 
                                            especially crypto. Always do your own research and never invest more than you can afford to lose.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileForecast;