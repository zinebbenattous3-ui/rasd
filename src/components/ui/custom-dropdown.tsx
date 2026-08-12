import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  dotColor?: string;
}

interface CustomDropdownProps {
  icon?: any;
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
};

export function CustomDropdown({
  icon: Icon,
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  disabled = false,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isDefaultSelected = value === "" || value === "ALL";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen(!open);
        }}
        style={{
          width: "100%",
          padding: "11px 16px",
          borderRadius: "12px",
          border: `1px solid ${!isDefaultSelected ? COLORS.teal : COLORS.border}`,
          backgroundColor: !isDefaultSelected ? COLORS.lightTeal : "white",
          color: COLORS.navy,
          fontWeight: "600",
          fontSize: "0.88rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(15,162,155,0.15)" : "0 2px 5px rgba(0,0,0,0.02)",
          transition: "all 0.15s ease",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {Icon && <Icon size={16} color={!isDefaultSelected ? COLORS.teal : COLORS.muted} style={{ flexShrink: 0 }} />}
          {selectedOption?.dotColor && (
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: selectedOption.dotColor, flexShrink: 0 }} />
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown
          size={16}
          color={COLORS.muted}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            backgroundColor: "white",
            borderRadius: "14px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 12px 30px -4px rgba(6, 44, 84, 0.15)",
            zIndex: 100,
            padding: "6px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.88rem",
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? COLORS.navy : COLORS.text,
                  backgroundColor: isSelected ? COLORS.lightTeal : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "#F8FAFC";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {opt.dotColor && (
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: opt.dotColor, flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{opt.label}</span>
                </div>
                {isSelected && <Check size={16} color={COLORS.teal} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
