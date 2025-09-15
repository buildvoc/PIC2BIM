import { useMemo } from 'react';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    PhotoCentroidState,
    BuiltupAreaGeoJson
} from '../types';

interface UseDataFiltersProps {
  // Raw data arrays
  buildingCentroidsData: BuildingCentroidState[];
  buildingPartCentroidsData: BuildingPartCentroidState[];
  siteCentroidsData: SiteCentroidState[];
  nhleCentroidsData: NhleFeatureState[];
  photoCentroidsData: PhotoCentroidState[];
  
  // Filter parameters
  shapes: {data: BuiltupAreaGeoJson} | null;
  selectedShapeIds: string[];
  floorRange: { min: number; max: number };
  selectedGrades: string[];
  dataType: { buildings: boolean; buildingParts: boolean; sites: boolean; nhle: boolean; photos: boolean };
  
  // Shape filtering
  boundarySearch: string;
  showSelectedOnly: boolean;
}

export function useDataFilters({
  buildingCentroidsData,
  buildingPartCentroidsData,
  siteCentroidsData,
  nhleCentroidsData,
  photoCentroidsData,
  shapes,
  selectedShapeIds,
  floorRange,
  selectedGrades,
  dataType,
  boundarySearch,
  showSelectedOnly
}: UseDataFiltersProps) {

  // Helper function to filter by selected shapes
  const filterBySelectedShapes = useMemo(() => {
    if (!shapes?.data?.features) return () => true;
    
    const selectedPolygons = shapes.data.features.filter(shape => 
      selectedShapeIds.includes(shape.id as string)
    );
    const hasSelectedShapes = selectedPolygons.length > 0;
    
    if (!hasSelectedShapes) return () => true;
    
    return (coordinates: [number, number]) => {
      const point = turf.point(coordinates);
      return selectedPolygons.some(polygon => {
        try {
          return booleanPointInPolygon(point, polygon as any);
        } catch (e) {
          return false;
        }
      });
    };
  }, [shapes?.data?.features, selectedShapeIds]);

  // Filtered Buildings
  const filteredBuildingCentroids = useMemo(() => {
    return buildingCentroidsData.filter(d => {
      // Shape filter
      if (!filterBySelectedShapes(d.coordinates)) {
        return false;
      }

      // Floor range filter
      const floors = d.properties?.numberoffloors || d.properties?.floors || d.properties?.numFloors || d.properties?.floor_count || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [buildingCentroidsData, floorRange, filterBySelectedShapes]);

  // Filtered Building Parts
  const filteredBuildingPartCentroids = useMemo(() => {
    return buildingPartCentroidsData.filter(d => {
      // Shape filter
      return filterBySelectedShapes(d.coordinates);
    });
  }, [buildingPartCentroidsData, filterBySelectedShapes]);

  // Filtered NHLE
  const filteredNhleCentroids = useMemo(() => {
    return nhleCentroidsData.filter(d => {
      // Shape filter
      if (!filterBySelectedShapes(d.coordinates)) {
        return false;
      }

      // Grade filter
      if (selectedGrades.length > 0) {
        return selectedGrades.includes(d.properties?.grade || '');
      }

      return true;
    });
  }, [nhleCentroidsData, selectedGrades, filterBySelectedShapes]);

  // Filtered Photos
  const filteredPhotoCentroids = useMemo(() => {
    return photoCentroidsData.filter(d => {
      // Shape filter
      return filterBySelectedShapes(d.coordinates);
    });
  }, [photoCentroidsData, filterBySelectedShapes]);

  // Filtered Sites
  const filteredSiteCentroids = useMemo(() => {
    return siteCentroidsData.filter(d => {
      // Shape filter
      if (!filterBySelectedShapes(d.coordinates)) {
        return false;
      }

      // Floor range filter (sites can also have floor data)
      const floors = d.properties?.numberoffloors || d.properties?.floors || d.properties?.numFloors || d.properties?.floor_count || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [siteCentroidsData, floorRange, filterBySelectedShapes]);

  // Available grades for NHLE filtering
  const availableGrades = useMemo(() => {
    const grades = nhleCentroidsData.map(d => d.properties?.grade).filter(Boolean);
    return Array.from(new Set(grades)).sort();
  }, [nhleCentroidsData]);

  // Filtered shapes for boundary search and selection
  const filteredShapes = useMemo(() => {
    if (!shapes?.data?.features) return [];
    
    let filtered = shapes.data.features;
    
    // Apply search filter
    if (boundarySearch) {
      filtered = filtered.filter(shape => 
        shape.properties.bua24nm.toLowerCase().includes(boundarySearch.toLowerCase())
      );
    }
    
    // Apply selected only filter
    if (showSelectedOnly) {
      filtered = filtered.filter(shape => 
        selectedShapeIds.includes(shape.id as string)
      );
    }
    
    return filtered;
  }, [shapes?.data?.features, boundarySearch, showSelectedOnly, selectedShapeIds]);

  // Combined filtered data based on data type selection
  const allFilteredData = useMemo(() => {
    const isAnyTypeSelected = dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos;
    
    if (!isAnyTypeSelected) {
      return [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids, ...filteredNhleCentroids, ...filteredPhotoCentroids];
    }
    
    const data = [];
    if (dataType.buildings) data.push(...filteredBuildingCentroids);
    if (dataType.buildingParts) data.push(...filteredBuildingPartCentroids);
    if (dataType.sites) data.push(...filteredSiteCentroids);
    if (dataType.nhle) data.push(...filteredNhleCentroids);
    if (dataType.photos) data.push(...filteredPhotoCentroids);
    
    return data;
  }, [filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids, dataType]);

  return {
    filteredBuildingCentroids,
    filteredBuildingPartCentroids,
    filteredSiteCentroids,
    filteredNhleCentroids,
    filteredPhotoCentroids,
    availableGrades,
    filteredShapes,
    allFilteredData
  };
}
