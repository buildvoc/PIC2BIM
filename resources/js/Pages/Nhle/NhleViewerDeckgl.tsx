import { useRef, useEffect, useState, memo, useCallback } from "react";
import axios from "axios";
import { DeckGL } from '@deck.gl/react';
import { IconLayer, GeoJsonLayer, IconLayerProps } from '@deck.gl/layers';
import Map from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { GeoJSON, Feature, Position, Geometry } from 'geojson';
import type { MapViewState } from '@deck.gl/core';
import { WebMercatorViewport } from '@deck.gl/core';
import { bbox } from '@turf/turf';

interface NhleFeatureState {
  id: string|number;
  coordinates: [longitude: number, latitude: number];
  properties: {Name: string;}
}

interface NhleFeature extends GeoJSON.Feature {
  id: string|number;
  geometry: Geometry;
  properties: {Name: string;};
}

interface FetchedPolygonsData extends GeoJSON.FeatureCollection {
  features: Feature[];
}

interface MGeoJson extends GeoJSON.FeatureCollection {
  features: NhleFeature[];
}

function NhleViewerDeckgl({ geoJsonKey, geoJson }: { geoJsonKey: string, geoJson: MGeoJson }) {

  const mapRef = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const [iconLayerData, setIconLayerData] = useState<NhleFeatureState[]>([]);
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0.1,
    latitude: 52.5,
    zoom: 6,
    pitch: 0,
    bearing: 0,
  });

  const [fetchedPolygons, setFetchedPolygons] = useState<FetchedPolygonsData | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);

  const mapViewClickHandler = useCallback(() => {
    setMapStyle("mapbox://styles/mapbox/streets-v11");
  }, []);

  const satelliteViewClickHandler = useCallback(() => {
    setMapStyle("mapbox://styles/mapbox/satellite-v9");
  }, []);

  useEffect(() => {
    if (geoJson && geoJson.features) {
      console.log(geoJson);

      const extractedData = geoJson.features.map((feature, index) => ({
        id: `marker-${index}`,
        coordinates: extractCoordsFromGeometry(feature.geometry)[0] as [longitude: number, latitude: number],
        properties: feature.properties,
      }));
      setIconLayerData(extractedData);

      try {
        const boundingBox = bbox(geoJson); // [minLng, minLat, maxLng, maxLat]
        if (boundingBox && boundingBox.every(coord => typeof coord === 'number' && !isNaN(coord))) {
          const [minLng, minLat, maxLng, maxLat] = boundingBox;
          const viewport = new WebMercatorViewport(viewState);
          const { longitude, latitude, zoom } = viewport.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 50 }
          );
          setViewState(prev => ({ ...prev, longitude, latitude, zoom: Math.min(zoom, 9) }));
        }
      } catch (e) {
        console.error("Error calculating GeoJSON bounds:", e);
      }
    } else {
      setIconLayerData([]);
    }
  }, [geoJson]);

  useEffect(() => {
    const fetchPolygons = async () => {
      let maxLat, minLat, maxLng, minLng;

      const boundingBox = bbox(geoJson);
      [minLng, minLat, maxLng, maxLat] = boundingBox;

      if ([maxLat, minLat, maxLng, minLng].every(coord => typeof coord === 'number' && !isNaN(coord))) {
        try {
          const response = await axios.post(route('comm_shapes'), {
            max_lat: maxLat,
            min_lat: minLat,
            max_lng: maxLng,
            min_lng: minLng,
          });
          setFetchedPolygons(response.data.data as FetchedPolygonsData);
        } catch (error) {
          console.error('Error fetching polygons:', error);
          setFetchedPolygons(null);
        }
      }
    };
    if (geoJson) fetchPolygons();
  }, [geoJson]);

  const iconLayerProps: IconLayerProps<NhleFeatureState> = {
    id: geoJsonKey,
    data: iconLayerData,
    pickable: true,
    iconAtlas: ICON_ATLAS,
    iconMapping: ICON_MAPPING,
    getPosition: d => d.coordinates,
    getIcon: d => d.id.toString(), 
  };

  const layers = [
    // new GeoJsonLayer<ShapeProperties>({
    //   id: 'shapes-layer-highlighted-line',
    //   data: shapes.data,
    //   pickable: false,
    //   stroked: true,
    //   filled: false,
    //   lineWidthMinPixels: 2,
    //   getLineColor: f => [234, 49, 34, 255],
    //   updateTriggers: {
    //     getLineColor: [shapes.data]
    //   }
    // }),
    // new GeoJsonLayer<ShapeProperties>({
    //   id: 'ground',
    //   data: shapes.data,
    //   pickable: true,
    //   stroked: false,
    //   filled: true,
    //   extruded: false,
    //   wireframe: false,
    //   getFillColor: f => {
    //       const color = f.properties.color;
    //       const hex = color.slice(1);
    //       const r = parseInt(hex.substring(0, 2), 16);
    //       const g = parseInt(hex.substring(2, 4), 16);
    //       const b = parseInt(hex.substring(4, 6), 16);
    //       return [r, g, b, Math.round(0.1 * 255)];
    //   },
    //   updateTriggers: {
    //     getFillColor: [shapes.data]
    //   }
    // }),
    new IconLayer({
      ...iconLayerProps,
      getSize: 40,
      onClick: (info) => {
        if (info.object && info.object.properties) {
          console.log('Clicked:', info.object.properties.Name);
          setHoverInfo(info as any);
        }
      },
      onHover: (info) => {
        setHoverInfo(info.object ? info as any : null);
      },
      updateTriggers: {
        data: iconLayerData,
      },
    }),
    fetchedPolygons && new GeoJsonLayer<Feature>({
      id: 'fetched-polygons-layer',
      data: fetchedPolygons,
      pickable: false,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      getFillColor: [234, 49, 34, 0],
      getLineColor: [234, 49, 34, 255],
    }),
  ].filter(Boolean);

  const getCursor = useCallback<any>((info: { isPicking: any; }) => {
    return info.isPicking ? 'pointer' : 'grab';
  }, []);

  const extractCoordsFromGeometry = (geometry: Geometry) => {
    const allCoords: Position[] = [];

    if (!geometry || !geometry.type) {
      return allCoords;
    }

    switch (geometry.type) {
      case 'Point':
        allCoords.push(geometry.coordinates);
        break;
      case 'MultiPoint':
      case 'LineString':
        geometry.coordinates.forEach(coord => allCoords.push(coord));
        break;
      case 'Polygon':
      case 'MultiLineString':
        geometry.coordinates.forEach(ringOrLine => {
          ringOrLine.forEach(coord => allCoords.push(coord));
        });
        break;
      case 'MultiPolygon':
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            ring.forEach(coord => allCoords.push(coord));
          });
        });
        break;
      case 'GeometryCollection':
        geometry.geometries.forEach(geom => extractCoordsFromGeometry(geom));
        break;
      default:
        break;
    }

    return allCoords;
  };

  return (
    <div style={{ width: '100%', height: '75vh', position: 'relative' }}>
      <DeckGL
        initialViewState={viewState}
        controller
        layers={layers}
        onViewStateChange={({ viewState }) => setViewState(viewState as any)}
        getCursor={getCursor}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
          mapStyle={mapStyle}
        />
      </DeckGL>
      <ToggleControl
        onMapViewClick={mapViewClickHandler}
        onSatelliteViewClick={satelliteViewClickHandler}
      />
      {hoverInfo && hoverInfo.object && (
        <div
          style={{
            position: 'absolute',
            zIndex: 1,
            pointerEvents: 'none',
            left: hoverInfo.x,
            top: hoverInfo.y,
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '4px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          }}
        >
          {hoverInfo.object.properties?.Name}
        </div>
      )}
    </div>
  );
}

const ICON_ATLAS = 'https://raw.githubusercontent.com/visgl/deck.gl/refs/heads/9.1-release/examples/website/icon/data/location-icon-atlas.png';
const ICON_MAPPING = 'https://raw.githubusercontent.com/visgl/deck.gl/refs/heads/9.1-release/examples/website/icon/data/location-icon-mapping.json';

interface ToggleControlProps {
  onMapViewClick: () => void;
  onSatelliteViewClick: () => void;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ onMapViewClick, onSatelliteViewClick }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'white',
      padding: '8px',
      borderRadius: '4px',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      zIndex: 1
    }}>
      <button onClick={onMapViewClick} style={{ marginRight: '8px', padding: '6px 10px', cursor: 'pointer' }}>Map View</button>
      <button onClick={onSatelliteViewClick} style={{ padding: '6px 10px', cursor: 'pointer' }}>Satellite View</button>
    </div>
  );
};


export default memo(NhleViewerDeckgl);