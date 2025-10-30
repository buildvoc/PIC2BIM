import axios from 'axios';
import { getWorkerManager } from '../workers/WorkerManager';

/**
 * Lazy loading helper functions for DataMap
 * Each function loads a specific data type from the backend
 * Uses Web Workers for parallel data processing
 */

export interface LazyLoadOptions {
  areaIds: string[];
  includeBuaFilter?: boolean;
  useWorker?: boolean; // Option to enable/disable worker processing
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Process data using worker or fallback to main thread
 */
const processDataWithWorker = async (dataType: string, data: any, useWorker?: boolean): Promise<any> => {
  // Default to false for now to debug
  const shouldUseWorker = useWorker ?? false;


  if (!shouldUseWorker) {
    // Fallback: return data as-is
    return data;
  }

  try {
    const workerManager = getWorkerManager();
    const result = await workerManager.processData(dataType, data);
    
    // If worker returns null/undefined, use original data
    if (result === null || result === undefined) {
      return data;
    }
    
    return result;
  } catch (error) {
    console.warn(`Worker processing failed for ${dataType}, using fallback:`, error);
    return data; // Fallback to original data
  }
}

/**
 * Load Building Parts data using streaming
 */
export const loadBuildingParts = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any }) => void;
}) => {
  return await loadBuildingPartsStream(options);
};

/**
 * Stream Building Parts data progressively
 */
export const loadBuildingPartsStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any }) => void;
}): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const allData: any[] = [];
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-building-parts-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Response body is not readable');
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(allData);
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({ type: 'metadata', total: data.total });
                } 
                else if (data.type === 'chunk') {
                  // Handle different data formats from backend
                  let chunkData;
                  
                  if (Array.isArray(data.data)) {
                    // Direct array format (used by Sites, NHLE, etc.)
                    console.log(`[BuildingParts] Processing direct array with ${data.data.length} items`);
                    chunkData = data.data;
                    allData.push(...data.data);
                  } else if (data.data && typeof data.data === 'object' && data.data.features && Array.isArray(data.data.features)) {
                    // GeoJSON FeatureCollection format (used by Building Parts)
                    console.log(`[BuildingParts] Processing FeatureCollection with ${data.data.features.length} features`);
                    chunkData = data.data.features;
                    allData.push(...data.data.features);
                  } else if (data.data && typeof data.data === 'object') {
                    // Single object - treat as single item
                    console.warn('[BuildingParts] Single object in chunk, treating as array:', data.data);
                    chunkData = [data.data];
                    allData.push(data.data);
                  } else {
                    // Null, undefined, or primitive - skip
                    console.warn('[BuildingParts] Unexpected data format in chunk, skipping:', data.data);
                    chunkData = [];
                  }
                  
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allData.length,
                    total: allData.length,
                    chunkData: chunkData
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({ type: 'complete', total: data.total });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start BuildingParts stream:', error);
      reject(error);
    });
  });
};

/**
 * Load sites data using streaming
 */
export const loadSites = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadSitesStream(options);
};

/**
 * Stream Sites data progressively
 */
export const loadSitesStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const allData: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-sites-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 50
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(allData);
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allData.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allData.length,
                    total: allData.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start Sites stream:', error);
      reject(error);
    });
  });
};

/**
 * Load NHLE data using streaming
 */
export const loadNHLE = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadNHLEStream(options);
};

/**
 * Stream NHLE data progressively
 */
export const loadNHLEStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const allData: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-nhle-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 50
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve(allData);
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allData.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allData.length,
                    total: allData.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start NHLE stream:', error);
      reject(error);
    });
  });
};

/**
 * Load Land Registry data using streaming
 */
export const loadLandRegistry = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadLandRegistryStream(options);
};

/**
 * Stream Land Registry data progressively
 */
export const loadLandRegistryStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-land-registry-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Response body is not readable');
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({ type: 'metadata', total: data.total });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({ type: 'complete', total: data.total });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e);
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start LandRegistry stream:', error);
      reject(error);
    });
  });
};

/**
 * Load UPRN data using streaming
 */
export const loadUPRN = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadUPRNStream(options);
};

/**
 * Stream UPRN data progressively
 */
export const loadUPRNStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-uprn-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start UPRN stream:', error);
      reject(error);
    });
  });
};

/**
 * Load photos data with streaming support
 */
export const loadPhotos = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadPhotosStream(options);
};

/**
 * Stream Photos data progressively
 */
export const loadPhotosStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ type: string; features: any[] }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-photos-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 20  // Smaller chunk size for photos (they have more data per item)
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ type: 'FeatureCollection', features: allFeatures });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start Photos stream:', error);
      reject(error);
    });
  });
};

/**
 * Load OSM Building Parts data using streaming
 */
export const loadOSMBuildingParts = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadOSMBuildingPartsStream(options);
};

/**
 * Stream OSM Building Parts data progressively
 */
export const loadOSMBuildingPartsStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-osm-building-parts-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start OSM BuildingParts stream:', error);
      reject(error);
    });
  });
};

/**
 * Load OSM Addresses data using streaming
 */
export const loadOSMAddresses = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadOSMAddressesStream(options);
};

/**
 * Stream OSM Addresses data progressively
 */
export const loadOSMAddressesStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-osm-addresses-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start OSM Addresses stream:', error);
      reject(error);
    });
  });
};

/**
 * Load OSM Landuse data using streaming
 */
export const loadOSMLanduse = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadOSMLanduseStream(options);
};

/**
 * Stream OSM Landuse data progressively
 */
export const loadOSMLanduseStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-osm-landuse-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start OSM Landuse stream:', error);
      reject(error);
    });
  });
};

/**
 * Load EPC Certificates data using streaming
 */
export const loadEPCCertificates = async (options: LazyLoadOptions & { 
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}) => {
  return await loadEPCCertificatesStream(options);
};

/**
 * Stream EPC Certificates data progressively
 */
export const loadEPCCertificatesStream = async (options: LazyLoadOptions & {
  onProgress?: (progress: { type: string; progress?: number; loaded?: number; total?: number; chunkData?: any[] }) => void;
}): Promise<{ data: { type: string; features: any[] } }> => {
  return new Promise((resolve, reject) => {
    const allFeatures: any[] = [];
    
    // Get CSRF token
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    fetch('/stream-epc-certificates-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        area_ids: options.areaIds,
        include_bua_filter: options.includeBuaFilter ?? true,
        chunk_size: 100
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      let buffer = '';
      
      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            resolve({ data: { type: 'FeatureCollection', features: allFeatures } });
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (!jsonStr) continue;
                
                const data = JSON.parse(jsonStr);
                
                if (data.type === 'metadata') {
                  options.onProgress?.({
                    type: 'metadata',
                    total: data.total
                  });
                } 
                else if (data.type === 'chunk') {
                  allFeatures.push(...data.data);
                  
                  // ✅ Send chunk data to callback for immediate rendering
                  options.onProgress?.({
                    type: 'chunk',
                    progress: data.progress,
                    loaded: allFeatures.length,
                    total: allFeatures.length,
                    chunkData: data.data
                  });
                } 
                else if (data.type === 'complete') {
                  options.onProgress?.({
                    type: 'complete',
                    total: data.total
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e, 'Line:', line.substring(0, 100));
              }
            }
          }
          
          readStream();
        }).catch(error => {
          console.error('Stream reading error:', error);
          reject(error);
        });
      };
      
      readStream();
    })
    .catch(error => {
      console.error('Failed to start EPC stream:', error);
      reject(error);
    });
  });
};

/**
 * Load all data types in batches for better performance
 */
export const loadAllDataBatched = async (options: LazyLoadOptions, onProgress?: (dataType: string, data: any) => void) => {
  const results: any = {};

  /**
   * Throttle requests to limit concurrent API calls
   * Uses a simple queue-based approach with max concurrent limit
   * @param tasks Array of task objects with name and function
   * @param limit Maximum number of concurrent requests (default: 2)
   */
  async function throttleRequests<T>(
    tasks: Array<{ name: string; task: () => Promise<T> }>, 
    limit = 2
  ): Promise<Array<{ name: string; data: T | null; error?: any }>> {
    const results: Array<{ name: string; data: T | null; error?: any }> = [];
    let activeCount = 0;
    let taskIndex = 0;

    return new Promise((resolve) => {
      const runNext = () => {
        // If all tasks are done, resolve
        if (taskIndex >= tasks.length && activeCount === 0) {
          resolve(results);
          return;
        }

        // Start new tasks up to the limit
        while (activeCount < limit && taskIndex < tasks.length) {
          const { name, task } = tasks[taskIndex++];
          activeCount++;

          task()
            .then(data => {
              results.push({ name, data });
            })
            .catch(error => {
              console.error(`[Throttle] ✗ Failed: ${name}`, error);
              results.push({ name, data: null, error });
            })
            .finally(() => {
              activeCount--;
              runNext();
            });
        }
      };

      runNext();
    });
  }

  
  try {
    // Batch 1: Important data (load first)
    console.log('Loading batch 1: Important data...');
    
    // Load NHLE with streaming and incremental rendering
    const nhlePromise = loadNHLE({
      ...options,
      onProgress: (progress) => {
        if (progress.type === 'chunk' && progress.chunkData) {
          onProgress?.('nhle', progress.chunkData);
        }
      }
    });
    
    // Load Sites with streaming and incremental rendering
    const sitesPromise = loadSites({
      ...options,
      onProgress: (progress) => {
        if (progress.type === 'chunk' && progress.chunkData) {
          onProgress?.('sites', progress.chunkData);
        }
      }
    });
    
    // Load Photos with streaming and incremental rendering
    const photosPromise = loadPhotos({
      ...options,
      onProgress: (progress) => {
        if (progress.type === 'chunk' && progress.chunkData) {
          onProgress?.('photos', { type: 'FeatureCollection', features: progress.chunkData });
        }
      }
    });
    
    const batch1 = await Promise.allSettled([
      nhlePromise,
      sitesPromise,
      photosPromise
    ]);
    
    if (batch1[0].status === 'fulfilled') {
      results.nhle = batch1[0].value;
      // Note: onProgress already called for each chunk above
      console.log(`[Batch] NHLE final: ${batch1[0].value.length} total items`);
    }
    if (batch1[1].status === 'fulfilled') {
      results.sites = batch1[1].value;
      // Note: onProgress already called for each chunk above
      console.log(`[Batch] Sites final: ${batch1[1].value.length} total items`);
    }
    if (batch1[2].status === 'fulfilled') {
      results.photos = batch1[2].value;
      // Note: onProgress already called for each chunk above
      console.log(`[Batch] Photos final: ${batch1[2].value?.features?.length || 0} total items`);
    }
    
    // Batch 2: Heavy data with streaming
    console.log('Loading batch 2: Heavy data with streaming...');
    
    // Load Building Parts with streaming
    const buildingPartsPromise = loadBuildingParts({
      ...options,
      onProgress: (progress) => {
        if (progress.type === 'chunk' && progress.chunkData) {
          // Convert array to FeatureCollection format to match expected format in Index.tsx
          onProgress?.('buildingParts', { 
            type: 'FeatureCollection', 
            features: progress.chunkData 
          });
        }
      }
    });
    
    // Load Land Registry with streaming
    const landRegistryPromise = loadLandRegistry({
      ...options,
      onProgress: (progress) => {
        if (progress.type === 'chunk' && progress.chunkData) {
          onProgress?.('landRegistryInspire', { data: { type: 'FeatureCollection', features: progress.chunkData } });
        }
      }
    });
    
    const batch2 = await Promise.allSettled([
      buildingPartsPromise,
      landRegistryPromise
    ]);
    
    if (batch2[0].status === 'fulfilled') {
      // Convert final result to FeatureCollection format
      const buildingPartsData = batch2[0].value;
      results.buildingParts = {
        type: 'FeatureCollection',
        features: Array.isArray(buildingPartsData) ? buildingPartsData : []
      };
    }
    if (batch2[1].status === 'fulfilled') {
      results.landRegistryInspire = batch2[1].value;
    }
    
    // Batch 3: Optional data (throttled to 2 concurrent requests)
    console.log('Loading batch 3: Optional data with throttling (max 2 concurrent)...');
    const batch3Tasks = [
      { 
        name: 'uprn', 
        task: () => loadUPRN({
          ...options,
          onProgress: (progress) => {
            if (progress.type === 'chunk' && progress.chunkData) {
              onProgress?.('uprn', { data: { type: 'FeatureCollection', features: progress.chunkData } });
            }
          }
        })
      },
      { 
        name: 'epcCertificates', 
        task: () => loadEPCCertificates({
          ...options,
          onProgress: (progress) => {
            if (progress.type === 'chunk' && progress.chunkData) {
              onProgress?.('epcCertificates', { data: { type: 'FeatureCollection', features: progress.chunkData } });
            }
          }
        })
      },
      { 
        name: 'osmBuildingParts', 
        task: () => loadOSMBuildingParts({
          ...options,
          onProgress: (progress) => {
            if (progress.type === 'chunk' && progress.chunkData) {
              onProgress?.('osmBuildingParts', { data: { type: 'FeatureCollection', features: progress.chunkData } });
            }
          }
        })
      },
      { 
        name: 'osmAddresses', 
        task: () => loadOSMAddresses({
          ...options,
          onProgress: (progress) => {
            if (progress.type === 'chunk' && progress.chunkData) {
              onProgress?.('osmAddresses', { data: { type: 'FeatureCollection', features: progress.chunkData } });
            }
          }
        })
      },
      { 
        name: 'osmLanduseAreas', 
        task: () => loadOSMLanduse({
          ...options,
          onProgress: (progress) => {
            if (progress.type === 'chunk' && progress.chunkData) {
              onProgress?.('osmLanduseAreas', { data: { type: 'FeatureCollection', features: progress.chunkData } });
            }
          }
        })
      }
    ];

    const batch3Results = await throttleRequests(batch3Tasks, 2);
    
    // Process results and trigger progress callbacks
    batch3Results.forEach(({ name, data, error }) => {
      if (data && !error) {
        results[name] = data;
        onProgress?.(name, data);
      } else {
        console.warn(`Skipping ${name} due to error:`, error);
      }
    });
    
    console.log('All data loaded successfully');
    return results;
    
  } catch (error) {
    console.error('Error loading batched data:', error);
    throw error;
  }
};

/**
 * Cleanup function to terminate workers when component unmounts
 * Call this when the DataMap component is unmounted
 */
export { terminateWorkerManager } from '../workers/WorkerManager';

/**
 * Get worker status for debugging
 */
export const getWorkerStatus = () => {
  const workerManager = getWorkerManager();
  return workerManager.getStatus();
};
