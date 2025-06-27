import React from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import useApi from '../../hooks/useApi';

const MarketDominance = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/market-metrics/global', 300000); // 5 minutes
  
  const COLORS = {
    btc: '#F7931A',
    eth: '#627EEA',
    others: '#6B7280'
  };
  
  const formatData = () => {
    if (!data || !data.marketCapPercentage) return [];
    
    return [
      { name: 'Bitcoin', value: data.marketCapPercentage.btc, color: COLORS.btc },
      { name: 'Ethereum', value: data.marketCapPercentage.eth, color: COLORS.eth },
      { name: 'Others', value: data.marketCapPercentage.others, color: COLORS.others }
    ];
  };
  
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="fw-bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };
  
  const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Market Dominance
          </h5>
          {lastFetch && (
            <small className="text-muted">Updated {timeSince(lastFetch)}</small>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
          </div>
        )}
        
        {error && (
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
        
        {data && !loading && !error && (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={formatData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formatData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${(value || 0).toFixed(2)}%`}
                contentStyle={{ 
                  backgroundColor: 'var(--bs-body-bg)', 
                  border: '1px solid var(--bs-border-color)' 
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => {
                  const item = formatData().find(d => d.name === value);
                  return `${value}: ${(item?.value || 0).toFixed(1)}%`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card.Body>
    </Card>
  );
};

export default MarketDominance;