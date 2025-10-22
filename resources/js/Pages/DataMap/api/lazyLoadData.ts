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
 * Load building parts data
 */
export const loadBuildingParts = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'building_parts',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('buildingParts', response.data.buildingParts, options.useWorker);
  } catch (error) {
    console.error('Failed to load building parts:', error);
    throw error;
  }
};

/**
 * Load sites data
 */
export const loadSites = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'sites',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('sites', response.data.sites, options.useWorker);
  } catch (error) {
    console.error('Failed to load sites:', error);
    throw error;
  }
};

/**
 * Load NHLE data
 */
export const loadNHLE = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'nhle',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('nhle', response.data.nhle, options.useWorker);
  } catch (error) {
    console.error('Failed to load NHLE:', error);
    throw error;
  }
};

/**
 * Load Land Registry data
 */
export const loadLandRegistry = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'land_registry',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('landRegistryInspire', response.data.landRegistryInspire, options.useWorker);
  } catch (error) {
    console.error('Failed to load Land Registry:', error);
    throw error;
  }
};

/**
 * Load UPRN data
 */
export const loadUPRN = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'uprn',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('uprn', response.data.uprn, options.useWorker);
  } catch (error) {
    console.error('Failed to load UPRN:', error);
    throw error;
  }
};

/**
 * Load photos data
 */
export const loadPhotos = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'photos',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('photos', response.data.photos, options.useWorker);
  } catch (error) {
    console.error('Failed to load photos:', error);
    throw error;
  }
};

/**
 * Load OSM Building Parts data
 */
export const loadOSMBuildingParts = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'osm_building_parts',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('osmBuildingParts', response.data.osmBuildingParts, options.useWorker);
  } catch (error) {
    console.error('Failed to load OSM Building Parts:', error);
    throw error;
  }
};

/**
 * Load OSM Addresses data
 */
export const loadOSMAddresses = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'osm_addresses',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('osmAddresses', response.data.osmAddresses, options.useWorker);
  } catch (error) {
    console.error('Failed to load OSM Addresses:', error);
    throw error;
  }
};

/**
 * Load OSM Landuse data
 */
export const loadOSMLanduse = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'osm_landuse',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('osmLanduseAreas', response.data.osmLanduseAreas, options.useWorker);
  } catch (error) {
    console.error('Failed to load OSM Landuse:', error);
    throw error;
  }
};

/**
 * Load EPC Certificates data
 */
export const loadEPCCertificates = async (options: LazyLoadOptions) => {
  try {
    const response = await axios.post('/get-area-data', {
      area_ids: options.areaIds,
      data_type: 'epc_certificates',
      include_bua_filter: options.includeBuaFilter ?? true
    });
    
    return await processDataWithWorker('epcCertificates', response.data.epcCertificates, options.useWorker);
  } catch (error) {
    console.error('Failed to load EPC Certificates:', error);
    throw error;
  }
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
    const batch1 = await Promise.allSettled([
      loadNHLE(options),
      loadSites(options),
      loadPhotos(options)
    ]);
    
    if (batch1[0].status === 'fulfilled') {
      results.nhle = batch1[0].value;
      onProgress?.('nhle', batch1[0].value);
    }
    if (batch1[1].status === 'fulfilled') {
      results.sites = batch1[1].value;
      onProgress?.('sites', batch1[1].value);
    }
    if (batch1[2].status === 'fulfilled') {
      results.photos = batch1[2].value;
      onProgress?.('photos', batch1[2].value);
    }
    
    // Batch 2: Heavy data
    console.log('Loading batch 2: Heavy data...');
    const batch2 = await Promise.allSettled([
      loadBuildingParts(options),
      loadLandRegistry(options)
    ]);
    
    if (batch2[0].status === 'fulfilled') {
      results.buildingParts = batch2[0].value;
      onProgress?.('buildingParts', batch2[0].value);
    }
    if (batch2[1].status === 'fulfilled') {
      results.landRegistryInspire = batch2[1].value;
      onProgress?.('landRegistryInspire', batch2[1].value);
    }
    
    // Batch 3: Optional data (throttled to 2 concurrent requests)
    console.log('Loading batch 3: Optional data with throttling (max 2 concurrent)...');
    const batch3Tasks = [
      { name: 'uprn', task: () => loadUPRN(options) },
      { name: 'epcCertificates', task: () => loadEPCCertificates(options) },
      { name: 'osmBuildingParts', task: () => loadOSMBuildingParts(options) },
      { name: 'osmAddresses', task: () => loadOSMAddresses(options) },
      { name: 'osmLanduseAreas', task: () => loadOSMLanduse(options) }
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
