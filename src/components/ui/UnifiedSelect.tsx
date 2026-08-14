import React from "react";
import { SelectDropdown, SelectOption } from "./select-dropdown";
import { LucideIcon } from "lucide-react";

export interface UnifiedSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  icon?: LucideIcon;
  searchable?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  wrapperStyle?: React.CSSProperties;
}

export function UnifiedSelect({
  value,
  onChange,
  options,
  placeholder = "Sélectionner...",
  label,
  icon,
  searchable = false,
  disabled = false,
  style,
  wrapperStyle
}: UnifiedSelectProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...wrapperStyle }}>
      {label && (
        <label style={{ fontSize: "0.82rem", fontWeight: "700", color: "#062C54" }}>
          {label}
        </label>
      )}
      <SelectDropdown
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        icon={icon}
        searchable={searchable}
        disabled={disabled}
        style={style}
      />
    </div>
  );
}

export type { SelectOption };
