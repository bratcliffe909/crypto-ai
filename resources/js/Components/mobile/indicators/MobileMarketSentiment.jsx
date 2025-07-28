import React from 'react';
import useApi from '../../../hooks/useApi';
import MobileSectionHeader from '../common/MobileSectionHeader';
import TimeAgo from '../../common/TimeAgo';
import { BsGraphUp, BsArrowUp, BsArrowDown, BsDash } from 'react-icons/bs';

const MobileMarketSentiment = () => {
    const { data: sentimentData, loading: sentimentLoading, error: sentimentError, lastUpdated } = useApi('/api/crypto/market-sentiment');
    const { data: socialData, loading: socialLoading, error: socialError } = useApi('/api/crypto/social-activity?days=30');

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
        if (score >= 80) return '#FF0000';
        if (score >= 60) return '#FFA500';
        if (score >= 40) return '#FFD700';
        if (score >= 20) return '#90EE90';
        return '#00FF00';
    };

    if (sentimentLoading || socialLoading) {
        return (
            <div className="mobile-section">
                <MobileSectionHeader title="Market Sentiment" icon={BsGraphUp} />
                <div className="p-3">
                    <div className="d-flex justify-content-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const sentimentScore = sentimentData?.sentiment_score || 50;
    const bullishPercentage = sentimentData?.bullish_percentage || 0;
    const bearishPercentage = sentimentData?.bearish_percentage || 0;
    const neutralPercentage = sentimentData?.neutral_percentage || 0;

    // Get last 7 days of social data for mobile
    const recentSocialData = socialData?.historical_data?.slice(-7) || [];
    const maxSocialValue = Math.max(...recentSocialData.map(d => d.normalized), 1);

    return (
        <div className="mobile-section">
            <div className="mobile-section-header">
                <div className="header-content">
                    <div className="d-flex align-items-center">
                        <BsGraphUp className="section-icon me-2" size={20} />
                        <h5 className="section-title mb-0">Market Sentiment</h5>
                    </div>
                    <div className="header-actions">
                        {lastUpdated && <TimeAgo date={lastUpdated} />}
                    </div>
                </div>
            </div>
            
            <div className="p-3">
                {/* Sentiment Score */}
                <div className="sentiment-card bg-dark rounded p-3 mb-3">
                    <div className="text-center">
                        <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                            {getSentimentIcon(sentimentScore)}
                            <h1 className="mb-0" style={{ color: getSentimentColor(sentimentScore), fontSize: '3rem' }}>
                                {sentimentScore}
                            </h1>
                        </div>
                        <h5 className="mb-3">{getSentimentLabel(sentimentScore)}</h5>
                        
                        {/* Sentiment Bar */}
                        <div className="sentiment-bar mb-3">
                            <div 
                                style={{
                                    background: `linear-gradient(to right, 
                                        #00FF00 0%, 
                                        #90EE90 20%, 
                                        #FFD700 40%, 
                                        #FFA500 60%, 
                                        #FF0000 100%)`,
                                    height: '25px',
                                    borderRadius: '12px',
                                    position: 'relative'
                                }}
                            >
                                <div 
                                    style={{
                                        position: 'absolute',
                                        left: `${sentimentScore}%`,
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '5px',
                                        height: '35px',
                                        backgroundColor: '#fff',
                                        borderRadius: '2px',
                                        boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                                    }}
                                />
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                                <small>Fear</small>
                                <small>Neutral</small>
                                <small>Greed</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sentiment Breakdown */}
                <div className="sentiment-breakdown bg-dark rounded p-3 mb-3">
                    <h6 className="mb-3">Market Distribution</h6>
                    
                    <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-success">Bullish</span>
                            <span className="text-success">{bullishPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                            <div 
                                className="progress-bar bg-success" 
                                style={{ width: `${bullishPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-danger">Bearish</span>
                            <span className="text-danger">{bearishPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                            <div 
                                className="progress-bar bg-danger" 
                                style={{ width: `${bearishPercentage}%` }}
                            />
                        </div>
                    </div>

                    <div className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-warning">Neutral</span>
                            <span className="text-warning">{neutralPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                            <div 
                                className="progress-bar bg-warning" 
                                style={{ width: `${neutralPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Social Activity Mini Chart */}
                {recentSocialData.length > 0 && (
                    <div className="social-activity-card bg-dark rounded p-3">
                        <h6 className="mb-3">7-Day Social Activity</h6>
                        <div style={{ height: '80px' }}>
                            <div className="d-flex align-items-end justify-content-between h-100">
                                {recentSocialData.map((day, index) => {
                                    const barHeight = (day.normalized / maxSocialValue) * 100;
                                    const date = new Date(day.date);
                                    const dayLabel = date.toLocaleDateString('en', { weekday: 'short' });
                                    
                                    return (
                                        <div 
                                            key={day.date} 
                                            className="d-flex flex-column align-items-center"
                                            style={{ flex: 1 }}
                                        >
                                            <div className="w-100 d-flex justify-content-center" style={{ height: '60px' }}>
                                                <div
                                                    style={{
                                                        width: '60%',
                                                        height: `${barHeight}%`,
                                                        backgroundColor: index === recentSocialData.length - 1 ? '#0d6efd' : '#6c757d',
                                                        borderRadius: '2px 2px 0 0',
                                                        alignSelf: 'flex-end'
                                                    }}
                                                />
                                            </div>
                                            <small className="text-muted mt-1" style={{ fontSize: '10px' }}>
                                                {dayLabel}
                                            </small>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {sentimentData?.coins_analyzed && (
                    <div className="text-center mt-3">
                        <small className="text-muted">
                            Based on {sentimentData.coins_analyzed} top cryptocurrencies
                        </small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileMarketSentiment;