import React, { useMemo } from 'react';
import { Alert } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import useApi from '../../../hooks/useApi';
import LoadingSpinner from '../../common/LoadingSpinner';

const MobileAltcoinSeason = () => {
  const { data: rawData, loading, error } = useApi('/api/crypto/altcoin-season', 300000); // 5 minutes cache

  // Calculate current index and status
  const { currentIndex, seasonStatus, seasonColor, historicalData } = useMemo(() => {
    if (!rawData) return { currentIndex: 0, seasonStatus: 'Loading...', seasonColor: 'secondary', historicalData: [] };
    
    const index = Math.round(rawData.currentIndex || 0);
    let status, color;
    
    if (index >= 75) {
      status = 'Altcoin Season';
      color = 'success';
    } else if (index >= 50) {
      status = 'Neutral';
      color = 'warning';
    } else if (index >= 25) {
      status = 'Bitcoin Favored';
      color = 'info';
    } else {
      status = 'Bitcoin Season';
      color = 'danger';
    }
    
    return { 
      currentIndex: index, 
      seasonStatus: status, 
      seasonColor: color,
      historicalData: rawData.historicalData || []
    };
  }, [rawData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark p-2 rounded border">
          <p className="text-light mb-1 small">{new Date(label).toLocaleDateString()}</p>
          <p className="mb-0 small">
            <span className="text-primary">Index: </span>
            <span className="text-light">{data.index}%</span>
          </p>
          <p className="mb-0 small">
            <span className="text-muted">Alts outperforming: </span>
            <span className="text-light">{data.outperformingCount}/50</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && !rawData) {
    return (
      <div className="text-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning" className="mx-3">
        <i className="bi bi-exclamation-triangle me-2"></i>
        Unable to load Altcoin Season data
      </Alert>
    );
  }

  const badgeColorClass = seasonColor === 'danger' ? 'bg-danger' : 
                          seasonColor === 'warning' ? 'bg-warning' : 
                          seasonColor === 'info' ? 'bg-info' : 
                          seasonColor === 'success' ? 'bg-success' : 'bg-secondary';

  return (
    <div className="mobile-altcoin-season py-2">
      {/* Visual Scale with Pointer */}
      <div className="mb-4 px-4">
        <div className="position-relative" style={{ paddingTop: '35px' }}>
          {/* Numerical Label on Marker */}
          <div 
            className="position-absolute" 
            style={{ 
              left: `${currentIndex}%`, 
              top: '0',
              transform: 'translateX(-50%)',
              zIndex: 11
            }}
          >
            <div className="text-center">
              <div className={`${badgeColorClass} text-white px-2 py-1 rounded`} style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '2px' }}>
                {currentIndex}%
              </div>
              <div 
                style={{ 
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid #ffffff',
                  margin: '0 auto',
                  marginBottom: '4px'
                }}
              />
            </div>
          </div>
          
          {/* White Vertical Marker - moved outside scale bar */}
          <div 
            className="position-absolute" 
            style={{ 
              left: `${currentIndex}%`, 
              top: '35px',
              height: '26px',
              width: '4px',
              background: '#ffffff',
              transform: 'translateX(-50%)',
              zIndex: 10,
              boxShadow: '0 0 4px rgba(0,0,0,0.8)'
            }}
          />
          
          {/* Scale Bar */}
          <div className="position-relative" style={{ height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div 
              className="position-absolute h-100" 
              style={{ 
                left: '0', 
                width: '25%', 
                background: '#dc3545'
              }}
            />
            <div 
              className="position-absolute h-100" 
              style={{ 
                left: '25%', 
                width: '50%', 
                background: '#ffc107'
              }}
            />
            <div 
              className="position-absolute h-100" 
              style={{ 
                left: '75%', 
                width: '25%', 
                background: '#28a745'
              }}
            />
            
          </div>
          
        {/* Scale Labels */}
        <div className="d-flex justify-content-between mt-2">
          <small className="text-muted" style={{ fontSize: '11px' }}>0%</small>
          <small className="text-muted" style={{ fontSize: '11px', marginLeft: '5%' }}>25%</small>
          <small className="text-muted" style={{ fontSize: '11px', marginRight: '5%' }}>75%</small>
          <small className="text-muted" style={{ fontSize: '11px' }}>100%</small>
        </div>
        
          {/* Zone Labels */}
          <div className="d-flex justify-content-between mt-1">
            <small className="text-danger fw-bold" style={{ fontSize: '11px', marginLeft: '5%' }}>Bitcoin Season</small>
            <small className="text-warning fw-bold" style={{ fontSize: '11px' }}>Neutral</small>
            <small className="text-success fw-bold" style={{ fontSize: '11px', marginRight: '5%' }}>Altcoin Season</small>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      {historicalData && historicalData.length > 0 && (
        <div className="px-2" style={{ width: '100%', height: '200px' }}>
          <ResponsiveContainer>
            <ComposedChart data={historicalData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="altseasonGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28a745" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#28a745" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                stroke="#666"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                stroke="#666"
                tick={{ fontSize: 11 }}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              
              {/* Background areas */}
              <Area type="monotone" dataKey={() => 100} fill="url(#altseasonGradient)" stroke="none" />
              
              {/* Reference lines */}
              <ReferenceLine y={75} stroke="#28a745" strokeDasharray="5 5" />
              <ReferenceLine y={25} stroke="#dc3545" strokeDasharray="5 5" />
              
              {/* Main index line */}
              <Line 
                type="monotone" 
                dataKey="index" 
                stroke="#0d6efd" 
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MobileAltcoinSeason;