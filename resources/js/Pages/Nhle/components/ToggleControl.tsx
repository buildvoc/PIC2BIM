import React from 'react';

interface ToggleControlProps {
  onMapViewClick: () => void;
  onSatelliteViewClick: () => void;
  currentMapStyle: string;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ onMapViewClick, onSatelliteViewClick, currentMapStyle }) => {
  const baseStyle: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    fontWeight: 500,
    transition: 'background-color 0.2s ease, color 0.2s ease',
  };

  const activeStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
  };

  const isMapView = !currentMapStyle.includes('hybrid');

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'white',
      padding: '4px',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      zIndex: 1,
      display: 'flex',
    }}>
      <button onClick={onMapViewClick} style={isMapView ? activeStyle : baseStyle}>Map</button>
      <button onClick={onSatelliteViewClick} style={!isMapView ? activeStyle : baseStyle}>Satellite</button>
    </div>
  );
};

export default ToggleControl;
