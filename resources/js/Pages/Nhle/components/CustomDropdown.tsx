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
  const [isFocused, setIsFocused] = useState(false);
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

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    minWidth: '160px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    justifyContent: 'space-between',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  };

  if (isOpen || isFocused) {
    buttonStyle.borderColor = '#a5b4fc';
    buttonStyle.boxShadow = '0 0 0 3px rgba(165, 180, 252, 0.3)';
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={buttonStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          {value}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginTop: '4px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 10,
          padding: '4px',
          opacity: 1,
          transform: 'scale(1)',
          transition: 'opacity 0.1s ease-out, transform 0.1s ease-out',
        }}>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{title}</div>
          {options.map(option => (
            <div
              key={option}
              onClick={() => handleOptionClick(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: value === option ? '#f3f4f6' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = value === option ? '#f3f4f6' : '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = value === option ? '#f3f4f6' : 'transparent')}
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
