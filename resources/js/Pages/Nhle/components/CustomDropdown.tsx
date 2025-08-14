import React, { useState, useEffect, useRef } from 'react';

interface CustomDropdownProps {
  title: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ title, options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

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
    absolute top-full left-0 right-0 bg-white border border-gray-200 
    rounded-md mt-1 shadow-lg z-10 p-1 transition-all duration-100 ease-out
  `;

  const optionClasses = (option: string) => `
    flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md 
    transition-colors duration-150 
    ${value === option ? 'bg-gray-100' : 'hover:bg-gray-50'}
  `;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <div className="flex items-center gap-2">
          {icon}
          {value}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div className={dropdownMenuClasses}>
          <div className="px-3 py-2 text-xs font-medium text-gray-500">{title}</div>
          {options.map(option => (
            <div
              key={option}
              onClick={() => handleOptionClick(option)}
              className={optionClasses(option)}
            >
              {icon}
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
