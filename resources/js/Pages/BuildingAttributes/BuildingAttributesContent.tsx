import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import BuildingDataGrid from "./BuildingDataGrid";
import { createRoot } from 'react-dom/client';
import BuildingAttributesMarker from '@/Components/Map/BuildingAttributesMarker';
import { getOffsetBehindCamera } from '../BuildingHeight/utils/geo-operations';
import type { ViewState, PhotoData, NearestBuildingData, BuildingGeometryData } from './types';
import { NginxFile } from "../BuildingHeight/types/nginx";
import { LAZ_FILES_DIRECTORY, LAZ_FILES_LIST_URL } from "../BuildingHeight/constants";
import { transformLazData } from "../BuildingHeight/utils/projection";
import { load } from '@loaders.gl/core';
import { LASLoader } from '@loaders.gl/las';

const INITIAL_VIEW_STATE = {
  longitude: -0.7934,
  latitude: 51.2177,
  zoom: 20,
  pitch: 61,
  bearing: 11.5657
};

const BuildingAttributesContent: React.FC<{ photos: PhotoData[] }> = ({ photos }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const deckRef = useRef<any>(null);
  
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [nearestBuildings, setNearestBuildings] = useState<Record<number, NearestBuildingData | null>>({});
  const [buildingGeometries, setBuildingGeometries] = useState<Record<number, BuildingGeometryData>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null); // State for selected marker
  const [overlayCamera, setOverlayCamera] = useState<any>(null); // Deck.gl overlay for Camera 3D
  const [overlayBuilding, setOverlayBuilding] = useState<any>(null); // Deck.gl overlay for Building 3D
  const [overlayLaz, setOverlayLaz] = useState<any>(null); // Deck.gl overlay for LAZ
  const [lazLayer, setLazLayer] = useState<any>(null); // For future extension if needed
  const [showLazSection, setShowLazSection] = useState(false);
  const [lazList, setLazList] = useState<NginxFile[]>([]);
  const [selectedLaz, setSelectedLaz] = useState<string>("");
  const [terrainEnabled, setTerrainEnabled] = useState(true);
  const [terrainReady, setTerrainReady] = useState(false);
  const [showOsmData, setShowOsmData] = useState(false);
  const [osmBuildingData, setOsmBuildingData] = useState<any[]>([]);
  const [loadingOsmData, setLoadingOsmData] = useState(false);

  const elevationCache = useRef(new Map<string, number>());
  const terrainReadyRef = useRef(false);

  // Helper function to convert hex color to RGB array
  const hexToRgb = (hex: string): [number, number, number, number] => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) {
      return [249, 180, 45, 255]; // Default orange if invalid hex
    }
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return [r, g, b, 255];
  };

  const createBuildingGeometriesGeoJSON = () => {
    // Use OSM data when toggle is active
    if (showOsmData && osmBuildingData.length > 0) {
      const features = osmBuildingData.map((building: any) => {
        if (!building.geojson?.features?.length || 
            !building.geojson.features[0]?.geometry?.coordinates?.length) return null;
        
        const coordinates = building.geojson.features[0].geometry.coordinates[0];
        const properties = building.geojson.features[0].properties;
        
        const height = properties?.height_m 
          ? parseFloat(properties.height_m) 
          : 10;
        
        const roofHeight = properties?.roof_height_m 
          ? parseFloat(properties.roof_height_m) 
          : 0;
        
        const minHeight = properties?.min_height_m
          ? parseFloat(properties.min_height_m)
          : 0;
        
        return {
          type: 'Feature',
          properties: {
            building: properties?.building || 'yes',
            name: building.name,
            'building:levels': properties?.building_levels,
            'building:min_level': properties?.building_min_level,
            height: height,
            min_height: minHeight,
            'roof:shape': properties?.roof_shape,
            'roof:height': roofHeight,
            'roof:levels': properties?.roof_levels,
            'roof:material': null,
            'roof:colour': properties?.roof_colour || '#2196F3',
            'building:material': properties?.base_material,
            building_colour: properties?.base_colour || '#F9B42D',
            'building:use': null,
            'building:part': properties?.building_part,
            source: 'osm',
            extrude: true,
            buildingId: building.id,
            osmId: building.osm_id,
            // Additional OSM fields
            base_shape: properties?.base_shape,
            base_direction: properties?.base_direction,
            base_orientation: properties?.base_orientation,
            base_height_m: properties?.base_height_m,
            base_levels: properties?.base_levels,
            base_angle_deg: properties?.base_angle_deg,
            building_levels_underground: properties?.building_levels_underground,
            ref_gb_uprn: properties?.ref_gb_uprn,
            building_reference_number: properties?.building_reference_number
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };
      }).filter(feature => feature !== null);
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
    if (!showOsmData) {
      const features = Object.entries(buildingGeometries).map(([photoId, buildingData]) => {
        if (!buildingData || !buildingData.coordinates || buildingData.coordinates.length === 0) return null;
        
        return {
          type: 'Feature',
          properties: {
            photoId: parseInt(photoId),
            buildingId: nearestBuildings[parseInt(photoId)]?.buildingPartId || 'unknown',
            height: buildingData.height || 10,
            min_height: buildingData.base || 0,
            source: 'legacy'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [buildingData.coordinates]
          }
        };
      }).filter(feature => feature !== null);
      
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
    return {
      type: 'FeatureCollection',
      features: []
    };
  };


  const createRoofGeometriesGeoJSON = () => {
    if (showOsmData && osmBuildingData.length > 0) {
      const features = osmBuildingData.map((building: any) => {
        if (!building.geojson?.features?.length || 
            !building.geojson.features[0]?.geometry?.coordinates?.length) return null;
        
        const coordinates = building.geojson.features[0].geometry.coordinates[0];
        const properties = building.geojson.features[0].properties;
        
        const height = properties?.height_m 
          ? parseFloat(properties.height_m) 
          : 10;

        const roofHeight = properties?.roof_height_m 
          ? parseFloat(properties.roof_height_m) 
          : 0;
        
        const minHeight = properties?.min_height_m
          ? parseFloat(properties.min_height_m)
          : 0;
        
        return {
          type: 'Feature',
          properties: {
            building: properties?.building || 'yes',
            name: building.name,
            'building:levels': properties?.building_levels,
            'building:min_level': properties?.building_min_level,
            height: height,
            min_height: minHeight,
            'roof:shape': properties?.roof_shape,
            'roof:height': roofHeight,
            'roof:levels': properties?.roof_levels,
            'building:material': properties?.base_material,
            building_colour: properties?.base_colour,
            'building:part': properties?.building_part,
            source: 'osm',
            extrude: true,
            buildingId: building.id,
            osmId: building.osm_id,
            base_shape: properties?.base_shape
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        };
      }).filter(feature => feature !== null);
      
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
    if (!showOsmData) {
      const features = Object.entries(buildingGeometries).map(([photoId, buildingData]) => {
        if (!buildingData || !buildingData.coordinates || buildingData.coordinates.length === 0) return null;
        
        return {
          type: 'Feature',
          properties: {
            photoId: parseInt(photoId),
            buildingId: nearestBuildings[parseInt(photoId)]?.buildingPartId || 'unknown',
            height: buildingData.height || 10,
            min_height: buildingData.base || 0,
            source: 'legacy'
          },
          geometry: {
            type: 'Polygon',
            coordinates: [buildingData.coordinates]
          }
        };
      }).filter(feature => feature !== null);
      
      return {
        type: 'FeatureCollection',
        features
      };
    }
    
    return {
      type: 'FeatureCollection',
      features: []
    };
  };


  const fetchOsmBuildingDataForPhoto = async (photoId: number, lat: string, lng: string, direction: string) => {
    try {
      const controller = new AbortController();
      const endpoint = `/comm_osm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${direction}`;
      
      const response = await fetch(endpoint, { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const responseData = await response.json();
      
      if (responseData.success && responseData.data?.building_part?.length > 0) {
        return responseData.data.building_part;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching OSM building data for photo:', error);
      return [];
    }
  };

  const fetchAllOsmBuildingData = async () => {
    if (!showOsmData || photos.length === 0) return;
    
    setLoadingOsmData(true);
    try {
      const promises = photos.map(photo => 
        fetchOsmBuildingDataForPhoto(photo.id, photo.lat, photo.lng, photo.photo_heading)
      );
      
      const results = await Promise.all(promises);
      
      // Flatten all results and remove duplicates based on osm_id
      const allOsmData = results.flat();
      const uniqueOsmData = allOsmData.filter((building, index, self) => 
        index === self.findIndex(b => b.osm_id === building.osm_id)
      );
      
      setOsmBuildingData(uniqueOsmData);
    } catch (error) {
      console.error('Error fetching OSM building data:', error);
      setOsmBuildingData([]);
    } finally {
      setLoadingOsmData(false);
    }
  };

  const fetchNearestBuilding = async (photoId: number, lat: string, lng: string, direction: string) => {
    try {
      const controller = new AbortController();
      const endpoint = showOsmData 
        ? `/comm_osm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${direction}`
        : `/comm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${direction}`;
      
      const response = await fetch(endpoint, { signal: controller.signal });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const responseData = await response.json();

      if (responseData.success && 
          responseData.data?.building_part?.length > 0 && 
          responseData.data.building_part[0]?.geojson?.features?.length > 0 &&
          responseData.data.building_part[0].geojson.features[0]?.geometry?.coordinates?.length > 0) {
        
        const coordinates = responseData.data.building_part[0].geojson.features[0].geometry.coordinates[0];
        
        const properties = responseData.data.building_part[0].geojson.features[0].properties;
        const height = properties?.relativeheightmaximum 
          ? parseFloat(properties.relativeheightmaximum) 
          : (properties?.absoluteheightmaximum ? parseFloat(properties.absoluteheightmaximum) - parseFloat(properties.absoluteheightminimum) : 10);
        
        const base = properties?.relativeheightroofbase
          ? parseFloat(properties.relativeheightroofbase)
          : 0;
        
        setBuildingGeometries(prev => ({
          ...prev,
          [photoId]: {
            coordinates,
            height,
            base
          }
        }));
      }
      
      setNearestBuildings(prev => ({
        ...prev,
        [photoId]: responseData.data?.building_part?.length > 0 ? {
          ...responseData.data.building_part[0],
          id: photoId,
          buildingPartId: responseData.data.building_part[0].id || 'unknown'
        } : null
      }));
      
      return responseData;
    } catch (error) {
      console.error('Error fetching nearest building:', error);
      setNearestBuildings(prev => ({
        ...prev,
        [photoId]: null
      }));
      return null;
    }
  };


  const fetchAllNearestBuildings = async () => {
    setLoadingPhotos(true);
    try {
      const promises = photos.map(photo => 
        fetchNearestBuilding(photo.id, photo.lat, photo.lng, photo.photo_heading)
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching all nearest buildings:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  // Re-fetch building data when toggle changes
  useEffect(() => {
    if (showOsmData) {
      setNearestBuildings({});
      setBuildingGeometries({});
      setOsmBuildingData([]);         
      if (photos.length > 0) {
        fetchAllOsmBuildingData();
      }
    } else {
      setOsmBuildingData([]);
      setNearestBuildings({});
      setBuildingGeometries({});
      
      if (photos.length > 0) {
        fetchAllNearestBuildings();
      }
    }
  }, [showOsmData, photos]);

  useEffect(() => {
    const loadScripts = async () => {

      if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
        const maplibreCSS = document.createElement('link');
        maplibreCSS.rel = 'stylesheet';
        maplibreCSS.href = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.css';
        document.head.appendChild(maplibreCSS);
      }


      if (!window.maplibregl) {
        const maplibreScript = document.createElement('script');
        maplibreScript.src = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.js';
        maplibreScript.async = true;
        document.head.appendChild(maplibreScript);
        await new Promise<void>((resolve) => {
          maplibreScript.onload = () => resolve();
        });
      }


      if (!window.pmtiles) {
        const pmtilesScript = document.createElement('script');
        pmtilesScript.src = 'https://unpkg.com/pmtiles@4.1.0/dist/pmtiles.js';
        pmtilesScript.async = true;
        document.head.appendChild(pmtilesScript);
        await new Promise<void>((resolve) => {
          pmtilesScript.onload = () => resolve();
        });
      }


      if (!window.deck) {
        const deckScript = document.createElement('script');
        deckScript.src = 'https://unpkg.com/deck.gl@^9.0.0/dist.min.js';
        deckScript.async = true;
        document.head.appendChild(deckScript);
        await new Promise<void>((resolve) => {
          deckScript.onload = () => resolve();
        });
      }

      initializeMap();
    };

    loadScripts();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  const getElevation = (lngLat: { lng: number; lat: number }): number | null => {
    if (!map.current) return null;
    try {
      return map.current.queryTerrainElevation(lngLat);
    } catch (e) {
      console.warn('Could not get elevation:', e);
      return null;
    }
  };
  
  // Cached elevation function for performance
  const getCachedElevation = useCallback((lng: number, lat: number): number => {
    const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
    if (!elevationCache.current.has(key)) {
      const elevation = getElevation({ lng, lat }) || 0;
      elevationCache.current.set(key, elevation);
    }
    return elevationCache.current.get(key)!;
  }, []);
  
  // Debounce function
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  const initializeMap = () => {
    const maplibregl = window.maplibregl;
    const pmtiles = window.pmtiles;

    if (!maplibregl || !pmtiles || !mapContainer.current) return;

    // Initialize the pmtiles protocol
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const tilesURL = "https://pic2bim.co.uk/output.pmtiles";

    // Create the map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      maxPitch: 90,
      maxZoom: 21
    });

    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      'top-right'
    );

    map.current.on('load', async () => {
      // Add terrain sources
      map.current.addSource('terrainSource', {
        type: "raster-dem",
        url: "pmtiles://" + tilesURL,
        tileSize: 256
      });

      map.current.addSource('hillshadeSource', {
        type: "raster-dem",
        url: "pmtiles://" + tilesURL,
        tileSize: 256,
      });

      // Set up the terrain
      map.current.setTerrain({
        source: "terrainSource",
        exaggeration: 1
      });

      const originalSetTerrain = map.current.setTerrain;
      map.current.setTerrain = function(options: any) {
        setTerrainEnabled(!!(options && options.source));
        return originalSetTerrain.apply(this, arguments);
      };


      map.current.addLayer({
        id: 'hillshadeLayer',
        type: 'hillshade',
        source: 'terrainSource',
        paint: {
          'hillshade-shadow-color': '#000000',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#888888'
        }
      });

      map.current.addControl(
        new maplibregl.TerrainControl({
          source: "terrainSource",
          exaggeration: 1
        })
      );

      map.current.addSource('api-buildings-source', {
        type: 'geojson',
        data: createBuildingGeometriesGeoJSON()
      });
      
      map.current.addSource('api-roofs-source', {
        type: 'geojson',
        data: createRoofGeometriesGeoJSON()
      });

      map.current.addLayer({
        id: 'buildings-layer',
        type: 'fill-extrusion',
        source: 'api-buildings-source',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'building_colour'],
            ['get', 'building_colour'],
            '#F9B42D' // Default orange color
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.95
        },
        layout: {
          'visibility': 'none' // Initially hidden, will be shown when OSM data is loaded
        }
      });

      map.current.addLayer({
        id: 'roofs-layer',
        type: 'fill',
        source: 'api-roofs-source',
        paint: {
          'fill-color': [
            'case',
            ['has', 'roof_colour'],
            ['get', 'roof_colour'],
            '#2196F3' // Default blue color
          ],
          'fill-opacity': 0.9
        },
        layout: {
          'visibility': 'none' // Initially hidden, will be shown when OSM data is loaded
        }
      });
    });

    map.current.on('sourcedata', function waitForTerrain(e: any) {
      if (e.sourceId === 'terrainSource' && map.current.isSourceLoaded('terrainSource')) {
        map.current.off('sourcedata', waitForTerrain);
        terrainReadyRef.current = true;
        setTerrainReady(true);
      }
    });

    // Fallback: Set terrain ready after timeout if event doesn't fire
    setTimeout(() => {
      if (!terrainReadyRef.current) {
        terrainReadyRef.current = true;
        setTerrainReady(true);
      }
    }, 3000);


    map.current.on('style.load', () => {
      map.current.setLayoutProperty('highway-name-path', 'visibility', 'none');
      map.current.setLayoutProperty('highway-name-minor', 'visibility', 'none');
      map.current.setLayoutProperty('highway-name-major', 'visibility', 'none');
      map.current.setLayoutProperty('highway-shield-non-us', 'visibility', 'none');
      map.current.setLayoutProperty('highway-shield-us-interstate', 'visibility', 'none');
      map.current.setLayoutProperty('road_shield_us', 'visibility', 'none');
    });
  };


  useEffect(() => {
    if (map.current && map.current.getSource('api-buildings-source')) {
      const buildingsGeoJSON = createBuildingGeometriesGeoJSON();
      map.current.getSource('api-buildings-source').setData(buildingsGeoJSON);
      
      // Show/hide MapLibre layers based on data source
      if (map.current.getLayer('buildings-layer')) {
        map.current.setLayoutProperty('buildings-layer', 'visibility', showOsmData ? 'visible' : 'none');
      }
    }
    
    if (map.current && map.current.getSource('api-roofs-source')) {
      const roofsGeoJSON = createRoofGeometriesGeoJSON();
      map.current.getSource('api-roofs-source').setData(roofsGeoJSON);
      
      if (map.current.getLayer('roofs-layer')) {
        map.current.setLayoutProperty('roofs-layer', 'visibility', showOsmData ? 'visible' : 'none');
      }
    }
  }, [buildingGeometries, osmBuildingData, showOsmData]);


  const processedBuildingData = useMemo(() => {
    if (!terrainReady) return { groundData: null, buildingData: [], roofData: [] };
    
    const geoJSON = createBuildingGeometriesGeoJSON();
    

    const groundData = {
      ...geoJSON,
      features: geoJSON.features.map(f => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: [f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => {
            const elevation = terrainEnabled ? getCachedElevation(lng, lat) : 0;
            return [lng, lat, elevation];
          })]
        }
      }))
    };
    

    const buildingData = geoJSON.features.map(f => {
      const contour = f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => {
        const elevation = terrainEnabled ? getCachedElevation(lng, lat) : 0;
        return [lng, lat, elevation];
      });
      return {
        ...f.properties,
        contour,
        height: f.properties.height || 0,
        min_height: f.properties.min_height || 0
      };
    });
    

    const roofData = geoJSON.features.map(f => {
      const contour = f.geometry.coordinates[0].map(([lng, lat]: [number, number]) => {
        const elevation = terrainEnabled ? getCachedElevation(lng, lat) : 0;
        const minHeight = f.properties.min_height || 0;
        return [lng, lat, elevation + minHeight];
      });
      const roofHeight = (f.properties as any)['roof:height'] || 0;
      const totalHeight = f.properties.height || 0;
      const minHeightValue = f.properties.min_height || 0;
      
      return {
        ...f.properties,
        contour,
        height: roofHeight > 0 ? roofHeight : (totalHeight - minHeightValue),
        min_height: minHeightValue
      };
    });
    
    return { groundData, buildingData, roofData };
  }, [buildingGeometries, osmBuildingData, showOsmData, terrainReady, terrainEnabled, getCachedElevation]);
  

  const processedPhotoData = useMemo(() => {
    if (!terrainReady) return [];
    
    return photos.map(photo => {
      const lng = parseFloat(photo.lng);
      const lat = parseFloat(photo.lat);
      const elevation = terrainEnabled ? getCachedElevation(lng, lat) : 0;
      const altitude = terrainEnabled ? elevation + (Number(photo.altitude) - elevation) : 0;
      return {
        ...photo,
        coordinates: [lng, lat, altitude],
        bearing: photo.photo_heading || 0,
        exits: photo.exits || 1
      };
    });
  }, [photos, terrainReady, terrainEnabled, getCachedElevation]);
  

  const createBuildingOverlay = useCallback(() => {
    if (!window.deck || !map.current || !terrainReady) return;
    
    // Check if we have any building data to display
    const hasData = showOsmData ? osmBuildingData.length > 0 : Object.keys(buildingGeometries).length > 0;
    if (!hasData && Object.keys(buildingGeometries).length === 0 && osmBuildingData.length === 0) {
      return;
    }

    if (overlayBuilding) {
      try { map.current.removeControl(overlayBuilding); } catch {}
    }
    
    const { groundData, buildingData, roofData } = processedBuildingData;
    const photoData = processedPhotoData;
    
    // Use Deck.gl layers for legacy data, MapLibre GL handles OSM data
    const buildingLayers = !showOsmData ? [
      new window.deck.GeoJsonLayer({
        id: 'deckgl-ground-layer',
        data: groundData,
        getLineColor: [0, 0, 0, 255],
        getFillColor: [183, 244, 216, 255],
        getLineWidth: () => 0.3,
        opacity: 1,
        pickable: false
      }),
      
      new window.deck.PolygonLayer({
        id: 'deckgl-storey-building',
        data: buildingData,
        extruded: true,
        wireframe: true,
        getPolygon: (d:any) => d.contour,
        getFillColor: (d:any) => {
          // Use base_colour if available, otherwise default to orange
          return d.base_colour ? hexToRgb(d.base_colour) : [249, 180, 45, 255];
        },
        getLineColor: [0, 0, 0, 255],
        getElevation: (d:any) => d.height,
        opacity: 1,
        pickable: true
      }),
      
      new window.deck.PolygonLayer({
        id: 'deckgl-roof-layer',
        data: roofData,
        extruded: true,
        wireframe: true,
        getPolygon: (d:any) => d.contour,
        getFillColor: [33, 150, 243, 200],
        getLineColor: [0, 0, 0, 255],
        getElevation: (d:any) => d.height,
        opacity: 0.8,
        pickable: true
      })
    ] : [];
    

    // Create combined photo layers (camera and photo icon)
    const createPhotoLayers = (data: any[]) => {
      const cameraLayer = new window.deck.ScenegraphLayer({
        id: 'deckgl-exif3d-camera-layer',
        data,
        scenegraph: "./marker.gltf",
        getPosition: (d:any) => d.coordinates,
        getColor: (d:any) => [64, 64, 64],
        getOrientation: (d:any) => [0, -d.bearing, 90],
        getScale: [0.2, 0.2, 0.2],
        pickable: true,
        opacity: 1,
        onClick: (info: any) => {
          if (info && info.object) {
            setSelectedPhoto(info.object);
          }
        },
        onHover: (info: any) => {
          if (map.current && map.current.getCanvas) {
            map.current.getCanvas().style.cursor = info && info.object ? 'pointer' : '';
          }
        }
      });

      const photoIconLayer = new window.deck.IconLayer({
        id: "photo-icon-layer",
        data,
        getIcon: (d: any) => ({
          url: d.link,
          height: 240,
          width: 180,
          id: d.id,
          mask: false,
        }),
        getPosition: (d: any) => {
          const bearing = d.bearing || 0;
          return getOffsetPosition(d.coordinates, bearing, -1); // 1.5 meters behind
        },
        getAngle: (d: any) => (d.bearing || 0),
        getSize: () => 5,
        sizeScale: 15,
        billboard: true,
        pickable: true,
        onClick: (info: any) => {
          if (info && info.object) {
            setSelectedPhoto(info.object);
          }
        },
        onHover: (info: any) => {
          if (map.current && map.current.getCanvas) {
            map.current.getCanvas().style.cursor = info && info.object ? 'pointer' : '';
          }
        }
      });

      return [cameraLayer, photoIconLayer];
    };

    const [cameraLayer, photoIconLayer] = createPhotoLayers(photoData);

    const markerLayer = new window.deck.IconLayer({
      id: 'deckgl-exif-icon-layer',
      data: photoData,
      getIcon: () => "marker",
      iconAtlas: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
      iconMapping: {
        marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
      },
      getPosition: (d:any) => d.coordinates,
      getColor: (d:any) => [Math.sqrt(d.exits), 140, 0],
      getSize: () => 5,
      sizeScale: 8,
      billboard: true,
      pickable: true,
      onClick: (info: any) => {
        if (info && info.object) {
          setSelectedPhoto(info.object);
        }
      },
      getTooltip: (info: any) => info.object ? `Photo ID: ${info.object.id}` : null
    });

    const newOverlayBuilding = new window.deck.MapboxOverlay({
      layers: [...buildingLayers, markerLayer, cameraLayer, photoIconLayer]
    });
    map.current.addControl(newOverlayBuilding);
    setOverlayBuilding(newOverlayBuilding);
  }, [terrainReady, processedBuildingData, processedPhotoData, showOsmData, osmBuildingData, buildingGeometries]);
  

  // Helper function to calculate offset position based on bearing
  const getOffsetPosition = (coordinates: [number, number, number], bearing: number, distance: number) => {
    const rad = (bearing * Math.PI) / 180;
    const offsetLat = distance * Math.cos(rad) / 111111; // Rough meters to degrees conversion
    const offsetLon = distance * Math.sin(rad) / (111111 * Math.cos(coordinates[1] * Math.PI / 180));
    return [
      coordinates[0] + offsetLon,
      coordinates[1] + offsetLat,
      coordinates[2] + 6
    ];
  };

  // Create combined photo layers (camera and photo icon)
  const createPhotoLayers = (data: any[]) => {
    const cameraLayer = new window.deck.ScenegraphLayer({
      id: 'deckgl-exif3d-camera-layer',
      data,
      scenegraph: "./marker.gltf",
      getPosition: (d:any) => d.coordinates,
      getColor: (d:any) => [64, 64, 64],
      getOrientation: (d:any) => [0, -d.bearing, 90],
      getScale: [0.2, 0.2, 0.2],
      pickable: true,
      opacity: 1,
      onClick: (info: any) => {
        if (info && info.object) {
          setSelectedPhoto(info.object);
        }
      },
      onHover: (info: any) => {
        if (map.current && map.current.getCanvas) {
          map.current.getCanvas().style.cursor = info && info.object ? 'pointer' : '';
        }
      }
    });

    const photoIconLayer = new window.deck.IconLayer({
      id: "photo-icon-layer",
      data,
      getIcon: (d: any) => ({
        url: d.link,
        height: 240,
        width: 180,
        id: d.id,
        mask: false,
      }),
      getPosition: (d: any) => {
        const bearing = d.bearing || 0;
        return getOffsetPosition(d.coordinates, bearing, -1); // 1.5 meters behind
      },
      getAngle: (d: any) => (d.bearing || 0),
      getSize: () => 5,
      sizeScale: 15,
      billboard: true,
      pickable: true,
      onClick: (info: any) => {
        if (info && info.object) {
          setSelectedPhoto(info.object);
        }
      },
      onHover: (info: any) => {
        if (map.current && map.current.getCanvas) {
          map.current.getCanvas().style.cursor = info && info.object ? 'pointer' : '';
        }
      }
    });

    return [cameraLayer, photoIconLayer];
  };

  const debouncedCreateOverlay = useMemo(
    () => debounce(createBuildingOverlay, 100),
    [createBuildingOverlay, debounce]
  )
  
  // Consolidated effect for overlay updates - triggers when data changes OR terrain becomes ready
  useEffect(() => {
    const hasData = Object.keys(buildingGeometries).length > 0 || osmBuildingData.length > 0;
    
    if (terrainReady && hasData) {
      createBuildingOverlay();
    }
  }, [terrainReady, terrainEnabled, showOsmData, buildingGeometries, osmBuildingData, createBuildingOverlay]);
  

  useEffect(() => {
    elevationCache.current.clear();
  }, [terrainEnabled]);

  useEffect(() => {
    handleDrawLaz(!terrainEnabled);
    updateOverlayCamera();
  }, [terrainEnabled]);

  const updateOverlayCamera = () => {
    if (!window.deck || !map.current) return;
    if (overlayCamera) {
      try { map.current.removeControl(overlayCamera); } catch {}
    }
    const photoData = photos.map(photo => {
      const lng = parseFloat(photo.lng);
      const lat = parseFloat(photo.lat);
      const lngLat = { lng: lng, lat: lat };
      const elevation = getElevation(lngLat) || 0;
      const altitude = terrainEnabled ? elevation + (Number(photo.altitude) - elevation) : 0;
      return {
        ...photo,
        coordinates: [lng, lat, altitude],
        bearing: photo.photo_heading || 0,
      };
    });

    // Use the same photo layers creation function
    const [cameraLayer, photoIconLayer] = createPhotoLayers(photoData);

    const newOverlayCamera = new window.deck.MapboxOverlay({ layers: [cameraLayer, photoIconLayer] });
    map.current.addControl(newOverlayCamera);
    setOverlayCamera(newOverlayCamera);
  };

  const handleDrawLaz = useCallback(async (flattenZ: boolean = false) => {
    try {
      const url = `${LAZ_FILES_LIST_URL}${selectedLaz}`;
      const data :any = await load(url, LASLoader);
      transformLazData(data, flattenZ);
      const layer = new window.deck.PointCloudLayer({
        id: "laz-pointcloud",
        data,
        getPosition: (d: any) => d.position,
        getColor: (d: any) => (d && d.color && Array.isArray(d.color)) ? d.color : [0,0,255],
        pointSize: 1,
        pickable: false
      });

      if (overlayLaz && map.current) {
        try { map.current.removeControl(overlayLaz); } catch {}
      }

      const newOverlayLaz = new window.deck.MapboxOverlay({ layers: [layer] });
      map.current.addControl(newOverlayLaz);
      setOverlayLaz(newOverlayLaz);
      setLazLayer(layer);
    } catch (e) {
      console.error(e);
    }
  }, [selectedLaz, map, overlayLaz, setLazLayer]);


  useEffect(() => {
    return () => {
      if (overlayCamera && map.current) {
        try { map.current.removeControl(overlayCamera); } catch {}
      }
      if (overlayLaz && map.current) {
        try { map.current.removeControl(overlayLaz); } catch {}
      }
    };
  }, [overlayCamera, overlayLaz]);


  useEffect(() => {
      const getLazFilesList = async () => {
        const response = await fetch(LAZ_FILES_DIRECTORY);
        const result = await response.json();
        setLazList(result as NginxFile[]);
      };
      getLazFilesList();
    }, []);

  return (
    <div className="relative w-full h-[calc(100vh-74px)] flex flex-col">
      {/* Collapsible LAZ Section */}
      <div className="w-full bg-white shadow mb-2">
        {/* Building Data Source Toggle */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-semibold text-lg">Building Data Source</span>
            <span className="text-sm text-gray-600">
              Switch between legacy and OSM building data
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showOsmData}
              onChange={(e) => setShowOsmData(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {showOsmData ? 'OSM Data' : 'Legacy Data'}
            </span>
          </label>
        </div>
        
        {/* LAZ Section */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 font-semibold text-left text-lg border-b hover:bg-gray-50 focus:outline-none transition"
          onClick={() => setShowLazSection((v) => !v)}
        >
          <span>Load LAZ</span>
          <svg className={`w-5 h-5 transform transition-transform duration-200 ${showLazSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showLazSection && (
          <div className="px-4 py-4 border-t bg-gray-50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <button
                onClick={() => handleDrawLaz(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Draw
              </button>
              <div className="flex flex-col gap-1 w-full max-w-xs">
                <select
                  id="laz-select"
                  className="border rounded px-2 py-1"
                  value={selectedLaz}
                  onChange={e => setSelectedLaz(e.target.value)}
                >
                  <option value="">Select a file</option>
                  {lazList.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Slide-in panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${selectedPhoto ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: 350,
          maxWidth: '90vw',
          top: 'auto',
          bottom: 0,
          maxHeight: showLazSection ? 'calc(100vh - 194px)' : 'calc(100vh - 124px)'
        }}
      >
        {selectedPhoto && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg">Building Data</span>
              <button onClick={() => setSelectedPhoto(null)} className="text-gray-600 hover:text-black">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              {(() => {
                const buildingData = nearestBuildings[selectedPhoto.id];
                if (!buildingData) {
                  return <div className="text-gray-500">No building data.</div>;
                }
                const properties = buildingData.geojson?.features?.[0]?.properties;
                const osid = buildingData.geojson?.features?.[0]?.id;
                return (
                  <BuildingDataGrid selectedPhoto={selectedPhoto} properties={properties} osid={osid} />
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div ref={mapContainer} id="map" className="w-full flex-1 min-h-[300px]"></div>
      {(loadingPhotos || loadingOsmData) && (
        <div className="fixed top-4 right-4 bg-white p-2 rounded shadow z-10">
          {loadingOsmData ? 'Loading OSM building data...' : 'Loading nearest buildings data...'}
        </div>
      )}
      <div className="fixed bottom-4 right-4 bg-white p-2 rounded shadow z-10">
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span className="text-sm">Photo</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm">Photo with building data</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-pink-500 rounded-full mr-2"></div>
          <span className="text-sm">Photo with building geometry</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-4 h-4 bg-yellow-400 mr-2" style={{ height: '10px' }}></div>
          <span className="text-sm">Building base (ground to roof base)</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 mr-2" style={{ height: '10px' }}></div>
          <span className="text-sm">Building roof (roof base to max)</span>
        </div>
      </div>
    </div>
  );
};

export default BuildingAttributesContent;
