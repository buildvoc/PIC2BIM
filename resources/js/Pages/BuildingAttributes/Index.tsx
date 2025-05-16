import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import axios from 'axios';
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

interface UnassignedResponse {
  status: string;
  error_msg: string | null;
  photos_ids: number[];
}

interface PhotoResponse {
  status: string;
  error_msg: string | null;
  photo: {
    id: number;
    lat: string | number;
    lng: string | number;
    altitude: string | number;
    photo_heading: string | number;
    link?: string;
    [key: string]: any;
  };
}

interface BuildingPartResponse {
  success: boolean;
  http_code: number;
  data: {
    building_part: Array<{
      geojson: {
        type: string;
        features: Array<{
          type: string;
          id: string;
          geometry: {
            type: string;
            coordinates: number[][][];
          };
          properties: {
            TOID: string;
            absoluteheightminimum?: number;
            absoluteheightroofbase?: number;
            absoluteheightmaximum?: number;
            [key: string]: any;
          };
        }>;
      };
    }>;
  };
}

interface PhotoInfo {
  id: number;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  link?: string;
  buildingFeatures?: any[];
}

interface PhotoMarkerProps {
  photo: PhotoInfo;
  onClick: (id: number) => void;
}

// Custom Photo Marker Component
const PhotoMarker: React.FC<PhotoMarkerProps> = ({ photo, onClick }) => {
  return (
    <div style={{ cursor: 'pointer' }} onClick={() => onClick(photo.id)}>
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <div style={{ position: 'absolute', top: '5px', width: '100%', textAlign: 'center', fontSize: '10px', color: '#333', fontWeight: 'bold' }}>
          Photo ID: {photo.id}
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
            backgroundColor: 'rgb(45 50 66)'
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

export default function Index({ auth }: PageProps) {
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

  useEffect(() => {
    const fetchPhotoData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Fetch unassigned photos
        const unassignedResponse = await axios.post<UnassignedResponse>('/comm_unassigned', {
          user_id: auth.user.id
        });
        
        console.log("unassignedResponse",unassignedResponse);
        if (!unassignedResponse.data || !unassignedResponse.data.photos_ids || !unassignedResponse.data.photos_ids.length) {
          throw new Error('No unassigned photos found');
        }
        
        const photoIds = unassignedResponse.data.photos_ids;
        const photoInfosArray: PhotoInfo[] = [];
        
        // Step 2: Fetch data for each photo
        for (const photoId of photoIds.slice(0, 5)) { // Limit to 5 photos to avoid too many requests
          try {
            const photoResponse = await axios.post<PhotoResponse>('/comm_get_photo', {
              photo_id: photoId
            });
            
            if (photoResponse.data && photoResponse.data.status === 'ok' && photoResponse.data.photo) {
              const photo = photoResponse.data.photo;
              console.log("sas",photo);
              if (photo.lat && photo.lng) {
                photoInfosArray.push({
                  id: photo.id || photoId,
                  lat: typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat,
                  lng: typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng,
                  altitude: typeof photo.altitude === 'string' ? parseFloat(photo.altitude || '0') : (photo.altitude || 0),
                  heading: typeof photo.photo_heading === 'string' ? parseFloat(photo.photo_heading || '0') : (photo.photo_heading || 0),
                  link: photo.link || undefined
                });
              }
            }
          } catch (photoErr) {
            console.error(`Error fetching photo ${photoId}:`, photoErr);
          }
        }
        
        if (photoInfosArray.length === 0) {
          throw new Error('No valid photos found');
        }
        
        // Update state with photo infos
        setPhotoInfos(photoInfosArray);
        
        // If we have photos, update view state to center on the first photo
        if (photoInfosArray.length > 0) {
          setViewState({
            ...viewState,
            longitude: photoInfosArray[0].lng,
            latitude: photoInfosArray[0].lat
          });
          
          // Auto-select the first photo to display its buildings
          setSelectedPhotoId(photoInfosArray[0].id);
        }
        
      } catch (err) {
        console.error('Error fetching photo data:', err);
        setError('Failed to fetch photo data');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotoData();
  }, []);

  useEffect(() => {
    // Fetch building data for all photos, not just the selected one
    const fetchBuildingDataForPhotos = async () => {
      setLoading(true);
      try {
        const updatedPhotoInfos = [...photoInfos];
        let anyUpdates = false;
        
        for (let i = 0; i < updatedPhotoInfos.length; i++) {
          const photoInfo = updatedPhotoInfos[i];
          if (!photoInfo || photoInfo.buildingFeatures) continue;
          
          try {
            const response = await axios.get<BuildingPartResponse>('/comm_building_part_nearest', {
              params: {
                latitude: photoInfo.lat,
                longitude: photoInfo.lng,
                imagedirection: photoInfo.heading
              }
            });
            
            console.log(`Building part response for photo ${photoInfo.id}:`, response.data);
            
            if (response.data && response.data.success && response.data.data.building_part) {
              const buildingParts = response.data.data.building_part;
              const features: any[] = [];
              
              // Process building parts - new structure
              buildingParts.forEach(part => {
                try {
                  if (part.geojson && part.geojson.features) {
                    part.geojson.features.forEach(feature => {
                      if (feature.geometry && feature.geometry.coordinates) {
                        features.push({
                          type: 'Feature',
                          properties: {
                            ...feature.properties,
                            absoluteheightminimum: feature.properties.absoluteheightminimum || 0,
                            absoluteheightroofbase: feature.properties.absoluteheightroofbase || 0,
                            absoluteheightmaximum: feature.properties.absoluteheightmaximum || 0,
                            description: feature.properties.description || 'Building'
                          },
                          geometry: feature.geometry
                        });
                      }
                    });
                  }
                } catch (e) {
                  console.error('Error parsing building geometry:', e);
                }
              });
              
              if (features.length > 0) {
                updatedPhotoInfos[i] = {
                  ...photoInfo,
                  buildingFeatures: features
                };
                anyUpdates = true;
              }
            }
          } catch (err) {
            console.error(`Error fetching building data for photo ${photoInfo.id}:`, err);
          }
        }
        
        if (anyUpdates) {
          setPhotoInfos(updatedPhotoInfos);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (photoInfos.length > 0) {
      fetchBuildingDataForPhotos();
    }
  }, [photoInfos.length]); // Only re-run when the number of photos changes

  // Create deck.gl layers for 3D buildings
  useEffect(() => {
    // Create layers based on photos and buildings
    const createLayers = () => {
      const newLayers: any[] = [];
      
      // Display buildings for all photos, not just selected one
      photoInfos.forEach((photo, photoIndex) => {
        if (photo?.buildingFeatures && photo.buildingFeatures.length > 0) {
          // Add a base GeoJSON layer for ground outlines
          const groundLayer = new GeoJsonLayer({
            id: `ground-layer-${photoIndex}`,
            data: {
              type: 'FeatureCollection',
              features: photo.buildingFeatures
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
          photo.buildingFeatures.forEach((feature: any, index: number) => {
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
                id: `building-part-a-${photoIndex}-${index}`,
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
                id: `building-part-b-${photoIndex}-${index}`,
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
      });
      
      setLayers(newLayers);
    };
    
    createLayers();
  }, [photoInfos, selectedPhotoId]);

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
          
          // Add terrain control - this is what was missing
          mapInstance.addControl(
            new maplibregl.TerrainControl({
              source: "terrainSource",
              exaggeration: 1
            })
          );
          
          // Add custom photo markers
          addPhotoMarkers();
        });

        // Sync deck.gl viewState with maplibre
        mapInstance.on('move', () => {
          const { lng, lat } = mapInstance.getCenter();
          setViewState({
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
  }, [photoInfos]);
  
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
          onClick={(id) => setSelectedPhotoId(id)} 
        />
      );
      
      // Create and add marker to map
      const marker = new maplibregl.Marker(markerElement)
        .setLngLat([photo.lng, photo.lat])
        .addTo(map.current!);
      
      // Store marker reference for cleanup
      markerRef.current.push(marker);
    });
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
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2">Loading data...</span>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute top-4 right-4 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <span>{error}</span>
                </div>
              )}
              
              <div style={{ position: 'relative', width: '100%', height: '600px' }}>
                <div ref={mapContainer} style={{ width: '100%', height: '600px', position: 'absolute', top: 0, left: 0 }} />
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
                <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 p-2 rounded shadow">
                  <p className="text-sm">Building information is displayed automatically</p>
                  <p className="text-sm text-gray-500 mt-1">Found {photoInfos.length} unassigned photos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}