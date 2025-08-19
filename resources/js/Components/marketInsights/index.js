/**
 * Market Insights Components Export
 * Central export file for all market insights components
 */

// Main components
export { default as MarketInsightsDashboard } from './MarketInsightsDashboard';
export { default as CorrelationMatrix } from './CorrelationMatrix';
export { default as SimpleInsights } from './SimpleInsights';

// Common components
export { default as ToastProvider, useToast } from '../common/ToastProvider';
export { default as ErrorBoundary, withErrorBoundary, useErrorHandler } from '../common/ErrorBoundary';

// Services
export * from '../../services/api/marketInsights';

// Constants and utilities
export { LAYOUT_MODES, DASHBOARD_CONFIG } from './MarketInsightsDashboard';