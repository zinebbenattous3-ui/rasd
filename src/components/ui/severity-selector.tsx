import React from "react";
import { Check, ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";

export interface SeveritySelectorProps {
  value: string; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  onChange: (val: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const SEVERITIES = [
  {
    key: 'LOW',
    label: 'Faible',
    sub: 'LOW',
    color: '#2563EB',
    bgSelected: '#EFF6FF',
    borderSelected: '#3B82F6',
    icon: Info
  },
  {
    key: 'MEDIUM',
    label: 'Moyenne',
    sub: 'MEDIUM',
    color: '#D97706',
    bgSelected: '#FFFBEB',
    borderSelected: '#F59E0B',
    icon: AlertCircle
  },
  {
    key: 'HIGH',
    label: 'Élevée',
    sub: 'HIGH',
    color: '#EA580C',
    bgSelected: '#FFF7ED',
    borderSelected: '#F97316',
    icon: AlertTriangle
  },
  {
    key: 'CRITICAL',
    label: 'Critique',
    sub: 'CRITICAL',
    color: '#DC2626',
    bgSelected: '#FEF2F2',
    borderSelected: '#EF4444',
    icon: ShieldAlert
  }
];

export function SeveritySelector({ value, onChange, disabled = false, style }: SeveritySelectorProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', ...style }}>
      {SEVERITIES.map((s) => {
        const isSelected = value === s.key;
        const IconComponent = s.icon;

        return (
          <button
            key={s.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.key)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: `2px solid ${isSelected ? s.borderSelected : '#E2E8F0'}`,
              backgroundColor: isSelected ? s.bgSelected : '#FFFFFF',
              color: isSelected ? s.color : '#475569',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? `0 4px 12px ${s.color}22` : 'none',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.borderColor = s.borderSelected;
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconComponent size={18} color={s.color} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: isSelected ? '800' : '700', fontSize: '0.88rem' }}>
                  {s.label}
                </div>
              </div>
            </div>

            {isSelected && (
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: s.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={11} strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
