import React from 'react';
import regimenLogo from '@/assets/regimen-wordmark-share.png';

interface StackShareCardProps {
  compounds: Array<{
    name: string;
    dose: string;
    schedule: string;
  }>;
}

interface CompoundShareCardProps {
  name: string;
  dose: string;
  schedule: string;
  startDate: string;
  totalDoses: number;
  estimatedLevel?: string;
  doseUnit?: string;
  chartData?: Array<{
    date: string;
    level: number;
    isFuture?: boolean;
  }>;
}

/**
 * Share card for My Stack - matches the app's actual UI
 */
export const StackShareCard = React.forwardRef<HTMLDivElement, StackShareCardProps>(
  ({ compounds }, ref) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    
    // Colors matching index.css
    const colors = isDark ? {
      bg: '#0F0F0F',
      cardBorder: 'rgba(255, 111, 97, 0.3)',
      cardGradient: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.12), rgba(255, 111, 97, 0.08), rgba(255, 111, 97, 0.05))',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      textSubtle: '#6B7280',
      primary: '#FF6F61',
      primaryGlow: 'rgba(255, 111, 97, 0.5)',
    } : {
      bg: '#FAFAFA',
      cardBorder: 'rgba(255, 111, 97, 0.3)',
      cardGradient: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.12), rgba(255, 111, 97, 0.08), rgba(255, 111, 97, 0.05))',
      text: '#0F0F0F',
      textMuted: '#6B7280',
      textSubtle: '#9CA3AF',
      primary: '#FF6F61',
      primaryGlow: 'rgba(255, 111, 97, 0.5)',
    };

    return (
      <div
        ref={ref}
        style={{
          width: '390px',
          padding: '24px',
          background: colors.bg,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img 
            src={regimenLogo} 
            alt="Regimen" 
            style={{ height: '24px', margin: '0 auto' }}
          />
        </div>

        {/* Section Label */}
        <div style={{ 
          fontSize: '10px', 
          fontWeight: 600, 
          color: colors.textMuted, 
          letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          ACTIVE
        </div>

        {/* Compound Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {compounds.map((compound, index) => (
            <div
              key={index}
              style={{
                background: colors.cardGradient,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: '16px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.primary,
                  boxShadow: `0 0 8px ${colors.primaryGlow}`,
                  marginTop: '6px',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: colors.text }}>
                    {compound.name}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '6px' }}>
                    {compound.dose} • {compound.schedule}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '11px', color: colors.textSubtle }}>
            helloregimen.com
          </span>
        </div>
      </div>
    );
  }
);

StackShareCard.displayName = 'StackShareCard';

/**
 * Share card for Compound Detail - matches the app's actual UI
 */
export const CompoundShareCard = React.forwardRef<HTMLDivElement, CompoundShareCardProps>(
  ({ name, dose, schedule, startDate, totalDoses, estimatedLevel, doseUnit, chartData }, ref) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    
    const colors = isDark ? {
      bg: '#0F0F0F',
      card: '#1A1A1A',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      textSubtle: '#6B7280',
      primary: '#FF6F61',
      border: '#333333',
      cardHighlight: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.15), rgba(255, 111, 97, 0.10), rgba(255, 111, 97, 0.05))',
      cardHighlightBorder: 'rgba(255, 111, 97, 0.2)',
    } : {
      bg: '#FAFAFA',
      card: '#FFFFFF',
      text: '#0F0F0F',
      textMuted: '#6B7280',
      textSubtle: '#9CA3AF',
      primary: '#FF6F61',
      border: '#E5E5E5',
      cardHighlight: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.15), rgba(255, 111, 97, 0.10), rgba(255, 111, 97, 0.05))',
      cardHighlightBorder: 'rgba(255, 111, 97, 0.2)',
    };

    // Simple SVG chart rendering
    const renderChart = () => {
      if (!chartData || chartData.length === 0) return null;
      
      const width = 342;
      const height = 120;
      const padding = { top: 10, right: 10, bottom: 20, left: 35 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      const maxLevel = Math.max(...chartData.map(d => d.level), 100);
      
      // Generate path
      const points = chartData.map((d, i) => {
        const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (d.level / maxLevel) * chartHeight;
        return { x, y, isFuture: d.isFuture };
      });
      
      // Split into past and future segments
      const pastPoints = points.filter(p => !p.isFuture);
      const futurePoints = points.filter(p => p.isFuture);
      
      const createPath = (pts: typeof points) => {
        if (pts.length === 0) return '';
        return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      };
      
      const createAreaPath = (pts: typeof points) => {
        if (pts.length === 0) return '';
        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const firstX = pts[0].x;
        const lastX = pts[pts.length - 1].x;
        const bottomY = padding.top + chartHeight;
        return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
      };

      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <defs>
            <linearGradient id="pastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.5" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="futureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          
          {/* Y-axis labels */}
          <text x={padding.left - 5} y={padding.top + 4} fontSize="9" fill={colors.textMuted} textAnchor="end">100%</text>
          <text x={padding.left - 5} y={padding.top + chartHeight / 2 + 3} fontSize="9" fill={colors.textMuted} textAnchor="end">50%</text>
          <text x={padding.left - 5} y={padding.top + chartHeight + 3} fontSize="9" fill={colors.textMuted} textAnchor="end">0%</text>
          
          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke={colors.border} strokeOpacity="0.3" />
          <line x1={padding.left} y1={padding.top + chartHeight / 2} x2={width - padding.right} y2={padding.top + chartHeight / 2} stroke={colors.border} strokeOpacity="0.3" />
          <line x1={padding.left} y1={padding.top + chartHeight} x2={width - padding.right} y2={padding.top + chartHeight} stroke={colors.border} strokeOpacity="0.3" />
          
          {/* Past area and line */}
          {pastPoints.length > 0 && (
            <>
              <path d={createAreaPath(pastPoints)} fill="url(#pastGradient)" />
              <path d={createPath(pastPoints)} fill="none" stroke={colors.primary} strokeWidth="2" />
            </>
          )}
          
          {/* Future area and line (dashed) */}
          {futurePoints.length > 0 && (
            <>
              <path d={createAreaPath(futurePoints)} fill="url(#futureGradient)" />
              <path d={createPath(futurePoints)} fill="none" stroke={colors.primary} strokeWidth="2" strokeDasharray="4 2" strokeOpacity="0.5" />
            </>
          )}
          
          {/* X-axis labels */}
          {chartData.length > 0 && (
            <>
              <text x={padding.left} y={height - 5} fontSize="9" fill={colors.textMuted}>{chartData[0].date}</text>
              <text x={width - padding.right} y={height - 5} fontSize="9" fill={colors.textMuted} textAnchor="end">{chartData[chartData.length - 1].date}</text>
            </>
          )}
        </svg>
      );
    };

    return (
      <div
        ref={ref}
        style={{
          width: '390px',
          padding: '24px',
          background: colors.bg,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img 
            src={regimenLogo} 
            alt="Regimen" 
            style={{ height: '24px', margin: '0 auto' }}
          />
        </div>

        {/* Compound Name */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: colors.text,
            margin: 0,
          }}>
            {name}
          </h1>
        </div>

        {/* Stats Grid - 2x2 matching app */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* Current Dose - highlighted */}
          <div style={{
            background: colors.cardHighlight,
            border: `1px solid ${colors.cardHighlightBorder}`,
            borderRadius: '12px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>
              Current Dose
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
              {dose}
            </div>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>
              {schedule}
            </div>
          </div>

          {/* Est. Level */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>
              Est. Level
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: estimatedLevel ? colors.primary : colors.textMuted }}>
              {estimatedLevel || '—'}
            </div>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>
              {estimatedLevel ? 'in system' : 'Not available'}
            </div>
          </div>

          {/* Started */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>
              Started
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
              {startDate}
            </div>
          </div>

          {/* Total Doses */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '4px' }}>
              Total Doses
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
              {totalDoses}
            </div>
            <div style={{ fontSize: '10px', color: colors.textMuted, marginTop: '2px' }}>
              logged
            </div>
          </div>
        </div>

        {/* Levels Chart */}
        {chartData && chartData.length > 0 && (
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: colors.text,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
              Estimated Levels
            </div>
            {renderChart()}
          </div>
        )}

        {/* Footer */}
        <div style={{
          paddingTop: '16px',
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '11px', color: colors.textSubtle }}>
            helloregimen.com
          </span>
        </div>
      </div>
    );
  }
);

CompoundShareCard.displayName = 'CompoundShareCard';
