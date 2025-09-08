import React from 'react';
import MetadataGrid from './MetadataGrid';

interface PhotoPanelProps {
  selectedFeature: any;
  buildingApiData: any;
  codepointData: any;
  uprnData: any;
  landRegistryInspireData: any;
  landData: any;
  shapeData: any;
  isLoadingAdditionalData: boolean;
}

const PhotoPanel: React.FC<PhotoPanelProps> = ({
  selectedFeature,
  buildingApiData,
  codepointData,
  uprnData,
  landRegistryInspireData,
  landData,
  shapeData,
  isLoadingAdditionalData
}) => {
  return (
    <div>
      <MetadataGrid 
        data={{
          buildingData: buildingApiData?.data?.building_part?.[0]?.geojson?.features?.[0]?.properties || null,
          codepointData,
          uprnData,
          landRegistryInspireData,
          landData,
          nhleData: null, // Photos don't have NHLE data
          shapeData,
          photoData: selectedFeature.properties
        }}
        isLoading={isLoadingAdditionalData}
      />
    </div>
  );
};

export default PhotoPanel;
