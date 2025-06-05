import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';

// We need to import CSS in the component since this is React
// The MapLibre and deck.gl scripts will be loaded in the head of the document via CDN

const INITIAL_VIEW_STATE = {
  longitude: -0.795,
  latitude: 51.217,
  zoom: 17,
  pitch: 45,
  bearing: 0
};

const BuildingAttributesContent: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [showLayer, setShowLayer] = useState<boolean>(true);
  const overlay = useRef<any>(null);
  
  // Define sampleData at component level so it can be accessed by all functions
  const sampleData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Building 1',
          height: 10,
          color: [255, 140, 0]
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-0.794810388, 51.217510695],
            [-0.794820488, 51.217518395],
            [-0.794824188, 51.217521895],
            [-0.794881288, 51.217576495],
            [-0.794898588, 51.217569995],
            [-0.794881888, 51.217551795],
            [-0.794894188, 51.217547495],
            [-0.794898588, 51.217543895],
            [-0.794901588, 51.217539395],
            [-0.794904588, 51.217534095],
            [-0.794905388, 51.217529095],
            [-0.794903388, 51.217523295],
            [-0.794900688, 51.217517395],
            [-0.794895788, 51.217512795],
            [-0.794879588, 51.217501895],
            [-0.794971788, 51.217454695],
            [-0.794987888, 51.217468395],
            [-0.795011088, 51.217457795],
            [-0.795028588, 51.217471995],
            [-0.795090288, 51.217440195],
            [-0.795096588, 51.217446095],
            [-0.795161288, 51.217420395],
            [-0.795170388, 51.217416795],
            [-0.795075388, 51.217325895],
            [-0.794984888, 51.217362695],
            [-0.794993888, 51.217374895],
            [-0.794960488, 51.217392595],
            [-0.794899288, 51.217350595],
            [-0.794720088, 51.217442695],
            [-0.794810388, 51.217510695]
          ]]
        }
      }
    ]
  };

  useEffect(() => {
    // Load MapLibre and deck.gl scripts dynamically
    const loadScripts = async () => {
      // Load MapLibre CSS
      if (!document.querySelector('link[href*="maplibre-gl.css"]')) {
        const maplibreCSS = document.createElement('link');
        maplibreCSS.rel = 'stylesheet';
        maplibreCSS.href = 'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css';
        document.head.appendChild(maplibreCSS);
      }

      // Load MapLibre JS
      if (!window.maplibregl) {
        const maplibreScript = document.createElement('script');
        maplibreScript.src = 'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js';
        maplibreScript.async = true;
        document.head.appendChild(maplibreScript);
        await new Promise<void>((resolve) => {
          maplibreScript.onload = () => resolve();
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

  const initializeMap = () => {
    const maplibregl = window.maplibregl;
    const deck = window.deck;

    if (!maplibregl || !deck || !mapContainer.current) return;

    // Use OpenStreetMap style instead of the Clockwork Micro API that's failing
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add the overlay as a control
    const initializeOverlay = () => {
      // Create lighting effects for 3D
      const ambientLight = new deck.AmbientLight({
        color: [255, 255, 255],
        intensity: 1.0
      });

      const pointLight = new deck.PointLight({
        color: [255, 255, 255],
        intensity: 2.0,
        position: [-0.8, 51.21, 10000]
      });

      const lightingEffect = new deck.LightingEffect({ ambientLight, pointLight });

      // Create a GeoJsonLayer for the building
      const layer = new deck.GeoJsonLayer({
        id: 'geojson-building-layer',
        data: sampleData,
        filled: true,
        extruded: true,
        wireframe: true,
        getLineColor: [0, 0, 0, 200],
        getFillColor: (d: any) => d.properties.color,
        getElevation: (d: any) => d.properties.height,
        pickable: true,
        lineWidthMinPixels: 1,
        onClick: (info: any) => {
          if (info.object && map.current) {
            const { properties } = info.object;
            const description = `
              <div>
                <p><strong>Name:</strong> ${properties.name}</p>
                <p><strong>Height:</strong> ${properties.height}m</p>
              </div>
            `;
            
            new maplibregl.Popup()
              .setLngLat(info.coordinate)
              .setHTML(description)
              .addTo(map.current);
          }
        }
      });

      // Create the overlay with lighting effects
      overlay.current = new deck.MapboxOverlay({
        layers: [layer],
        effects: [lightingEffect]
      });

      map.current.addControl(overlay.current);
    };

    map.current.on('load', () => {
      // Add the overlay
      initializeOverlay();
    });
  };

  const toggleLayer = () => {
    if (!map.current || !window.deck) return;

    if (showLayer) {
      map.current.removeControl(overlay.current);
    } else {
      const deck = window.deck;
      
      // Create lighting effects for 3D
      const ambientLight = new deck.AmbientLight({
        color: [255, 255, 255],
        intensity: 1.0
      });

      const pointLight = new deck.PointLight({
        color: [255, 255, 255],
        intensity: 2.0,
        position: [-0.8, 51.21, 10000]
      });

      const lightingEffect = new deck.LightingEffect({ ambientLight, pointLight });

      // Create a GeoJsonLayer for the building
      const layer = new deck.GeoJsonLayer({
        id: 'geojson-building-layer',
        data: sampleData,
        filled: true,
        extruded: true,
        wireframe: true,
        getLineColor: [0, 0, 0, 200],
        getFillColor: (d: any) => d.properties.color,
        getElevation: (d: any) => d.properties.height,
        pickable: true,
        lineWidthMinPixels: 1,
        onClick: (info: any) => {
          if (info.object && map.current) {
            const { properties } = info.object;
            const description = `
              <div>
                <p><strong>Name:</strong> ${properties.name}</p>
                <p><strong>Height:</strong> ${properties.height}m</p>
              </div>
            `;
            
            new window.maplibregl.Popup()
              .setLngLat(info.coordinate)
              .setHTML(description)
              .addTo(map.current);
          }
        }
      });

      // Create the overlay with lighting effects
      overlay.current = new deck.MapboxOverlay({
        layers: [layer],
        effects: [lightingEffect]
      });

      map.current.addControl(overlay.current);
    }

    setShowLayer(!showLayer);
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <div ref={mapContainer} id="map" className="w-full h-full"></div>
      <button 
        className="fixed top-20 left-5 bg-purple-700 text-amber-50 text-lg min-w-[70px] rounded px-3 py-1 transition-all hover:scale-110 hover:shadow-lg z-10"
        onClick={toggleLayer}
      >
        {showLayer ? 'Hide' : 'Show'}
      </button>
    </div>
  );
};

export default function Index({ auth }: PageProps) {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Building Attributes V2</h2>}
    >
      <Head title="Building Attributes V2" />
      <BuildingAttributesContent />
    </AuthenticatedLayout>
  );
}

// Add TypeScript declarations for the global window object
declare global {
  interface Window {
    maplibregl: any;
    deck: any;
  }
}
