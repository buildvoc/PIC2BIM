import React from 'react';
import { ScatterplotLayer, IconLayer, PathLayer, GeoJsonLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    PhotoCentroidState
} from '../types';

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
  
  // Functions
  groupByMapping: { [key: string]: string };
  getFillColorForData: (d: any, defaultColor: number[], fallbackColor: number[]) => number[];
  getCursor: any;
  setHoverInfo: (info: any) => void;
  setSelectedFeature: (feature: any) => void;
  iconLayerData: any[];
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
  groupByMapping,
  getFillColorForData,
  getCursor,
  setHoverInfo,
  setSelectedFeature,
  iconLayerData
}: MapLayersProps) {
  
  const layers = [
    // Building Parts Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildingParts) && 
    filteredBuildingPartCentroids.length > 0 && 
    new ScatterplotLayer<BuildingPartCentroidState>({
      id: `buildingpart-layer`,
      data: filteredBuildingPartCentroids,
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
          setSelectedFeature(info.object as BuildingPartCentroidState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Sites Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.sites) && 
    filteredSiteCentroids.length > 0 && 
    new ScatterplotLayer<SiteCentroidState>({
      id: `site-layer`,
      data: filteredSiteCentroids,
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
          setSelectedFeature(info.object as SiteCentroidState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // NHLE Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.nhle) && 
    filteredNhleCentroids.length > 0 && 
    new ScatterplotLayer<NhleFeatureState>({
      id: `nhle-layer`,
      data: filteredNhleCentroids,
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
      },
    }),

    // Buildings Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildings) && 
    filteredBuildingCentroids.length > 0 && 
    new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer`,
      data: filteredBuildingCentroids,
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
          setSelectedFeature(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Photos Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.photos) && 
    filteredPhotoCentroids.length > 0 && 
    new ScatterplotLayer<PhotoCentroidState>({
      id: `photo-layer`,
      data: filteredPhotoCentroids,
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
          setSelectedFeature(info.object as PhotoCentroidState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids],
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
