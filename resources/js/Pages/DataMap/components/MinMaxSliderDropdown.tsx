import React, { useState, useEffect, useRef } from 'react';
import MinMaxRangeSlider from './MinMaxRangeSlider';

interface MinMaxSliderDropdownProps {
  title: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  values: { min: number; max: number };
  onChange: (values: { min: number; max: number }) => void;
}

const MinMaxSliderDropdown: React.FC<MinMaxSliderDropdownProps> = ({ title, icon, min, max, values, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClasses = `
    flex items-center justify-between gap-2 px-3 py-2 bg-white 
    border border-gray-300 rounded-md text-sm font-medium text-gray-700 
    cursor-pointer min-w-[160px] shadow-sm transition-all duration-200 
    focus:outline-none focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
  `;

  const dropdownMenuClasses = `
    absolute top-full right-0 bg-white border border-gray-200 
    rounded-md mt-1 shadow-lg z-10 p-4 transition-all duration-100 ease-out w-64
  `;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2">
          {icon}
          {`${values.min} - ${values.max}`}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div className={dropdownMenuClasses}>
          <div className="px-1 py-2 text-xs font-medium text-gray-500">{title}</div>
          <MinMaxRangeSlider
            min={min}
            max={max}
            minVal={values.min}
            maxVal={values.max}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
};

export default MinMaxSliderDropdown;
