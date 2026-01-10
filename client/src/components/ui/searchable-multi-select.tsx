"use client";

import React from "react";
import Select, { SingleValue, StylesConfig } from "react-select";
import { Check } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

interface SearchableMultiSelectProps {
  options: Option[];
  selected: string[]; // Keep as array for compatibility, but we'll use single select
  onSelect: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
  onInputChange?: (inputValue: string) => void;
  existingMedicineIds?: number[]; // IDs of medicines already in prescription
}

const customStyles: StylesConfig<Option, false> = {
  control: (provided) => ({
    ...provided,
    minHeight: "36px",
    fontSize: "0.75rem",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    fontSize: "0.75rem",
    pointerEvents: "auto",
    overflowY: "auto",
    maxHeight: "300px",
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
    pointerEvents: "auto",
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: "300px",
    overflowY: "auto",
    padding: "4px",
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: "0.75rem",
    cursor: "pointer",
    padding: "8px 12px",
    pointerEvents: "auto",
  }),
  placeholder: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
  input: (provided) => ({
    ...provided,
    fontSize: "0.75rem",
  }),
};

export default function SearchableMultiSelect({
  options,
  selected,
  onSelect,
  placeholder = "Search and select...",
  className = "",
  isLoading = false,
  onInputChange,
  existingMedicineIds = [],
}: SearchableMultiSelectProps) {
  const [menuIsOpen, setMenuIsOpen] = React.useState(false);
  // For single select, we don't show selected value in the dropdown
  const selectedOption = null; // Always show placeholder for new selection

  const handleChange = (newValue: SingleValue<Option>) => {
    if (newValue) {
      // Add the selected value to the array (for compatibility with existing code)
      onSelect([newValue.value]);
    }
  };

  const handleInputChange = (inputValue: string) => {
    if (onInputChange) {
      onInputChange(inputValue);
    }
  };

  const formatOptionLabel = ({ value, label }: Option, meta: any) => {
    if (meta.context === "value") {
      return label;
    }
    // Check if this medicine is already in the prescription
    const medicineId = parseInt(value);
    const isAlreadySelected = existingMedicineIds.includes(medicineId);
    return (
      <div className="flex items-center gap-2">
        {isAlreadySelected && <Check className="h-3 w-3 text-primary" />}
        <span>{label}</span>
        {isAlreadySelected && (
          <span className="ml-auto text-xs text-muted-foreground">(Already added)</span>
        )}
      </div>
    );
  };

  // Open menu when options become available
  React.useEffect(() => {
    if (options.length > 0) {
      setMenuIsOpen(true);
    }
  }, [options.length]);

  return (
    <div className={className}>
      <Select
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isSearchable={true}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        formatOptionLabel={formatOptionLabel}
        styles={customStyles}
        classNamePrefix="react-select"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        closeMenuOnSelect={true}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        onFocus={() => {
          if (options.length > 0) {
            setMenuIsOpen(true);
          }
        }}
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 2
            ? "Type at least 2 characters to search"
            : "No medicines found"
        }
        filterOption={() => true}
      />
    </div>
  );
}

