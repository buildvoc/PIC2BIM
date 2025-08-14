import React from 'react';

interface ToggleControlProps {
  onMapViewClick: () => void;
  onSatelliteViewClick: () => void;
  currentMapStyle: string;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ onMapViewClick, onSatelliteViewClick, currentMapStyle }) => {
  const baseStyle = 'px-3 py-1.5 cursor-pointer border-none bg-transparent font-medium transition-colors duration-200 ease-in-out';
  const activeStyle = `${baseStyle} bg-gray-200 rounded-md`;

  const isMapView = !currentMapStyle.includes('hybrid');

  return (
    <div className="absolute top-2.5 left-2.5 bg-white p-1 rounded-lg shadow-lg z-10 flex">
      <button onClick={onMapViewClick} className={isMapView ? activeStyle : baseStyle}>Map</button>
      <button onClick={onSatelliteViewClick} className={!isMapView ? activeStyle : baseStyle}>Satellite</button>
    </div>
  );
};

export default ToggleControl;
