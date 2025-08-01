import React, { memo, useEffect, useState, useCallback } from 'react';
import "mapbox-gl/dist/mapbox-gl.css";
import { Head, router, usePage, useRemember, } from '@inertiajs/react';
import type { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl';
import { GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport } from '@deck.gl/core';
import { bbox } from '@turf/turf';
import type { Feature } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { NhleProperties } from '@/types/nhle';
import { romanToInt } from '@/Constants/Constants';

interface NhleFeatureState { 
  id: string|number; 
  coordinates: [longitude: number, latitude: number];
  properties: NhleProperties;
}
interface NhleFeature extends GeoJSON.Feature {
  id: string|number;
  geometry: GeoJSON.MultiPoint;
  properties: NhleProperties;
}

interface NhleGeoJson extends GeoJSON.FeatureCollection {
  features: NhleFeature[];
}

interface ShapeFeature extends GeoJSON.Feature {
  id: string|number;
  properties: ShapeProperties;
  geometry: GeoJSON.MultiPolygon;
}

interface ShapesGeoJson extends GeoJSON.FeatureCollection {
  features: ShapeFeature[];
}

interface SelectedShapeData extends GeoJSON.Feature {
  id: string|number; // Corresponds to ogc_fid
  geometry: GeoJSON.MultiPolygon;
  properties: ShapeProperties;
}

export function Index({ auth }: PageProps) {
  const { shapes: mShapes, selectedShape: mSelectedShape, nhles, ogc_fid } = usePage<{
    shapes: {data: ShapesGeoJson};
    selectedShape?: { data: SelectedShapeData };
    nhles: { data: NhleGeoJson };
    ogc_fid: string | null;
  }>().props;

  const [shapes] = useRemember(mShapes, `shapes`);

  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: mSelectedShape && mSelectedShape.data.properties.longitude || 0.1,
    latitude: mSelectedShape && mSelectedShape.data.properties.latitude || 52.5,
    zoom: mSelectedShape ? 10: 6,
    pitch: 0,
    bearing: 0,
  });

  const [nhlePointsData, setNhlePointsData] = useState<NhleFeatureState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);

  const mapViewClickHandler = useCallback(() => {
    setMapStyle("mapbox://styles/mapbox/streets-v11");
  }, []);

  const satelliteViewClickHandler = useCallback(() => {
    setMapStyle("mapbox://styles/mapbox/satellite-v9");
  }, []);

  const applyFilters = useCallback((params: { bbox?: string; ogc_fid?: string }) => {
    router.visit(route('nhle.index'), {
      method: 'get',
      preserveState: true,
      data: {
        ogc_fid: params.ogc_fid || '',
      },
      except: ['shapes'],
    });
  }, []);

  useEffect(() => {
    if (ogc_fid && nhles) {
      const extractedData = nhles.data.features.map(feature => ({
        id: feature.id,
        coordinates: getCoordinatesFromFeature(feature)[0] as [longitude: number, latitude: number],
        properties: feature.properties,
      }));
      setNhlePointsData(extractedData);
      
      try {
        const boundingBox = bbox(nhles.data);
        if (boundingBox && boundingBox.every(coord => typeof coord === 'number' && !isNaN(coord))) {
          const [minLng, minLat, maxLng, maxLat] = boundingBox;
          
          const viewport = new WebMercatorViewport(viewState);
          const { longitude, latitude, zoom } = viewport.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 50 }
          );
          setViewState(prev => ({ ...prev, longitude, latitude, zoom: Math.min(zoom, 10) }));
        }
      } catch (e) {
        console.error("Error calculating NHLE GeoJSON bounds:", e);
      }

    } else {
      setNhlePointsData([]);
    }

    return () => {
      setNhlePointsData([]);
      setHoverInfo(null);
    };
  }, [ogc_fid, nhles]);

  
  const layers = [
    new GeoJsonLayer<ShapeProperties>({
      id: 'shapes-layer',
      data: shapes.data,
      pickable: true,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      getFillColor: f => {
        const color = f.properties.color;
        if (color) {
            const hex = color.startsWith('#') ? color.slice(1) : color;
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return [r, g, b, 0.1 * 255];
        }
        return [234, 49, 34, 0.1 * 255];
      },
      getLineColor: f => {
        const isHighlighted = ogc_fid?.includes(String(f.properties.ogc_fid));
        return isHighlighted ? [234, 49, 34, 255] : [100, 100, 100, 100];
      },
      getLineWidth: f => {
        const isHighlighted = ogc_fid?.includes(String(f.properties.ogc_fid));
        return isHighlighted ? 2 : 1;
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          const clickedOgcFid = String(info.object.properties.ogc_fid);
          applyFilters({ ogc_fid: clickedOgcFid });
        }
      },
      updateTriggers: {
        getFillColor: [shapes.data],
        getLineColor: [shapes.data, ogc_fid],
        getLineWidth: [shapes.data, ogc_fid],
      }
    }),

    nhlePointsData.length > 0 && new IconLayer<NhleFeatureState>({
      id: `nhle-layer-${ogc_fid}`,
      data: nhlePointsData,
      pickable: true,
      iconAtlas: ICON_ATLAS,
      iconMapping: ICON_MAPPING,
      getPosition: d => d.coordinates,
      getIcon: d => `marker-${romanToInt(d.properties.grade)}`, 
      getSize: 40,
      getPixelOffset: [0, -7], 
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      updateTriggers: {
        data: nhlePointsData,
      },
    }),
  ].filter(Boolean);

  const getCursor = useCallback<any>((info: {
    objects: any; isPicking: any; 
  }) => {
    if (info.isPicking) {
      const interactiveLayerIds = ['shapes-layer', `nhle-layer-${ogc_fid}`];
      if (info.objects && info.objects.some((obj: any) => interactiveLayerIds.includes(obj.layer.id))) {
        return 'pointer';
      }
    }
    return 'grab';
  }, [ogc_fid]);

  const getCoordinatesFromFeature = (feature: Feature) => {
    const geometry = feature.geometry;
    if (!geometry) return [];

    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates];
      case 'LineString':
      case 'MultiPoint':
        return geometry.coordinates;
      case 'Polygon':
      case 'MultiLineString':
        return geometry.coordinates.flat();
      case 'MultiPolygon':
        return geometry.coordinates.flat(2);
      default:
        return [];
    }
  };

  return (
    <>
      <Head title="The National Heritage List for England" />
      <AuthenticatedLayout user={auth.user}>
        <div style={{ width: '100%', minHeight: '91vh', position: 'relative' }}>
          <DeckGL
            initialViewState={viewState}
            controller={true}
            layers={layers}
            onViewStateChange={({ viewState }) => setViewState(viewState as any)}
            getCursor={getCursor}
          >
            <Map
              mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
              mapStyle={mapStyle}
            />
          </DeckGL>

          <ToggleControl
            onMapViewClick={mapViewClickHandler}
            onSatelliteViewClick={satelliteViewClickHandler}
          />

          {hoverInfo && hoverInfo.object && hoverInfo.layer?.id.startsWith('nhle-layer-') && (
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
                transform: 'translate(-50%, -100%)',
              }}
            >
              {hoverInfo.object.properties?.name}
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </>
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

export default memo(Index);