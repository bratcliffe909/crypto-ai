import React from 'react';
import useApi from '../../../hooks/useApi';
import { formatPrice } from '../../../utils/formatters';
import TimeAgo from '../../common/TimeAgo';
import Tooltip from '../../common/Tooltip';
import { BsArrowUp, BsArrowDown, BsDash, BsInfoCircleFill, BsQuestionCircleFill } from 'react-icons/bs';

const MarketSentiment = () => {
    const { data, loading, error, dataSource, lastUpdated } = useApi('/api/crypto/market-sentiment');

    const getSentimentLabel = (score) => {
        if (score >= 80) return 'Very Bullish';
        if (score >= 60) return 'Bullish';
        if (score >= 40) return 'Neutral';
        if (score >= 20) return 'Bearish';
        return 'Very Bearish';
    };

    const getSentimentIcon = (score) => {
        if (score >= 60) return <BsArrowUp className="text-success" />;
        if (score <= 40) return <BsArrowDown className="text-danger" />;
        return <BsDash className="text-warning" />;
    };

    const getSentimentColor = (score) => {
        if (score >= 80) return '#00FF00'; // Very Bullish - Bright Green
        if (score >= 60) return '#90EE90'; // Bullish - Light Green
        if (score >= 40) return '#FFD700'; // Neutral - Gold
        if (score >= 20) return '#FFA500'; // Bearish - Orange
        return '#FF0000'; // Very Bearish - Red
    };

    const getBarWidth = (percentage) => {
        return `${Math.min(100, Math.max(0, percentage))}%`;
    };

    if (loading) {
        return (
            <div className="market-sentiment-container card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0">Market Sentiment</h5>
                        <Tooltip content="Market sentiment calculated from real-time data: Price Momentum (25%), Market Breadth (25%), Bullish Strength (20%), Alt Activity (15%), and Trend Strength (15%). Score ranges from 0 (Very Bearish) to 100 (Very Bullish).">
                            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
                        </Tooltip>
                    </div>
                </div>
                <div className="card-body">
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="market-sentiment-container card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0">Market Sentiment</h5>
                        <Tooltip content="Market sentiment calculated from real-time data: Price Momentum (25%), Market Breadth (25%), Bullish Strength (20%), Alt Activity (15%), and Trend Strength (15%). Score ranges from 0 (Very Bearish) to 100 (Very Bullish).">
                            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
                        </Tooltip>
                    </div>
                </div>
                <div className="card-body">
                    <div className="alert alert-warning mb-0" role="alert">
                        <small>Unable to load market sentiment data</small>
                    </div>
                </div>
            </div>
        );
    }

    const sentimentScore = data.sentiment_score || 50;

    return (
        <div className="market-sentiment-container card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <h5 className="mb-0">Market Sentiment</h5>
                    <Tooltip content="Market sentiment calculated from real-time data: Price Momentum (25%), Market Breadth (25%), Bullish Strength (20%), Alt Activity (15%), and Trend Strength (15%). Score ranges from 0 (Very Bearish) to 100 (Very Bullish).">
                        <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
                    </Tooltip>
                </div>
                {lastUpdated && (
                    <TimeAgo date={lastUpdated} />
                )}
            </div>
            <div className="card-body">

            <div className="sentiment-meter mb-3">
                <div className="sentiment-score-container text-center mb-2">
                    <div className="d-flex align-items-center justify-content-center gap-2">
                        {getSentimentIcon(sentimentScore)}
                        <h2 className="mb-0" style={{ color: getSentimentColor(sentimentScore) }}>
                            {sentimentScore}
                        </h2>
                    </div>
                    <div className="sentiment-label">
                        {getSentimentLabel(sentimentScore)}
                    </div>
                </div>

                <div className="sentiment-bar mb-2">
                    <div 
                        className="sentiment-progress"
                        style={{
                            background: `linear-gradient(to right, 
                                #FF0000 0%, 
                                #FFA500 20%, 
                                #FFD700 40%, 
                                #90EE90 60%, 
                                #00FF00 100%)`,
                            height: '20px',
                            borderRadius: '10px',
                            position: 'relative'
                        }}
                    >
                        <div 
                            className="sentiment-indicator"
                            style={{
                                position: 'absolute',
                                left: `${sentimentScore}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '4px',
                                height: '28px',
                                backgroundColor: '#000',
                                borderRadius: '2px',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }}
                        />
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                        <small className="text-muted">Bearish</small>
                        <small className="text-muted">Neutral</small>
                        <small className="text-muted">Bullish</small>
                    </div>
                </div>
            </div>

            {data.components && (
                <div className="sentiment-components">
                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                                <span className="text-muted">Price Momentum</span>
                                <Tooltip content="Average 24h price change across all top 10 coins. Higher values indicate stronger upward momentum.">
                                    <BsQuestionCircleFill 
                                        className="ms-1 text-muted" 
                                        style={{ cursor: 'help', fontSize: '0.75rem' }} 
                                    />
                                </Tooltip>
                            </div>
                            <span>{data.components.price_momentum || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                    width: getBarWidth(data.components.price_momentum || 0),
                                    backgroundColor: (data.components.price_momentum || 0) > 50 ? '#90EE90' : '#FFA500'
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                                <span className="text-muted">Market Breadth</span>
                                <Tooltip content="Percentage of coins showing gains (>2% change). Higher values mean more coins are advancing.">
                                    <BsQuestionCircleFill 
                                        className="ms-1 text-muted" 
                                        style={{ cursor: 'help', fontSize: '0.75rem' }} 
                                    />
                                </Tooltip>
                            </div>
                            <span>{data.components.market_breadth || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                    width: getBarWidth(data.components.market_breadth || 0),
                                    backgroundColor: (data.components.market_breadth || 0) > 50 ? '#90EE90' : '#FFA500'
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                                <span className="text-muted">Bullish Strength</span>
                                <Tooltip content="Average gain size of advancing coins. Shows how strong the bullish moves are when they occur.">
                                    <BsQuestionCircleFill 
                                        className="ms-1 text-muted" 
                                        style={{ cursor: 'help', fontSize: '0.75rem' }} 
                                    />
                                </Tooltip>
                            </div>
                            <span>{data.components.bullish_strength || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                    width: getBarWidth(data.components.bullish_strength || 0),
                                    backgroundColor: (data.components.bullish_strength || 0) > 50 ? '#90EE90' : '#FFA500'
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                                <span className="text-muted">Alt Activity</span>
                                <Tooltip content="Altcoin trading volume relative to Bitcoin. Higher values indicate more alt activity (inverse of BTC dominance).">
                                    <BsQuestionCircleFill 
                                        className="ms-1 text-muted" 
                                        style={{ cursor: 'help', fontSize: '0.75rem' }} 
                                    />
                                </Tooltip>
                            </div>
                            <span>{data.components.alt_activity || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                    width: getBarWidth(data.components.alt_activity || 0),
                                    backgroundColor: (data.components.alt_activity || 0) > 50 ? '#90EE90' : '#FFA500'
                                }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                                <span className="text-muted">Trend Strength</span>
                                <Tooltip content="Market consensus level. Higher values mean most coins are moving in the same direction (unified trend).">
                                    <BsQuestionCircleFill 
                                        className="ms-1 text-muted" 
                                        style={{ cursor: 'help', fontSize: '0.75rem' }} 
                                    />
                                </Tooltip>
                            </div>
                            <span>{data.components.trend_strength || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div 
                                className="progress-bar" 
                                role="progressbar" 
                                style={{ 
                                    width: getBarWidth(data.components.trend_strength || 0),
                                    backgroundColor: (data.components.trend_strength || 0) > 50 ? '#90EE90' : '#FFA500'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {data.coins_analyzed && (
                <div className="text-center mt-2">
                    <small className="text-muted">
                        Based on {data.coins_analyzed} top cryptocurrencies
                        {data.avg_change !== undefined && (
                            <span> • Avg change: {data.avg_change > 0 ? '+' : ''}{data.avg_change}%</span>
                        )}
                    </small>
                </div>
            )}
            </div>
        </div>
    );
};

export default MarketSentiment;