import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const markerRef = useRef<any[]>([]);
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [nearestBuildings, setNearestBuildings] = useState<Record<number, NearestBuildingData | null>>({});
  const [buildingGeometries, setBuildingGeometries] = useState<Record<number, BuildingGeometryData>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoData | null>(null); // State for selected marker
  const [overlay, setOverlay] = useState<any>(null); // Deck.gl overlay for LAZ
  const [lazLayer, setLazLayer] = useState<any>(null); // For future extension if needed
  const [metrics, setMetrics] = useState<{ landArea?: number; buildingArea?: number; volume?: number; buildingHeight?: number }>({}); // <-- Fix for ReferenceError
  const [showLazSection, setShowLazSection] = useState(false);
  const [lazList, setLazList] = useState<NginxFile[]>([]);
  const [selectedLaz, setSelectedLaz] = useState<string>("");

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
        const mapBearing = map.current && typeof map.current.getBearing === 'function' ? map.current.getBearing() : 0;
        const polygonElevation = photo.altitude ? photo.altitude : 0;
        const cameraCoordinates = map.current && typeof map.current.getCenter === 'function'
          ? [map.current.getCenter().lng, map.current.getCenter().lat, polygonElevation]
          : undefined;
        const offset = getOffsetBehindCamera(mapBearing, polygonElevation, cameraCoordinates);
        const zoom = map.current && typeof map.current.getZoom === 'function' ? map.current.getZoom() : 20;
        root.render(
          <BuildingAttributesMarker
            data={photo}
            mapBearing={mapBearing}
            onClick={() => setSelectedPhoto(photo)}
            zoom={zoom}
            offset={offset}
          />
        );
        const marker = new window.maplibregl.Marker({ element: el })
          .setLngLat([parseFloat(photo.lng), parseFloat(photo.lat)])
          .addTo(map.current);
        markerRef.current.push(marker);
      } catch (error) {
        console.error(`Failed to render marker for photo ID ${photo.id}:`, error);
      }
    });
  }, [setSelectedPhoto]);

  useEffect(() => {
    if (!map.current) return;
    const handleRotate = () => {
      addMarkers(photos);
    };
    const handleZoom = () => {
      addMarkers(photos);
    };
    map.current.on('rotate', handleRotate);
    map.current.on('zoom', handleZoom);
    return () => {
      map.current.off('rotate', handleRotate);
      map.current.off('zoom', handleZoom);
    };
  }, [map.current, photos, addMarkers]);

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

      // Load Deck.gl
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

      map.current.on('render', () => {
        if (!markerRef.current || !photos) return;
        markerRef.current.forEach((marker, idx) => {
          const photo = photos[idx];
          if (!photo || !photo.lat || !photo.lng) return;

          const lng = parseFloat(photo.lng);
          const lat = parseFloat(photo.lat);
          const markerScreen = map.current.project([lng, lat]);

          const features = map.current.queryRenderedFeatures([markerScreen.x, markerScreen.y], {
            layers: ['api-buildings', 'api-roofs', 'building', 'building-3d']
          });

          let hidden = false;
          for (const feature of features) {
            const geom = feature.geometry;
            if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) continue;

            const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;

            for (const poly of polygons) {
              for (const ring of poly) {
                const projected = ring.map(([lngP, latP]: [number, number]) => {
                  return map.current.project([lngP, latP]);
                });

                const xs = projected.map((p: any) => p.x);
                const ys = projected.map((p: any) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                if (
                  markerScreen.x >= minX && markerScreen.x <= maxX &&
                  markerScreen.y >= minY && markerScreen.y <= maxY
                ) {
                  
                  if (true) {
                    hidden = true;
                    break;
                  }
                }
              }
              if (hidden) break;
            }
            if (hidden) break;
          }

          const el = marker.getElement();
          el.style.display = hidden ? 'none' : '';
        });
      });
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

  const handleDrawLaz = useCallback(async () => {
  try {
    const url = `${LAZ_FILES_LIST_URL}${selectedLaz}`;
    console.log('Loading LAZ file:', url);
    const data = await load(url, LASLoader);
    console.log('LAZ data loaded', data);
    transformLazData(data);
    const layer = new window.deck.PointCloudLayer({
      id: "laz-pointcloud",
      data,
      getPosition: (d: any) => d.position,
      getColor: (d: any) => (d && d.color && Array.isArray(d.color)) ? d.color : [0,0,255],
      pointSize: 1,
      pickable: false
    });
    if (overlay) {
      map.current.removeControl(overlay);
    }
    const newOverlay = new window.deck.MapboxOverlay({ layers: [layer] });
    map.current.addControl(newOverlay);
    setOverlay(newOverlay);
    setLazLayer(layer);
  } catch (e) {
    console.error(e);
  }
}, [selectedLaz, overlay, map, setOverlay, setLazLayer]);

  useEffect(() => {
    return () => {
      if (overlay && map.current) {
        try { map.current.removeControl(overlay); } catch {}
      }
    };
  }, [overlay]);

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
                onClick={handleDrawLaz}
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
            {metrics && (metrics.landArea || metrics.buildingArea || metrics.volume || metrics.buildingHeight) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {metrics.landArea !== undefined && (
                  <div className="bg-white rounded shadow p-2 text-center">
                    <div className="text-xs text-gray-500">Land Area</div>
                    <div className="font-bold">{metrics.landArea.toFixed(2)} m²</div>
                  </div>
                )}
                {metrics.buildingArea !== undefined && (
                  <div className="bg-white rounded shadow p-2 text-center">
                    <div className="text-xs text-gray-500">Building Area</div>
                    <div className="font-bold">{metrics.buildingArea.toFixed(2)} m²</div>
                  </div>
                )}
                {metrics.volume !== undefined && (
                  <div className="bg-white rounded shadow p-2 text-center">
                    <div className="text-xs text-gray-500">Volume</div>
                    <div className="font-bold">{metrics.volume.toFixed(2)} m³</div>
                  </div>
                )}
                {metrics.buildingHeight !== undefined && (
                  <div className="bg-white rounded shadow p-2 text-center">
                    <div className="text-xs text-gray-500">Building Height</div>
                    <div className="font-bold">{metrics.buildingHeight.toFixed(2)} m</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Slide-in panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${selectedPhoto ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 350, maxWidth: '90vw' }}
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

export default BuildingAttributesContent;
