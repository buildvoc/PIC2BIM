import React from 'react';
import CustomDropdown from './CustomDropdown';

interface FilterPanelProps {
  category1: string;
  category2: string;
  onCategory1Change: (val: string) => void;
  onCategory2Change: (val: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ category1, category2, onCategory1Change, onCategory2Change }) => {
  const mapByOptions = ['Fixed Size', 'Size by Area'];
  const groupByOptions = ['Material', 'Usage', 'Connectivity', 'Theme'];

  const icon1 = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <rect x="7" y="8" width="3" height="8"/>
      <rect x="14" y="12" width="3" height="4"/>
    </svg>
  );

  const icon2 = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 1,
      }}
    >
      <CustomDropdown title="Map View" options={mapByOptions} value={category1} onChange={onCategory1Change} icon={icon1} />
      <CustomDropdown title="Group by" options={groupByOptions} value={category2} onChange={onCategory2Change} icon={icon2} />
    </div>
  );
};

export default FilterPanel;
