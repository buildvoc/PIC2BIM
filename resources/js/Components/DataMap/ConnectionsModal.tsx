import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

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
  sourcePhotoId?: string;
}

const ConnectionsModal: React.FC<ConnectionsModalProps> = ({
  isOpen,
  onClose,
  connections,
  onUpdateConnection,
  sourcePhotoId
}) => {
  if (!isOpen) return null;

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  // Map of fetched statuses from entity_links keyed by `${dst_type}|${dst_id}`
  const [fetchedStatuses, setFetchedStatuses] = useState<Record<string, 'verified' | 'rejected'>>({});
  const [isLoadingStatuses, setIsLoadingStatuses] = useState<boolean>(false);

  // Helper to map UI type to DB type
  const mapDstType = (t: string) => (t === 'buildingPart' ? 'building_part' : t);

  // Helper to derive dst_id
  const getDstId = (dst_type: string, props: any): string | null => {
    if (dst_type === 'nhle') {
      return props?.nhle_id?.toString?.() || null;
    }
    return props?.osid?.toString?.() || props?.id?.toString?.() || null;
  };

  // Prepare items list for status check
  const statusQueryItems = useMemo(() => {
    return connections.map((c) => {
      const dst_type = mapDstType(c.type);
      const dst_id = getDstId(dst_type, c.properties);
      return dst_id ? { dst_type, dst_id } : null;
    }).filter(Boolean) as { dst_type: string; dst_id: string }[];
  }, [connections]);

  // Fetch statuses when modal opens or connections/source changes
  useEffect(() => {
    if (!isOpen || !sourcePhotoId || statusQueryItems.length === 0) {
      return;
    }
    setIsLoadingStatuses(true);
    const payload = {
      src_type: 'photo',
      src_id: sourcePhotoId,
      relation: 'bearing_match',
      items: statusQueryItems,
    };
    console.info('[ConnectionsModal] Fetch statuses payload', payload);
    axios.post('/entity-links/statuses', payload)
      .then((res) => {
        const list = (res?.data?.data || []) as Array<{ dst_type: string; dst_id: string; status: 'verified' | 'rejected' | 'proposed' }>;
        const map: Record<string, 'verified' | 'rejected'> = {};
        list.forEach((it) => {
          if (it.status === 'verified' || it.status === 'rejected') {
            map[`${it.dst_type}|${it.dst_id}`] = it.status;
          }
        });
        console.info('[ConnectionsModal] Fetched statuses', map);
        setFetchedStatuses(map);
      })
      .catch((err) => {
        console.error('[ConnectionsModal] Failed to fetch statuses', err?.response?.data || err?.message || err);
      })
      .finally(() => setIsLoadingStatuses(false));
  }, [isOpen, sourcePhotoId, statusQueryItems]);

  // Get effective status for a connection (server status has priority)
  const getEffectiveStatus = (connection: Connection): 'proposed' | 'verified' | 'rejected' => {
    const dst_type = mapDstType(connection.type);
    const dst_id = getDstId(dst_type, connection.properties);
    const key = dst_id ? `${dst_type}|${dst_id}` : '';
    const fetched = key ? fetchedStatuses[key] : undefined;
    if (fetched === 'verified' || fetched === 'rejected') return fetched;
    return (connection.status || 'proposed');
  };

  // Only count/select items that are still proposed
  const proposedIds = useMemo(() => (
    connections
      .filter((c) => getEffectiveStatus(c) === 'proposed')
      .map((c) => c.id)
  ), [connections, fetchedStatuses]);

  const selectedCount = useMemo(() => (
    connections.reduce((acc, c) => acc + ((selectedIds[c.id] && getEffectiveStatus(c) === 'proposed') ? 1 : 0), 0)
  ), [connections, selectedIds, fetchedStatuses]);

  const allSelected = proposedIds.length > 0 && proposedIds.every((id) => !!selectedIds[id]);

  const toggleSelectAll = () => {
    if (allSelected) {
      const next = { ...selectedIds };
      proposedIds.forEach((id) => {
        delete next[id];
      });
      setSelectedIds(next);
    } else {
      const next = { ...selectedIds };
      proposedIds.forEach((id) => {
        next[id] = true;
      });
      setSelectedIds(next);
    }
  };

  // Auto-clean selections when items become non-proposed (e.g., after verify/reject fetch)
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        const c = connections.find((x) => x.id === id);
        if (!c || getEffectiveStatus(c) !== 'proposed') {
          delete next[id];
        }
      });
      return next;
    });
  }, [fetchedStatuses, connections]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    console.log('[ConnectionsModal] handleAction invoked', { connectionId, action, sourcePhotoId });
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
    
    // Undo: delete link if exists
    const target = connections.find(c => c.id === connectionId);
    if (newStatus === 'proposed' && target && sourcePhotoId) {
      const dst_type = mapDstType(target.type);
      const dst_id = getDstId(dst_type, target.properties);
      if (dst_id) {
        const payload = {
          src_type: 'photo',
          src_id: sourcePhotoId,
          relation: 'bearing_match',
          dst_type,
          dst_id,
        };
        console.info('[ConnectionsModal] DELETE /entity-links payload', payload);
        axios.delete('/entity-links', { data: payload })
          .then((res) => {
            console.info('[ConnectionsModal] Undo delete success', { connectionId, res: res?.data });
            // Remove fetched status cache so it reverts to proposed
            setFetchedStatuses((prev) => {
              const next = { ...prev };
              delete next[`${dst_type}|${dst_id}`];
              return next;
            });
          })
          .catch((err) => {
            console.error('[ConnectionsModal] Undo delete failed', err?.response?.data || err?.message || err);
          })
          .finally(() => {
            onUpdateConnection(connectionId, newStatus);
          });
        return;
      }
    }

    // Persist via web endpoint for verify/reject only
    if ((newStatus === 'verified' || newStatus === 'rejected') && target && sourcePhotoId) {
      console.log('[ConnectionsModal] Single action start', { connectionId, newStatus, sourcePhotoId, target });
      const dst_type = mapDstType(target.type);
      const dst_id = getDstId(dst_type, target.properties);

      if (dst_id) {
        const payload = {
          src_type: 'photo',
          src_id: sourcePhotoId,
          relation: 'bearing_match',
          dst_type,
          dst_id,
          status: newStatus,
          source: 'auto_bearing',
          bearing_delta: target.bearing ?? null,
          distance_m: target.distance ?? null,
        };
        console.info('[ConnectionsModal] POST /entity-links payload', payload);
        axios.post('/entity-links', payload)
          .then(res => {
            console.info('[ConnectionsModal] Single action success', { connectionId, status: newStatus, res: res?.data });
            // Update fetchedStatuses cache so UI reflects server state immediately
            setFetchedStatuses((prev) => ({ ...prev, [`${dst_type}|${dst_id}`]: newStatus as 'verified' | 'rejected' }));
          })
          .catch(err => {
            console.error('[ConnectionsModal] Failed to persist entity link (single):', err?.response?.data || err?.message || err);
          })
          .finally(() => {
            onUpdateConnection(connectionId, newStatus);
          });
        return;
      }
      console.warn('[ConnectionsModal] Missing dst_id, cannot persist', { connectionId, dst_type, target });
    }

    // Fallback: local update
    onUpdateConnection(connectionId, newStatus);
  };

  // Bulk actions: apply to selected items that are currently proposed
  const handleBulkAction = (action: 'verify' | 'reject') => {
    const targetStatus: 'verified' | 'rejected' = action === 'verify' ? 'verified' : 'rejected';
    const targetIds = connections
      .filter((c) => selectedIds[c.id] && getEffectiveStatus(c) === 'proposed')
      .map((c) => c.id);

    if (targetIds.length > 0 && sourcePhotoId) {
      console.log('[ConnectionsModal] Bulk action start', { action, targetStatus, selectedCount, targetIds, sourcePhotoId });
      const items = connections
        .filter(c => targetIds.includes(c.id))
        .map(c => {
          const dst_type = mapDstType(c.type);
          const dst_id = getDstId(dst_type, c.properties);
          return dst_id ? {
            src_type: 'photo',
            src_id: sourcePhotoId,
            relation: 'bearing_match',
            dst_type,
            dst_id,
            status: targetStatus,
            source: 'auto_bearing',
            bearing_delta: c.bearing ?? null,
            distance_m: c.distance ?? null,
          } : null;
        })
        .filter(Boolean);

      if (items.length > 0) {
        console.info('[ConnectionsModal] POST /entity-links/bulk payload', { itemsCount: (items as any[]).length, items });
        axios.post('/entity-links/bulk', { items })
          .then(res => {
            console.info('[ConnectionsModal] Bulk action success', { affected: targetIds.length, res: res?.data });
            // Update fetchedStatuses cache in bulk
            setFetchedStatuses((prev) => {
              const next = { ...prev } as Record<string, 'verified' | 'rejected'>;
              (items as any[]).forEach((it) => {
                next[`${it.dst_type}|${it.dst_id}`] = targetStatus;
              });
              return next;
            });
          })
          .catch(err => {
            console.error('[ConnectionsModal] Failed to persist entity links (bulk):', err?.response?.data || err?.message || err);
          })
          .finally(() => {
            targetIds.forEach((id) => onUpdateConnection(id, targetStatus));
            setSelectedIds({});
          });
        return;
      }
      console.warn('[ConnectionsModal] No valid items to persist in bulk (missing dst_id?)', { targetIds });
    }

    // Fallback local update
    targetIds.forEach((id) => onUpdateConnection(id, targetStatus));
    setSelectedIds({});
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
              {/* Bulk action bar */}
              {selectedCount > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <div className="text-sm text-indigo-800">
                    {selectedCount} selected
                  </div>
                  <div className="space-x-2">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      disabled={selectedCount === 0}
                      onClick={() => handleBulkAction('verify')}
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      disabled={selectedCount === 0}
                      onClick={() => handleBulkAction('reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        disabled={isLoadingStatuses}
                      />
                    </th>
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
                    const status = getEffectiveStatus(connection);
                    return (
                      <tr key={connection.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={!!selectedIds[connection.id] && status === 'proposed'}
                            onChange={() => {
                              if (status === 'proposed' && !isLoadingStatuses) {
                                toggleSelectOne(connection.id);
                              }
                            }}
                            aria-label={`Select ${connection.id}`}
                            disabled={isLoadingStatuses || status !== 'proposed'}
                          />
                        </td>
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
                          {isLoadingStatuses ? (
                            <div className="inline-flex items-center text-gray-500">
                              <svg className="animate-spin h-4 w-4 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                              <span className="text-xs">Checking status…</span>
                            </div>
                          ) : (
                            <>
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
                            </>
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
