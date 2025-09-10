import React from 'react';

interface MetadataGridProps {
  data: {
    buildingData?: any;
    codepointData?: any;
    uprnData?: any;
    landRegistryInspireData?: any;
    landData?: any;
    nhleData?: any;
    shapeData?: any;
    photoData?: any;
  };
  isLoading?: boolean;
}

const MetadataGrid: React.FC<MetadataGridProps> = ({ data, isLoading = false }) => {
  const {
    buildingData,
    codepointData,
    uprnData,
    landRegistryInspireData,
    landData,
    nhleData,
    shapeData,
    photoData
  } = data;

  if (isLoading) {
    return (
      <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading metadata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
      {/* Image section - only show for photos */}
      {photoData?.link && (
        <div className="mb-6">
          <div className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            <img
              src={photoData.link}
              className="w-full max-h-64 object-contain"
              alt="Photo"
            />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-y-2">
        {/* Building Data */}
        <div className="text-gray-500 dark:text-gray-400">TOID</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.TOID || buildingData?.toid || ''}
        </div>
        
        {/* Postcode */}
        <div className="text-gray-500 dark:text-gray-400">Postcode</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {codepointData?.postcode || ''}
        </div>
        
        {/* UPRN */}
        <div className="text-gray-500 dark:text-gray-400">UPRN</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {uprnData?.uprn || ''}
        </div>
        
        {/* Land Registry Inspire */}
        <div className="text-gray-500 dark:text-gray-400">Land Registry Inspire</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {landRegistryInspireData?.inspire_id || ''}
        </div>
        
        {/* NHLE Name */}
        <div className="text-gray-500 dark:text-gray-400">Name</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {nhleData?.properties?.name 
            ? (nhleData.properties.name.length > 30 
                ? nhleData.properties.name.substring(0, 27) + '...'   
                : nhleData.properties.name) 
            : ''}
        </div>
        
        {/* NHLE Grade */}
        <div className="text-gray-500 dark:text-gray-400">Grade</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {nhleData?.properties?.grade || ''}
        </div>
        
        {/* NHLE Hyperlink */}
        <div className="text-gray-500 dark:text-gray-400">Hyperlink</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {nhleData?.properties?.hyperlink ? (
            <a 
              href={nhleData.properties.hyperlink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              view
            </a>
          ) : ''}
        </div>
        
        {/* NGR */}
        <div className="text-gray-500 dark:text-gray-400">NGR</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {nhleData?.properties?.ngr || ''}
        </div>

        {/* Coordinates - only show if photoData is available */}
        {photoData && (
          <>
            <div className="text-gray-500 dark:text-gray-400">Latitude</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.lat ? Number(photoData.lat).toFixed(3) : ''}
            </div>
            
            <div className="text-gray-500 dark:text-gray-400">Longitude</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.lng ? Number(photoData.lng).toFixed(3) : ''}
            </div>
            
            <div className="text-gray-500 dark:text-gray-400">Altitude</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.altitude ? Number(photoData.altitude).toFixed(2) : ''}
            </div>
            
            <div className="text-gray-500 dark:text-gray-400">Azimuth</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.photo_heading ? Number(photoData.photo_heading).toFixed(3) : ''}
            </div>
          </>
        )}
        
        {/* Building Properties */}
        <div className="text-gray-500 dark:text-gray-400">OS Land Cover Tier A</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.oslandusetiera || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Height Absolute Roofbase</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.absoluteheightroofbase || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Height Relative Roofbase</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.relativeheightroofbase || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Height Absolute Max</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.absoluteheightmaximum || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Height Relative Max</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.relativeheightmaximum || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Height Absolute Min</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.absoluteheightminimum || ''}
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">Physical Level</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {buildingData?.physicallevel || ''}
        </div>
        
        {/* Photo specific data */}
        {photoData && (
          <>
            <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.accuracy ? Number(photoData.accuracy).toFixed(2) : ''}
            </div>
            
            <div className="text-gray-500 dark:text-gray-400">Created (UTC)</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.created || ''}
            </div>
          </>
        )}
        
        {/* Ward/District Data */}
        <div className="text-gray-500 dark:text-gray-400">WD24NM</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {shapeData?.wd24nm || ''}
        </div>
        
        {/* Land Data */}
        <div className="text-gray-500 dark:text-gray-400">Parcel Ref</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {landData?.description || ''}
        </div>
        
        {/* Photo Note */}
        {photoData && (
          <>
            <div className="text-gray-500 dark:text-gray-400">Note</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData?.note || ''}
            </div>

            <div className="text-gray-500 dark:text-gray-400">Network status</div>
            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
              {photoData.network_info ? 'Online': '-'}
            </div>

            <div className="text-gray-500 dark:text-gray-400">OSNMA validation</div>
            {photoData.osnma_enabled == "1" ?
            <div className="text-right font-medium text-green-700 dark:text-green-200">Enabled</div>:
            <div className="text-right font-medium text-red-700 dark:text-red-200">Photo has not been verified yet</div>
            }

            {photoData.osnma_enabled == "1" && (
              <>
                <div className="text-gray-500 dark:text-gray-400">Validated satellites</div>
                <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                  {photoData.validated_sats}
                </div>
              </>
            )}

            <div className="text-gray-500 dark:text-gray-400"></div>
            {photoData.osnma_validated == "1" ?
            <div className="text-right font-medium text-green-700 dark:text-green-200">Photo location is OSNMA validated</div>:
            <div className="text-right font-medium text-red-700 dark:text-red-200">Photo location is not validated</div>
            }
          </>
        )}
      </div>
    </div>
  );
};

export default MetadataGrid;
