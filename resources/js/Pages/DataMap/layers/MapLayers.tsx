import React from 'react';
import { ScatterplotLayer, IconLayer, PathLayer, GeoJsonLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { COORDINATE_SYSTEM } from '@deck.gl/core';
import * as turf from '@turf/turf';
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
  selectedPoint,
  spideredConnections,
  spideringRadius,
  onPointClick,
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
          
          // Check if this building part has a related site
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
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.sites) && 
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
          // Check if this site has potential connections (related buildings/parts)
          const siteProperties = info.object.properties as any;
          const siteId = siteProperties.osid || siteProperties.id;
          const siteMatchedUprn = siteProperties.matcheduprn;
          
          const hasRelatedBuildings = filteredBuildingCentroids.some(building => {
            if (building.properties.primarysiteid === siteId) return true;
            if (siteMatchedUprn && building.properties.uprn && Array.isArray(building.properties.uprn)) {
              return building.properties.uprn.some((uprnObj: any) => 
                uprnObj.uprn && uprnObj.uprn.toString() === siteMatchedUprn.toString()
              );
            }
            return false;
          });
          
          const hasRelatedParts = filteredBuildingPartCentroids.some(part => 
            part.properties.smallestsite_siteid === siteId
          );
          
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
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.nhle) && 
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
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.buildings) && 
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
          
          // Check if this building has a related site
          const hasRelatedSite = primarySiteId && filteredSiteCentroids.some(site => 
            site.properties.osid === primarySiteId
          );
          
          // Also check for UPRN-based site relationships
          const buildingUprns = building.properties.uprn;
          const hasUprnRelatedSite = buildingUprns && Array.isArray(buildingUprns) && 
            filteredSiteCentroids.some(site => {
              const siteMatchedUprn = site.properties.matcheduprn;
              return siteMatchedUprn && buildingUprns.some((uprnObj: any) => 
                uprnObj.uprn && uprnObj.uprn.toString() === siteMatchedUprn.toString()
              );
            });
          
          if (hasRelatedSite || hasUprnRelatedSite) {
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

    // Photos Layer
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos) || dataType.photos) && 
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
          // Trigger spidering for photos similar to buildings/sites
          // Parent handler should compute connections and set selectedPoint/spideredConnections
          onPointClick(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
        data: [selectedPoint, spideredConnections],
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
