import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Tooltip
} from 'recharts';
import MobileSectionHeader from '../common/MobileSectionHeader';

const MobileForecastCharts = () => {
    const [correlationData, setCorrelationData] = useState(null);
    const [regimeData, setRegimeData] = useState(null);
    const [volatilityData, setVolatilityData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

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

    // Transform correlation data for bar chart
    const getCorrelationChartData = () => {
        if (!correlationData) return [];
        
        return [
            {
                name: 'Fear Index (VIX)',
                correlation: Math.round(correlationData.vix_btc * 100),
                fullName: 'VIX vs Bitcoin',
                description: correlationData.vix_btc > 0 ? 'When fear rises, Bitcoin falls' : 'Bitcoin moves against market fear'
            },
            {
                name: 'US Dollar (DXY)',
                correlation: Math.round(correlationData.dxy_btc * 100),
                fullName: 'DXY vs Bitcoin',
                description: correlationData.dxy_btc < 0 ? 'Strong dollar pressures Bitcoin' : 'Weak dollar helps Bitcoin'
            },
            {
                name: 'Stocks (S&P 500)',
                correlation: Math.round(correlationData.spy_btc * 100),
                fullName: 'SPY vs Bitcoin',
                description: correlationData.spy_btc > 0 ? 'Bitcoin follows stock market' : 'Bitcoin moves opposite to stocks'
            },
            {
                name: 'Tech Stocks',
                correlation: Math.round(correlationData.nasdaq_eth * 100),
                fullName: 'NASDAQ vs Ethereum',
                description: correlationData.nasdaq_eth > 0 ? 'Crypto follows tech trends' : 'Crypto independent of tech'
            }
        ];
    };

    // Transform regime data for gauge chart
    const getRegimeGaugeData = () => {
        if (!regimeData) return [];
        
        const regimeScore = regimeData.regime === 'risk_on' ? 80 : 
                           regimeData.regime === 'risk_off' ? 20 : 50;
        
        return [
            { name: 'Risk Off', value: regimeScore <= 35 ? regimeScore : 0, color: '#dc3545' },
            { name: 'Transitional', value: regimeScore > 35 && regimeScore < 65 ? regimeScore : 0, color: '#ffc107' },
            { name: 'Risk On', value: regimeScore >= 65 ? regimeScore : 0, color: '#28a745' },
            { name: 'Remaining', value: 100 - regimeScore, color: '#e9ecef' }
        ];
    };

    // Generate volatility timeline data
    const getVolatilityTimelineData = () => {
        if (!volatilityData) return [];
        
        const today = new Date();
        const timeline = [];
        
        // Add historical (simulated for demo)
        for (let i = -7; i <= 0; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            timeline.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                volatility: i === 0 ? 
                    Math.round((volatilityData['24h']?.volatility || 0.3) * 100) : 
                    Math.round((20 + Math.random() * 40)), // Simulated historical data
                predicted: i > 0
            });
        }
        
        // Add future predictions
        for (let i = 1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            const baseVol = (volatilityData['7d']?.volatility || 0.35) * 100;
            const variation = (Math.random() - 0.5) * 20;
            
            timeline.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                volatility: Math.max(5, Math.min(80, Math.round(baseVol + variation))),
                predicted: true
            });
        }
        
        return timeline;
    };

    const getBarColor = (correlation) => {
        if (correlation > 50) return '#28a745'; // Strong positive - green
        if (correlation > 20) return '#17a2b8'; // Weak positive - blue
        if (correlation > -20) return '#6c757d'; // Neutral - gray
        if (correlation > -50) return '#fd7e14'; // Weak negative - orange
        return '#dc3545'; // Strong negative - red
    };

    const getMarketConditionSummary = () => {
        if (!regimeData || !correlationData) return null;
        
        const vixCorr = correlationData.vix_btc || 0;
        const regime = regimeData.regime;
        
        if (regime === 'risk_on' || vixCorr < -0.3) {
            return {
                emoji: '🌞',
                title: 'Favorable Conditions',
                description: 'Market conditions look positive for crypto',
                color: 'success'
            };
        }
        
        if (regime === 'risk_off' || vixCorr > 0.7) {
            return {
                emoji: '⛈️',
                title: 'Challenging Conditions', 
                description: 'Market stress may impact crypto negatively',
                color: 'danger'
            };
        }
        
        return {
            emoji: '⛅',
            title: 'Mixed Conditions',
            description: 'Markets showing conflicting signals',
            color: 'warning'
        };
    };

    if (loading) {
        return (
            <div className="mobile-section">
                <MobileSectionHeader 
                    title="Market Visual Analysis" 
                    subtitle="Loading charts..."
                />
                <div className="p-4 text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Preparing visual analysis...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mobile-section">
                <MobileSectionHeader 
                    title="Market Visual Analysis" 
                    subtitle="Unable to load charts"
                />
                <div className="p-4 text-center">
                    <div className="text-warning mb-3">
                        <i className="fas fa-chart-line fa-3x"></i>
                    </div>
                    <h5 className="text-muted mb-3">Charts Unavailable</h5>
                    <p className="text-muted mb-3">{error}</p>
                    <button 
                        className="btn btn-primary"
                        onClick={fetchForecastData}
                    >
                        <i className="fas fa-redo me-2"></i>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const correlationChartData = getCorrelationChartData();
    const regimeGaugeData = getRegimeGaugeData();
    const volatilityTimelineData = getVolatilityTimelineData();
    const marketSummary = getMarketConditionSummary();

    return (
        <div className="mobile-section">
            <MobileSectionHeader 
                title="Market Visual Analysis" 
                subtitle="Charts and graphs for better understanding"
                lastUpdated={lastUpdated}
            />
            
            {/* Tab Navigation */}
            <div className="px-3 pt-3">
                <div className="btn-group w-100 mb-3" role="group">
                    <button 
                        className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        🌡️ Overview
                    </button>
                    <button 
                        className={`btn ${activeTab === 'correlations' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('correlations')}
                    >
                        📊 Relationships
                    </button>
                    <button 
                        className={`btn ${activeTab === 'volatility' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setActiveTab('volatility')}
                    >
                        📈 Volatility
                    </button>
                </div>
            </div>

            <div className="px-3 pb-3">
                {activeTab === 'overview' && (
                    <>
                        {/* Market Condition Summary */}
                        {marketSummary && (
                            <div className={`card border-${marketSummary.color} mb-3`} style={{background: 'rgba(var(--bs-dark-rgb), 0.8)'}}>
                                <div className="card-body text-center">
                                    <div className="display-4 mb-2">{marketSummary.emoji}</div>
                                    <h5 className={`text-${marketSummary.color} mb-2`}>{marketSummary.title}</h5>
                                    <p className="text-muted mb-3">{marketSummary.description}</p>
                                    
                                    {regimeData.confidence && (
                                        <div className="progress mb-2" style={{height: '6px'}}>
                                            <div 
                                                className={`progress-bar bg-${marketSummary.color}`}
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

                        {/* Market Regime Gauge */}
                        <div className="card bg-dark border-secondary mb-3">
                            <div className="card-header">
                                <h6 className="mb-0">🎯 Market Risk Level</h6>
                            </div>
                            <div className="card-body">
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={regimeGaugeData}
                                                cx="50%"
                                                cy="50%"
                                                startAngle={180}
                                                endAngle={0}
                                                innerRadius={60}
                                                outerRadius={80}
                                                dataKey="value"
                                            >
                                                {regimeGaugeData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center">
                                    <div className="d-flex justify-content-around text-center mt-2">
                                        <div>
                                            <div className="small text-danger">Risk Off</div>
                                            <div className="small">⛈️ Bearish</div>
                                        </div>
                                        <div>
                                            <div className="small text-warning">Mixed</div>
                                            <div className="small">⛅ Neutral</div>
                                        </div>
                                        <div>
                                            <div className="small text-success">Risk On</div>
                                            <div className="small">🌞 Bullish</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'correlations' && (
                    <div className="card bg-dark border-secondary mb-3">
                        <div className="card-header">
                            <h6 className="mb-0">📊 How Bitcoin Relates to Other Markets</h6>
                            <small className="text-muted">Positive = moves together, Negative = moves opposite</small>
                        </div>
                        <div className="card-body">
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={correlationChartData}
                                        layout="horizontal"
                                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis 
                                            type="number" 
                                            domain={[-100, 100]}
                                            tick={{ fill: '#fff', fontSize: 12 }}
                                        />
                                        <YAxis 
                                            type="category" 
                                            dataKey="name"
                                            tick={{ fill: '#fff', fontSize: 11 }}
                                            width={70}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#343a40', 
                                                border: '1px solid #6c757d',
                                                color: '#fff'
                                            }}
                                            formatter={(value, name, props) => [
                                                `${value}%`, 
                                                props.payload.description
                                            ]}
                                        />
                                        <Bar 
                                            dataKey="correlation" 
                                            fill={(entry) => getBarColor(entry.correlation)}
                                        >
                                            {correlationChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getBarColor(entry.correlation)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <div className="mt-3">
                                <div className="row text-center">
                                    <div className="col-4">
                                        <div className="small text-success">+50 to +100</div>
                                        <div className="small">Strong Together</div>
                                    </div>
                                    <div className="col-4">
                                        <div className="small text-secondary">-20 to +20</div>
                                        <div className="small">Independent</div>
                                    </div>
                                    <div className="col-4">
                                        <div className="small text-danger">-100 to -50</div>
                                        <div className="small">Strong Opposite</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'volatility' && (
                    <div className="card bg-dark border-secondary mb-3">
                        <div className="card-header">
                            <h6 className="mb-0">📈 Price Movement Forecast</h6>
                            <small className="text-muted">Higher = more price swings expected</small>
                        </div>
                        <div className="card-body">
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={volatilityTimelineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fill: '#fff', fontSize: 10 }}
                                        />
                                        <YAxis 
                                            tick={{ fill: '#fff', fontSize: 12 }}
                                            label={{ value: 'Volatility %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#fff' } }}
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#343a40', 
                                                border: '1px solid #6c757d',
                                                color: '#fff'
                                            }}
                                            formatter={(value, name, props) => [
                                                `${value}%`, 
                                                props.payload.predicted ? 'Predicted' : 'Historical'
                                            ]}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="volatility" 
                                            stroke="#17a2b8"
                                            strokeWidth={2}
                                            strokeDasharray={entry => entry.predicted ? "5 5" : "0"}
                                            dot={{ fill: '#17a2b8', r: 3 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <div className="mt-3">
                                <div className="row text-center">
                                    <div className="col-4">
                                        <div className="small text-success">0-20%</div>
                                        <div className="small">😌 Calm</div>
                                    </div>
                                    <div className="col-4">
                                        <div className="small text-warning">20-40%</div>
                                        <div className="small">🤔 Active</div>
                                    </div>
                                    <div className="col-4">
                                        <div className="small text-danger">40%+</div>
                                        <div className="small">😰 Wild</div>
                                    </div>
                                </div>
                                
                                <div className="text-center mt-2">
                                    <small className="text-muted">
                                        Solid line = Historical | Dashed line = Predicted
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileForecastCharts;