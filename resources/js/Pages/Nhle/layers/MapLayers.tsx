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
  iconLayerData: any[];
  clusteringEnabled: boolean | 'single';
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
  iconLayerData,
  clusteringEnabled
}: MapLayersProps) {
  
  const convertToClusterPoints = (data: any[], dataType: string): ClusterPoint[] => {
    return data.map(item => ({
      coordinates: item.coordinates,
      properties: item.properties,
      dataType: dataType as any,
      id: `${dataType}_${item.properties?.id || Math.random()}`
    }));
  };
  
  const allPoints: ClusterPoint[] = [
    ...convertToClusterPoints(filteredBuildingCentroids, 'buildings'),
    ...convertToClusterPoints(filteredBuildingPartCentroids, 'buildingParts'),
    ...convertToClusterPoints(filteredSiteCentroids, 'sites'),
    ...convertToClusterPoints(filteredNhleCentroids, 'nhle'),
    ...convertToClusterPoints(filteredPhotoCentroids, 'photos')
  ];
  
  let clusteredData: (ClusterPoint | ClusterData)[];
  
  if (currentZoom >= 16) {
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
  
  // Separate clusters from individual points
  const clusters = clusteredData.filter((item): item is ClusterData => 'isCluster' in item);
  const individualPoints = clusteredData.filter((item): item is ClusterPoint => !('isCluster' in item));
  
  // Group individual points by data type
  const groupedPoints = {
    buildings: individualPoints.filter(p => p.dataType === 'buildings'),
    buildingParts: individualPoints.filter(p => p.dataType === 'buildingParts'),
    sites: individualPoints.filter(p => p.dataType === 'sites'),
    nhle: individualPoints.filter(p => p.dataType === 'nhle'),
    photos: individualPoints.filter(p => p.dataType === 'photos')
  };
  
  const layers = [
    // Clusters Layer - Shows clustered points with dynamic sizing
    clusters.length > 0 && new ScatterplotLayer({
      id: 'clusters-layer',
      data: clusters,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 80,
      lineWidthMinPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => {
        // Dynamic radius that scales with zoom and remains visible at all levels
        const count = d.properties.point_count;
        const zoomFactor = Math.max(0.8, Math.min(3.0, currentZoom / 8));
        
        // Larger radii that remain visible when zoomed out
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

    // Building Parts Layer - Individual points when clustering disabled
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildingParts) && 
    groupedPoints.buildingParts.length > 0 && 
    new ScatterplotLayer({
      id: `buildingpart-layer`,
      data: groupedPoints.buildingParts,
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
  ].filter(Boolean);

  return layers;
}
