import React from 'react';
import { ScatterplotLayer, IconLayer, PathLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    PhotoCentroidState
} from '../types';
import { 
  clusterPoints, 
  getClusterColor, 
  expandCluster,
  getClusterBounds,
  getClusterExpansionZoom,
  type ClusterPoint, 
  type ClusterData 
} from '../utils/clusteringUtils';
import {
  groupStackedPoints,
  createSpiderClusters,
  toggleSpiderCluster,
  getSpiderOverlayPoint,
  calculateSpiderPositions,
  closeAllSpiderClusters,
  type SpiderCluster,
  type SpiderPoint
} from '../utils/spiderUtils';

// Import helper functions for single cluster mode
function calculateCentroid(coordinates: [number, number][]): [number, number] {
  const sum = coordinates.reduce(
    (acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]],
    [0, 0]
  );
  return [sum[0] / coordinates.length, sum[1] / coordinates.length];
}

function countDataTypes(points: ClusterPoint[]): Record<string, number> {
  return points.reduce((acc, point) => {
    acc[point.dataType] = (acc[point.dataType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function getDominantType(typeCount: Record<string, number>): string {
  return Object.entries(typeCount).reduce((a, b) => 
    typeCount[a[0]] > typeCount[b[0]] ? a : b
  )[0];
}

function abbreviateNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (num >= 10000) {
    const thousands = num / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(0)}K`;
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    return `${thousands.toFixed(1)}K`;
  }
  return num.toString();
}

interface MapLayersProps {
  // Data arrays
  filteredBuildingCentroids: BuildingCentroidState[];
  filteredBuildingPartCentroids: BuildingPartCentroidState[];
  filteredSiteCentroids: SiteCentroidState[];
  filteredNhleCentroids: NhleFeatureState[];
  filteredPhotoCentroids: PhotoCentroidState[];
  polygonCentroids: Array<{coordinates: [number, number], properties: any}>;
  bidirectionalLinks: any[];
  
  // State variables
  dataType: { buildings: boolean; buildingParts: boolean; sites: boolean; nhle: boolean; photos: boolean };
  category1: string;
  category2: string;
  selectedLegendItem: any | null;
  zoomBasedRadius: number;
  geoJson: any;
  fetchedPolygons: any;
  searchMarker: {coordinates: [number, number], data: any, type: string} | null;
  selectedFeature: BuildingCentroidState | BuildingPartCentroidState | SiteCentroidState | NhleFeatureState | PhotoCentroidState | null;
  currentZoom: number;
  
  // Functions
  groupByMapping: { [key: string]: string };
  getFillColorForData: (d: any, defaultColor: number[], fallbackColor: number[]) => number[];
  getCursor: any;
  setHoverInfo: (info: any) => void;
  setSelectedFeature: (feature: any) => void;
  onZoomToCluster?: (bounds: [[number, number], [number, number]], zoom: number) => void;
  onZoomToPoint?: (coordinates: [number, number], zoom?: number) => void;
  iconLayerData: any[];
  clusteringEnabled: boolean | 'single';
  
  // Spider functionality
  spiderClusters?: SpiderCluster[];
  onSpiderClusterClick?: (clusterId: string) => void;
  onCloseAllSpiderClusters?: () => void;
  viewport?: any;
}

export function createMapLayers({
  filteredBuildingCentroids,
  filteredBuildingPartCentroids,
  filteredSiteCentroids,
  filteredNhleCentroids,
  filteredPhotoCentroids,
  polygonCentroids,
  bidirectionalLinks,
  dataType,
  category1,
  category2,
  selectedLegendItem,
  zoomBasedRadius,
  geoJson,
  fetchedPolygons,
  searchMarker,
  selectedFeature,
  currentZoom,
  groupByMapping,
  getFillColorForData,
  getCursor,
  setHoverInfo,
  setSelectedFeature,
  onZoomToCluster,
  onZoomToPoint,
  iconLayerData,
  clusteringEnabled,
  spiderClusters = [],
  onSpiderClusterClick,
  onCloseAllSpiderClusters,
  viewport
}: MapLayersProps) {
  
  const convertToClusterPoints = (data: any[], dataType: string): ClusterPoint[] => {
    return data.map(item => ({
      coordinates: item.coordinates,
      properties: item.properties,
      dataType: dataType as any,
      id: `${dataType}_${item.properties?.id || Math.random()}`
    }));
  };
  
  const hasAnyDataTypeSelected = dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos;
  
  const shouldIncludeBuildings = !hasAnyDataTypeSelected || dataType.buildings;
  const shouldIncludeBuildingParts = !hasAnyDataTypeSelected || dataType.buildingParts;
  const shouldIncludeSites = !hasAnyDataTypeSelected || dataType.sites;
  const shouldIncludeNhle = !hasAnyDataTypeSelected || dataType.nhle;
  const shouldIncludePhotos = !hasAnyDataTypeSelected || dataType.photos;

  const allPoints: ClusterPoint[] = [
    ...(shouldIncludeBuildings ? convertToClusterPoints(filteredBuildingCentroids, 'buildings') : []),
    ...(shouldIncludeBuildingParts ? convertToClusterPoints(filteredBuildingPartCentroids, 'buildingParts') : []),
    ...(shouldIncludeSites ? convertToClusterPoints(filteredSiteCentroids, 'sites') : []),
    ...(shouldIncludeNhle ? convertToClusterPoints(filteredNhleCentroids, 'nhle') : []),
    ...(shouldIncludePhotos ? convertToClusterPoints(filteredPhotoCentroids, 'photos') : [])
  ];
  
  let clusteredData: (ClusterPoint | ClusterData)[];
  let spiderOverlayPoints: any[] = [];
  let expandedSpiderPoints: any[] = [];
  
  const hasActiveSpiderClusters = spiderClusters.some(cluster => cluster.isExpanded);
  
  if (currentZoom > 16) {
    const stackedGroups = groupStackedPoints(allPoints, currentZoom);
    const { spiderClusters: autoSpiderClusters, individualPoints } = createSpiderClusters(stackedGroups, 2);
    
    const activeSpiderClusters = spiderClusters.length > 0 ? spiderClusters : autoSpiderClusters;
    spiderOverlayPoints = activeSpiderClusters
      .filter(cluster => !cluster.isExpanded)
      .map(cluster => getSpiderOverlayPoint(cluster));
    
    expandedSpiderPoints = activeSpiderClusters
      .filter(cluster => cluster.isExpanded)
      .flatMap(cluster => cluster.points);
    
    clusteredData = [...individualPoints, ...spiderOverlayPoints];
  } else if (currentZoom >= 16) {
    clusteredData = allPoints;
  } else if (clusteringEnabled === 'single') {
    if (allPoints.length > 0) {
      const centroid = calculateCentroid(allPoints.map(p => p.coordinates));
      const typeCount = countDataTypes(allPoints);
      const dominantType = getDominantType(typeCount);
      
      const singleCluster: ClusterData = {
        coordinates: centroid,
        properties: {
          cluster: true,
          point_count: allPoints.length,
          point_count_abbreviated: abbreviateNumber(allPoints.length),
          cluster_id: `single_${Date.now()}`,
          clustered_points: allPoints,
          dominant_type: dominantType,
          mixed_types: Object.keys(typeCount).length > 1,
          type_breakdown: typeCount
        },
        isCluster: true
      };
      
      clusteredData = [singleCluster];
    } else {
      clusteredData = [];
    }
  } else if (clusteringEnabled) {
    clusteredData = clusterPoints(allPoints, currentZoom);
  } else {
    clusteredData = allPoints;
  }
  
  const clusters = clusteredData.filter((item): item is ClusterData => 'isCluster' in item);
  const individualPoints = clusteredData.filter((item): item is ClusterPoint => !('isCluster' in item));
  
  const groupedPoints = {
    buildings: individualPoints.filter(p => p.dataType === 'buildings'),
    buildingParts: individualPoints.filter(p => p.dataType === 'buildingParts'),
    sites: individualPoints.filter(p => p.dataType === 'sites'),
    nhle: individualPoints.filter(p => p.dataType === 'nhle'),
    photos: individualPoints.filter(p => p.dataType === 'photos')
  };
  
  const layers = [
    clusters.length > 0 && new ScatterplotLayer({
      id: 'clusters-layer',
      data: clusters,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => {
        const count = d.properties.point_count;
        
        if (currentZoom > 14) {
          let baseRadius = 10;
          
          if (count >= 1000) return baseRadius + 8;
          if (count >= 100) return baseRadius + 6;
          if (count >= 50) return baseRadius + 4;
          if (count >= 10) return baseRadius + 2;
          return baseRadius;
        }
        
        const zoomFactor = Math.max(0.8, Math.min(3.0, currentZoom / 8));
        
        if (count >= 10000) return Math.max(40, Math.min(80, 60 * zoomFactor));
        if (count >= 1000) return Math.max(30, Math.min(60, 45 * zoomFactor));
        if (count >= 100) return Math.max(25, Math.min(50, 35 * zoomFactor));
        if (count >= 50) return Math.max(20, Math.min(40, 30 * zoomFactor));
        if (count >= 10) return Math.max(15, Math.min(35, 25 * zoomFactor));
        return Math.max(12, Math.min(30, 20 * zoomFactor));
      },
      getFillColor: d => getClusterColor(d.properties.dominant_type, d.properties.mixed_types),
      getLineColor: d => [255, 255, 255, 200],
      onHover: info => {
        if (info.object) {
          const cluster = info.object.properties;
          let clusterInfo = `${cluster.point_count} items`;
          
          clusterInfo = `${cluster.point_count} items (${cluster.dominant_type})`;
          
          setHoverInfo({
            ...info,
            object: {
              properties: {
                ...cluster,
                cluster_info: clusterInfo
              }
            }
          });
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && onZoomToCluster) {
          // Calculate cluster bounds and zoom to them
          const bounds = getClusterBounds(info.object);
          const targetZoom = getClusterExpansionZoom(info.object, currentZoom);
          
          // Trigger zoom to cluster
          onZoomToCluster(bounds, targetZoom);
        }
      },
      updateTriggers: {
        getFillColor: [currentZoom],
        getRadius: [currentZoom, zoomBasedRadius],
      },
    }),

    // Cluster Labels Layer
    clusters.length > 0 && new TextLayer({
      id: 'cluster-labels',
      data: clusters,
      pickable: false,
      getPosition: d => d.coordinates,
      getText: d => d.properties.point_count_abbreviated,
      getSize: d => {
        // Smaller, more conservative font sizes
        const baseSize = Math.max(8, Math.min(14, 6 + currentZoom * 0.4));
        const count = d.properties.point_count;
        if (count >= 1000) return Math.min(baseSize + 3, 16);
        if (count >= 100) return Math.min(baseSize + 2, 14);
        if (count >= 10) return Math.min(baseSize + 1, 12);
        return baseSize;
      },
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      getColor: [255, 255, 255, 255],
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontWeight: 'bold',
      updateTriggers: {
        getText: [currentZoom],
        getSize: [currentZoom],
      },
    }),

    // Spider Overlay Layer - Main overlay points for stacked data when zoom > 18
    currentZoom > 16 && spiderOverlayPoints.length > 0 && new ScatterplotLayer({
      id: 'spider-overlay-layer',
      data: spiderOverlayPoints,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => {
        const count = d.properties?.point_count || 1;
        return Math.max(12, Math.min(20, 10 + Math.log10(count) * 2));
      },
      getFillColor: d => {
        if (d.properties?.is_spider_overlay) {
          // Use original data type colors with reduced opacity when other spiders are active
          const dominantType = d.properties.dominant_type;
          const opacity = hasActiveSpiderClusters ? 120 : 200;
          switch (dominantType) {
            case 'buildings': return [0, 0, 255, opacity]; // Blue
            case 'buildingParts': return [255, 165, 0, opacity]; // Orange
            case 'sites': return [0, 255, 0, opacity]; // Green
            case 'nhle': return [255, 0, 0, opacity]; // Red
            case 'photos': return [255, 20, 147, opacity];
            default: return getClusterColor(d.properties.dominant_type, d.properties.mixed_types);
          }
        }
        return [100, 100, 100, hasActiveSpiderClusters ? 80 : 200];
      },
      getLineColor: d => [255, 255, 255, 255],
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties?.spider_cluster_id && onSpiderClusterClick) {
          onSpiderClusterClick(info.object.properties.spider_cluster_id);
        }
      },
      updateTriggers: {
        getFillColor: [currentZoom],
        getRadius: [currentZoom, zoomBasedRadius],
      },
    }),

    // Spider Overlay Labels
    currentZoom > 16 && spiderOverlayPoints.length > 0 && new TextLayer({
      id: 'spider-overlay-labels',
      data: spiderOverlayPoints,
      pickable: false,
      getPosition: d => d.coordinates,
      getText: d => d.properties?.point_count_abbreviated || d.properties?.point_count?.toString() || '1',
      getSize: 12,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      getColor: [255, 255, 255, 255],
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontWeight: 'bold',
      updateTriggers: {
        getText: [currentZoom],
      },
    }),

    // Building Parts Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildingParts) && 
    groupedPoints.buildingParts.length > 0 && 
    new ScatterplotLayer({
      id: `buildingpart-layer`,
      data: groupedPoints.buildingParts,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
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
        const dataWithType = { ...d, dataType: 'buildingParts' };
        const baseColor = getFillColorForData(dataWithType, [255, 165, 0, 200], [255, 165, 0]) as [number, number, number, number];
        // Reduce opacity when spider clusters are active
        return hasActiveSpiderClusters ? [baseColor[0], baseColor[1], baseColor[2], 80] : baseColor;
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
          // Close all spider clusters when clicking on regular data points
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, currentZoom],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Sites Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.sites) && 
    groupedPoints.sites.length > 0 && 
    new ScatterplotLayer({
      id: `site-layer`,
      data: groupedPoints.sites,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
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
        const baseColor = getFillColorForData(dataWithType, [0, 255, 0, 200], [0, 255, 0]) as [number, number, number, number];
        // Reduce opacity when spider clusters are active
        return hasActiveSpiderClusters ? [baseColor[0], baseColor[1], baseColor[2], 80] : baseColor;
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
          // Close all spider clusters when clicking on regular data points
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, currentZoom],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // NHLE Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.nhle) && 
    groupedPoints.nhle.length > 0 && 
    new ScatterplotLayer({
      id: `nhle-layer`,
      data: groupedPoints.nhle,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
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
        const baseColor = getFillColorForData(dataWithType, [255, 0, 0, 200], [255, 0, 0]) as [number, number, number, number];
        return hasActiveSpiderClusters ? [baseColor[0], baseColor[1], baseColor[2], 80] : baseColor;
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
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, currentZoom],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Buildings Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildings) && 
    groupedPoints.buildings.length > 0 && 
    new ScatterplotLayer({
      id: `building-layer`,
      data: groupedPoints.buildings,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
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
        const baseColor = getFillColorForData(dataWithType, [0, 0, 255, 200], [0, 0, 255]) as [number, number, number, number];
        // Reduce opacity when spider clusters are active
        return hasActiveSpiderClusters ? [baseColor[0], baseColor[1], baseColor[2], 80] : baseColor;
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
          // Close all spider clusters when clicking on regular data points
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, currentZoom],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Photos Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.photos) && 
    groupedPoints.photos.length > 0 && 
    new ScatterplotLayer({
      id: `photo-layer`,
      data: groupedPoints.photos,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
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
        const baseColor = getFillColorForData(dataWithType, [255, 20, 147, 200], [255, 20, 147]) as [number, number, number, number];
        return hasActiveSpiderClusters ? [baseColor[0], baseColor[1], baseColor[2], 80] : baseColor;
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
          // Close all spider clusters when clicking on regular data points
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, currentZoom],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
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

    // Bidirectional Links Layer
    bidirectionalLinks.length > 0 && new PathLayer({
      id: 'bidirectional-links',
      data: bidirectionalLinks,
      pickable: true,
      getPath: (d: any) => d.path,
      getWidth: 2,
      widthUnits: 'pixels',
      getColor: (d: any) => {
        switch (d.type) {
          case 'building': return [60, 160, 255, 200]; // Building Blue #3C78FF
          case 'buildingPart': return [255, 182, 72, 200]; // Building Part Orange #FFB648
          case 'site': return [46, 204, 113, 200]; // Site Green #2ECC71
          case 'nhle': return [231, 76, 60, 210]; // NHLE Red #E74C3C
          default: return [60, 160, 255, 200]; // Default blue
        }
      },
      getDashArray: (d: any) => d.type === 'nhle' ? [3, 3] : [1, 0], // NHLE dashed, others solid
      getOffset: (d: any) => d.offset,
      parameters: { depthTest: false },
      extensions: [new PathStyleExtension({ offset: true, dash: true })],
      autoHighlight: true,
      onHover: (info: any) => {
        if (info.object) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: (info: any) => {
        if (info.object) {
          // Find the actual candidate feature to select
          const candidateType = info.object.type;
          const candidateId = info.object.properties.id;
          
          let candidateFeature = null;
          if (candidateType === 'building') {
            candidateFeature = filteredBuildingCentroids.find(b => b.properties.id === candidateId);
          } else if (candidateType === 'buildingPart') {
            candidateFeature = filteredBuildingPartCentroids.find(p => p.properties.id === candidateId);
          } else if (candidateType === 'site') {
            candidateFeature = filteredSiteCentroids.find(s => s.properties.id === candidateId);
          } else if (candidateType === 'nhle') {
            candidateFeature = filteredNhleCentroids.find(n => n.properties.id === candidateId);
          }
          
          if (candidateFeature) {
            setSelectedFeature(candidateFeature);
          }
        }
      },
    }),

    // Spider Connection Lines - Lines connecting overlay to expanded points (TOP LAYER)
    currentZoom > 16 && expandedSpiderPoints.length > 0 && new PathLayer({
      id: 'spider-connection-lines',
      data: expandedSpiderPoints.map(point => ({
        path: [point.originalCoordinates, point.coordinates],
        properties: point.properties
      })),
      pickable: false,
      widthScale: 1,
      widthMinPixels: 1,
      widthMaxPixels: 2,
      getPath: d => d.path,
      getColor: [150, 150, 150, 150],
      getWidth: 1,
      updateTriggers: {
        getPath: [expandedSpiderPoints],
      },
    }),

    // Expanded Spider Points Layer - Fan-out points when spider is expanded (TOP LAYER)
    currentZoom > 16 && expandedSpiderPoints.length > 0 && new ScatterplotLayer({
      id: 'expanded-spider-points-layer',
      data: expandedSpiderPoints,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 25,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => Math.max(12, currentZoom * 0.8),
      getFillColor: (d: any) => {
        switch (d.dataType) {
          case 'buildings': return [0, 0, 255, 200];
          case 'buildingParts': return [255, 165, 0, 200];
          case 'sites': return [0, 255, 0, 200]; 
          case 'nhle': return [255, 0, 0, 200]; 
          case 'photos': return [255, 20, 147, 200];
          default: 
            const dataWithType = { ...d, dataType: d.dataType };
            return getFillColorForData(dataWithType, [100, 100, 100, 200], [100, 100, 100]) as [number, number, number, number];
        }
      },
      getLineColor: d => [255, 255, 255, 200],
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          if (onZoomToPoint && info.object.originalCoordinates) {
            onZoomToPoint(info.object.originalCoordinates, 20);
          }
          if (onCloseAllSpiderClusters) {
            onCloseAllSpiderClusters();
          }
          setSelectedFeature({
            coordinates: info.object.originalCoordinates || info.object.coordinates,
            properties: info.object.properties
          });
        }
      },
      updateTriggers: {
        getFillColor: [currentZoom],
        getRadius: [currentZoom, zoomBasedRadius],
      },
    }),
  ].filter(Boolean);

  return layers;
}
