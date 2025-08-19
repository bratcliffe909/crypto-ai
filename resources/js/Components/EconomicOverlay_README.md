# Economic Overlay Chart Components

Production-ready React components for displaying Bitcoin price correlation with traditional economic indicators.

## Components Overview

### 1. EconomicOverlayChart (Desktop)
- **Location**: `/components/dashboard/EconomicOverlayChart.jsx`
- **Purpose**: Full-featured desktop component with dual-axis charts
- **Features**:
  - Interactive dual Y-axis charts (Bitcoin + Economic Indicator)
  - Dropdown selector for 6 economic indicators
  - Time range buttons (1Y, 2Y, 5Y, All Time)
  - Real-time correlation strength display
  - Educational tooltips and pattern analysis
  - Historical event markers
  - Correlation zone visualization
  - Responsive Bootstrap design

### 2. MobileEconomicOverlay (Mobile)
- **Location**: `/components/mobile/MobileEconomicOverlay.jsx`
- **Purpose**: Touch-optimized mobile component
- **Features**:
  - Swipeable indicator carousel
  - Simplified chart with performance optimization
  - Collapsible detailed analysis
  - Educational modal for beginners
  - Touch-friendly time range selection
  - Quick insight cards

## Available Economic Indicators

| Indicator | ID | Color | Description |
|-----------|----|----|-----------|
| Federal Funds Rate | `federal_funds_rate` | #FF6B6B | Central bank overnight lending rate |
| CPI Inflation | `inflation_cpi` | #4ECDC4 | Consumer price index inflation |
| Unemployment Rate | `unemployment_rate` | #45B7D1 | Labor force unemployment percentage |
| DXY Dollar Index | `dxy_dollar_index` | #96CEB4 | US Dollar strength measure |
| 10Y Treasury Yield | `treasury_10y` | #FFD93D | 10-year government bond yield |
| M2 Money Supply | `money_supply_m2` | #F38BA8 | Broad money supply measure |

## API Integration

### Endpoints Used
- `GET /api/crypto/economic-overlay?indicator={id}&days={days}` - Main overlay data
- `GET /api/crypto/economic-indicators` - Available indicators config
- `GET /api/crypto/correlation-data?days={days}` - Correlation summary

### API Response Structure
```json
{
  "data": {
    "data": [
      {
        "date": "2025-05-11",
        "bitcoin_price": 104630.88,
        "federal_funds_rate": 4.33,
        "correlation": 0.67,
        "correlation_strength": "strong",
        "price_change_pct": 0.15
      }
    ],
    "metadata": {
      "indicator": "federal_funds_rate",
      "correlation": 0.67,
      "correlation_strength": "strong",
      "indicator_config": {
        "name": "Federal Funds Rate",
        "description": "...",
        "unit": "%",
        "color": "#FF6B6B"
      }
    }
  }
}
```

## Usage Examples

### Basic Desktop Usage
```jsx
import { EconomicOverlayChart } from '../components/dashboard';

function Dashboard() {
  return (
    <div>
      <EconomicOverlayChart 
        initialIndicator="FEDERAL_FUNDS_RATE"
        initialTimeRange="730"
        showEvents={true}
        showZones={true}
      />
    </div>
  );
}
```

### Basic Mobile Usage
```jsx
import { MobileEconomicOverlay } from '../components/mobile';

function MobileDashboard() {
  return (
    <div>
      <MobileEconomicOverlay 
        initialIndicator="FEDERAL_FUNDS_RATE"
        initialTimeRange="365"
      />
    </div>
  );
}
```

## Dependencies

### Required Packages
- `react` >= 17.0.0
- `react-bootstrap` >= 2.0.0
- `react-icons` >= 4.0.0
- `recharts` >= 2.0.0
- `axios` >= 0.27.0

### Internal Dependencies
- `useApi` hook for data fetching
- `LoadingSpinner` common component
- `TimeAgo` common component
- `Tooltip` common component
- Economic overlay API service

## Features in Detail

### Educational Design
- Non-financial user friendly explanations
- Visual correlation strength indicators
- Pattern recognition hints
- Historical context markers

### Performance Optimizations
- Data sampling for mobile (max 100 points)
- Memoized calculations
- Efficient re-renders
- Touch-optimized interactions

### Accessibility
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast color scheme

## Styling Integration

Components follow the existing dashboard theme:
- Bootstrap 5 component system
- Dark theme with professional colors
- Responsive grid system
- Consistent card layouts
- Icon usage from react-icons/bs

## Error Handling

- Graceful API failure handling
- Loading states with spinners
- User-friendly error messages
- Fallback to cached data
- Network timeout handling

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development Notes

### Testing Considerations
- Mock API responses for unit tests
- Component isolation testing
- Touch interaction testing
- Responsive breakpoint testing

### Extension Points
- Additional economic indicators
- Custom correlation algorithms
- Enhanced pattern recognition
- Export functionality
- Historical backtesting features

## Troubleshooting

### Common Issues
1. **API timeouts**: Check Laravel backend API configuration
2. **Missing data**: Verify economic indicator IDs match backend
3. **Performance issues**: Reduce data sampling on mobile
4. **Styling conflicts**: Ensure Bootstrap 5 compatibility

### Debug Mode
Set `localStorage.debug = 'economic-overlay'` for detailed console logging.