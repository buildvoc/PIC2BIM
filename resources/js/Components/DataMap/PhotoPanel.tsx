import React, { useEffect, useState } from 'react';
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
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Reset image loading state when selected photo changes
  useEffect(() => {
    const link = selectedFeature?.properties?.link;
    if (link) {
      setImgLoading(true);
      setImgError(false);
    } else {
      setImgLoading(false);
      setImgError(false);
    }
  }, [selectedFeature?.properties?.link]);

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
        <div className="space-y-4">
          {/* Photo preview */}
          {(() => {
            const p = selectedFeature?.properties || {};
            if (!p.link) return null;
            return (
              <div className="w-full flex justify-center">
                <div className="relative w-full max-w-xl flex items-center justify-center">
                  {imgLoading && !imgError && (
                    <div className="h-64 w-full bg-gray-100 animate-pulse rounded flex items-center justify-center text-gray-500">
                      Loading image...
                    </div>
                  )}
                  {imgError && (
                    <div className="h-64 w-full bg-gray-100 rounded flex items-center justify-center text-red-500">
                      Failed to load image
                    </div>
                  )}
                  <img
                    src={p.link as string}
                    alt="Photo preview"
                    className={`max-h-64 w-auto rounded shadow object-contain ${imgLoading || imgError ? 'hidden' : ''}`}
                    onLoad={() => setImgLoading(false)}
                    onError={() => { setImgLoading(false); setImgError(true); }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Simplified, ordered photo metadata list */}
          {(() => {
            const p = selectedFeature?.properties || {};
            const fmtNum = (v: any, suffix: string = '') => {
              const n = typeof v === 'string' ? parseFloat(v) : v;
              return (typeof n === 'number' && !isNaN(n)) ? `${n}${suffix}` : '-';
            };
            const fmtDateLocal = (v: any) => {
              if (!v) return '-';
              const d = new Date(v);
              if (isNaN(d.getTime())) return '-';
              return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
            };
            const fmtDateUTC = (v: any) => {
              if (!v) return '-';
              const d = new Date(v);
              if (isNaN(d.getTime())) return '-';
              return d.toISOString().slice(0, 19).replace('T', ' ');
            };
            const deviceLabel = (() => {
              // Try to derive from network_info if present
              const info = p?.network_info;
              if (info && typeof info === 'object') {
                const model = (info.model || info.deviceModel || info.device || '') as string;
                const os = (info.os || info.platform || info.androidVersion || '') as string;
                const parts = [] as string[];
                if (model) parts.push(model);
                if (os) parts.push(os);
                return parts.length ? parts.join(' - ') : '-';
              }
              return '-';
            })();

            const rows: Array<{ label: string; value: React.ReactNode }> = [
              { label: 'Latitude', value: p.lat ?? '-' },
              { label: 'Longitude', value: p.lng ?? '-' },
              { label: 'Altitude', value: fmtNum(p.altitude, ' m') },
              { label: 'Azimuth', value: fmtNum(p.photo_heading, '°') },
              { label: 'Vertical angle', value: (p.vertical_angle ?? p.pitch ?? '-') },
              { label: 'Note', value: p.note || '-' },
              { label: 'Device', value: deviceLabel },
              { label: 'Accuracy', value: fmtNum(p.accuracy, ' m') },
              { label: 'Distance', value: p.distance ? fmtNum(p.distance, ' m') : '-' },
              { label: 'Distance (GNSS)', value: p.gnss_distance ? fmtNum(p.gnss_distance, ' m') : '-' },
              { label: 'Timestamp', value: fmtDateLocal(p.created) },
              { label: 'Created (UTC)', value: fmtDateUTC(p.created) },
            ];

            return (
              <div className="grid grid-cols-2 gap-y-2">
                {rows.map((r, i) => (
                  <React.Fragment key={i}>
                    <div className="text-gray-500 dark:text-gray-400">{r.label}</div>
                    <div className="text-right font-medium text-blue-600 dark:text-blue-400 break-words">
                      {r.value}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            );
          })()}
        </div>
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
