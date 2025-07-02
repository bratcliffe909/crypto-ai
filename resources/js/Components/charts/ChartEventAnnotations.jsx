import React, { useEffect, useState } from 'react';
import { Annotate, SvgPathAnnotation } from '@react-financial-charts/annotations';
import { format } from 'd3-format';
import { timeFormat } from 'd3-time-format';
import useApi from '../../hooks/useApi';

const ChartEventAnnotations = ({ 
  chartData, 
  xScale, 
  yScale, 
  timeframe = 'daily',
  height
}) => {
  const [annotations, setAnnotations] = useState([]);
  
  // Get date range from chart data
  const startDate = chartData && chartData.length > 0 
    ? new Date(chartData[0].date).toISOString().split('T')[0]
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
  const endDate = chartData && chartData.length > 0
    ? new Date(chartData[chartData.length - 1].date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const { data: annotationData } = useApi(
    `/api/crypto/chart-annotations?start_date=${startDate}&end_date=${endDate}&timeframe=${timeframe}`,
    300000 // 5 minute cache
  );

  useEffect(() => {
    if (annotationData && annotationData.annotations) {
      // Filter annotations to only include those within the chart data range
      const filteredAnnotations = annotationData.annotations.filter(annotation => {
        const annotationDate = new Date(annotation.date);
        return chartData.some(d => {
          const dataDate = new Date(d.date);
          return Math.abs(dataDate - annotationDate) < 24 * 60 * 60 * 1000; // Within 1 day
        });
      });
      setAnnotations(filteredAnnotations);
    }
  }, [annotationData, chartData]);

  if (!annotations.length || !xScale || !yScale) {
    return null;
  }

  // Create vertical line annotations for events
  const eventAnnotations = annotations.map((annotation, index) => {
    const datum = chartData.find(d => {
      const dataDate = new Date(d.date).toDateString();
      const annotationDate = new Date(annotation.date).toDateString();
      return dataDate === annotationDate;
    });

    if (!datum) return null;

    const x = xScale(new Date(datum.date));
    const yStart = 0;
    const yEnd = height;

    return (
      <Annotate
        key={`event-${index}`}
        with={SvgPathAnnotation}
        when={d => d.date === datum.date}
        usingProps={{
          path: ({ xScale, yScale }) => {
            const x = xScale(new Date(datum.date));
            return `M ${x} ${yStart} L ${x} ${yEnd}`;
          },
          stroke: annotation.color,
          strokeWidth: annotation.impact === 'high' ? 2 : 1,
          strokeDasharray: annotation.impact === 'high' ? 'none' : '5,5',
          opacity: 0.7,
          onMouseEnter: (e) => {
            // Show tooltip on hover
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-event-tooltip';
            tooltip.innerHTML = `
              <div style="background: #212529; color: white; padding: 8px; border-radius: 4px; font-size: 12px; max-width: 200px; border: 1px solid ${annotation.color};">
                <strong>${annotation.primaryEvent}</strong><br/>
                ${new Date(annotation.date).toLocaleDateString()}<br/>
                <span style="color: ${annotation.color}">Impact: ${annotation.impact}</span>
                ${annotation.events.length > 1 ? `<br/><small>+${annotation.events.length - 1} more events</small>` : ''}
              </div>
            `;
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY - 10}px`;
            tooltip.style.zIndex = '1000';
            tooltip.style.pointerEvents = 'none';
            document.body.appendChild(tooltip);
            
            // Store tooltip reference
            e.target._tooltip = tooltip;
          },
          onMouseLeave: (e) => {
            // Remove tooltip
            if (e.target._tooltip) {
              document.body.removeChild(e.target._tooltip);
              delete e.target._tooltip;
            }
          }
        }}
      />
    );
  }).filter(Boolean);

  // Add event markers at the top of the chart
  const eventMarkers = annotations.map((annotation, index) => {
    const datum = chartData.find(d => {
      const dataDate = new Date(d.date).toDateString();
      const annotationDate = new Date(annotation.date).toDateString();
      return dataDate === annotationDate;
    });

    if (!datum) return null;

    const x = xScale(new Date(datum.date));
    const y = 20; // Fixed position at top

    return (
      <g key={`marker-${index}`} transform={`translate(${x}, ${y})`}>
        <circle
          r={4}
          fill={annotation.color}
          stroke="#ffffff"
          strokeWidth={1}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => {
            // Show detailed tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-event-tooltip-detailed';
            tooltip.innerHTML = `
              <div style="background: #212529; color: white; padding: 12px; border-radius: 6px; font-size: 12px; max-width: 250px; border: 1px solid ${annotation.color}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <h6 style="margin: 0 0 8px 0; color: ${annotation.color};">${annotation.primaryEvent}</h6>
                <div style="margin-bottom: 4px;">${new Date(annotation.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                ${annotation.events.map(event => `
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <strong>${event.event}</strong> (${event.country})
                    ${event.actual !== null ? `<br/>Actual: ${event.actual}` : ''}
                    ${event.forecast !== null ? `<br/>Forecast: ${event.forecast}` : ''}
                    ${event.previous !== null ? `<br/>Previous: ${event.previous}` : ''}
                  </div>
                `).join('')}
              </div>
            `;
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
            tooltip.style.zIndex = '1001';
            tooltip.style.pointerEvents = 'none';
            document.body.appendChild(tooltip);
            
            e.target._detailedTooltip = tooltip;
          }}
          onMouseLeave={(e) => {
            if (e.target._detailedTooltip) {
              document.body.removeChild(e.target._detailedTooltip);
              delete e.target._detailedTooltip;
            }
          }}
        />
        {annotation.impact === 'high' && (
          <text
            x={0}
            y={-8}
            textAnchor="middle"
            fontSize="10"
            fill={annotation.color}
            fontWeight="bold"
          >
            !
          </text>
        )}
      </g>
    );
  }).filter(Boolean);

  return (
    <>
      {eventAnnotations}
      <g className="event-markers">
        {eventMarkers}
      </g>
    </>
  );
};

export default ChartEventAnnotations;