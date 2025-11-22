"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onSelect: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function MultiSelect({
  options,
  selected,
  onSelect,
  placeholder = "Select...",
  className = "",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onSelect(selected.filter((v) => v !== value));
    } else {
      onSelect([...selected, value]);
    }
  };

  // Extract height class from className if present
  const heightClass = className.match(/\bh-\d+/)?.[0] || '';
  const remainingClasses = className.replace(/\bh-\d+/g, '').trim();
  const containerClasses = remainingClasses ? `relative ${remainingClasses}` : 'relative';

  return (
    <div className={containerClasses}>
      {/* Input box */}
      <div
        className={`border rounded-md px-3 flex items-center justify-between bg-white cursor-pointer ${heightClass || 'py-2'}`}
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm text-gray-700">
          {selected.length > 0 
            ? selected.map(id => {
                const option = options.find(opt => opt.value === id);
                return option ? option.label : id;
              }).join(", ")
            : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-md shadow-md max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                readOnly
                className="mr-2"
              />
              <span className="text-sm">{opt.label}</span>
              {selected.includes(opt.value) && (
                <Check className="ml-auto h-4 w-4 text-green-600" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
