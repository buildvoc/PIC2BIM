import React, { useMemo } from 'react';
import { ScatterplotLayer, IconLayer, PathLayer, GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    PhotoCentroidState,
    UprnCentroidState
} from '../types';

interface MapLayersProps {
  // Data arrays
  filteredBuildingCentroids: BuildingCentroidState[];
  filteredBuildingPartCentroids: BuildingPartCentroidState[];
  filteredSiteCentroids: SiteCentroidState[];
  filteredNhleCentroids: NhleFeatureState[];
  filteredPhotoCentroids: PhotoCentroidState[];
  filteredUprnCentroids: UprnCentroidState[];
  filteredOsmBuildingPartCentroids: any[];
  filteredOsmLanduseAreasCentroids: any[];
  landRegistryInspireData: any;
  polygonCentroids: Array<{coordinates: [number, number], properties: any}>;
  bidirectionalLinks: any[];
  
  // BUA filtering props
  shapes: {data: any} | null;
  selectedShapeIds: string[];
  
  // Polygon data for 2D display
  buildingPartPolygons?: any; // GeoJSON data for building part polygons
  osmBuildingPartPolygons?: any; // GeoJSON data for OSM building part polygons
  
  // State variables
  dataType: { buildings: boolean; buildingParts: boolean; sites: boolean; nhle: boolean; photos: boolean; uprn: boolean; osmBuildingParts: boolean; osmLanduseAreas: boolean };
  category1: string;
  category2: string;
  selectedLegendItem: any | null;
  zoomBasedRadius: number;
  geoJson: any;
  fetchedPolygons: any;
  searchMarker: {coordinates: [number, number], data: any, type: string} | null;
  selectedFeature: BuildingCentroidState | BuildingPartCentroidState | SiteCentroidState | NhleFeatureState | PhotoCentroidState | null;
  
  // Spidering props
  selectedPoint: any | null;
  spideredConnections: any[];
  spideringRadius: number;
  onPointClick: (point: any) => void;
  
  // Functions
  groupByMapping: { [key: string]: string };
  getFillColorForData: (d: any, defaultColor: number[], fallbackColor: number[]) => number[];
  getCursor: any;
  setHoverInfo: (info: any) => void;
  setSelectedFeature: (feature: any) => void;
  iconLayerData: any[];
  showPhotoBearingPolygon: boolean;
  osmBuildingParts?: any;
}

export function createMapLayers({
  filteredBuildingCentroids,
  filteredBuildingPartCentroids,
  filteredSiteCentroids,
  filteredNhleCentroids,
  filteredPhotoCentroids,
  filteredUprnCentroids = [],
  filteredOsmBuildingPartCentroids = [],
  filteredOsmLanduseAreasCentroids = [],
  landRegistryInspireData,
  polygonCentroids,
  bidirectionalLinks,
  shapes,
  selectedShapeIds,
  buildingPartPolygons,
  osmBuildingPartPolygons,
  dataType,
  category1,
  category2,
  selectedLegendItem,
  zoomBasedRadius,
  geoJson,
  fetchedPolygons,
  searchMarker,
  selectedFeature,
  selectedPoint,
  spideredConnections,
  spideringRadius,
  onPointClick,
  groupByMapping,
  getFillColorForData,
  getCursor,
  setHoverInfo,
  setSelectedFeature,
  iconLayerData,
  showPhotoBearingPolygon,
  osmBuildingParts
}: MapLayersProps) {
  
  // Helper function to filter by selected shapes (same as in useDataFilters)
  const filterBySelectedShapes = useMemo(() => {
    if (!shapes?.data?.features) return () => true;
    
    const selectedPolygons = shapes.data.features.filter((shape: any) => 
      selectedShapeIds.includes(shape.id as string)
    );
    const hasSelectedShapes = selectedPolygons.length > 0;
    
    if (!hasSelectedShapes) return () => true;
    
    return (coordinates: [number, number]) => {
      const point = turf.point(coordinates);
      return selectedPolygons.some((polygon: any) => {
        try {
          return booleanPointInPolygon(point, polygon);
        } catch (e) {
          return false;
        }
      });
    };
  }, [shapes?.data?.features, selectedShapeIds]);

  // Note: Land Registry INSPIRE data is used for photo bearing connections but not displayed as layer
  // The connection logic is handled in Index.tsx photo bearing intersection

  const layers = [
    // Building Part Polygons Layer (2D) - Show only when photo spidering is active AND polygons intersect with photo bearing
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.buildingParts) && 
    buildingPartPolygons && 
    buildingPartPolygons.features && 
    buildingPartPolygons.features.length > 0 &&
    showPhotoBearingPolygon &&
    selectedPoint &&
    'file_name' in selectedPoint.properties && // Check if spidering point is a photo
    new GeoJsonLayer({
      id: `building-part-polygons-layer`,
      data: {
        type: 'FeatureCollection',
        features: buildingPartPolygons.features.filter((polygon: any) => {
          // Only show polygons that intersect with the spidering photo's bearing
          if (!selectedPoint || !('file_name' in selectedPoint.properties)) {
            return false;
          }
          
          try {
            // Get photo details from spidering point
            const photoCoords: [number, number] = [selectedPoint.coordinates[0], selectedPoint.coordinates[1]];
            const photoHeading = typeof selectedPoint.properties.photo_heading === 'string' 
              ? parseFloat(selectedPoint.properties.photo_heading) 
              : (selectedPoint.properties.photo_heading || 0);
            
            // Create photo bearing sector (same logic as in photo bearing layer)
            const [lng, lat] = photoCoords;
            const headingRad = (photoHeading * Math.PI) / 180;
            const radius = 0.0001; // 10m radius in degrees
            const sectorAngle = Math.PI / 3; // 60 degrees sector angle
            const startAngle = headingRad - sectorAngle / 2;
            const endAngle = headingRad + sectorAngle / 2;
            
            // Adjust for latitude distortion
            const latCos = Math.cos(lat * Math.PI / 180);
            const adjustedRadius = radius / latCos;
            
            // Create arc points for bearing sector
            const arcPoints = [];
            const numPoints = 30;
            arcPoints.push([lng, lat]); // Start from center
            
            for (let i = 0; i <= numPoints; i++) {
              const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
              const x = lng + Math.sin(angle) * adjustedRadius;
              const y = lat + Math.cos(angle) * radius;
              arcPoints.push([x, y]);
            }
            arcPoints.push([lng, lat]); // Close polygon
            
            const bearingSector = turf.polygon([arcPoints]);
            
            // Check if photo point is inside polygon OR bearing sector intersects with polygon
            const photoPoint = turf.point(photoCoords);
            const photoInsidePolygon = booleanPointInPolygon(photoPoint, polygon);
            const intersects = booleanIntersects(bearingSector, polygon);
            
            return photoInsidePolygon || intersects;
          } catch (error) {
            console.warn('Error checking polygon intersection with photo bearing:', error);
            return false;
          }
        })
      },
      pickable: true,
      stroked: true,
      filled: true,
      wireframe: false,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getFillColor: () => [255, 165, 0, 80], // Orange with transparency like building parts
      getLineColor: () => [255, 165, 0, 200], // Solid orange border
      getLineWidth: () => 1,
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const buildingPartCentroid = filteredBuildingPartCentroids.find(
            part => part.properties.osid === info.object.properties.osid
          );
          if (buildingPartCentroid) {
            setSelectedFeature(buildingPartCentroid);
          }
        }
      },
      updateTriggers: {
        data: [buildingPartPolygons, selectedPoint, showPhotoBearingPolygon],
      },
    }),

    // OSM Building Part Polygons Layer (2D) - mirror building part polygon flow for photos
    filteredOsmBuildingPartCentroids &&
    filteredOsmBuildingPartCentroids &&
    filteredOsmBuildingPartCentroids.length > 0 &&
    showPhotoBearingPolygon &&
    selectedPoint &&
    'file_name' in selectedPoint.properties &&
    new GeoJsonLayer({
      id: `osm-building-part-polygons-layer`,
      data: {
        type: 'FeatureCollection',
        features: filteredOsmBuildingPartCentroids.filter((polygon: any) => {
          if (!selectedPoint || !('file_name' in selectedPoint.properties)) return false;
          try {
            const photoCoords: [number, number] = [selectedPoint.coordinates[0], selectedPoint.coordinates[1]];
            const photoHeading = typeof selectedPoint.properties.photo_heading === 'string'
              ? parseFloat(selectedPoint.properties.photo_heading)
              : (selectedPoint.properties.photo_heading || 0);

            // Create photo bearing sector (same logic)
            const [lng, lat] = photoCoords;
            const headingRad = (photoHeading * Math.PI) / 180;
            const radius = 0.0001; // ~10m in degrees
            const sectorAngle = Math.PI / 3; // 60 deg
            const startAngle = headingRad - sectorAngle / 2;
            const endAngle = headingRad + sectorAngle / 2;
            const latCos = Math.cos(lat * Math.PI / 180);
            const adjustedRadius = radius / latCos;

            const arcPoints = [] as [number, number][];
            const numPoints = 30;
            arcPoints.push([lng, lat]);
            for (let i = 0; i <= numPoints; i++) {
              const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
              const x = lng + Math.sin(angle) * adjustedRadius;
              const y = lat + Math.cos(angle) * radius;
              arcPoints.push([x, y]);
            }
            arcPoints.push([lng, lat]);
            const bearingSector = turf.polygon([arcPoints]);

            const photoPoint = turf.point(photoCoords);
            const photoInsidePolygon = booleanPointInPolygon(photoPoint, polygon);
            const intersects = booleanIntersects(bearingSector, polygon);
            return photoInsidePolygon || intersects;
          } catch (e) {
            return false;
          }
        })
      },
      pickable: true,
      stroked: true,
      filled: true,
      wireframe: false,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getFillColor: () => [255, 165, 0, 70],
      getLineColor: () => [255, 165, 0, 230],
      getLineWidth: () => 1,
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const osmId = String(info.object.properties?.osm_id ?? info.object.properties?.id ?? '');
          const centroid = filteredOsmBuildingPartCentroids.find((c: any) => String(c.properties?.osm_id ?? c.properties?.id ?? '') === osmId);
          if (centroid) {
            setSelectedFeature(centroid);
          }
        }
      },
      updateTriggers: {
        data: [filteredOsmBuildingPartCentroids, selectedPoint, showPhotoBearingPolygon]
      },
    }),

    // Building Parts Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.buildingParts) && 
    filteredBuildingPartCentroids.length > 0 && 
    new ScatterplotLayer<BuildingPartCentroidState>({
      id: `buildingpart-layer`,
      data: filteredBuildingPartCentroids.filter(part => {
        // Hide only specific building parts that are being spidered (but keep selected point visible)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'buildingPart' && 
            conn.properties.osid === part.properties.osid
          );
          return !isSpideredConnection;
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius;
        if (category1 === 'Size by Area') {
          const area = d.properties?.area || 0;
          baseRadius = Math.sqrt(area);
        } else { // Fixed Size
          baseRadius = 10;
        }

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        // Add dataType property for grouping by data type
        const dataWithType = { ...d, dataType: 'buildingParts' };
        return getFillColorForData(dataWithType, [255, 165, 0, 200], [255, 165, 0]) as [number, number, number, number];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const buildingPart = info.object as BuildingPartCentroidState;
          const smallestSiteId = buildingPart.properties.smallestsite_siteid;

          // Spider when this building part has a related site via smallestsite_siteid
          const hasRelatedSite = smallestSiteId && filteredSiteCentroids.some(site =>
            site.properties.osid === smallestSiteId
          );

          if (hasRelatedSite) {
            onPointClick(buildingPart);
          } else {
            setSelectedFeature(buildingPart);
          }
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
      },
    }),

    // Sites Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.sites) && 
    filteredSiteCentroids.length > 0 && 
    new ScatterplotLayer<SiteCentroidState>({
      id: `site-layer`,
      data: filteredSiteCentroids.filter(site => {
        // Hide only specific sites that are being spidered (but not the selected point)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.osid === site.properties.osid;
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'site' && 
            conn.properties.osid === site.properties.osid
          );
          return !isSpideredConnection || isSelectedPoint; // Keep selected point visible
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius;
        if (category1 === 'Size by Area') {
          const area = d.properties?.area || 0;
          baseRadius = Math.sqrt(area);
        } else { // Fixed Size
          baseRadius = 10;
        }

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'sites' };
        return getFillColorForData(dataWithType, [0, 255, 0, 200], [0, 255, 0]) as [number, number, number, number];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          // Spider when this site has related buildings (by primarysiteid) or parts (by smallestsite_siteid)
          const siteProperties = info.object.properties as any;
          const siteId = siteProperties.osid || siteProperties.id;

          const hasRelatedBuildings = filteredBuildingCentroids.some(building => building.properties.primarysiteid === siteId);
          const hasRelatedParts = filteredBuildingPartCentroids.some(part => part.properties.smallestsite_siteid === siteId);

          if (hasRelatedBuildings || hasRelatedParts) {
            onPointClick(info.object);
          } else {
            setSelectedFeature(info.object as SiteCentroidState);
          }
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
      },
    }),

    // NHLE Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.nhle) && 
    filteredNhleCentroids.length > 0 && 
    new ScatterplotLayer<NhleFeatureState>({
      id: `nhle-layer`,
      data: filteredNhleCentroids.filter(nhle => {
        // Hide only specific NHLE that are being spidered or are the selected point
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.nhle_id === nhle.properties.nhle_id;
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'nhle' && 
            conn.properties.nhle_id === nhle.properties.nhle_id
          );
          return !isSelectedPoint && !isSpideredConnection;
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 15,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius = 10;

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'nhle' };
        return getFillColorForData(dataWithType, [255, 0, 0, 200], [255, 0, 0]) as [number, number, number, number];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          setSelectedFeature(info.object as NhleFeatureState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
      },
    }),

    // Buildings Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.buildings) && 
    filteredBuildingCentroids.length > 0 && 
    new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer`,
      data: filteredBuildingCentroids.filter(building => {
        // Hide only specific buildings that are being spidered (but keep selected point visible)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'building' && 
            conn.properties.osid === building.properties.osid
          );
          return !isSpideredConnection;
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius;
        if (category1 === 'Size by Area') {
          const area = d.properties?.area || 0;
          baseRadius = Math.sqrt(area);
        } else { // Fixed Size
          baseRadius = 10;
        }

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'buildings' };
        return getFillColorForData(dataWithType, [0, 0, 255, 200], [0, 0, 255]) as [number, number, number, number];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const building = info.object as BuildingCentroidState;
          const primarySiteId = building.properties.primarysiteid;

          // Spider when this building has a related site via primarysiteid
          const hasRelatedSite = primarySiteId && filteredSiteCentroids.some(site =>
            site.properties.osid === primarySiteId
          );

          if (hasRelatedSite) {
            onPointClick(building);
          } else {
            setSelectedFeature(building);
          }
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
      },
    }),

    // UPRN Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.uprn) && 
    filteredUprnCentroids.length > 0 &&
    new ScatterplotLayer<UprnCentroidState>({
      id: `uprn-layer`,
      data: filteredUprnCentroids,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 16,
      radiusMinPixels: 2,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getRadius: (d: any) => {
        let baseRadius = 8; // fixed size for UPRN
        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }
        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'uprn' };
        return getFillColorForData(dataWithType, [0, 188, 212, 220], [0, 188, 212]) as [number, number, number, number];
      },
      getLineColor: (d: any) => [51, 51, 51, 255], // stroke: #333
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          // For UPRN: trigger spidering to show nearby UPRNs
          onPointClick(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [filteredUprnCentroids, zoomBasedRadius],
      },
    }),

    // OSM Building Part Polygons Layer (2D) - Show only when photo spidering is active AND polygons intersect with photo bearing
    osmBuildingPartPolygons && 
    osmBuildingPartPolygons.features && 
    osmBuildingPartPolygons.features.length > 0 &&
    showPhotoBearingPolygon &&
    selectedPoint &&
    dataType.osmBuildingParts &&
    'file_name' in selectedPoint.properties && // Check if spidering point is a photo
    new GeoJsonLayer({
      id: `osm-building-part-polygons-display-layer`,
      data: {
        type: 'FeatureCollection',
        features: osmBuildingPartPolygons.features.filter((polygon: any) => {
          // Only show polygons that intersect with the spidering photo's bearing
          if (!selectedPoint || !('file_name' in selectedPoint.properties)) {
            return false;
          }
          
          try {
            // Get photo details from spidering point
            const photoCoords: [number, number] = [selectedPoint.coordinates[0], selectedPoint.coordinates[1]];
            const photoHeading = typeof selectedPoint.properties.photo_heading === 'string' 
              ? parseFloat(selectedPoint.properties.photo_heading) 
              : (selectedPoint.properties.photo_heading || 0);
            
            // Create photo bearing sector (same logic as in photo bearing layer)
            const [lng, lat] = photoCoords;
            const headingRad = (photoHeading * Math.PI) / 180;
            const radius = 0.0001; // 10m radius in degrees
            const sectorAngle = Math.PI / 3; // 60 degrees sector angle
            const startAngle = headingRad - sectorAngle / 2;
            const endAngle = headingRad + sectorAngle / 2;
            
            // Adjust for latitude distortion
            const latCos = Math.cos(lat * Math.PI / 180);
            const adjustedRadius = radius / latCos;
            
            // Create arc points for bearing sector
            const arcPoints = [];
            const numPoints = 30;
            arcPoints.push([lng, lat]); // Start from center
            
            for (let i = 0; i <= numPoints; i++) {
              const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
              const x = lng + Math.sin(angle) * adjustedRadius;
              const y = lat + Math.cos(angle) * radius;
              arcPoints.push([x, y]);
            }
            arcPoints.push([lng, lat]); // Close polygon
            
            const bearingSector = turf.polygon([arcPoints]);
            
            // Check if photo point is inside polygon OR bearing sector intersects with polygon
            const photoPoint = turf.point(photoCoords);
            const photoInsidePolygon = booleanPointInPolygon(photoPoint, polygon);
            const intersects = booleanIntersects(bearingSector, polygon);
            
            return photoInsidePolygon || intersects;
          } catch (error) {
            console.warn('Error checking OSM polygon intersection with photo bearing:', error);
            return false;
          }
        })
      },
      pickable: true,
      stroked: true,
      filled: true,
      wireframe: false,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getFillColor: (d: any) => {
        // Check if building_part is "yes" to use orange color, otherwise use blue
        const buildingPart = d.properties?.building_part;
        if (buildingPart === 'yes') {
          return [255, 165, 0, 80] as [number, number, number, number]; // Orange with transparency
        }
        return [0, 0, 255, 80] as [number, number, number, number]; // Blue with transparency
      },
      getLineColor: (d: any) => {
        // Check if building_part is "yes" to use orange color, otherwise use blue
        const buildingPart = d.properties?.building_part;
        if (buildingPart === 'yes') {
          return [255, 165, 0, 200] as [number, number, number, number]; // Orange border
        }
        return [0, 0, 255, 200] as [number, number, number, number]; // Blue border
      },
      getLineWidth: () => 1,
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const osmId = String(info.object.properties?.osm_id ?? info.object.properties?.id ?? '');
          const centroid = filteredOsmBuildingPartCentroids.find((c: any) => String(c.properties?.osm_id ?? c.properties?.id ?? '') === osmId);
          if (centroid) {
            setSelectedFeature(centroid);
          }
        }
      },
      updateTriggers: {
        data: [osmBuildingPartPolygons, selectedPoint, showPhotoBearingPolygon],
      },
    }),

    // OSM Building Parts Layer (Centroids)
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.osmBuildingParts) && 
    filteredOsmBuildingPartCentroids.length > 0 &&
    new ScatterplotLayer({
      id: `osm-building-part-layer`,
      data: filteredOsmBuildingPartCentroids.filter((osmPart: any) => {
        // Hide only specific OSM building parts that are being spidered (but not the selected point)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.id === osmPart.properties.id;
          const isSpideredConnection = spideredConnections.some((conn: any) => 
            conn.type === 'osmBuildingPart' && 
            conn.properties.id === osmPart.properties.id
          );
          return !isSpideredConnection || isSelectedPoint; // Keep selected point visible
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 16,
      radiusMinPixels: 2,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getRadius: (d: any) => {
        let baseRadius = 8; // Base size for OSM building parts
        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }
        return baseRadius;
      },
      getFillColor: (d: any) => {
        // Check if building_part is "yes" to use orange color, otherwise use blue
        const buildingPart = d.properties?.building_part;
        if (buildingPart === 'yes') {
          return [255, 165, 0, 200] as [number, number, number, number]; // Orange color
        }
        
        const dataWithType = { ...d, dataType: 'buildings' };
        return getFillColorForData(dataWithType, [0, 0, 255, 200], [0, 0, 255]) as [number, number, number, number];
      },
      getLineColor: (d: any) => [51, 51, 51, 255], // Dark stroke
      onHover: (info: any) => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: (info: any) => {
        if (info.object && info.object.properties) {
          // For OSM Building Parts: trigger spidering to show nearby features
          onPointClick(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [filteredOsmBuildingPartCentroids, zoomBasedRadius],
      },
    }),

    // OSM Landuse Areas Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.osmLanduseAreas) && 
    filteredOsmLanduseAreasCentroids.length > 0 &&
    new ScatterplotLayer({
      id: `osm-landuse-areas-layer`,
      data: filteredOsmLanduseAreasCentroids.filter((landuseArea: any) => {
        // Hide only specific landuse areas that are being spidered (but not the selected point)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.id === landuseArea.properties.id;
          const isSpideredConnection = spideredConnections.some((conn: any) => 
            conn.type === 'osmLanduseArea' && 
            conn.properties.id === landuseArea.properties.id
          );
          return !isSpideredConnection || isSelectedPoint; // Keep selected point visible
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 16,
      radiusMinPixels: 2,
      lineWidthMinPixels: 1,
      getPosition: (d: any) => d.coordinates,
      getRadius: (d: any) => {
        let baseRadius = 8; // Base size for OSM landuse areas
        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }
        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'sites' };
        return getFillColorForData(dataWithType, [0, 255, 0, 200], [0, 255, 0]) as [number, number, number, number];
      },
      getLineColor: (d: any) => [0, 0, 0, 255], // Black stroke like sites
      onHover: (info: any) => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: (info: any) => {
        if (info.object && info.object.properties) {
          // For OSM Landuse Areas: trigger spidering to show nearby features
          onPointClick(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [filteredOsmLanduseAreasCentroids, zoomBasedRadius],
      },
    }),

    // Photos Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.photos) && 
    filteredPhotoCentroids.length > 0 && 
    new ScatterplotLayer<PhotoCentroidState>({
      id: `photo-layer`,
      data: filteredPhotoCentroids.filter(photo => {
        // Hide only specific photos that are being spidered (but not the selected point)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.id === photo.properties.id;
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'photo' && 
            conn.properties.id === photo.properties.id
          );
          return !isSpideredConnection || isSelectedPoint; // Keep selected point visible
        }
        return true;
      }),
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius = 10; // Fixed size for photos
        
        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const dataWithType = { ...d, dataType: 'photos' };
        return getFillColorForData(dataWithType, [255, 0, 255, 200], [255, 0, 255]) as [number, number, number, number];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          // Restore photo spidering to show candidate connections
          console.log('photo clicked', info.object);
          onPointClick(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
      },
    }),

    // Photo Bearing Layer - Sector/Arc shape with green transparent fill
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.photos) && 
    filteredPhotoCentroids.length > 0 && 
    showPhotoBearingPolygon &&
    new PolygonLayer<any>({
      id: `photo-bearing-layer`,
      data: filteredPhotoCentroids.filter(photo => {
        // Hide only specific photos that are being spidered (but not the selected point)
        if (selectedPoint && spideredConnections.length > 0) {
          const isSelectedPoint = selectedPoint.properties.id === photo.properties.id;
          const isSpideredConnection = spideredConnections.some(conn => 
            conn.type === 'photo' && 
            conn.properties.id === photo.properties.id
          );
          return !isSpideredConnection || isSelectedPoint; // Keep selected point visible
        }
        return true;
      }).map(photo => {
        // Create sector/arc polygon for each photo bearing
        const [lng, lat] = photo.coordinates;
        const heading = parseFloat(photo.properties.photo_heading || '0');
        const headingRad = (heading * Math.PI) / 180;
        
        // Sector parameters
        const radius = 0.0001; // Sector radius in degrees (about 10 meters)
        const sectorAngle = Math.PI / 3; // 60 degrees sector angle
        const startAngle = headingRad - sectorAngle / 2;
        const endAngle = headingRad + sectorAngle / 2;
        
        // Adjust for latitude distortion to create symmetric sectors
        const latCos = Math.cos(lat * Math.PI / 180);
        const adjustedRadius = radius / latCos; // Adjust longitude radius based on latitude
        
        // Create arc points for polygon
        const arcPoints = [];
        const numPoints = 30; // More points for smoother arc
        
        // Start from center
        arcPoints.push([lng, lat]);
        
        // Create arc points with latitude correction
        for (let i = 0; i <= numPoints; i++) {
          const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
          // Use adjusted radius for longitude to compensate for latitude distortion
          const x = lng + Math.sin(angle) * adjustedRadius;
          const y = lat + Math.cos(angle) * radius;
          arcPoints.push([x, y]);
        }
        
        // Close the polygon back to center
        arcPoints.push([lng, lat]);
        
        return {
          polygon: [arcPoints], // PolygonLayer expects polygon format
          properties: photo.properties
        };
      }),
      pickable: false,
      stroked: true,
      filled: true,
      getPolygon: d => d.polygon,
      getFillColor: () => [0, 0, 0, 0], // Green fill with transparency
      getLineColor: () => [0, 255, 0, 150], // Green border with slightly more opacity
      getLineWidth: () => 2,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 3,
      updateTriggers: {
        data: [selectedPoint, spideredConnections, filteredPhotoCentroids],
      },
    }),
    
    // Polygon Centroids Layer
    geoJson && polygonCentroids.length > 0 && new ScatterplotLayer({
      id: `polygon-centroids`,
      data: polygonCentroids,
      pickable: true,
      opacity: 0.4,
      stroked: true,
      filled: true,
      getPosition: d => d.coordinates,
      getRadius: d => 10,
      getFillColor: d => [255, 140, 0, 200],
      getLineColor: d => [255, 140, 0, 255],
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          console.log('Clicked polygon centroid:', info.object);
          setHoverInfo(info as any);
        }
      },
    }),
    
    // Fetched Polygons Layer
    geoJson && fetchedPolygons && new GeoJsonLayer<any>({
      id: 'fetched-polygons-layer',
      data: fetchedPolygons,
      pickable: false,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      getFillColor: [234, 49, 34, 0],
      getLineColor: [234, 49, 34, 255],
      updateTriggers: {
        data: [iconLayerData],
      },
    }),

    // Search Pin Marker Layer
    (searchMarker || selectedFeature) && new IconLayer({
      id: 'search-pin-marker-layer',
      data: [
        ...(searchMarker ? [{
          ...searchMarker,
          icon: 'pin'
        }] : []),
        ...(selectedFeature ? [{
          coordinates: selectedFeature.coordinates,
          data: selectedFeature.properties,
          icon: 'pin'
        }] : [])
      ],
      pickable: true,
      iconAtlas: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2C15.163 2 8 9.163 8 18c0 13.5 16 26 16 26s16-12.5 16-26c0-8.837-7.163-16-16-16z" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="24" cy="18" r="6" fill="#FFFFFF"/>
        </svg>
      `),
      iconMapping: {
        pin: {
          x: 0,
          y: 0,
          width: 48,
          height: 48,
          anchorY: 48,
          anchorX: 24
        }
      },
      getIcon: d => 'pin',
      getPosition: d => d.coordinates,
      getSize: 32,
      getColor: [255, 0, 0, 255],
      onHover: info => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            layer: info.layer,
            object: {
              properties: info.object.data,
              type: info.object.type
            }
          });
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object) {
          const selectedFeatureData = {
            id: `search-${Date.now()}`,
            coordinates: info.object.coordinates,
            properties: info.object.data
          };
          setSelectedFeature(selectedFeatureData);
        }
      },
    }),

    // Spidered Connections Layer
    selectedPoint && spideredConnections.length > 0 && new ScatterplotLayer({
      id: `spidered-connections-${selectedPoint.id}`,
      data: spideredConnections,
      coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
      coordinateOrigin: selectedPoint.coordinates,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      getPosition: (d: any, { index }: { index: number }) => {
        const angle = (index / spideredConnections.length) * Math.PI * 2;
        return [
          spideringRadius * Math.cos(angle),
          spideringRadius * Math.sin(angle)
        ];
      },
      getRadius: 8,
      getFillColor: (d: any) => {
        // Color based on connection type
        switch (d.type) {
          case 'building': return [60, 160, 255, 200]; // Building Blue
          case 'buildingPart': return [255, 165, 0, 200]; // Building Part Orange
          case 'site': return [46, 204, 113, 200]; // Site Green
          case 'nhle': return [231, 76, 60, 200]; // NHLE Red
          case 'photo': return [255, 0, 255, 200]; // Photo Magenta
          case 'uprn': return [0, 188, 212, 200]; // UPRN Cyan (match uprn-layer)
          case 'osmBuildingPart': return [255, 165, 0, 200]; // Building Part Orange
          case 'osmLanduseArea': return [0, 255, 0, 200]; // OSM Landuse Area Green (same as sites)
          default: return [128, 128, 128, 200]; // Default Gray
        }
      },
      getLineColor: [255, 255, 255, 255], // White border
      onHover: info => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            layer: info.layer,
            object: {
              properties: info.object.properties,
              type: info.object.type
            }
          });
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object) {
          // Find the actual feature to select
          let actualFeature = null;
          const connectionType = info.object.type;
          const connectionId = info.object.properties.id;
          
          if (connectionType === 'building') {
            actualFeature = filteredBuildingCentroids.find(b => b.properties.osid === info.object.properties.osid);
          } else if (connectionType === 'buildingPart') {
            actualFeature = filteredBuildingPartCentroids.find(p => p.properties.osid === info.object.properties.osid);
          } else if (connectionType === 'site') {
            actualFeature = filteredSiteCentroids.find(s => s.properties.osid === info.object.properties.osid);
          } else if (connectionType === 'nhle') {
            actualFeature = filteredNhleCentroids.find(n => n.properties.nhle_id === info.object.properties.nhle_id);
          } else if (connectionType === 'photo') {
            actualFeature = filteredPhotoCentroids.find(p => p.properties.id === info.object.properties.id);
          } else if (connectionType === 'uprn') {
            actualFeature = info.object;
          } else if (connectionType === 'osmBuildingPart') {
            actualFeature = filteredOsmBuildingPartCentroids.find(osm => osm.properties.id === info.object.properties.id);
          } else if (connectionType === 'osmLanduseArea') {
            actualFeature = filteredOsmLanduseAreasCentroids.find(osm => osm.properties.id === info.object.properties.id);
          }
          
          if (actualFeature) {
            setSelectedFeature(actualFeature);
          }
        }
      },
      updateTriggers: {
        getPosition: [spideringRadius, spideredConnections.length],
        getFillColor: [spideredConnections]
      },
      transitions: {
        getPosition: {
          duration: 300,
          easing: (t: number) => t * (2 - t) // easeOutQuad equivalent
        }
      }
    }),

    // Spidered Connection Lines Layer
    selectedPoint && spideredConnections.length > 0 && new PathLayer({
      id: `spidered-connection-lines-${selectedPoint.id}`,
      data: spideredConnections.map((conn, index) => {
        const angle = (index / spideredConnections.length) * Math.PI * 2;
        const spideredPosition = [
          spideringRadius * Math.cos(angle),
          spideringRadius * Math.sin(angle)
        ];
        
        return {
          path: [
            [0, 0], // Center point (selectedPoint coordinates as origin)
            spideredPosition // Spidered position
          ],
          type: conn.type,
          properties: conn.properties
        };
      }),
      coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
      coordinateOrigin: selectedPoint.coordinates,
      pickable: false,
      getPath: (d: any) => d.path,
      getWidth: 2,
      widthUnits: 'pixels',
      getColor: (d: any) => {
        // Color based on connection type with transparency
        switch (d.type) {
          case 'building': return [60, 160, 255, 150]; // Building Blue
          case 'buildingPart': return [255, 165, 0, 150]; // Building Part Orange
          case 'site': return [46, 204, 113, 150]; // Site Green
          case 'nhle': return [231, 76, 60, 150]; // NHLE Red
          case 'photo': return [255, 0, 255, 150]; // Photo Magenta
          case 'uprn': return [0, 188, 212, 150]; // UPRN Cyan (match uprn-layer)
          case 'osmBuildingPart': return [255, 165, 0, 150]; // Building Part Orange
          case 'osmLanduseArea': return [0, 255, 0, 150]; // OSM Landuse Area Green (same as sites)
          default: return [128, 128, 128, 150]; // Default Gray
        }
      },
      updateTriggers: {
        data: [spideringRadius, spideredConnections],
        getColor: [spideredConnections]
      },
      transitions: {
        getPath: {
          duration: 300,
          easing: (t: number) => t * (2 - t) // easeOutQuad equivalent
        }
      }
    }),
  ].filter(Boolean);

  return layers;
}
