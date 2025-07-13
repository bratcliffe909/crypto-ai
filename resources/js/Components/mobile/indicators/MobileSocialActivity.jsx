import React, { useMemo } from 'react';
import useApi from '../../../hooks/useApi';
import TimeAgo from '../../common/TimeAgo';
import Tooltip from '../../common/Tooltip';
import { BsGraphUp, BsChatDots, BsInfoCircleFill } from 'react-icons/bs';

const MobileSocialActivity = () => {
    const { data, loading, error, dataSource, lastUpdated } = useApi('/api/crypto/social-activity?days=30');

    const chartData = useMemo(() => {
        if (!data?.historical_data) return null;

        // For mobile, show last 30 days as daily data
        const recentData = data.historical_data.slice(-30);
        
        // Group into weekly averages for mobile display
        const weeklyData = [];
        for (let i = 0; i < recentData.length; i += 7) {
            const weekData = recentData.slice(i, Math.min(i + 7, recentData.length));
            const avg = weekData.reduce((sum, day) => sum + day.normalized, 0) / weekData.length;
            
            const startDate = new Date(weekData[0].date);
            weeklyData.push({
                week: weekData[0].date,
                value: Math.round(avg),
                label: startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })
            });
        }
        
        return weeklyData;
    }, [data]);

    const maxValue = useMemo(() => {
        if (!chartData) return 100;
        return Math.max(...chartData.map(d => d.value), 100);
    }, [chartData]);

    if (loading) {
        return (
            <div className="mobile-social-activity">
                <div className="mobile-card">
                    <div className="mobile-card-header">
                        <div className="d-flex align-items-center">
                            <BsChatDots className="me-2" />
                            <h6 className="mb-0">Social Activity</h6>
                        </div>
                        {lastUpdated && (
                            <TimeAgo date={lastUpdated} />
                        )}
                    </div>
                    <div className="mobile-card-body">
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !chartData) {
        return (
            <div className="mobile-social-activity">
                <div className="mobile-card">
                    <div className="mobile-card-header">
                        <div className="d-flex align-items-center">
                            <BsChatDots className="me-2" />
                            <h6 className="mb-0">Social Activity</h6>
                        </div>
                    </div>
                    <div className="mobile-card-body">
                        <div className="alert alert-warning mb-0" role="alert">
                            <small>Unable to load social activity data</small>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-social-activity">
            <div className="mobile-card">
                <div className="mobile-card-header">
                    <div className="d-flex align-items-center">
                        <BsChatDots className="me-2" />
                        <h6 className="mb-0">Social Activity</h6>
                        <Tooltip content="Social media activity trend">
                            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help', fontSize: '0.75rem' }} />
                        </Tooltip>
                    </div>
                    {lastUpdated && (
                        <TimeAgo timestamp={lastUpdated} compact={true} />
                    )}
                </div>
                <div className="mobile-card-body">
                    <div className="social-chart-mobile" style={{ height: '120px' }}>
                        <div className="d-flex align-items-end justify-content-between h-100" style={{ paddingBottom: '20px' }}>
                            {chartData.map((week, index) => {
                                const barHeight = (week.value / maxValue) * 100;
                                const isRecent = index === chartData.length - 1;
                                
                                return (
                                    <div 
                                        key={week.week} 
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
                                                    width: '80%',
                                                    height: `${barHeight}%`,
                                                    backgroundColor: isRecent ? '#0d6efd' : '#6c757d',
                                                    borderRadius: '2px 2px 0 0',
                                                    transition: 'height 0.3s ease',
                                                    alignSelf: 'flex-end',
                                                    opacity: isRecent ? 1 : 0.7
                                                }}
                                                title={`${week.label}: ${week.value}%`}
                                            />
                                        </div>
                                        <small 
                                            className="text-muted mt-1" 
                                            style={{ fontSize: '9px' }}
                                        >
                                            {week.label}
                                        </small>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted">30-Day Trend</small>
                        <small className="text-muted">
                            <BsGraphUp className="me-1" />
                            Activity Level
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileSocialActivity;