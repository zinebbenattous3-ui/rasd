import React from "react";
import { Check } from "lucide-react";

export interface BloodTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function BloodTypeSelector({ value, onChange, disabled = false, style }: BloodTypeSelectorProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        ...style
      }}
    >
      {BLOOD_TYPES.map((bt) => {
        const isSelected = value === bt;
        return (
          <button
            key={bt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(bt)}
            style={{
              padding: '10px 6px',
              borderRadius: '10px',
              border: `2px solid ${isSelected ? '#E11D48' : '#E2E8F0'}`,
              backgroundColor: isSelected ? '#FFF1F2' : '#FFFFFF',
              color: isSelected ? '#BE123C' : '#475569',
              fontWeight: isSelected ? '800' : '600',
              fontSize: '0.88rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
              boxShadow: isSelected ? '0 4px 10px rgba(225, 29, 72, 0.15)' : 'none',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.borderColor = '#FECDD3';
                e.currentTarget.style.backgroundColor = '#FFF1F2';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected && !disabled) {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }
            }}
          >
            <span>{bt}</span>
            {isSelected && <Check size={13} strokeWidth={3} color="#BE123C" />}
          </button>
        );
      })}
    </div>
  );
}
