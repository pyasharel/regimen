import React from 'react';
import { formatDose } from '@/utils/doseUtils';

interface StackShareCardProps {
  compounds: Array<{
    name: string;
    dose: string;
    schedule: string;
    hasLevels?: boolean;
  }>;
}

interface CompoundShareCardProps {
  name: string;
  dose: string;
  schedule: string;
  times: string;
  startDate: string;
  totalDoses: number;
  estimatedLevel?: string;
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
      card: '#1A1A1A',
      cardBorder: 'rgba(255, 111, 97, 0.3)',
      cardGradient: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.12), rgba(255, 111, 97, 0.08), rgba(255, 111, 97, 0.05))',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      primary: '#FF6F61',
      primaryGlow: 'rgba(255, 111, 97, 0.5)',
      statCardActive: 'linear-gradient(to bottom right, #FF6F61, #E55A4F)',
      statCardInactive: '#262626',
    } : {
      bg: '#FAFAFA',
      card: '#FFFFFF',
      cardBorder: 'rgba(255, 111, 97, 0.3)',
      cardGradient: 'linear-gradient(to bottom right, rgba(255, 111, 97, 0.12), rgba(255, 111, 97, 0.08), rgba(255, 111, 97, 0.05))',
      text: '#0F0F0F',
      textMuted: '#6B7280',
      primary: '#FF6F61',
      primaryGlow: 'rgba(255, 111, 97, 0.5)',
      statCardActive: 'linear-gradient(to bottom right, #FF6F61, #E55A4F)',
      statCardInactive: '#F0F0F0',
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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            fontSize: '15px', 
            fontWeight: 700, 
            color: colors.primary,
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            REGIMEN
          </h1>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            flex: 1,
            background: colors.statCardActive,
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', opacity: 0.9 }}>ACTIVE</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF' }}>{compounds.length}</div>
            <div style={{ fontSize: '12px', color: '#FFFFFF', opacity: 0.8 }}>
              {compounds.length === 1 ? 'Medication' : 'Medications'}
            </div>
          </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '17px', fontWeight: 700, color: colors.text }}>{compound.name}</span>
                    {compound.hasLevels && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '999px',
                        background: 'rgba(255, 111, 97, 0.15)',
                        color: colors.primary,
                        fontSize: '9px',
                        fontWeight: 600,
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        LEVELS
                      </span>
                    )}
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
          <span style={{ fontSize: '11px', color: colors.textMuted }}>
            Tracked with Regimen • regimen.app
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
  ({ name, dose, schedule, times, startDate, totalDoses, estimatedLevel }, ref) => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    
    const colors = isDark ? {
      bg: '#0F0F0F',
      card: '#1A1A1A',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      primary: '#FF6F61',
      surface: '#262626',
      border: '#333333',
    } : {
      bg: '#FAFAFA',
      card: '#FFFFFF',
      text: '#0F0F0F',
      textMuted: '#6B7280',
      primary: '#FF6F61',
      surface: '#F5F5F5',
      border: '#E5E5E5',
    };

    const stats = [
      { label: 'Dose', value: dose },
      { label: 'Schedule', value: schedule },
      { label: 'Times', value: times },
      { label: 'Started', value: startDate },
      { label: 'Total doses', value: String(totalDoses) },
      ...(estimatedLevel ? [{ label: 'Est. level', value: estimatedLevel }] : []),
    ];

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
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: colors.text,
            margin: 0,
            marginBottom: '4px',
          }}>
            {name}
          </h1>
          <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>
            {schedule}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
        }}>
          {stats.map((stat, index) => (
            <div
              key={index}
              style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: colors.text }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '11px', color: colors.textMuted }}>
            Tracked with Regimen • regimen.app
          </span>
        </div>
      </div>
    );
  }
);

CompoundShareCard.displayName = 'CompoundShareCard';
