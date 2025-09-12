import React, { useState } from 'react';

interface Connection {
  coordinates: [number, number];
  type: string;
  properties: any;
  id: string;
  distance?: number;
  bearing?: number;
  status?: 'proposed' | 'verified' | 'rejected';
}

interface ConnectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: Connection[];
  onUpdateConnection: (connectionId: string, status: 'proposed' | 'verified' | 'rejected') => void;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  isOpen,
  onClose,
  connections,
  onUpdateConnection
}) => {
  if (!isOpen) return null;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'proposed': 
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      case 'proposed':
      default: return 'Proposed';
    }
  };

  const handleAction = (connectionId: string, action: 'verify' | 'reject' | 'undo') => {
    let newStatus: 'proposed' | 'verified' | 'rejected';
    
    switch (action) {
      case 'verify':
        newStatus = 'verified';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'undo':
        newStatus = 'proposed';
        break;
    }
    
    onUpdateConnection(connectionId, newStatus);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Connections ({connections.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {connections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No connections found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bearing Δ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {connections.map((connection) => {
                    const status = connection.status || 'proposed';
                    return (
                      <tr key={connection.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {(() => {
                            switch (connection.type) {
                              case 'building':
                              case 'buildingPart':
                              case 'site':
                                return connection.properties?.osid || 'N/A';
                              case 'nhle':
                                return connection.properties.nhle_id || 'N/A';
                              default:
                                return connection.properties?.id || connection.id.split('-')[1] || 'N/A';
                            }
                          })()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {connection.distance ? `${Math.round(connection.distance)}m` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {connection.bearing ? `${Math.round(connection.bearing)}°` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {getStatusLabel(status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                          {status === 'proposed' && (
                            <>
                              <button
                                onClick={() => handleAction(connection.id, 'verify')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleAction(connection.id, 'reject')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(status === 'verified' || status === 'rejected') && (
                            <button
                              onClick={() => handleAction(connection.id, 'undo')}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Undo
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {connections.filter(c => (c.status || 'proposed') === 'verified').length} verified, {' '}
            {connections.filter(c => (c.status || 'proposed') === 'rejected').length} rejected, {' '}
            {connections.filter(c => (c.status || 'proposed') === 'proposed').length} pending
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
  );
};

export default ConnectionsModal;
