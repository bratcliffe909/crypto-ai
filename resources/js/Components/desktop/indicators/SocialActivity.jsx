import React, { useMemo } from 'react';
import useApi from '../../../hooks/useApi';
import TimeAgo from '../../common/TimeAgo';
import Tooltip from '../../common/Tooltip';
import { BsGraphUp, BsChatDots, BsInfoCircleFill } from 'react-icons/bs';

const SocialActivity = () => {
    const { data, loading, error, dataSource, lastUpdated } = useApi('/api/crypto/social-activity?days=365');

    const chartData = useMemo(() => {
        if (!data?.historical_data) return null;

        // Group data by month
        const monthlyData = {};
        data.historical_data.forEach(day => {
            const monthKey = day.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = [];
            }
            monthlyData[monthKey].push(day.normalized);
        });

        // Calculate monthly averages
        const months = Object.keys(monthlyData).sort().slice(-12); // Last 12 months
        return months.map(month => {
            const values = monthlyData[month];
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            return {
                month: month,
                value: Math.round(avg),
                label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })
            };
        });
    }, [data]);

    const maxValue = useMemo(() => {
        if (!chartData) return 100;
        return Math.max(...chartData.map(d => d.value), 100);
    }, [chartData]);

    if (loading) {
        return (
            <div className="social-activity-container card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0">
                            <BsChatDots className="me-2" />
                            Social Activity
                        </h5>
                        <Tooltip content="Tracks social media activity and volume trends for Bitcoin and major cryptocurrencies over the past 12 months. Higher values indicate increased social engagement.">
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

    if (error || !chartData) {
        return (
            <div className="social-activity-container card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <h5 className="mb-0">
                            <BsChatDots className="me-2" />
                            Social Activity
                        </h5>
                        <Tooltip content="Tracks social media activity and volume trends for Bitcoin and major cryptocurrencies over the past 12 months. Higher values indicate increased social engagement.">
                            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
                        </Tooltip>
                    </div>
                </div>
                <div className="card-body">
                    <div className="alert alert-warning mb-0" role="alert">
                        <small>Unable to load social activity data</small>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="social-activity-container card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <h5 className="mb-0">
                        <BsChatDots className="me-2" />
                        Social Activity
                    </h5>
                    <Tooltip content="Tracks social media activity and volume trends for Bitcoin and major cryptocurrencies over the past 12 months. Higher values indicate increased social engagement.">
                        <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
                    </Tooltip>
                </div>
                {lastUpdated && (
                    <TimeAgo date={lastUpdated} />
                )}
            </div>
            <div className="card-body">

            <div className="social-chart" style={{ height: '120px' }}>
                <div className="d-flex align-items-end justify-content-between h-100" style={{ paddingBottom: '20px' }}>
                    {chartData.map((month, index) => {
                        const barHeight = (month.value / maxValue) * 100;
                        const isRecent = index >= chartData.length - 3;
                        
                        return (
                            <div 
                                key={month.month} 
                                className="d-flex flex-column align-items-center"
                                style={{ flex: 1, maxWidth: `${100 / chartData.length}%` }}
                            >
                                <div 
                                    className="position-relative w-100 d-flex justify-content-center"
                                    style={{ height: '100px' }}
                                >
                                    <div
                                        className="social-bar"
                                        style={{
                                            width: '70%',
                                            height: `${barHeight}%`,
                                            backgroundColor: isRecent ? '#0d6efd' : '#6c757d',
                                            borderRadius: '2px 2px 0 0',
                                            transition: 'height 0.3s ease',
                                            alignSelf: 'flex-end',
                                            opacity: isRecent ? 1 : 0.7
                                        }}
                                        title={`${month.label}: ${month.value}%`}
                                    />
                                </div>
                                <small 
                                    className="text-muted mt-1" 
                                    style={{ 
                                        fontSize: '10px',
                                        writingMode: 'vertical-rl',
                                        textOrientation: 'mixed'
                                    }}
                                >
                                    {month.label}
                                </small>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">12-Month Trend</small>
                <small className="text-muted">
                    <BsGraphUp className="me-1" />
                    Normalized Activity
                </small>
            </div>

            {data?.coins_tracked && (
                <div className="text-center mt-2">
                    <small className="text-muted" style={{ fontSize: '11px' }}>
                        Tracking: {data.coins_tracked.join(', ')}
                    </small>
                </div>
            )}
            </div>
        </div>
    );
};

export default SocialActivity;