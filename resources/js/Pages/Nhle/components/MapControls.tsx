import React from 'react';
import { IconButton, Paper } from '@mui/material';
import { Add, Remove, Navigation } from '@mui/icons-material';
import { MapViewState } from '@deck.gl/core';

interface MapControlsProps {
  viewState: MapViewState;
  onViewStateChange: (params: { viewState: MapViewState }) => void;
}

const MapControls: React.FC<MapControlsProps> = ({ viewState, onViewStateChange }) => {
  const handleZoomIn = () => {
    onViewStateChange({
      viewState: {
        ...viewState,
        zoom: viewState.zoom! + 0.5,
        transitionDuration: 200,
      },
    });
  };

  const handleZoomOut = () => {
    onViewStateChange({
      viewState: {
        ...viewState,
        zoom: viewState.zoom! - 0.5,
        transitionDuration: 200,
      },
    });
  };

  const handleCompassClick = () => {
    onViewStateChange({
      viewState: {
        ...viewState,
        bearing: 0,
        pitch: 0,
        transitionDuration: 500,
      },
    });
  };

  return (
    <div style={{ zIndex: 1 }}>
      <Paper elevation={2} style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', backgroundColor: 'white' }}>
        <IconButton onClick={handleZoomIn} aria-label="zoom in">
          <Add />
        </IconButton>
        <IconButton onClick={handleZoomOut} aria-label="zoom out">
          <Remove />
        </IconButton>
        <IconButton onClick={handleCompassClick} aria-label="reset bearing">
          <Navigation style={{ transform: `rotate(${viewState.bearing || 0}deg)`, transition: 'transform 0.5s' }} />
        </IconButton>
      </Paper>
    </div>
  );
};

export default MapControls;
