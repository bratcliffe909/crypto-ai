import React from 'react';
import useApi from '../../../hooks/useApi';
import { formatPrice } from '../../../utils/formatters';
import TimeAgo from '../../common/TimeAgo';
import { BsArrowUp, BsArrowDown, BsDash } from 'react-icons/bs';

const MarketSentiment = () => {
    const { data, loading, error, dataSource, lastUpdated } = useApi('/api/crypto/market-sentiment');

    const getSentimentLabel = (score) => {
        if (score >= 80) return 'Extreme Greed';
        if (score >= 60) return 'Greed';
        if (score >= 40) return 'Neutral';
        if (score >= 20) return 'Fear';
        return 'Extreme Fear';
    };

    const getSentimentIcon = (score) => {
        if (score >= 60) return <BsArrowUp className="text-success" />;
        if (score <= 40) return <BsArrowDown className="text-danger" />;
        return <BsDash className="text-warning" />;
    };

    const getSentimentColor = (score) => {
        if (score >= 80) return '#FF0000'; // Extreme Greed - Red
        if (score >= 60) return '#FFA500'; // Greed - Orange
        if (score >= 40) return '#FFD700'; // Neutral - Gold
        if (score >= 20) return '#90EE90'; // Fear - Light Green
        return '#00FF00'; // Extreme Fear - Green
    };

    const getBarWidth = (percentage) => {
        return `${Math.min(100, Math.max(0, percentage))}%`;
    };

    if (loading) {
        return (
            <div className="market-sentiment-container card p-3">
                <h6 className="mb-3">Market Sentiment</h6>
                <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="market-sentiment-container card p-3">
                <h6 className="mb-3">Market Sentiment</h6>
                <div className="alert alert-warning mb-0" role="alert">
                    <small>Unable to load market sentiment data</small>
                </div>
            </div>
        );
    }

    const sentimentScore = data.sentiment_score || 50;
    const bullishPercentage = data.bullish_percentage || 0;
    const bearishPercentage = data.bearish_percentage || 0;
    const neutralPercentage = data.neutral_percentage || 0;

    return (
        <div className="market-sentiment-container card p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Market Sentiment</h6>
                {lastUpdated && (
                    <TimeAgo timestamp={lastUpdated} showCacheStatus={true} dataSource={dataSource} />
                )}
            </div>

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
                                #00FF00 0%, 
                                #90EE90 20%, 
                                #FFD700 40%, 
                                #FFA500 60%, 
                                #FF0000 100%)`,
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
                        <small className="text-muted">Fear</small>
                        <small className="text-muted">Neutral</small>
                        <small className="text-muted">Greed</small>
                    </div>
                </div>
            </div>

            <div className="sentiment-breakdown">
                <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-success">Bullish</span>
                        <span>{bullishPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                        <div 
                            className="progress-bar bg-success" 
                            role="progressbar" 
                            style={{ width: getBarWidth(bullishPercentage) }}
                        />
                    </div>
                </div>

                <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-danger">Bearish</span>
                        <span>{bearishPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                        <div 
                            className="progress-bar bg-danger" 
                            role="progressbar" 
                            style={{ width: getBarWidth(bearishPercentage) }}
                        />
                    </div>
                </div>

                <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-warning">Neutral</span>
                        <span>{neutralPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                        <div 
                            className="progress-bar bg-warning" 
                            role="progressbar" 
                            style={{ width: getBarWidth(neutralPercentage) }}
                        />
                    </div>
                </div>
            </div>

            {data.coins_analyzed && (
                <div className="text-center mt-2">
                    <small className="text-muted">
                        Based on {data.coins_analyzed} top cryptocurrencies
                    </small>
                </div>
            )}
        </div>
    );
};

export default MarketSentiment;