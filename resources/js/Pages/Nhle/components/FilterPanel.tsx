import React from 'react';
import CustomDropdown from './CustomDropdown';

interface FilterPanelProps {
  category1: string;
  category2: string;
  dataType: { buildings: boolean; buildingParts: boolean; sites: boolean; nhle: boolean };
  onCategory1Change: (val: string) => void;
  onCategory2Change: (val: string) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
    category1, 
    category2, 
    dataType,
    onCategory1Change, 
    onCategory2Change
}) => {
  const mapByOptions = ['Fixed Size', 'Size by Area'];
  
  // Dynamic grouping options based on active data types
  const getGroupByOptions = () => {
    const options: string[] = [];
    const activeTypes = Object.keys(dataType).filter(key => dataType[key as keyof typeof dataType]);
    
    // If multiple types are selected, show all available options
    if (activeTypes.length > 1) {
      options.push('Usage', 'Connectivity', 'Material', 'Grade');
    } else if (activeTypes.length === 1) {
      // Single type selected, show specific options for that type
      if (dataType.buildings) {
        options.push('Usage', 'Connectivity', 'Material');
      } else if (dataType.sites) {
        options.push('OSLandTiera');
      } else if (dataType.nhle) {
        options.push('Grade');
      } else if (dataType.buildingParts) {
        options.push('OSLandTiera');
      }
    } else {
      // No type selected, show all available options
      options.push('Usage', 'Connectivity', 'Material',  'Grade');
    }
    
    return options.length > 0 ? options : ['No Grouping Available'];
  };
  
  const groupByOptions = getGroupByOptions();

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

  const icon3 = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
        <path d="M2 22h20"/>
        <path d="M4 22V6.83a2 2 0 0 1 .94-1.66l6-4.02a2 2 0 0 1 2.12 0l6 4.02A2 2 0 0 1 20 6.83V22"/>
        <path d="M10 10h4"/>
        <path d="M10 14h4"/>
        <path d="M10 18h4"/>
    </svg>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <CustomDropdown title="Map View" options={mapByOptions} value={category1} onChange={onCategory1Change} icon={icon1} />
      <CustomDropdown title="Group by" options={groupByOptions} value={category2} onChange={onCategory2Change} icon={icon2} />
    </div>
  );
};

export default FilterPanel;
