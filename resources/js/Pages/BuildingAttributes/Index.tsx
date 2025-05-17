import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { PageProps, Photo } from '@/types';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { createRoot } from 'react-dom/client';
import { Protocol } from 'pmtiles';

type FeatureProperties = {
  name?: string;
  description?: string;
  height?: number;
  absoluteheightminimum?: number;
  absoluteheightroofbase?: number;
  absoluteheightmaximum?: number;
  [key: string]: any;
};

// Define the view state type
interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface PhotoInfo {
  id: number;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  link?: string;
  buildingFeatures?: any[];
  isLoading?: boolean;
  cameraGPSData?: any[];
  error?: string;
  noBuildings?: boolean;
  processed?: boolean;
}

interface PhotoMarkerProps {
  photo: PhotoInfo;
  onClick: (id: number) => void;
  isSelected: boolean;
}

// Custom Photo Marker Component
const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onClick, isSelected }) => {
  return (
    <div style={{ cursor: 'pointer' }} onClick={() => onClick(photo.id)}>
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          width: '100%', 
          textAlign: 'center', 
          fontSize: '10px', 
          color: isSelected ? '#fff' : '#333', 
          fontWeight: 'bold',
          backgroundColor: isSelected ? '#4285f4' : 'transparent',
          borderRadius: '4px',
          padding: '2px 4px'
        }}>
          Photo ID: {photo.id}
          {photo.isLoading && ' (Loading...)'}
          {photo.error && ' (Error)'}
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            position: 'absolute', 
            width: '82px', 
            height: '82px', 
            display: 'flex',
            left: '9px',
            top: '-90px',
            overflow: 'hidden',
            borderRadius: '50%',
            backgroundColor: 'rgb(45 50 66)',
            border: isSelected ? '3px solid #4285f4' : (photo.error ? '3px solid #e53935' : 'none')
          }}>
            {photo.link && (
              <img 
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  position: 'absolute',
                  objectFit: 'scale-down',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                src={photo.link} 
                alt={`Photo ${photo.id}`}
              />
            )}
          </div>
          <div style={{ position: 'absolute', top: '-90px', left: '9px' }}>
            <img 
              style={{ 
                position: 'absolute',
                transform: `rotate(${photo.heading}deg)`,
                width: '100px'
              }}
              src="/icon_azimuth.png" 
              alt="Azimuth"
            />
          </div>
          <img 
            style={{ width: '84px', position: 'absolute', top: '-90px', left: '9px' }}
            src="/icon_photo.png" 
            alt="Marker"
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced fetchBuilding function with better timeout handling and caching
const fetchBuilding = async (lat: number, lon: number, camDirection: number, camAltitude: number = 0, retryCount = 0) => {
  let lng = lon;
  if (lng > 0) lng = -Math.abs(lng);

  // Generate a cache key based on coordinates and direction
  const cacheKey = `bldg_${lat.toFixed(6)}_${lng.toFixed(6)}_${camDirection.toFixed(1)}`;
  
  // Check if we have this result in sessionStorage
  const cachedResult = sessionStorage.getItem(cacheKey);
  if (cachedResult) {
    try {
      const parsed = JSON.parse(cachedResult);
      console.log(`Using cached building data for ${lat},${lng}`);
      return parsed;
    } catch (e) {
      console.error("Failed to parse cached data:", e);
      sessionStorage.removeItem(cacheKey);
      // Continue with normal fetch
    }
  }

  // Add timeout to prevent hanging requests - increased to 20 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    // Log the request to help with debugging
    console.log(`Fetching building data for ${lat},${lng} with direction ${camDirection}`);
    
    const response = await fetch(
      `/comm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${camDirection}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();

    // Always return a valid response structure, even if no building parts were found
    const result = {
      success: true,
      geojson: data.data?.building_part?.length > 0 && data.data.building_part[0]?.geojson 
        ? data.data.building_part[0].geojson 
        : { type: 'FeatureCollection', features: [] },
      cameraGPSData: [
        {
          coordinates: [lng, lat, camAltitude],
          bearing: camDirection,
          altitude: camAltitude,
        },
      ],
      hasBuildings: !!(data.data?.building_part?.length > 0 && data.data.building_part[0]?.geojson)
    };
    
    // Cache the successful response in sessionStorage
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (e) {
      console.warn("Failed to cache building data:", e);
      // Non-critical error, continue without caching
    }
    
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    
    // Handle timeout or network errors with retry logic
    if ((err as Error).name === 'AbortError') {
      console.log(`Request timed out for photo at ${lat},${lng}`);
      
      // Retry logic - attempt up to 2 retries
      if (retryCount < 2) {
        console.log(`Retrying request (attempt ${retryCount + 1}/2)...`);
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchBuilding(lat, lon, camDirection, camAltitude, retryCount + 1);
      }
    }
    throw err;
  }
};

// Debounce function to prevent excessive calls
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Improved polygon simplification for better performance
const simplifyPolygon = (coordinates: number[][], tolerance: number = 0.00001): number[][] => {
  if (coordinates.length <= 2) return coordinates;
  
  // Check if the polygon is complex enough to warrant simplification
  // This avoids unnecessary processing for simple polygons
  if (coordinates.length < 50) return coordinates;
  
  // Find the point with the maximum distance from line between start and end
  const findFurthestPoint = (start: number, end: number): { index: number, distance: number } => {
    let maxDistance = 0;
    let maxIndex = 0;
    
    const [x1, y1] = coordinates[start];
    const [x2, y2] = coordinates[end];
    
    // Line equation coefficients: ax + by + c = 0
    const a = y2 - y1;
    const b = x1 - x2;
    const c = x2 * y1 - x1 * y2;
    const lineLengthSq = a * a + b * b;
    
    // Skip processing if line length is near zero to avoid division by zero
    if (lineLengthSq < 1e-10) return { index: start, distance: 0 };
    
    for (let i = start + 1; i < end; i++) {
      const [x, y] = coordinates[i];
      // Distance from point to line
      const distance = Math.abs(a * x + b * y + c) / Math.sqrt(lineLengthSq);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    return { index: maxIndex, distance: maxDistance };
  };
  
  // Recursive simplification with reduced recursion depth
  const simplifySegment = (start: number, end: number, result: Set<number>) => {
    // Base case: segment is too short
    if (end - start <= 1) return;
    
    const { index, distance } = findFurthestPoint(start, end);
    
    if (distance > tolerance) {
      // Point is far enough, keep it and recursively process segments
      // Use smaller segments to reduce stack depth
      if (index - start > 1) simplifySegment(start, index, result);
      result.add(index);
      if (end - index > 1) simplifySegment(index, end, result);
    }
    // If not far enough, we don't include intermediate points
  };
  
  // Collect points to keep
  const pointSet = new Set<number>([0, coordinates.length - 1]);
  
  // Use a non-recursive approach for very large polygons to avoid stack overflow
  if (coordinates.length > 1000) {
    // Simple distance-based decimation for very large polygons
    const step = Math.max(1, Math.floor(coordinates.length / 500)); // Keep around 500 points
    for (let i = 0; i < coordinates.length; i += step) {
      pointSet.add(i);
    }
  } else {
    // Use recursive approach for moderate-sized polygons
    simplifySegment(0, coordinates.length - 1, pointSet);
  }
  
  // Convert back to sorted array of coordinates
  return Array.from(pointSet)
    .sort((a, b) => a - b)
    .map(index => coordinates[index]);
};

export default function Index({ auth, photos }: PageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker[]>([]);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -0.7982,
    latitude: 51.2144,
    zoom: 15.5,
    pitch: 40,
    bearing: 0
  });
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [photoInfos, setPhotoInfos] = useState<PhotoInfo[]>([]);
  const [layers, setLayers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingCount, setLoadingCount] = useState<number>(0);
  const [metrics, setMetrics] = useState<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLoadTime: number;
    totalLoadTime: number;
  }>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLoadTime: 0,
    totalLoadTime: 0
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const mapAreaRef = useRef<HTMLDivElement>(null);

  // Process photos from props directly
  useEffect(() => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      setError('No photos available');
      return;
    }

    // Process all photos
    const photoInfosArray = photos.map((photo: Photo) => ({
      id: photo.id,
      lat: typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat,
      lng: typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng, 
      altitude: typeof photo.altitude === 'string' ? parseFloat(photo.altitude || '0') : (photo.altitude || 0),
      heading: typeof photo.photo_heading === 'string' ? parseFloat(photo.photo_heading || '0') : (photo.photo_heading || 0),
      link: photo.link || undefined,
      isLoading: false,
      cameraGPSData: undefined,
      error: undefined,
      noBuildings: false,
      processed: false
    }));

    setPhotoInfos(photoInfosArray);
    
    // Update view state to center on the first photo
    if (photoInfosArray.length > 0) {
      setViewState({
        ...viewState,
        longitude: photoInfosArray[0].lng,
        latitude: photoInfosArray[0].lat
      });
      
      // Auto-select the first photo
      setSelectedPhotoId(photoInfosArray[0].id);
    }
  }, [photos]);

  // Function to fetch building data for a single photo
  const fetchBuildingForPhoto = useCallback(async (photoId: number) => {
    const photoIndex = photoInfos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) return;
    
    const photo = photoInfos[photoIndex];
    if (photo.buildingFeatures || photo.isLoading) return;
    
    // Start measuring the load time
    const startTime = performance.now();
    
    try {
      // Mark this photo as loading
      setPhotoInfos(prev => {
        const updated = [...prev];
        updated[photoIndex] = { ...updated[photoIndex], isLoading: true, error: undefined };
        return updated;
      });
      
      setLoadingCount(prev => prev + 1);
      
      // Update metrics for new request
      setMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1
      }));
      
      const data = await fetchBuilding(
        photo.lat,
        photo.lng,
        photo.heading,
        photo.altitude
      );
      
      // Calculate load time
      const loadTime = performance.now() - startTime;
      
      const features: any[] = [];
      
      if (data.geojson.features && Array.isArray(data.geojson.features)) {
        data.geojson.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            // Check if we should simplify the polygon (only for very complex polygons)
            let processedCoordinates = feature.geometry.coordinates;
            if (feature.geometry.type === 'Polygon') {
              const coordCount = feature.geometry.coordinates.reduce(
                (sum: number, ring: number[][]) => sum + ring.length, 0
              );
              
              // If the polygon has many points, simplify it
              if (coordCount > 100) {
                processedCoordinates = feature.geometry.coordinates.map(
                  (ring: number[][]) => simplifyPolygon(ring, 0.00001)
                );
                console.log(`Simplified polygon from ${coordCount} to ${
                  processedCoordinates.reduce((sum: number, ring: number[][]) => sum + ring.length, 0)
                } points`);
              }
            }
            
            features.push({
              type: 'Feature',
              properties: {
                ...feature.properties,
                absoluteheightminimum: feature.properties.absoluteheightminimum || 0,
                absoluteheightroofbase: feature.properties.absoluteheightroofbase || 0,
                absoluteheightmaximum: feature.properties.absoluteheightmaximum || 0,
                description: feature.properties.description || 'Building'
              },
              geometry: {
                ...feature.geometry,
                coordinates: processedCoordinates
              }
            });
          }
        });
      }
      
      // Mark the photo as successfully processed, even if no buildings were found
      setPhotoInfos(prev => {
        const updated = [...prev];
        updated[photoIndex] = {
          ...updated[photoIndex],
          buildingFeatures: features,
          isLoading: false,
          cameraGPSData: data.cameraGPSData,
          error: undefined,
          noBuildings: features.length === 0,
          processed: true // Mark as processed regardless of building data availability
        };
        return updated;
      });
      
      // Update metrics for successful request
      setMetrics(prev => {
        const newTotalLoadTime = prev.totalLoadTime + loadTime;
        const newSuccessfulRequests = prev.successfulRequests + 1;
        return {
          ...prev,
          successfulRequests: newSuccessfulRequests,
          totalLoadTime: newTotalLoadTime,
          averageLoadTime: newTotalLoadTime / newSuccessfulRequests
        };
      });
      
      if (features.length > 0) {
        console.log(`Loaded ${features.length} building features for photo ${photo.id} in ${loadTime.toFixed(0)}ms`);
      } else {
        console.log(`No building features found for photo ${photo.id}, but request was successful (${loadTime.toFixed(0)}ms)`);
      }
    } catch (err) {
      // Calculate load time even for failed requests
      const loadTime = performance.now() - startTime;
      
      console.error(`Error fetching building data for photo ${photo.id}:`, err);
      setPhotoInfos(prev => {
        const updated = [...prev];
        updated[photoIndex] = { 
          ...updated[photoIndex], 
          isLoading: false,
          error: (err as Error).name === 'AbortError' 
            ? "Request timed out" 
            : `Error: ${(err as Error).message}`
        };
        return updated;
      });
      
      // Update metrics for failed request
      setMetrics(prev => ({
        ...prev,
        failedRequests: prev.failedRequests + 1,
        totalLoadTime: prev.totalLoadTime + loadTime
      }));
    } finally {
      setLoadingCount(prev => prev - 1);
    }
  }, [photoInfos]);

  // Fetch building data when a photo is selected
  useEffect(() => {
    if (selectedPhotoId === null) return;
    
    const photo = photoInfos.find(p => p.id === selectedPhotoId);
    if (!photo || photo.buildingFeatures || photo.isLoading) return;
    
    fetchBuildingForPhoto(selectedPhotoId);
  }, [selectedPhotoId, photoInfos, fetchBuildingForPhoto]);

  // Update loading state based on loading count
  useEffect(() => {
    setLoading(loadingCount > 0);
  }, [loadingCount]);

  // Create deck.gl layers for 3D buildings (only for selected photo)
  useEffect(() => {
    // Create layers based on selected photo
    const createLayers = () => {
      const newLayers: any[] = [];
      
      if (!selectedPhotoId) return newLayers;
      
      // Only display buildings for selected photo to improve performance
      const selectedPhoto = photoInfos.find(photo => photo.id === selectedPhotoId);
      
      if (selectedPhoto?.buildingFeatures && selectedPhoto.buildingFeatures.length > 0) {
        // Add a base GeoJSON layer for ground outlines
        const groundLayer = new GeoJsonLayer({
          id: `ground-layer`,
          data: {
            type: 'FeatureCollection',
            features: selectedPhoto.buildingFeatures
          },
          filled: true,
          stroked: true,
          lineWidthMinPixels: 1,
          getLineColor: [0, 0, 0, 255],
          getFillColor: [183, 244, 216, 150],
          getLineWidth: 1,
          pickable: true,
          updateTriggers: {
            getFillColor: [183, 244, 216, 150]
          }
        });
        newLayers.push(groundLayer);
        
        // Create extruded polygon layers for each building feature
        selectedPhoto.buildingFeatures.forEach((feature: any, index: number) => {
          if (!feature.properties) return;
          
          const baseHeight = feature.properties.absoluteheightminimum || 0;
          const roofBaseHeight = feature.properties.absoluteheightroofbase || 0;
          const maxHeight = feature.properties.absoluteheightmaximum || 0;
          
          // Base to roof base (Part A)
          if (roofBaseHeight > baseHeight && feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
            const partAData = {
              contour: feature.geometry.coordinates[0],
              baseHeight: baseHeight,
              height: roofBaseHeight - baseHeight,
              color: [249, 180, 45, 200],
              name: feature.properties.description || `Building ${index + 1}`,
              info: `Base to Roof Base: ${baseHeight}m to ${roofBaseHeight}m`
            };
            
            const partALayer = new PolygonLayer({
              id: `building-part-a-${index}`,
              data: [partAData],
              extruded: true,
              wireframe: true,
              getPolygon: (d: any) => d.contour,
              getFillColor: (d: any) => d.color,
              getLineColor: [0, 0, 0, 255],
              lineWidthMinPixels: 1,
              pickable: true,
              elevationScale: 1,
              getElevation: (d: any) => d.height,
              getPosition: (d: any) => [0, 0, d.baseHeight],
              updateTriggers: {
                getElevation: (d: any) => d.height,
                getPosition: (d: any) => [0, 0, d.baseHeight]
              }
            });
            newLayers.push(partALayer);
          }
          
          // Roof base to max height (Part B)
          if (maxHeight > roofBaseHeight && feature.geometry && feature.geometry.coordinates && feature.geometry.coordinates[0]) {
            const partBData = {
              contour: feature.geometry.coordinates[0],
              baseHeight: roofBaseHeight,
              height: maxHeight - roofBaseHeight,
              color: [66, 135, 245, 200],
              name: feature.properties.description || `Building ${index + 1}`,
              info: `Roof Base to Max: ${roofBaseHeight}m to ${maxHeight}m`
            };
            
            const partBLayer = new PolygonLayer({
              id: `building-part-b-${index}`,
              data: [partBData],
              extruded: true,
              wireframe: true,
              getPolygon: (d: any) => d.contour,
              getFillColor: (d: any) => d.color,
              getLineColor: [0, 0, 0, 255],
              lineWidthMinPixels: 1,
              pickable: true,
              elevationScale: 1,
              getElevation: (d: any) => d.height,
              getPosition: (d: any) => [0, 0, d.baseHeight],
              updateTriggers: {
                getElevation: (d: any) => d.height,
                getPosition: (d: any) => [0, 0, d.baseHeight]
              }
            });
            newLayers.push(partBLayer);
          }
        });
      }
      
      return newLayers;
    };
    
    // Update the view when selected photo changes
    if (selectedPhotoId) {
      const selectedPhoto = photoInfos.find(photo => photo.id === selectedPhotoId);
      
      if (selectedPhoto && map.current) {
        // If we have camera GPS data, use that for better positioning
        if (selectedPhoto.cameraGPSData && selectedPhoto.cameraGPSData.length > 0) {
          const camera = selectedPhoto.cameraGPSData[0];
          const bearing = camera.bearing || 0;
          
          // Update view state with camera position and bearing
          setViewState({
            longitude: selectedPhoto.lng,
            latitude: selectedPhoto.lat,
            zoom: 17.5,
            pitch: 45,
            bearing: bearing
          });
          
          // Fly to this location with proper bearing
          map.current.flyTo({
            center: [selectedPhoto.lng, selectedPhoto.lat],
            zoom: 17.5,
            pitch: 45,
            bearing: bearing,
            duration: 1000
          });
        }
      }
    }
    
    setLayers(createLayers());
  }, [photoInfos, selectedPhotoId, map]);

  // Initialize MapLibre map and add custom photo markers
  useEffect(() => {
    const initializeMap = () => {
      if (mapContainer.current && !map.current) {
        // Add PMTiles protocol
        const protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);
        const PMTILES_URL = 'https://pic2bim.co.uk/output.pmtiles'; // Use the PMTiles file in your public directory
        
        const mapInstance = new maplibregl.Map({
          style: 'https://tiles.openfreemap.org/styles/liberty',
          container: mapContainer.current,
          center: [viewState.longitude, viewState.latitude],
          zoom: viewState.zoom,
          pitch: viewState.pitch,
          bearing: viewState.bearing,
          maxPitch: 85,
          maxZoom: 20
        });
        
        map.current = mapInstance;
        
        mapInstance.on('load', () => {
          // Add terrain sources and setup
          mapInstance.addSource('terrainSource', {
            type: "raster-dem",
            url: "pmtiles://" + PMTILES_URL,
            tileSize: 256
          });
          
          mapInstance.addSource('hillshadeSource', {
            type: "raster-dem",
            url: "pmtiles://" + PMTILES_URL,
            tileSize: 256,
          });
          
          mapInstance.setTerrain({
            source: "terrainSource",
            exaggeration: 1
          });
          
          mapInstance.addLayer({
            id: 'hillshadeLayer',
            type: 'hillshade',
            source: 'terrainSource',
            paint: {
              'hillshade-shadow-color': '#000000', 
              'hillshade-highlight-color': '#ffffff',
              'hillshade-accent-color': '#888888'
            }
          });
          
          // Add navigation controls
          mapInstance.addControl(
            new maplibregl.NavigationControl({
              visualizePitch: true,
              showZoom: true,
              showCompass: true,
            })
          );
          
          // Add terrain control
          mapInstance.addControl(
            new maplibregl.TerrainControl({
              source: "terrainSource",
              exaggeration: 1
            })
          );
          
          // Add custom photo markers
          addPhotoMarkers();
        });

        // Debounce view state updates to improve performance
        const debouncedSetViewState = debounce(
          (newViewState: ViewState) => setViewState(newViewState),
          100
        );

        // Sync deck.gl viewState with maplibre
        mapInstance.on('move', () => {
          const { lng, lat } = mapInstance.getCenter();
          debouncedSetViewState({
            longitude: lng,
            latitude: lat,
            zoom: mapInstance.getZoom(),
            pitch: mapInstance.getPitch(),
            bearing: mapInstance.getBearing()
          });
        });
      }
    };
    
    initializeMap();
    
    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  // Add custom photo markers when photoInfos changes
  useEffect(() => {
    if (map.current && photoInfos.length > 0) {
      addPhotoMarkers();
    }
  }, [photoInfos, selectedPhotoId]); // Added selectedPhotoId as dependency to update marker style
  
  // Function to add photo markers to the map
  const addPhotoMarkers = () => {
    // Clear previous markers
    markerRef.current.forEach(marker => marker.remove());
    markerRef.current = [];
    
    // Add markers for each photo
    photoInfos.forEach(photo => {
      const markerElement = document.createElement('div');
      const root = createRoot(markerElement);
      
      // Render custom photo marker component
      root.render(
        <PhotoMarker 
          photo={photo} 
          onClick={(id) => handlePhotoSelect(id)} 
          isSelected={photo.id === selectedPhotoId} 
        />
      );
      
      // Create a clickable popup with photo info
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: 'photo-popup'
      }).setHTML(`
        <div style="text-align: center; padding: 5px;">
          <div style="font-weight: bold;">Photo ID: ${photo.id}</div>
          ${photo.buildingFeatures && photo.buildingFeatures.length > 0 ? 
            `<div style="color: green; font-size: 11px;">Buildings found</div>` : 
            photo.processed ? 
              `<div style="color: orange; font-size: 11px;">Processed, no buildings</div>` : 
              photo.error ? 
                `<div style="color: red; font-size: 11px;">Error: ${photo.error}</div>` :
                `<div style="font-size: 11px;">Click to process</div>`
          }
        </div>
      `);
      
      // Create and add marker to map with popup and click handler
      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'bottom',
        clickTolerance: 10 // Make it easier to click
      })
      .setLngLat([photo.lng, photo.lat])
      .setPopup(popup)
      .addTo(map.current!);
      
      // Make the entire marker clickable
      markerElement.style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => {
        // Close any open popups
        markerRef.current.forEach(m => m.getPopup().remove());
        // Open this marker's popup
        marker.togglePopup();
        // Handle the photo selection
        handlePhotoSelect(photo.id);
      });
      
      // Handle mouseover to show popup
      marker.getElement().addEventListener('mouseenter', () => {
        marker.getPopup().addTo(map.current!);
      });
      
      // Handle mouseout to hide popup if not the selected marker
      marker.getElement().addEventListener('mouseleave', () => {
        if (photo.id !== selectedPhotoId) {
          marker.getPopup().remove();
        }
      });
      
      // Store marker reference for cleanup
      markerRef.current.push(marker);
    });
  };

  // Handle photo selection and center map
  const handlePhotoSelect = (id: number) => {
    setSelectedPhotoId(id);
    
    // Get the selected photo
    const selectedPhoto = photoInfos.find(p => p.id === id);
    if (!selectedPhoto) return;
    
    // Load data for this photo if not loaded yet
    if (!selectedPhoto.buildingFeatures && !selectedPhoto.isLoading) {
      fetchBuildingForPhoto(id);
    }
    
    // Center map on selected photo
    if (map.current) {
      map.current.flyTo({
        center: [selectedPhoto.lng, selectedPhoto.lat],
        zoom: 17.5,
        duration: 1000
      });
    }
  };
  
  // Load building data for all photos with batching and progress updates
  const loadAllBuildingData = useCallback(() => {
    // Only consider photos that haven't been processed yet and aren't currently loading
    const photosToLoad = photoInfos.filter(
      photo => !photo.processed && !photo.isLoading
    );
    
    if (photosToLoad.length === 0) {
      setError("All photos have already been processed");
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    // Show notification
    setError(`Loading data for ${photosToLoad.length} photos...`);
    
    // Process photos in batches to avoid overwhelming the server
    // but still get some parallelism
    const BATCH_SIZE = 3; // Process 3 photos at a time
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches
    
    // Load data for photos in batches
    const loadInBatches = async () => {
      let processed = 0;
      const totalToProcess = photosToLoad.length;
      
      // Process photos in batches
      for (let i = 0; i < photosToLoad.length; i += BATCH_SIZE) {
        const batch = photosToLoad.slice(i, i + BATCH_SIZE);
        
        // Process this batch in parallel
        await Promise.allSettled(
          batch.map(photo => fetchBuildingForPhoto(photo.id))
        );
        
        processed += batch.length;
        
        // Update progress
        setError(`Processed ${processed}/${totalToProcess} photos...`);
        
        // Add delay between batches to avoid overwhelming the server
        if (i + BATCH_SIZE < photosToLoad.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
      
      setError("All photos processed successfully");
      setTimeout(() => setError(null), 3000);
    };
    
    loadInBatches();
  }, [photoInfos, fetchBuildingForPhoto]);

  const clearBuildingCache = useCallback(() => {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('bldg_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    setError("Building cache cleared");
    setTimeout(() => setError(null), 3000);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Get coordinates where the photo was dropped
    const mapArea = mapAreaRef.current;
    if (!mapArea || !map.current) return;
    
    // Get drop position relative to the map
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to map coordinates
    const point = map.current.unproject([x, y]);
    const lng = point.lng;
    const lat = point.lat;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        setError('Please drop an image file');
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      const tempId = Date.now(); // Use timestamp as temporary ID
      const heading = 0; // Default heading
      
      // Create URL for preview
      const photoUrl = URL.createObjectURL(file);
      
      // Add to photos array
      const newPhoto: PhotoInfo = {
        id: tempId,
        lat,
        lng,
        altitude: 0,
        heading,
        link: photoUrl,
        isLoading: false,
        processed: false
      };
      
      setPhotoInfos(prev => [...prev, newPhoto]);
      setSelectedPhotoId(tempId);
      
      // Optional: automatically fetch building data for this photo
      setTimeout(() => {
        fetchBuildingForPhoto(tempId);
      }, 500);
      
      setError(`Added new photo at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Building Attributes 3D Map</h2>}
    >
      <Head title="Building Attributes 3D Map" />
      
      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900 dark:text-gray-100">
              {loading && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <span className="mb-2">Loading building data...</span>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(photoInfos.filter(p => p.processed).length / photoInfos.length) * 100}%` }}></div>
                    </div>
                    <span className="text-xs mt-1">
                      {photoInfos.filter(p => p.processed).length} of {photoInfos.length} photos processed
                    </span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute top-4 right-4 z-10 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  <span>{error}</span>
                </div>
              )}
              
              <div 
                style={{ position: 'relative', width: '100%', height: '600px' }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                ref={mapAreaRef}
              >
                <div ref={mapContainer} style={{ width: '100%', height: '600px', position: 'absolute', top: 0, left: 0 }} />
                
                {isDragging && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(52, 152, 219, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ margin: 0 }}>Drop photo here</h3>
                      <p style={{ margin: '10px 0 0' }}>The photo will be added at the drop location</p>
                    </div>
                  </div>
                )}

                <DeckGL
                  initialViewState={viewState}
                  controller={true}
                  layers={layers}
                  getTooltip={({object}: any) => {
                    if (!object) return null;
                    
                    return {
                      html: `
                        <div>
                          <h3>${object.name || 'Building'}</h3>
                          <p>${object.info || ''}</p>
                        </div>
                      `,
                      style: {
                        backgroundColor: 'white',
                        color: 'black',
                        fontSize: '12px',
                        padding: '10px',
                        borderRadius: '4px'
                      }
                    };
                  }}
                  // @ts-ignore - DeckGL styling type issue
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  onViewStateChange={({viewState}: any) => {
                    const newViewState = viewState as ViewState;
                    // Using direct update here for smooth interaction
                    setViewState(newViewState);
                    if (map.current) {
                      map.current.jumpTo({
                        center: [newViewState.longitude, newViewState.latitude],
                        zoom: newViewState.zoom,
                        pitch: newViewState.pitch,
                        bearing: newViewState.bearing
                      });
                    }
                  }}
                />
                <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow">
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={loadAllBuildingData}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Load All Building Data
                    </button>
                    <button 
                      onClick={clearBuildingCache}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded text-sm"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow">
                  <p className="text-sm font-semibold text-blue-600">👆 Click on a photo to view its building</p>
                  <p className="text-sm text-gray-500 mt-1">Showing {photoInfos.length} photos</p>
                  <p className="text-sm text-gray-500">
                    Processed: {photoInfos.filter(p => p.processed).length}/{photoInfos.length} photos
                  </p>
                  <p className="text-sm text-gray-500">
                    Buildings found: {photoInfos.filter(p => p.buildingFeatures && p.buildingFeatures.length > 0).length} photos
                  </p>
                  {selectedPhotoId && (
                    <p className="text-sm text-gray-700 mt-1">Selected: Photo ID {selectedPhotoId}</p>
                  )}
                </div>
                
                {/* Add thumbnails of photos at bottom for easy selection */}
                <div className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow max-w-md overflow-x-auto flex gap-2">
                  {photoInfos.map(photo => (
                    <div 
                      key={photo.id}
                      onClick={() => handlePhotoSelect(photo.id)}
                      className={`cursor-pointer p-1 rounded transition-all ${photo.id === selectedPhotoId ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <div className="relative w-16 h-16 overflow-hidden rounded">
                        {photo.link ? (
                          <img 
                            src={photo.link} 
                            alt={`Thumbnail ${photo.id}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-xs">No image</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black bg-opacity-50 text-white">
                          {photo.id}
                        </div>
                        {photo.isLoading && (
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {photo.buildingFeatures && photo.buildingFeatures.length > 0 && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full" 
                               title="Building data loaded"></div>
                        )}
                        {photo.processed && photo.noBuildings && (
                          <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-500 rounded-full" 
                               title="No buildings found in this area"></div>
                        )}
                        {photo.error && (
                          <div 
                            className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center cursor-pointer" 
                            title={photo.error}
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchBuildingForPhoto(photo.id);
                            }}
                          >
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status legend */}
                <div className="absolute bottom-32 right-4 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow">
                  <div className="text-sm font-semibold mb-1">Status Legend:</div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs">Building found</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-xs">Processed, no buildings</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-xs">Error (click to retry)</span>
                  </div>
                </div>

                {/* Performance Metrics Panel */}
                {metrics.totalRequests > 0 && (
                  <div className="absolute top-4 right-32 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow">
                    <div className="text-xs font-semibold mb-1">Performance Metrics:</div>
                    <div className="text-xs">Requests: {metrics.totalRequests}</div>
                    <div className="text-xs">Success rate: {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%</div>
                    <div className="text-xs">Avg. load time: {metrics.averageLoadTime.toFixed(0)}ms</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}