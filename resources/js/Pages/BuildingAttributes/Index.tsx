import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import BuildingAttributesMarker from '@/Components/Map/BuildingAttributesMarker';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface PhotoData {
  id: number;
  lat: string;
  lng: string;
  photo_heading: string;
  file_name: string;
  link: string;
  altitude?: number;
  path?: string;
  angle?: number;
  vertical_view_angle?: number;
  distance?: number;
  nmea_distance?: number;
  [key: string]: any; // Allow for additional properties
}

interface NearestBuildingData {
  id: number;
  buildingPartId: string;
  distance: number;
  name?: string;
  geometry?: any;
  [key: string]: any;
}

interface BuildingGeometryData {
  coordinates: any[];
  height: number;
  base: number;
}

interface Props extends Omit<PageProps, 'photos'> {
  photos: PhotoData[];
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      login: string;
      surname: string;
      identification_number: string;
      vat: string;
      email_verified_at: string;
      roles: any[];
      [key: string]: any;
    };
  };
}

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
  const markerRef = useRef<any[]>([]); // Untuk menyimpan marker DOM
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [nearestBuildings, setNearestBuildings] = useState<Record<number, NearestBuildingData | null>>({});
  const [buildingGeometries, setBuildingGeometries] = useState<Record<number, BuildingGeometryData>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(true);

  const addMarkers = useCallback((photos_: PhotoData[]) => {
    if (!map.current || !window.maplibregl) {
      console.warn('MapLibre GL or map instance not available');
      return;
    }
    // Clear existing markers
    markerRef.current.forEach(marker => marker.remove());
    markerRef.current = [];
  
    photos_.forEach((photo) => {
      if (!photo || !photo.lat || !photo.lng) {
        console.warn(`Invalid photo data for ID ${photo?.id}:`, photo);
        return;
      }
      const el = document.createElement('div');
      try {
        const root = createRoot(el);
        root.render(
          <BuildingAttributesMarker data={photo} onClick={() => {
          }} />
        );
        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([parseFloat(photo.lng), parseFloat(photo.lat)])
          .addTo(map.current);
        markerRef.current.push(marker);
      } catch (error) {
        console.error(`Failed to render marker for photo ID ${photo.id}:`, error);
      }
    });
  }, []);

  // Create a GeoJSON from all building geometries
  const createBuildingGeometriesGeoJSON = () => {
    const features = Object.entries(buildingGeometries).map(([photoId, buildingData]) => {
      if (!buildingData || !buildingData.coordinates || buildingData.coordinates.length === 0) return null;
      
      return {
        type: 'Feature',
        properties: {
          photoId: parseInt(photoId),
          buildingId: nearestBuildings[parseInt(photoId)]?.buildingPartId || 'unknown',
          height: buildingData.height || 10,
          base: buildingData.base || 0
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
  };

  // Create a GeoJSON specifically for the roof parts
  const createRoofGeometriesGeoJSON = () => {
    const features = Object.entries(buildingGeometries).map(([photoId, buildingData]) => {
      if (!buildingData || !buildingData.coordinates || buildingData.coordinates.length === 0) return null;
      
      return {
        type: 'Feature',
        properties: {
          photoId: parseInt(photoId),
          buildingId: nearestBuildings[parseInt(photoId)]?.buildingPartId || 'unknown',
          height: buildingData.height || 10,
          base: buildingData.base || 0
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
  };

  // Convert photos to GeoJSON for map display
  const createPhotosGeoJSON = () => {
    return {
      type: 'FeatureCollection',
      features: photos.map(photo => ({
        type: 'Feature',
        properties: {
          id: photo.id,
          heading: photo.photo_heading,
          fileName: photo.file_name,
          path: photo.path,
          nearestBuildingId: nearestBuildings[photo.id]?.buildingPartId || null,
          nearestBuildingDistance: nearestBuildings[photo.id]?.distance || null,
          hasGeometry: buildingGeometries[photo.id] ? true : false,
          link: photo.link,
          altitude: photo.altitude || 0
        },
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(photo.lng), parseFloat(photo.lat)]
        }
      }))
    };
  };

  // Fetch nearest building data for a photo
  const fetchNearestBuilding = async (photoId: number, lat: string, lng: string, direction: string) => {
    try {
      const controller = new AbortController();
      const response = await fetch(
        `/comm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${direction}`,
        { signal: controller.signal }
      );
      
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

  // Fetch nearest buildings for all photos
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

  useEffect(() => {
    if (photos.length > 0) {
      fetchAllNearestBuildings();
    }
  }, [photos]);

  useEffect(() => {
    const loadScripts = async () => {
      // Load MapLibre CSS
      if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
        const maplibreCSS = document.createElement('link');
        maplibreCSS.rel = 'stylesheet';
        maplibreCSS.href = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.css';
        document.head.appendChild(maplibreCSS);
      }

      // Load MapLibre JS
      if (!window.maplibregl) {
        const maplibreScript = document.createElement('script');
        maplibreScript.src = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.js';
        maplibreScript.async = true;
        document.head.appendChild(maplibreScript);
        await new Promise<void>((resolve) => {
          maplibreScript.onload = () => resolve();
        });
      }

      // Load pmtiles
      if (!window.pmtiles) {
        const pmtilesScript = document.createElement('script');
        pmtilesScript.src = 'https://unpkg.com/pmtiles@4.1.0/dist/pmtiles.js';
        pmtilesScript.async = true;
        document.head.appendChild(pmtilesScript);
        await new Promise<void>((resolve) => {
          pmtilesScript.onload = () => resolve();
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

      // Add hillshade layer
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

      // Add terrain control
      map.current.addControl(
        new maplibregl.TerrainControl({
          source: "terrainSource",
          exaggeration: 1
        })
      );

      // Add building sources
      map.current.addSource('api-buildings-source', {
        type: 'geojson',
        data: createBuildingGeometriesGeoJSON()
      });
      
      map.current.addSource('api-roofs-source', {
        type: 'geojson',
        data: createRoofGeometriesGeoJSON()
      });
      
      // Add layers for buildings
      map.current.addLayer({
        'id': 'api-buildings',
        'source': 'api-buildings-source',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': '#FFEB3B',
          'fill-extrusion-height': ['get', 'base'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.8
        }
      });
      
      map.current.addLayer({
        'id': 'api-roofs',
        'source': 'api-roofs-source',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': '#2196F3',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-opacity': 0.8
        }
      });
      
      // Add photo markers as DOM elements using React
      addMarkers(photos);
    });

    // Disable road labels
    map.current.on('style.load', () => {
      map.current.setLayoutProperty('highway-name-path', 'visibility', 'none');
      map.current.setLayoutProperty('highway-name-minor', 'visibility', 'none');
      map.current.setLayoutProperty('highway-name-major', 'visibility', 'none');
      map.current.setLayoutProperty('highway-shield-non-us', 'visibility', 'none');
      map.current.setLayoutProperty('highway-shield-us-interstate', 'visibility', 'none');
      map.current.setLayoutProperty('road_shield_us', 'visibility', 'none');
    });
  };

  // Update photo markers when data changes
  useEffect(() => {
    if (map.current) {
      addMarkers(photos);
    }
  }, [photos, addMarkers]);

  useEffect(() => {
    if (map.current && map.current.getSource('api-buildings-source')) {
      const buildingsGeoJSON = createBuildingGeometriesGeoJSON();
      map.current.getSource('api-buildings-source').setData(buildingsGeoJSON);
    }
    
    if (map.current && map.current.getSource('api-roofs-source')) {
      const roofsGeoJSON = createRoofGeometriesGeoJSON();
      map.current.getSource('api-roofs-source').setData(roofsGeoJSON);
    }
  }, [buildingGeometries]);

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <div ref={mapContainer} id="map" className="w-full h-full"></div>
      {loadingPhotos && (
        <div className="fixed top-4 right-4 bg-white p-2 rounded shadow z-10">
          Loading nearest buildings data...
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

export default function Index({ auth, photos }: Props) {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Building Attributes V2</h2>}
    >
      <Head title="Building Attributes V2" />
      <BuildingAttributesContent photos={photos} />
    </AuthenticatedLayout>
  );
}

// Add TypeScript declarations for the global window object
declare global {
  interface Window {
    maplibregl: any;
    pmtiles: any;
    deck: any;
  }
}

declare module '@deck.gl/react';
declare module '@deck.gl/layers';
declare module '@deck.gl/mesh-layers';