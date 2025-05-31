import React, { useEffect, useRef, useState, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, Photo } from '@/types';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import { Protocol } from 'pmtiles';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';

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

interface HeightMeasurements {
  absoluteMax: number;
  absoluteRoofbase: number;
  absoluteMin: number;
  relativeMax: number;
  relativeRoofbase: number;
  roofHeight: number;
}

const ALTITUDE_CLASSIFICATION = {
  LOWLAND: { max: 200, factor: 1.0 },
  MIDLAND: { max: 500, factor: 1.2 },
  HIGHLAND: { min: 501, factor: 1.5 }
};

const getAltitudeFactor = (altitude: number) => {
  if (altitude <= ALTITUDE_CLASSIFICATION.LOWLAND.max) {
    return ALTITUDE_CLASSIFICATION.LOWLAND.factor;
  } else if (altitude <= ALTITUDE_CLASSIFICATION.MIDLAND.max) {
    return ALTITUDE_CLASSIFICATION.MIDLAND.factor;
  } else {
    return ALTITUDE_CLASSIFICATION.HIGHLAND.factor;
  }
};

const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const calculateHeightMeasurements = (feature: any): HeightMeasurements => {
  const absoluteMax = toNumber(feature.properties?.absoluteheightmaximum);
  const absoluteRoofbase = toNumber(feature.properties?.absoluteheightroofbase);
  const absoluteMin = toNumber(feature.properties?.absoluteheightminimum);
  
  const relativeMax = Math.max(0, absoluteMax - absoluteMin);
  const relativeRoofbase = Math.max(0, absoluteRoofbase - absoluteMin);
  const roofHeight = Math.max(0, absoluteMax - absoluteRoofbase);
  
  return {
    absoluteMax,
    absoluteRoofbase,
    absoluteMin,
    relativeMax,
    relativeRoofbase,
    roofHeight
  };
};

const simplifyPolygon = (coordinates: number[][], tolerance: number = 0.00001): number[][] => {
  if (coordinates.length <= 2) return coordinates;
  if (coordinates.length < 50) return coordinates;
  
  const findFurthestPoint = (start: number, end: number): { index: number, distance: number } => {
    let maxDistance = 0;
    let maxIndex = 0;
    
    const [x1, y1] = coordinates[start];
    const [x2, y2] = coordinates[end];
    
    const a = y2 - y1;
    const b = x1 - x2;
    const c = x2 * y1 - x1 * y2;
    const lineLengthSq = a * a + b * b;
    
    if (lineLengthSq < 1e-10) return { index: start, distance: 0 };
    
    for (let i = start + 1; i < end; i++) {
      const [x, y] = coordinates[i];
      const distance = Math.abs(a * x + b * y + c) / Math.sqrt(lineLengthSq);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    return { index: maxIndex, distance: maxDistance };
  };
  
  const simplifySegment = (start: number, end: number, result: Set<number>) => {
    if (end - start <= 1) return;
    
    const { index, distance } = findFurthestPoint(start, end);
    
    if (distance > tolerance) {
      if (index - start > 1) simplifySegment(start, index, result);
      result.add(index);
      if (end - index > 1) simplifySegment(index, end, result);
    }
  };
  
  const pointSet = new Set<number>([0, coordinates.length - 1]);
  
  if (coordinates.length > 1000) {
    const step = Math.max(1, Math.floor(coordinates.length / 500));
    for (let i = 0; i < coordinates.length; i += step) {
      pointSet.add(i);
    }
  } else {
    simplifySegment(0, coordinates.length - 1, pointSet);
  }
  
  return Array.from(pointSet)
    .sort((a, b) => a - b)
    .map(index => coordinates[index]);
};

interface PhotoMarkerProps {
  photo: PhotoInfo;
  onClick: (id: number) => void;
  isSelected: boolean;
}

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

const BuildingAttributes = ({ auth, photos }: PageProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
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
  const markerRef = useRef<maplibregl.Marker[]>([]);

  const fetchBuilding = async (lat: number, lon: number, camDirection: number, camAltitude: number = 0, retryCount = 0) => {
    let lng = lon;
    if (lng > 0) lng = -Math.abs(lng);

    const cacheKey = `bldg_${lat.toFixed(6)}_${lng.toFixed(6)}_${camDirection.toFixed(1)}`;
    
    const cachedResult = sessionStorage.getItem(cacheKey);
    if (cachedResult) {
      try {
        const parsed = JSON.parse(cachedResult);
        return parsed;
      } catch (e) {
        console.error("Failed to parse cached data:", e);
        sessionStorage.removeItem(cacheKey);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        `/comm_building_part_nearest?latitude=${lat}&longitude=${lng}&imagedirection=${camDirection}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();

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
      
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        console.warn("Failed to cache building data:", e);
      }
      
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      
      if ((err as Error).name === 'AbortError') {
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchBuilding(lat, lon, camDirection, camAltitude, retryCount + 1);
        }
      }
      throw err;
    }
  };

  const getCachedElevation = (lng: number, lat: number): number | null => {
    const cacheKey = `elev_${lng.toFixed(6)}_${lat.toFixed(6)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }
    return null;
  };
  
  const setCachedElevation = (lng: number, lat: number, elevation: number) => {
    const cacheKey = `elev_${lng.toFixed(6)}_${lat.toFixed(6)}`;
    sessionStorage.setItem(cacheKey, elevation.toString());
  };

  const fetchBuildingForPhoto = useCallback(async (photoId: number) => {
    const photoIndex = photoInfos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) return;
    
    const photo = photoInfos[photoIndex];
    if (photo.buildingFeatures || photo.isLoading) return;
    
    const startTime = performance.now();
    
    try {
      setPhotoInfos(prev => {
        const updated = [...prev];
        updated[photoIndex] = { ...updated[photoIndex], isLoading: true, error: undefined };
        return updated;
      });
      
      setLoadingCount(prev => prev + 1);
      
      const data = await fetchBuilding(
        photo.lat,
        photo.lng,
        photo.heading,
        photo.altitude
      );
      
      const loadTime = performance.now() - startTime;
      
      const features: any[] = [];
      
      if (data.geojson.features && Array.isArray(data.geojson.features)) {
        data.geojson.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.coordinates) {
            let processedCoordinates = feature.geometry.coordinates;
            if (feature.geometry.type === 'Polygon') {
              const coordCount = feature.geometry.coordinates.reduce(
                (sum: number, ring: number[][]) => sum + ring.length, 0
              );
              
              if (coordCount > 100) {
                processedCoordinates = feature.geometry.coordinates.map(
                  (ring: number[][]) => simplifyPolygon(ring, 0.00001)
                );
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
      
      setPhotoInfos(prev => {
        const updated = [...prev];
        updated[photoIndex] = {
          ...updated[photoIndex],
          buildingFeatures: features,
          isLoading: false,
          cameraGPSData: data.cameraGPSData,
          error: undefined,
          noBuildings: features.length === 0,
          processed: true
        };
        return updated;
      });
      
      if (features.length > 0) {
        console.log(`Loaded ${features.length} building features for photo ${photo.id} in ${loadTime.toFixed(0)}ms`);
      }
    } catch (err) {
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
    } finally {
      setLoadingCount(prev => prev - 1);
    }
  }, [photoInfos]);

  useEffect(() => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      setError('No photos available');
      return;
    }

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
    
    if (photoInfosArray.length > 0) {
      setViewState({
        ...viewState,
        longitude: photoInfosArray[0].lng,
        latitude: photoInfosArray[0].lat
      });
      
      setSelectedPhotoId(photoInfosArray[0].id);
    }
  }, [photos]);

  useEffect(() => {
    if (selectedPhotoId === null) return;
    
    const photo = photoInfos.find(p => p.id === selectedPhotoId);
    if (!photo || photo.buildingFeatures || photo.isLoading) return;
    
    fetchBuildingForPhoto(selectedPhotoId);
  }, [selectedPhotoId, photoInfos, fetchBuildingForPhoto]);

  useEffect(() => {
    setLoading(loadingCount > 0);
  }, [loadingCount]);

  useEffect(() => {
    const createLayers = () => {
      const newLayers: any[] = [];
      
      if (!selectedPhotoId) return newLayers;
      
      const selectedPhoto = photoInfos.find(photo => photo.id === selectedPhotoId);
      
      if (selectedPhoto?.buildingFeatures && selectedPhoto.buildingFeatures.length > 0) {
        const altitude = selectedPhoto.altitude || 0;
        const altitudeFactor = getAltitudeFactor(altitude);
        
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
        
        selectedPhoto.buildingFeatures.forEach((feature: any, index: number) => {
          if (!feature.properties) return;
          
          const heights = calculateHeightMeasurements(feature);
          
          const baseExtrusion = heights.relativeRoofbase * altitudeFactor;
          const roofExtrusion = heights.roofHeight * altitudeFactor;
          
          const buildingDataCopy = [...feature.geometry.coordinates[0]];
          
          if (heights.relativeRoofbase > 0) {
            const baseCoords = buildingDataCopy.map((item: any) => {
              const [lng, lat] = item;

              let elevation = getCachedElevation(lng, lat);
              
              if (elevation === null) {
                let retryCount = 0;
                const maxRetries = 5;
                
                const getElevation = () => {
                  const lngLat = new (window as any).maplibregl.LngLat(lng, lat);
                  elevation = map.current.queryTerrainElevation(lngLat) || 0;
                  if (elevation === 0 && retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(getElevation, 500);
                  } else {
                    if (elevation !== 0 && elevation !== null) {
                      setCachedElevation(lng, lat, elevation);
                    }
                  }
                };
                
                getElevation();
              }

              const finalElevation = heights.absoluteMin - (elevation || 0);
              return [lng, lat, finalElevation];
            });

            const partAData = {
              contour: baseCoords,
              height: baseExtrusion,
              color: [249, 180, 45, 200],
              name: feature.properties.description || `Building ${index + 1}`,
              info: `
                Base to Roof Base: ${heights.absoluteMin.toFixed(2)}m to ${heights.absoluteRoofbase.toFixed(2)}m
                Relative Height: ${heights.relativeRoofbase.toFixed(2)}m
              `
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
              getPosition: (d: any) => [0, 0, 0],
              updateTriggers: {
                getElevation: (d: any) => d.height,
                getPosition: (d: any) => [0, 0, 0]
              }
            });
            newLayers.push(partALayer);
          }
          
          if (heights.roofHeight > 0) {
            const roofCoords = buildingDataCopy.map((item: any) => {
              const [lng, lat] = item;
              let elevation = getCachedElevation(lng, lat);
              
              if (elevation === null) {
                let retryCount = 0;
                const maxRetries = 3;
                
                const getElevation = () => {
                  elevation = map.current?.queryTerrainElevation?.([lng, lat]) || 0;
                  if (elevation === 0 && retryCount < maxRetries) {
                    retryCount++;
                    setTimeout(getElevation, 500);
                  } else {
                    if (elevation !== 0 && elevation !== null) {
                      setCachedElevation(lng, lat, elevation);
                    }
                  }
                };
                
                getElevation();
              }

              const finalElevation = heights.absoluteRoofbase - (elevation || 0);

              return [lng, lat, finalElevation];
            });
            
            const partBData = {
              contour: roofCoords,
              baseHeight: baseExtrusion,
              height: roofExtrusion,
              color: [66, 135, 245, 200],
              name: feature.properties.description || `Building ${index + 1}`,
              info: `
                Roof Base to Max: ${heights.absoluteRoofbase.toFixed(2)}m to ${heights.absoluteMax.toFixed(2)}m
                Roof Height: ${heights.roofHeight.toFixed(2)}m
              `
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
    
    if (selectedPhotoId) {
      const selectedPhoto = photoInfos.find(photo => photo.id === selectedPhotoId);
      
      if (selectedPhoto && map.current) {
        if (selectedPhoto.cameraGPSData && selectedPhoto.cameraGPSData.length > 0) {
          const camera = selectedPhoto.cameraGPSData[0];
          const bearing = camera.bearing || 0;
          
          setViewState({
            longitude: selectedPhoto.lng,
            latitude: selectedPhoto.lat,
            zoom: 17.5,
            pitch: 45,
            bearing: bearing
          });
          
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

  const handlePhotoSelect = (id: number) => {
    setSelectedPhotoId(id);
    
    const selectedPhoto = photoInfos.find(p => p.id === id);
    if (!selectedPhoto) return;
    
    if (!selectedPhoto.buildingFeatures && !selectedPhoto.isLoading) {
      fetchBuildingForPhoto(id);
    }
    
    if (map.current) {
      map.current.flyTo({
        center: [selectedPhoto.lng, selectedPhoto.lat],
        zoom: 17.5,
        duration: 1000
      });
    }
  };

  useEffect(() => {
    const loadScripts = async () => {
      if (typeof window.maplibregl === 'undefined') {
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.css';
        linkElement.crossOrigin = 'anonymous';
        document.head.appendChild(linkElement);

        const maplibreScript = document.createElement('script');
        maplibreScript.src = 'https://unpkg.com/maplibre-gl@5.0.0/dist/maplibre-gl.js';
        maplibreScript.crossOrigin = 'anonymous';
        document.head.appendChild(maplibreScript);

        const pmtilesScript = document.createElement('script');
        pmtilesScript.src = 'https://unpkg.com/pmtiles@4.1.0/dist/pmtiles.js';
        document.head.appendChild(pmtilesScript);

        await new Promise((resolve) => {
          let scriptsLoaded = 0;
          const checkLoaded = () => {
            scriptsLoaded++;
            if (scriptsLoaded === 2) resolve(true);
          };
          maplibreScript.onload = checkLoaded;
          pmtilesScript.onload = checkLoaded;
        });
      }

      initializeMap();
    };

    const initializeMap = () => {
      const { maplibregl, pmtiles } = window as any;
      
      if (map.current || !mapContainer.current) return;

      let protocol = new pmtiles.Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      let URL = "https://pic2bim.co.uk/output.pmtiles";

      map.current = new maplibregl.Map({
        style: 'https://tiles.openfreemap.org/styles/liberty',
        container: mapContainer.current,
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        pitch: viewState.pitch,
        bearing: viewState.bearing,
        maxPitch: 85,
        maxZoom: 20,
        projection: 'mercator'
      });

      map.current.on('load', () => {
        map.current.addSource('terrainSource', {
          type: "raster-dem",
          url: "pmtiles://" + URL,
          tileSize: 256
        });

        map.current.addSource('hillshadeSource', {
          type: "raster-dem",
          url: "pmtiles://" + URL,
          tileSize: 256,
        });

        map.current.setTerrain({
          source: "terrainSource",
          exaggeration: 1
        });

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

        map.current.on('sourcedata', (e: any) => {
          if (e.sourceId === 'terrainSource' && e.isSourceLoaded) {
            setLayers(prevLayers => [...prevLayers]);
          }
        });

      });

      map.current.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showZoom: true,
          showCompass: true,
        })
      );

      map.current.addControl(
        new maplibregl.TerrainControl({
          source: "terrainSource",
          exaggeration: 1
        })
      );
    };

    loadScripts();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [viewState]);

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Building Attributes 3D Map</h2>}
    >
      <div className="w-full h-screen relative">
        <div 
          ref={mapContainer} 
          className="absolute top-0 bottom-0 w-full"
          style={{ height: '100vh' }}
        />
        
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
          onClick={({x, y, coordinate}) => {
            if (map.current && coordinate) {
              const popups = document.getElementsByClassName('maplibregl-popup');
              while (popups[0]) {
                popups[0].remove();
              }

              const elevation = map.current.queryTerrainElevation(coordinate);
              if (elevation !== null) {
                const popup = new (window as any).maplibregl.Popup({
                  closeButton: true,
                  closeOnClick: false,
                  maxWidth: '300px',
                  className: 'elevation-popup'
                })
                  .setLngLat([coordinate[0], coordinate[1]])
                  .setHTML(`
                    <div style="
                      background: white;
                      padding: 10px;
                      border-radius: 4px;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">
                      <h3 style="margin: 0 0 10px 0; font-size: 16px;">Elevation Information</h3>
                      <p style="margin: 5px 0; font-size: 14px;">Elevation: ${Math.round(elevation)} meters</p>
                      <p style="margin: 5px 0; font-size: 14px;">Coordinates: ${coordinate[0].toFixed(4)}, ${coordinate[1].toFixed(4)}</p>
                    </div>
                  `)
                  .addTo(map.current);

                const style = document.createElement('style');
                style.textContent = `
                  .elevation-popup {
                    z-index: 1000 !important;
                  }
                  .maplibregl-popup-content {
                    background: white !important;
                    border-radius: 4px !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                  }
                `;
                document.head.appendChild(style);
              }
            }
          }}
          style={{ 
            position: 'absolute', 
            top: '0', 
            left: '0', 
            width: '100%', 
            height: '100%'
          }}
          onViewStateChange={({viewState}: any) => {
            const newViewState = viewState as ViewState;
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
      </div>
    </AuthenticatedLayout>
  );
};

export default BuildingAttributes;