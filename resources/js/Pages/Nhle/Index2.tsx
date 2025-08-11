import React, { memo, useEffect, useState, useCallback } from 'react';
import "maplibre-gl/dist/maplibre-gl.css";
import { Head, router, usePage, useRemember, } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as checkGeoJson from '@placemarkio/check-geojson';
import * as turf from '@turf/turf';
import { GeoJsonLayer, IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport } from '@deck.gl/core';
import { romanToInt } from '@/Constants/Constants';
import { Accordion, AccordionDetails, AccordionSummary, Button } from '@mui/material';

import type { Feature, Geometry, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { NhleProperties } from '@/types/nhle';
import type { BuildingProperties, BuildingFeature, BuildingGeoJson } from '@/types/building';
import type { GeoJSON } from 'geojson';
import type { PageProps } from '@/types';

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

// Interfaces for Building data
interface BuildingFeatureState extends GeoJSON.Feature {
  id: string;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  properties: BuildingProperties;
}

interface BuildingCentroidState {
  id: string;
  coordinates: [number, number];
  properties: BuildingProperties;
}

interface BuildingGeoJsonState {
  type: 'FeatureCollection';
  features: BuildingFeatureState[];
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

interface LoadedNhleFeatureState {
  id: string|number;
  coordinates: [longitude: number, latitude: number];
  properties: {Name: string;}
}

interface LoadedNhleFeature extends GeoJSON.Feature {
  id: string|number;
  geometry: Geometry;
  properties: {Name: string;};
}

interface PolygonFeature extends GeoJSON.Feature {
  id: string|number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: any;
}

interface FetchedPolygonsData extends GeoJSON.FeatureCollection {
  features: Feature[];
}

interface MGeoJson extends GeoJSON.FeatureCollection {
  features: LoadedNhleFeature[];
}

interface ValidationError {
  message?: string;
  severity?: string;
  from?: number;
  to?: number;
  [key: string]: any; // Allow additional properties
}

export function Index({ auth }: PageProps) {
  const { shapes: mShapes, selectedShape: mSelectedShape, nhles, ogc_fid } = usePage<{
    shapes: {data: ShapesGeoJson};
    selectedShape?: { data: SelectedShapeData };
    nhles: { data: BuildingGeoJson }; // Changed from NhleGeoJson to BuildingGeoJson
    ogc_fid: string | null;
  }>().props;

  const [shapes] = useRemember(mShapes, `shapes`);

  const [mapStyle, setMapStyle] = useState("https://tiles.openfreemap.org/styles/liberty");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: mSelectedShape && mSelectedShape.data.properties.longitude || 0.1,
    latitude: mSelectedShape && mSelectedShape.data.properties.latitude || 52.5,
    zoom: mSelectedShape ? 10: 6,
    pitch: 0,
    bearing: 0,
  });

  const [nhlePointsData, setNhlePointsData] = useState<NhleFeatureState[]>([]);
  const [buildingCentroidsData, setBuildingCentroidsData] = useState<BuildingCentroidState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);

  const mapViewClickHandler = useCallback(() => {
    setMapStyle("https://tiles.openfreemap.org/styles/liberty");
  }, []);

  const satelliteViewClickHandler = useCallback(() => {
      setMapStyle("https://api.maptiler.com/maps/hybrid/style.json?key=tBAEj5fg0DU85lCuGbNM");
    }, []);

  const applyFilters = useCallback((params: { bbox?: string; ogc_fid?: string }) => {
    router.visit(route('nhle.index2'), {
      method: 'get',
      preserveState: true,
      data: {
        ogc_fid: params.ogc_fid || '',
      },
      except: ['shapes'],
    });
  }, []);

  // State for GeoJSON validation and visualization

  useEffect(() => {
    if (ogc_fid && nhles) {
      const centroids: BuildingCentroidState[] = [];
      for (const feature of nhles.data.features) {
        if (feature.geometry) {
          try {
            const centroid = turf.centroid(feature.geometry as any);
            const coordinates = centroid.geometry.coordinates as [number, number];
            
            centroids.push({
              id: feature.id as string,
              coordinates,
              properties: feature.properties as BuildingProperties
            });
          } catch (error) {
            console.error('Error calculating centroid for feature:', feature.id, error);
          }
        }
      }
      setBuildingCentroidsData(centroids);
    }
  }, [nhles, ogc_fid]);
  
  // Effect khusus untuk menghitung dan memperbarui viewport berdasarkan bounding box
  useEffect(() => {
    if (ogc_fid && nhles && nhles.data.features && nhles.data.features.length > 0) {
      try {
        // Memastikan data geometri valid sebelum menghitung bounding box
        const validFeatures = nhles.data.features.filter(f => f.geometry);
        if (validFeatures.length > 0) {
          const boundingBox = turf.bbox({
            type: 'FeatureCollection',
            features: validFeatures
          });
          
          if (boundingBox && boundingBox.every(coord => typeof coord === 'number' && !isNaN(coord))) {
            const [minLng, minLat, maxLng, maxLat] = boundingBox;
            
            const viewport = new WebMercatorViewport(viewState);
            const { longitude, latitude, zoom } = viewport.fitBounds(
              [[minLng, minLat], [maxLng, maxLat]],
              { padding: 100 }
            );
            
            // Hanya perbarui viewState jika ada perubahan signifikan
            setViewState(prev => {
              if (prev.longitude !== longitude || prev.latitude !== latitude || prev.zoom !== zoom) {
                return { ...prev, longitude, latitude, zoom };
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error calculating bounding box:', error);
      }
    }
  }, [nhles, ogc_fid]);

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

  const [error, setError] = useState<string|null>(null);
  const [fileContent, setFileContent] = useState<string|null>(null);
  const [geoJsonKey, setGeoJsonKey] = useState<string>('');
  const [geoJson, setGeoJson] = useState<MGeoJson>();
  const [iconLayerData, setIconLayerData] = useState<LoadedNhleFeatureState[]>([]);
  const [fetchedPolygons, setFetchedPolygons] = useState<FetchedPolygonsData | null>(null);
  // Additional state for polygon handling
  const [polygonCentroids, setPolygonCentroids] = useState<{coordinates: [number, number], properties: any}[]>([]);
  const [validationResult, setValidationResult] = useState<{valid: boolean, errors: (string | ValidationError)[]} | null>(null);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);

        if (content.type !== 'FeatureCollection' || !Array.isArray(content.features)) {
          setError('Invalid GeoJSON format. Expected FeatureCollection.');
          throw new Error('Invalid GeoJSON format. Expected FeatureCollection.');
        }
        
        // Validate GeoJSON using @placemarkio/check-geojson
        try {
          const validationResult = checkGeoJson.check(JSON.stringify(content));
          console.log('Validation result:', validationResult);
          setValidationResult({ valid: true, errors: [] });
        } catch (validationError: any) {
          console.log('Validation errors:', validationError.issues);
          setValidationResult({ valid: false, errors: validationError.issues || ['Validation failed'] });
          setError(`GeoJSON validation failed: ${validationError.issues || 'Unknown error'}`);
        }
        
        setFileContent(content);
      } catch (err: any) {
        setError(`Error parsing GeoJSON: ${err.message}`);
        setFileContent(null);
        setValidationResult({ valid: false, errors: [err.message] });
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setFileContent(null);
      setValidationResult({ valid: false, errors: ['Error reading file'] });
    };

    reader.readAsText(file);
  };

  const handleClick = () => {
    if (!fileContent) {
      setError('Invalid GeoJson file!');
      return;
    }

    try {
      console.log("Processing GeoJSON:", fileContent);
      // Validate again before processing
      const result = checkGeoJson.check(JSON.stringify(fileContent));
      setGeoJsonKey(geoJsonKey + 1);
      setGeoJson(result as MGeoJson);
      setError(null); // Clear any previous errors
    } catch (e: any) {
      console.log(e.issues);
      setError(e.issues);
      setValidationResult({ valid: false, errors: e.issues || ['Processing failed'] });
    }
  }

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

  useEffect(() => {
    if (geoJson && geoJson.features) {
      console.log("geoJson", geoJson);

      // Extract centroids from polygon features for ScatterplotLayer visualization
      const centroidData = geoJson.features
        .filter(feature => feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
        .map((feature, index) => {
          try {
            // Calculate centroid of the polygon
            const centroid = turf.centroid(feature);
            return {
              coordinates: centroid.geometry.coordinates as [number, number],
              properties: feature.properties || {}
            };
          } catch (e) {
            console.error("Error calculating centroid for feature:", feature, e);
            // Fallback to first coordinate if centroid calculation fails
            const coords = extractCoordsFromGeometry(feature.geometry);
            return {
              coordinates: coords[0] as [number, number],
              properties: feature.properties || {}
            };
          }
        });
      
      setPolygonCentroids(centroidData);

      // Also extract data for IconLayer (using first coordinate of each feature)
      const extractedData = geoJson.features.map((feature, index) => ({
        id: `marker-${index}`,
        coordinates: extractCoordsFromGeometry(feature.geometry)[0] as [longitude: number, latitude: number],
        properties: feature.properties,
      }));
      setIconLayerData(extractedData);

      try {
        const boundingBox = turf.bbox(geoJson);
        if (boundingBox && boundingBox.every(coord => typeof coord === 'number' && !isNaN(coord))) {
          const [minLng, minLat, maxLng, maxLat] = boundingBox;
          const viewport = new WebMercatorViewport(viewState);
          const { longitude, latitude, zoom } = viewport.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 50 }
          );

          const bboxPolygon = turf.bboxPolygon(boundingBox); 
          const featureCollection = turf.featureCollection(shapes.data.features);

          const filteredFeatures = [];

          for (const currentFeature of featureCollection.features) {
            const intersection = turf.intersect(currentFeature, bboxPolygon);
            if (intersection) {
              filteredFeatures.push(intersection);
            }
          }
          const newFeatureCollection = turf.featureCollection(filteredFeatures);
          setFetchedPolygons(newFeatureCollection);

          setViewState(prev => ({ ...prev, longitude, latitude, zoom: Math.min(zoom, 9) }));
        }
      } catch (e) {
        console.error("Error calculating GeoJSON bounds:", e);
      }
    } else {
      setIconLayerData([]);
      setPolygonCentroids([]);
    }
  }, [geoJson]);

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

    // Layer for Building centroids (using ScatterplotLayer)
    buildingCentroidsData.length > 0 && new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer-${ogc_fid}`,
      data: buildingCentroidsData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => 10,
      getFillColor: d => [0, 0, 255, 200], // Blue color
      getLineColor: d => [0, 0, 255, 255],
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          console.log('Clicked building:', info.object);
          setHoverInfo(info as any);
        }
      },
      updateTriggers: {
        data: buildingCentroidsData,
      },
    }),


    // ScatterplotLayer for polygon centroids
    geoJson && polygonCentroids.length > 0 && new ScatterplotLayer({
      id: `polygon-centroids-${geoJsonKey}`,
      data: polygonCentroids,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 5,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => 10,
      getFillColor: d => [255, 140, 0, 200],
      getLineColor: d => [255, 140, 0, 255],
      onHover: info => {
        if (info.object && info.object.properties) {
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          console.log('Clicked polygon centroid:', info.object);
          setHoverInfo(info as any);
        }
      },
    }),

    geoJson && new IconLayer<LoadedNhleFeatureState>({
      id: `nhle-layer-${geoJsonKey}`,
      data: iconLayerData,
      pickable: true,
      iconAtlas: ICON_ATLAS,
      iconMapping: ICON_MAPPING,
      getPosition: d => d.coordinates,
      getIcon: d => d.id.toString(),
      getSize: 40,
      onClick: (info) => {
        if (info.object && info.object.properties) {
          console.log('Clicked:', info.object);
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
    geoJson && fetchedPolygons && new GeoJsonLayer<Feature>({
      id: 'fetched-polygons-layer',
      data: fetchedPolygons,
      pickable: false,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      getFillColor: [234, 49, 34, 0],
      getLineColor: [234, 49, 34, 255],
      updateTriggers: {
        data: [iconLayerData],
      },
    }),
  ].filter(Boolean);

  return (
    <>
      <Head title="The National Heritage List for England" />
      <AuthenticatedLayout user={auth.user}>
        <Accordion style={{ margin: 0 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            Load GeoJson file
          </AccordionSummary>
          <AccordionDetails>
            <div className='flex flex-col gap-4 md:flex-row'>
              <input type='file' placeholder="Select files" onChange={handleFileChange} accept='.geojson' />
              <Button size='small' variant="contained" onClick={handleClick}>Draw</Button>
            </div>
            {error && <p className='text-red-500'>{error}</p>}
            {validationResult && (
              <div className={`p-2 rounded ${validationResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Validation Result:</strong> {validationResult.valid ? 'Valid GeoJSON' : 'Invalid GeoJSON'}
                {!validationResult.valid && validationResult.errors.length > 0 && (
                  <ul className='list-disc pl-5 mt-2'>
                    {validationResult.errors.map((error, index) => {
                      if (typeof error === 'string') {
                        return <li key={index}>{error}</li>;
                      } else if (error && typeof error === 'object') {
                        const validationError = error as ValidationError;
                        const errorMessage = validationError.message || JSON.stringify(validationError);
                        return <li key={index}>{errorMessage}</li>;
                      } else {
                        return <li key={index}>{String(error)}</li>;
                      }
                    })}
                  </ul>
                )}
              </div>
            )}
          </AccordionDetails>
        </Accordion>
        <div style={{ width: '100%', minHeight: '91vh', position: 'relative' }}>
          <DeckGL
            initialViewState={viewState}
            controller={true}
            layers={layers}
            onViewStateChange={(params) => setViewState(params.viewState as MapViewState)}
            getCursor={getCursor}
          >
            <Map
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
                transform: 'translate(-50%, -100%)',
                maxWidth: '300px',
                wordWrap: 'break-word',
              }}
            >
              {(hoverInfo.layer?.id.startsWith('nhle-layer-') || hoverInfo.layer?.id.startsWith('building-layer-')) && 
                (hoverInfo.object.properties?.name || 
                 hoverInfo.object.properties?.Name ||
                 hoverInfo.object.properties?.description ||
                 hoverInfo.object.properties?.buildinguse ||
                 `Building ID: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('polygon-centroids-') && (
                <div>
                  <div><strong>Polygon Feature</strong></div>
                  {hoverInfo.object.properties && Object.keys(hoverInfo.object.properties).map(key => (
                    <div key={key}><strong>{key}:</strong> {String(hoverInfo.object.properties[key])}</div>
                  ))}
                </div>
              )}
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