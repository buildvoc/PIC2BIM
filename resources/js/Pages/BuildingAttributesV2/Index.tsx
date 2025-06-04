import React, { useState, useRef } from 'react';
import Map, { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, PointLight } from '@deck.gl/core';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';

const MAPLIBRE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const SAMPLE_DATA: any = {
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

// Create lighting effect for the 3D buildings
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 2.0,
  position: [-0.8, 51.21, 10000]
});

const lightingEffect = new LightingEffect({ ambientLight, pointLight });

const INITIAL_VIEW_STATE = {
  longitude: -0.795,
  latitude: 51.217,
  zoom: 17,
  pitch: 45,
  bearing: 0
};

function MapContent() {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [showExtrudedBuildings, setShowExtrudedBuildings] = useState(false);

  // Create layer with non-extruded polygons
  const flatLayer = new GeoJsonLayer({
    id: 'geojson-flat-layer',
    data: SAMPLE_DATA,
    filled: true,
    getLineColor: [0, 0, 0, 200],
    getFillColor: (d: any) => d.properties.color,
    pickable: true,
    lineWidthMinPixels: 1
  });

  // Create layer with extruded polygons
  const extrudedLayer = new GeoJsonLayer({
    id: 'geojson-extruded-layer',
    data: SAMPLE_DATA,
    filled: true,
    extruded: true,
    wireframe: true,
    getLineColor: [0, 0, 0, 200],
    getFillColor: (d: any) => d.properties.color,
    getElevation: (d: any) => d.properties.height,
    pickable: true,
    lineWidthMinPixels: 1
  });

  // Choose which layers to render based on the toggle state
  const layers = showExtrudedBuildings ? [extrudedLayer] : [flatLayer];

  return (
    <div className="relative w-full h-[calc(100vh-64px)]">
      <div className="absolute top-4 right-4 z-10 bg-white p-2 rounded shadow">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showExtrudedBuildings}
            onChange={() => setShowExtrudedBuildings(!showExtrudedBuildings)}
          />
          <span>Show 3D Buildings</span>
        </label>
      </div>
      
      <DeckGL
        layers={layers}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        effects={[lightingEffect]}
      >
        <Map
          ref={mapRef}
          mapStyle={MAPLIBRE_STYLE}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
        />
      </DeckGL>
    </div>
  );
}

export default function Index({ auth }: PageProps) {
  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Building Attributes</h2>}
    >
      <Head title="Building Attributes" />
      <MapContent />
    </AuthenticatedLayout>
  );
}
