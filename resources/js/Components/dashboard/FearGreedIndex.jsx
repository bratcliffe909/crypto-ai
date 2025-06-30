import React from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { BsExclamationTriangle, BsInfoCircleFill } from 'react-icons/bs';
import useApi from '../../hooks/useApi';
import LoadingSpinner from '../common/LoadingSpinner';
import Tooltip from '../common/Tooltip';
import TimeAgo from '../common/TimeAgo';

const FearGreedIndex = () => {
  const { data, loading, error, lastFetch } = useApi('/api/crypto/fear-greed');

  const value = data?.data?.data?.[0]?.value || 0;
  const classification = data?.data?.data?.[0]?.value_classification || 'Unknown';

  const getColorClass = (val) => {
    if (val < 25) return 'danger';
    if (val < 45) return 'warning';
    if (val < 55) return 'secondary';
    if (val < 75) return 'info';
    return 'success';
  };

  const getDescription = (val) => {
    if (val < 25) return 'The market is experiencing extreme fear. This could be a buying opportunity.';
    if (val < 45) return 'Fear is present in the market. Investors are cautious.';
    if (val < 55) return 'The market sentiment is neutral.';
    if (val < 75) return 'Greed is starting to take over. Be cautious of overvaluation.';
    return 'Extreme greed in the market. Consider taking profits.';
  };


  // Calculate needle rotation angle (from -90 to 90 degrees)
  const getNeedleAngle = (val) => {
    return (val / 100) * 180 - 90;
  };

  // Get color for the gauge segment
  const getGaugeColor = (val) => {
    if (val < 25) return '#dc3545'; // danger - red
    if (val < 45) return '#ffc107'; // warning - yellow
    if (val < 55) return '#6c757d'; // secondary - gray
    if (val < 75) return '#0dcaf0'; // info - cyan
    return '#198754'; // success - green
  };

  const Speedometer = ({ value }) => {
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    const needleAngle = getNeedleAngle(value);

    // Create gauge segments
    const segments = [
      { start: -90, end: -54, color: '#dc3545', label: 'Extreme Fear' }, // 0-20
      { start: -54, end: -18, color: '#ffc107', label: 'Fear' }, // 20-40
      { start: -18, end: 18, color: '#6c757d', label: 'Neutral' }, // 40-60
      { start: 18, end: 54, color: '#0dcaf0', label: 'Greed' }, // 60-80
      { start: 54, end: 90, color: '#198754', label: 'Extreme Greed' } // 80-100
    ];

    const createArcPath = (startAngle, endAngle, innerRadius = radius) => {
      const start = polarToCartesian(centerX, centerY, innerRadius, endAngle);
      const end = polarToCartesian(centerX, centerY, innerRadius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      
      return `M ${start.x} ${start.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
    };

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };

    return (
      <svg width="300" height="200" viewBox="0 0 300 200" className="w-100">
        {/* Gauge segments */}
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.start, segment.end)}
            fill="none"
            stroke={segment.color}
            strokeWidth="30"
            strokeLinecap="round"
          />
        ))}

        {/* Gauge outline */}
        <path
          d={createArcPath(-90, 90, radius + 15)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          d={createArcPath(-90, 90, radius - 15)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Scale markers without numbers */}
        {[0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map((val) => {
          const angle = getNeedleAngle(val);
          const isMajor = val % 25 === 0;
          const inner = polarToCartesian(centerX, centerY, radius - (isMajor ? 20 : 15), angle);
          const outer = polarToCartesian(centerX, centerY, radius - 10, angle);
          return (
            <line
              key={val}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="currentColor"
              strokeWidth={isMajor ? "2" : "1"}
              opacity={isMajor ? "0.5" : "0.3"}
            />
          );
        })}

        {/* Needle */}
        <g transform={`rotate(${needleAngle} ${centerX} ${centerY})`}>
          <polygon
            points={`${centerX},${centerY - radius + 25} ${centerX - 5},${centerY + 10} ${centerX + 5},${centerY + 10}`}
            fill={getGaugeColor(value)}
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx={centerX} cy={centerY} r="8" fill={getGaugeColor(value)} stroke="currentColor" strokeWidth="2" />
        </g>

        {/* Center value display */}
        <text
          x={centerX}
          y={centerY + 40}
          textAnchor="middle"
          fontSize="36"
          fontWeight="bold"
          fill="currentColor"
        >
          {value}
        </text>
      </svg>
    );
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <h5 className="mb-0">Fear & Greed Index</h5>
          <Tooltip content={getDescription(value)}>
            <BsInfoCircleFill className="ms-2 text-muted" style={{ cursor: 'help' }} />
          </Tooltip>
        </div>
        <div className="d-flex align-items-center gap-2">
          {lastFetch && <TimeAgo date={lastFetch} />}
          {error && (
            <BsExclamationTriangle className="text-warning" title="Failed to update" />
          )}
        </div>
      </Card.Header>
      <Card.Body>
        {loading && !data ? (
          <LoadingSpinner />
        ) : (
          <div className="text-center">
            <Speedometer value={value} />
            <p className={`text-${getColorClass(value)} mb-2 fw-bold fs-5`}>
              {classification}
            </p>
            <p className="text-muted small mb-0">
              {getDescription(value)}
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default FearGreedIndex;