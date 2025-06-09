import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';

// The MapLibre and deck.gl scripts will be loaded in the head of the document via CDN

const INITIAL_VIEW_STATE = {
  longitude: -0.7934,
  latitude: 51.2177,
  zoom: 20,
  pitch: 61,
  bearing: 11.5657
};

interface PhotoData {
  id: number;
  lat: string;
  lng: string;
  photo_heading: string;
  file_name: string;
  link: string;
}

interface NearestBuildingData {
  id: number;
  buildingPartId: string;
  distance: number;
  name?: string;
  geometry?: any;
  [key: string]: any; // Allow for additional properties
}

interface BuildingGeometryData {
  coordinates: any[];
  height: number;
  base: number;
}

interface Props extends PageProps {
  photos: any[];
}

const BuildingAttributesContent: React.FC<{ photos: any[] }> = ({ photos }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlay = useRef<any>(null);
  const [nearestBuildings, setNearestBuildings] = useState<Record<number, NearestBuildingData | null>>({});
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(true);
  const [buildingGeometries, setBuildingGeometries] = useState<Record<number, BuildingGeometryData>>({});

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
          link: photo.link
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
  
  // Fetch nearest buildings when component mounts
  useEffect(() => {
    if (photos.length > 0) {
      fetchAllNearestBuildings();
    }
  }, [photos]);

  useEffect(() => {
    // Load MapLibre, pmtiles, and deck.gl scripts dynamically
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

      // Load deck.gl
      if (!window.deck) {
        const deckglScript = document.createElement('script');
        deckglScript.src = 'https://unpkg.com/deck.gl@8.9.33/dist.min.js';
        deckglScript.async = true;
        document.head.appendChild(deckglScript);
        await new Promise<void>((resolve) => {
          deckglScript.onload = () => resolve();
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

  // Update the photos source when nearestBuildings data changes
  useEffect(() => {
    if (map.current && map.current.getSource('photos-source')) {
      const photosGeoJSON = createPhotosGeoJSON();
      map.current.getSource('photos-source').setData(photosGeoJSON);
    }
  }, [nearestBuildings]);
  
  // Update the building geometries source when buildingGeometries changes
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

  const initializeMap = () => {
    const maplibregl = window.maplibregl;
    const pmtiles = window.pmtiles;
    const deck = window.deck;

    if (!maplibregl || !pmtiles || !mapContainer.current || !deck) return;

    // Initialize the pmtiles protocol
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    const tilesURL = "https://pic2bim.co.uk/output.pmtiles";

    // Create the map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
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

    map.current.on('load', () => {
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

      // Load trail GeoJSON data - Making sure it's only rendered as a line
      fetch('assets/building-polygons.geojson')
        .then(response => response.json())
        .then(geojsonData => {
          const lineFeatures = {
            type: 'FeatureCollection',
            features: geojsonData.features.filter((feature: any) => 
              feature.geometry.type === 'LineString' || 
              feature.geometry.type === 'MultiLineString'
            )
          };

          map.current.addSource('line-source', {
            type: 'geojson',
            data: lineFeatures.features.length > 0 ? lineFeatures : geojsonData
          });

          map.current.addLayer({
            id: 'line-layer',
            type: 'line',
            source: 'line-source',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#ff0000',
              'line-width': 6
            },
            filter: ['any', 
              ['==', ['geometry-type'], 'LineString'],
              ['==', ['geometry-type'], 'MultiLineString']
            ]
          });
        })
        .catch(error => {
          console.error("Error loading GeoJSON:", error);
        });
        
      // Add building sources using the same GeoJSON but only for Polygon features
      fetch('assets/building-polygons.geojson')
        .then(response => response.json())
        .then(geojsonData => {
          // Filter to only include Polygon or MultiPolygon features
          const polygonFeatures = {
            type: 'FeatureCollection',
            features: geojsonData.features.filter((feature: any) => 
              feature.geometry.type === 'Polygon' || 
              feature.geometry.type === 'MultiPolygon'
            )
          };

          // Only add building source if we have polygon features
          if (polygonFeatures.features.length > 0) {
            // Add the GeoJSON source
            map.current.addSource('buildings-source', {
              type: 'geojson',
              data: polygonFeatures
            });

            // Add the 3D buildings layer
            map.current.addLayer({
              'id': '3d-buildings',
              'source': 'buildings-source',
              'type': 'fill-extrusion',
              'paint': {
                'fill-extrusion-color': '#ff8c00',
                'fill-extrusion-height': 10,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.8
              },
              filter: ['any', 
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
              ]
            });
          }
        })
        .catch(error => {
          console.error("Error loading building polygons:", error);
        });
      
      // Add a source for API building geometries
      map.current.addSource('api-buildings-source', {
        type: 'geojson',
        data: createBuildingGeometriesGeoJSON()
      });
      
      // Add a source for API roof geometries
      map.current.addSource('api-roofs-source', {
        type: 'geojson',
        data: createRoofGeometriesGeoJSON()
      });
      
      // Add a layer for API building geometries (ground to roof base)
      map.current.addLayer({
        'id': 'api-buildings',
        'source': 'api-buildings-source',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': '#FFEB3B',
          'fill-extrusion-height': ['get', 'base'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.7
        }
      });
      
      // Add a layer for API roof geometries (roof base to maximum height)
      map.current.addLayer({
        'id': 'api-roofs',
        'source': 'api-roofs-source',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': '#2196F3',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base'],
          'fill-extrusion-opacity': 0.7
        }
      });
      
      // Add photos to the map as markers with direction
      const photosGeoJSON = createPhotosGeoJSON();
      map.current.addSource('photos-source', {
        type: 'geojson',
        data: photosGeoJSON
      });
      
      // Add a layer to render the photo locations as circles
      map.current.addLayer({
        id: 'photos-layer',
        type: 'circle',
        source: 'photos-source',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'case',
            ['get', 'hasGeometry'], '#E91E63', // Pink
            ['!=', ['get', 'nearestBuildingId'], null], '#4CAF50', // Green
            '#3887be' // Default blue
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add click handler for the photos
      map.current.on('click', 'photos-layer', (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;
          const photoId = parseInt(properties.id);
          const photoUrl = properties.link;
          
          const description = `
            <div style="display: flex; align-items: center;">
              <img 
                src="${photoUrl}" 
                alt="Photo ${properties.id}"
                style="width: 80px; height: auto;"
              />
              <div style="margin-left: 10px; width: 200px;">
                <div style="font-size: 1rem; font-weight: bold; text-align: left;">
                  Photo ID: ${properties.id}
                </div>
                <div style="font-size: 10px; text-align: left; display: flex; align-items: center;">
                  <span style="margin-right: 4px;">📍</span>
                  ${feature.geometry.coordinates[1].toFixed(5)}, ${feature.geometry.coordinates[0].toFixed(5)}
                </div>
                <div style="font-size: 10px; text-align: left; display: flex; align-items: center;">
                  <span style="margin-right: 4px;">📅</span>
                  Heading: ${properties.heading}°
                </div>
              </div>
            </div>
          `;
          
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(description)
            .addTo(map.current);
        }
      });
      
      // Add click handler for API buildings
      map.current.on('click', 'api-buildings', (e: any) => {
        if (e.features && e.features.length > 0) {
          const properties = e.features[0].properties;
          const photoId = properties.photoId;
          const buildingId = properties.buildingId;
          const height = properties.height;
          const base = properties.base;
          
            const description = `
              <div>
              <p><strong>Building ID:</strong> ${buildingId}</p>
              <p><strong>Associated with Photo:</strong> ${photoId}</p>
              <p><strong>Total Height:</strong> ${height ? height.toFixed(2) + 'm' : 'Unknown'}</p>
              <p><strong>Roof Base:</strong> ${base ? base.toFixed(2) + 'm' : '0m'}</p>
              <p><strong>Roof Height:</strong> ${(height && base) ? (height - base).toFixed(2) + 'm' : 'Unknown'}</p>
              </div>
            `;
            
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
              .setHTML(description)
              .addTo(map.current);
          }
      });
      
      // Add click handler for API roofs (same as buildings)
      map.current.on('click', 'api-roofs', (e: any) => {
        if (e.features && e.features.length > 0) {
          const properties = e.features[0].properties;
          const photoId = properties.photoId;
          const buildingId = properties.buildingId;
          const height = properties.height;
          const base = properties.base;
          
          const description = `
            <div>
              <p><strong>Building ID:</strong> ${buildingId}</p>
              <p><strong>Associated with Photo:</strong> ${photoId}</p>
              <p><strong>Total Height:</strong> ${height ? height.toFixed(2) + 'm' : 'Unknown'}</p>
              <p><strong>Roof Base:</strong> ${base ? base.toFixed(2) + 'm' : '0m'}</p>
              <p><strong>Roof Height:</strong> ${(height && base) ? (height - base).toFixed(2) + 'm' : 'Unknown'}</p>
            </div>
          `;
          
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(description)
            .addTo(map.current);
        }
      });
      
      // Change cursor on hover over photos
      map.current.on('mouseenter', 'photos-layer', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'photos-layer', () => {
        map.current.getCanvas().style.cursor = '';
      });
      
      // Change cursor on hover over API buildings
      map.current.on('mouseenter', 'api-buildings', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'api-buildings', () => {
        map.current.getCanvas().style.cursor = '';
      });
      
      // Change cursor on hover over API roofs
      map.current.on('mouseenter', 'api-roofs', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      
      map.current.on('mouseleave', 'api-roofs', () => {
        map.current.getCanvas().style.cursor = '';
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
