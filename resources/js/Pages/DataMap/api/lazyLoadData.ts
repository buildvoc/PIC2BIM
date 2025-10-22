import axios from 'axios';

/**
 * Lazy loading helper functions for DataMap
 * Each function loads a specific data type from the backend
 */

export interface LazyLoadOptions {
  areaIds: string[];
  includeBuaFilter?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
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
    
    return response.data.buildingParts;
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
    
    return response.data.sites;
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
    
    return response.data.nhle;
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
    
    return response.data.landRegistryInspire;
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
    
    return response.data.uprn;
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
    
    return response.data.photos;
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
    
    return response.data.osmBuildingParts;
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
    
    return response.data.osmAddresses;
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
    
    return response.data.osmLanduseAreas;
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
    
    return response.data.epcCertificates;
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
    
    // Batch 3: Optional data
    console.log('Loading batch 3: Optional data...');
    const batch3 = await Promise.allSettled([
      loadUPRN(options),
      loadEPCCertificates(options),
      loadOSMBuildingParts(options),
      loadOSMAddresses(options),
      loadOSMLanduse(options)
    ]);
    
    if (batch3[0].status === 'fulfilled') {
      results.uprn = batch3[0].value;
      onProgress?.('uprn', batch3[0].value);
    }
    if (batch3[1].status === 'fulfilled') {
      results.epcCertificates = batch3[1].value;
      onProgress?.('epcCertificates', batch3[1].value);
    }
    if (batch3[2].status === 'fulfilled') {
      results.osmBuildingParts = batch3[2].value;
      onProgress?.('osmBuildingParts', batch3[2].value);
    }
    if (batch3[3].status === 'fulfilled') {
      results.osmAddresses = batch3[3].value;
      onProgress?.('osmAddresses', batch3[3].value);
    }
    if (batch3[4].status === 'fulfilled') {
      results.osmLanduseAreas = batch3[4].value;
      onProgress?.('osmLanduseAreas', batch3[4].value);
    }
    
    console.log('All data loaded successfully');
    return results;
    
  } catch (error) {
    console.error('Error loading batched data:', error);
    throw error;
  }
};
