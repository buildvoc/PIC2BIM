import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
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
import useGeoJsonValidation from '@/hooks/useGeoJsonValidation';

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

interface BuildingCentroidState {
  id: string;
  coordinates: [number, number];
  properties: BuildingProperties;
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

// Helper function to generate a consistent pastel color from a string
const  stringToColor = (str: string): [number, number, number] => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }

  const safeMod = (n: number, m: number) => ((n % m) + m) % m;

  const h = safeMod(hash, 360);

  const s = 65 + safeMod(hash >> 8, 26); // 65..90

  const l = 72 + safeMod(hash >> 16, 17); // 72..88

  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rTemp = 0, gTemp = 0, bTemp = 0;
  if (h < 60) { rTemp = c; gTemp = x; bTemp = 0; }
  else if (h < 120) { rTemp = x; gTemp = c; bTemp = 0; }
  else if (h < 180) { rTemp = 0; gTemp = c; bTemp = x; }
  else if (h < 240) { rTemp = 0; gTemp = x; bTemp = c; }
  else if (h < 300) { rTemp = x; gTemp = 0; bTemp = c; }
  else { rTemp = c; gTemp = 0; bTemp = x; }

  const r = Math.round((rTemp + m) * 255);
  const g = Math.round((gTemp + m) * 255);
  const b = Math.round((bTemp + m) * 255);

  return [r, g, b];
};

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

  const [buildingCentroidsData, setBuildingCentroidsData] = useState<BuildingCentroidState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);
  const [category1, setCategory1] = useState<string>('All');
  const [category2, setCategory2] = useState<string>('All');

  const mapViewClickHandler = useCallback(() => {
    setMapStyle("https://tiles.openfreemap.org/styles/liberty");
  }, []);

  const satelliteViewClickHandler = useCallback(() => {
      setMapStyle("https://api.maptiler.com/maps/hybrid/style.json?key=tBAEj5fg0DU85lCuGbNM");
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
  
  useEffect(() => {
    if (ogc_fid && nhles && nhles.data.features && nhles.data.features.length > 0) {
      try {
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
  // Store parsed GeoJSON object
  const [fileContent, setFileContent] = useState<any>(null);
  const [geoJsonKey, setGeoJsonKey] = useState<string>('');
  const [geoJson, setGeoJson] = useState<MGeoJson>();
  const [iconLayerData, setIconLayerData] = useState<LoadedNhleFeatureState[]>([]);
  const [fetchedPolygons, setFetchedPolygons] = useState<FetchedPolygonsData | null>(null);
  const [polygonCentroids, setPolygonCentroids] = useState<{coordinates: [number, number], properties: any}[]>([]);
  const { status: validationStatus, result: validationResultFull, limited: validationLimited, validate } = useGeoJsonValidation();

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const content = JSON.parse(text);

        if (content.type !== 'FeatureCollection' || !Array.isArray(content.features)) {
          setError('Invalid GeoJSON format. Expected FeatureCollection.');
          // Stop further validation if basic structure is wrong
          setFileContent(null);
          return;
        }
        
        // Run validation in Web Worker or fallback (expects string input)
        validate(text).then((res) => {
          if (!res.valid) {
            setError('GeoJSON validation failed. See issues below.');
          } else {
            setError(null);
          }
          // Keep the parsed content regardless; drawing may still be gated by user action
          setFileContent(content);
        }).catch((err: any) => {
          setError(`Validation error: ${err?.message || 'Unknown error'}`);
          setFileContent(content);
        });
      } catch (err: any) {
        setError(`Error parsing GeoJSON: ${err.message}`);
        setFileContent(null);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setFileContent(null);
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
      checkGeoJson.check(JSON.stringify(fileContent));
      setGeoJsonKey(geoJsonKey + 1);
      setGeoJson(fileContent as MGeoJson);
      setError(null);
    } catch (e: any) {
      console.log(e.issues || e.message);
      const issues = e?.issues || [e?.message || 'Processing failed'];
      setError('GeoJSON invalid. Fix issues before drawing.');
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
      getFillColor: (d: any) => {
        const groupByMapping: { [key: string]: string } = {
          'Material': 'constructionmaterial',
          'Usage': 'buildinguse',
        };
        const propertyName = groupByMapping[category2];

        if (!propertyName || !d.properties) {
          return [0, 0, 255, 200]; // Default color
        }

        const propValue = d.properties[propertyName];
        return propValue ? [...stringToColor(String(propValue)), 200] : [128, 128, 128, 200]; // Gray for undefined
      },
      getLineColor: (d: any) => {
        const groupByMapping: { [key: string]: string } = {
          'Material': 'constructionmaterial',
          'Usage': 'buildinguse',
        };
        const propertyName = groupByMapping[category2];

        if (!propertyName || !d.properties) {
          return [0, 0, 255, 255]; // Default color
        }

        const propValue = d.properties[propertyName];
        return propValue ? [...stringToColor(String(propValue)), 255] : [128, 128, 128, 255]; // Gray for undefined
      },
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
        getFillColor: [category2],
        getLineColor: [category2],
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
      <Head title="Data Map" />
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
            {validationStatus !== 'idle' && (
              <div className={`p-2 rounded ${validationLimited.valid ? 'bg-green-100 text-green-800' : (validationStatus === 'validating' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}`}>
                <div className='flex items-center justify-between'>
                  <strong>Validation:</strong>
                  <span>
                    {validationStatus === 'validating' && 'Validating…'}
                    {validationStatus === 'success' && 'Valid GeoJSON'}
                    {validationStatus === 'error' && (validationLimited.valid ? 'Valid GeoJSON' : 'Invalid GeoJSON')}
                  </span>
                </div>
                {!validationLimited.valid && validationLimited.errors.length > 0 && (
                  <div className='mt-2'>
                    <strong>Errors (showing up to 50):</strong>
                    <ul className='list-disc pl-5 mt-2'>
                      {validationLimited.errors.map((errItem, index) => {
                        if (typeof errItem === 'string') return <li key={index}>{errItem}</li>;
                        const ve = errItem as ValidationError;
                        return <li key={index}>{ve.message || JSON.stringify(ve)}</li>;
                      })}
                    </ul>
                  </div>
                )}
                {validationLimited.warnings.length > 0 && (
                  <div className='mt-2'>
                    <strong>Warnings (showing up to 50):</strong>
                    <ul className='list-disc pl-5 mt-2'>
                      {validationLimited.warnings.map((wItem, index) => {
                        if (typeof wItem === 'string') return <li key={index}>{wItem}</li>;
                        const vw = wItem as ValidationError;
                        return <li key={index}>{vw.message || JSON.stringify(vw)}</li>;
                      })}
                    </ul>
                  </div>
                )}
                {(validationLimited as any).overflowErrors > 0 && (
                  <div className='mt-2 text-sm'>+{(validationLimited as any).overflowErrors} more errors not shown</div>
                )}
                {(validationLimited as any).overflowWarnings > 0 && (
                  <div className='mt-1 text-sm'>+{(validationLimited as any).overflowWarnings} more warnings not shown</div>
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
            currentMapStyle={mapStyle}
          />

          <FilterPanel
            category1={category1}
            category2={category2}
            onCategory1Change={setCategory1}
            onCategory2Change={setCategory2}
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
  currentMapStyle: string;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ onMapViewClick, onSatelliteViewClick, currentMapStyle }) => {
  const baseStyle: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    fontWeight: 500,
    transition: 'background-color 0.2s ease, color 0.2s ease',
  };

  const activeStyle: React.CSSProperties = {
    ...baseStyle,
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
  };

  const isMapView = !currentMapStyle.includes('hybrid');

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'white',
      padding: '4px',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      zIndex: 1,
      display: 'flex',
    }}>
      <button onClick={onMapViewClick} style={isMapView ? activeStyle : baseStyle}>Map</button>
      <button onClick={onSatelliteViewClick} style={!isMapView ? activeStyle : baseStyle}>Satellite</button>
    </div>
  );
};

interface FilterPanelProps {
  category1: string;
  category2: string;
  onCategory1Change: (val: string) => void;
  onCategory2Change: (val: string) => void;
}

const CustomDropdown: React.FC<{ 
  title: string;
  options: string[]; 
  value: string; 
  onChange: (value: string) => void;
  icon: React.ReactNode;
}> = ({ title, options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    minWidth: '160px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    justifyContent: 'space-between',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  };

  if (isOpen || isFocused) {
    buttonStyle.borderColor = '#a5b4fc';
    buttonStyle.boxShadow = '0 0 0 3px rgba(165, 180, 252, 0.3)';
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={buttonStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          {value}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginTop: '4px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 10,
          padding: '4px',
          opacity: 1,
          transform: 'scale(1)',
          transition: 'opacity 0.1s ease-out, transform 0.1s ease-out',
        }}>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{title}</div>
          {options.map(option => (
            <div
              key={option}
              onClick={() => handleOptionClick(option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: value === option ? '#f3f4f6' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = value === option ? '#f3f4f6' : '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = value === option ? '#f3f4f6' : 'transparent')}
            >
              {icon}
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterPanel: React.FC<FilterPanelProps> = ({ category1, category2, onCategory1Change, onCategory2Change }) => {
  const filterByOptions = ['No Filter', 'Option A', 'Option B'];
  const groupByOptions = ['Material', 'Usage'];

  const icon1 = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <rect x="7" y="8" width="3" height="8"/>
      <rect x="14" y="12" width="3" height="4"/>
    </svg>
  );

  const icon2 = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 1,
      }}
    >
      <CustomDropdown title="Filter by" options={filterByOptions} value={category1} onChange={onCategory1Change} icon={icon1} />
      <CustomDropdown title="Group by" options={groupByOptions} value={category2} onChange={onCategory2Change} icon={icon2} />
    </div>
  );
};

export default memo(Index);