import React, { useState } from 'react';
import MetadataGrid from './MetadataGrid';

interface PhotoPanelProps {
  selectedFeature: any;
  buildingApiData: any;
  codepointData: any;
  uprnData: any;
  landRegistryInspireData: any;
  landData: any;
  shapeData: any;
  nhleData: any;
  isLoadingAdditionalData: boolean;
  connectionsData?: Array<{
    coordinates: [number, number];
    type: string;
    properties: any;
    id: string;
    distance?: number;
    bearing?: number;
    status?: 'proposed' | 'verified' | 'rejected';
  }>;
  onOpenConnectionsModal?: () => void;
}

const PhotoPanel: React.FC<PhotoPanelProps> = ({
  selectedFeature,
  buildingApiData,
  codepointData,
  uprnData,
  landRegistryInspireData,
  landData,
  shapeData,
  nhleData,
  isLoadingAdditionalData,
  connectionsData = [],
  onOpenConnectionsModal
}) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'connections'>('metadata');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'building': return '#3C78FF';
      case 'buildingPart': return '#FFB648';
      case 'site': return '#2ECC71';
      case 'nhle': return '#E74C3C';
      default: return '#6B7280';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'building': return 'Building';
      case 'buildingPart': return 'Building Part';
      case 'site': return 'Site';
      case 'nhle': return 'NHLE';
      default: return type;
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'metadata'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Metadata
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'connections'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Connections ({connectionsData.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'metadata' && (
        <MetadataGrid 
          data={{
            buildingData: buildingApiData?.data?.building_part?.[0]?.geojson?.features?.[0]?.properties || null,
            codepointData,
            uprnData,
            landRegistryInspireData,
            landData,
            nhleData,
            shapeData,
            photoData: selectedFeature.properties
          }}
          isLoading={isLoadingAdditionalData}
        />
      )}

      {activeTab === 'connections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Nearby features within photo field of view (±20° bearing, 10m radius)
              {selectedFeature?.properties?.photo_heading && (
                <span className="block mt-1">
                  Photo heading: {Math.round(selectedFeature.properties.photo_heading)}°
                </span>
              )}
            </div>
            {connectionsData.length > 0 && (
              <button
                onClick={onOpenConnectionsModal}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Manage Connections
              </button>
            )}
          </div>
          
          {connectionsData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No connections found within the specified range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    {/* <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th> */}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bearing
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Properties
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {connectionsData.map((connection: any, index: number) => (
                    <tr key={`${connection.type}-${index}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: getTypeColor(connection.type) }}
                          />
                          <span className="text-sm font-medium text-gray-900">
                            {getTypeLabel(connection.type)}
                          </span>
                        </div>
                      </td>
                      {/* <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {connection.properties?.id || connection.id}
                      </td> */}
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {connection.distance ? `${Math.round(connection.distance)}m` : '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {connection.bearing ? `${Math.round(connection.bearing)}°` : '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {connection.properties?.name || 
                           connection.properties?.address || 
                           connection.properties?.description ||
                           'No description'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default PhotoPanel;
