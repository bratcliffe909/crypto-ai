import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip,
    PieChart, Pie, Cell
} from 'recharts';

const CorrelationCharts = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [chartType, setChartType] = useState('bar'); // 'bar' or 'network'

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

    const getCorrelationChartData = () => {
        if (!data) return [];
        
        return [
            {
                name: 'VIX-BTC',
                fullName: 'Fear Index vs Bitcoin',
                correlation: Math.round(data.vix_btc * 100),
                description: data.vix_btc > 0 ? 'Bitcoin falls when fear rises' : 'Bitcoin resists market fear'
            },
            {
                name: 'DXY-BTC',
                fullName: 'US Dollar vs Bitcoin',
                correlation: Math.round(data.dxy_btc * 100),
                description: data.dxy_btc < 0 ? 'Strong dollar pressures Bitcoin' : 'Dollar weakness helps Bitcoin'
            },
            {
                name: 'SPY-BTC',
                fullName: 'S&P 500 vs Bitcoin',
                correlation: Math.round(data.spy_btc * 100),
                description: data.spy_btc > 0 ? 'Bitcoin follows stock trends' : 'Bitcoin moves independently'
            },
            {
                name: 'NASDAQ-ETH',
                fullName: 'Tech Stocks vs Ethereum',
                correlation: Math.round(data.nasdaq_eth * 100),
                description: data.nasdaq_eth > 0 ? 'Crypto follows tech sector' : 'Crypto decoupled from tech'
            }
        ];
    };

    const getStrengthDistribution = () => {
        if (!data) return [];
        
        const correlations = [
            Math.abs(data.vix_btc * 100),
            Math.abs(data.dxy_btc * 100),
            Math.abs(data.spy_btc * 100),
            Math.abs(data.nasdaq_eth * 100)
        ];
        
        const strong = correlations.filter(c => c >= 60).length;
        const moderate = correlations.filter(c => c >= 30 && c < 60).length;
        const weak = correlations.filter(c => c < 30).length;
        
        return [
            { name: 'Strong (60%+)', value: strong, color: '#dc3545', emoji: '🔥' },
            { name: 'Moderate (30-60%)', value: moderate, color: '#ffc107', emoji: '⚡' },
            { name: 'Weak (<30%)', value: weak, color: '#28a745', emoji: '🌱' }
        ];
    };

    const getBarColor = (correlation) => {
        const abs = Math.abs(correlation);
        if (abs >= 60) return correlation > 0 ? '#28a745' : '#dc3545'; // Strong green/red
        if (abs >= 30) return correlation > 0 ? '#17a2b8' : '#fd7e14'; // Moderate blue/orange  
        return '#6c757d'; // Weak gray
    };

    if (loading) {
        return (
            <div className="card bg-dark border-secondary">
                <div className="card-header">
                    <h6 className="mb-0 text-light">
                        <i className="fas fa-chart-bar me-2"></i>
                        TradFi Correlation Charts
                    </h6>
                </div>
                <div className="card-body text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted mt-2">Loading correlation charts...</p>
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
                        TradFi Correlation Charts
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

    const correlationChartData = getCorrelationChartData();
    const strengthDistribution = getStrengthDistribution();

    return (
        <div className="card bg-dark border-secondary">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0 text-light">
                    <i className="fas fa-chart-bar me-2"></i>
                    TradFi Correlation Charts
                </h6>
                <div className="d-flex align-items-center">
                    <div className="btn-group btn-group-sm me-2">
                        <button 
                            className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setChartType('bar')}
                        >
                            📊 Bar
                        </button>
                        <button 
                            className={`btn ${chartType === 'network' ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setChartType('network')}
                        >
                            🥧 Pie
                        </button>
                    </div>
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
                {chartType === 'bar' && (
                    <>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={correlationChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: '#fff', fontSize: 12 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis 
                                        domain={[-100, 100]}
                                        tick={{ fill: '#fff', fontSize: 12 }}
                                        label={{ value: 'Correlation %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#fff' } }}
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
                                        labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                                    />
                                    <Bar dataKey="correlation">
                                        {correlationChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.correlation)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-3">
                            <div className="row text-center">
                                <div className="col-3">
                                    <div className="small text-success">Strong +</div>
                                    <div className="small">Move Together</div>
                                </div>
                                <div className="col-3">
                                    <div className="small text-info">Weak +</div>
                                    <div className="small">Loosely Together</div>
                                </div>
                                <div className="col-3">
                                    <div className="small text-warning">Weak -</div>
                                    <div className="small">Loosely Opposite</div>
                                </div>
                                <div className="col-3">
                                    <div className="small text-danger">Strong -</div>
                                    <div className="small">Move Opposite</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {chartType === 'network' && (
                    <>
                        <div className="row">
                            <div className="col-6">
                                <h6 className="text-light mb-3">Correlation Strength Distribution</h6>
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={strengthDistribution}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                dataKey="value"
                                                label={({ name, value, emoji }) => `${emoji} ${value}`}
                                            >
                                                {strengthDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: '#343a40', 
                                                    border: '1px solid #6c757d',
                                                    color: '#fff'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="col-6">
                                <h6 className="text-light mb-3">Current Relationships</h6>
                                <div className="list-group list-group-flush">
                                    {correlationChartData.map((item, index) => (
                                        <div key={index} className="list-group-item bg-transparent border-secondary text-light d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold">{item.name}</div>
                                                <small className="text-muted">{item.description}</small>
                                            </div>
                                            <div className="text-end">
                                                <span className={`badge bg-${Math.abs(item.correlation) >= 60 ? 'danger' : Math.abs(item.correlation) >= 30 ? 'warning' : 'success'}`}>
                                                    {item.correlation > 0 ? '+' : ''}{item.correlation}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}

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
            </div>
        </div>
    );
};

export default CorrelationCharts;