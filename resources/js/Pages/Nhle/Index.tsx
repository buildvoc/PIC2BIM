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
import { Accordion, AccordionDetails, AccordionSummary, Button } from '@mui/material';
import useGeoJsonValidation from '@/hooks/useGeoJsonValidation';
import ToggleControl from './components/ToggleControl';
import FilterPanel from './components/FilterPanel';
import { getColorForValue } from '@/utils/colors';

import type { Feature, Geometry, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { BuildingProperties, BuildingGeoJson } from '@/types/building';
import type { PageProps } from '@/types';
import type { 
    BuildingCentroidState, 
    ShapesGeoJson, 
    SelectedShapeData, 
    MGeoJson, 
    FetchedPolygonsData,
    LoadedNhleFeatureState,
    ValidationError
} from './types';



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
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingCentroidState | null>(null);
  const [selectedLegendItem, setSelectedLegendItem] = useState<any | null>(null);
  const [category1, setCategory1] = useState<string>('Fixed Size');
  const [category2, setCategory2] = useState<string>('Usage');
  const [isAccordionExpanded, setIsAccordionExpanded] = useState(false);
  const accordionDetailsRef = useRef<HTMLDivElement>(null);
  const [accordionHeight, setAccordionHeight] = useState(0);

  const groupByMapping: { [key: string]: string } = {
    'Material': 'constructionmaterial',
    'Usage': 'buildinguse',
    'Connectivity': 'connectivity',
    'Theme': 'theme',
  };

  const handleLegendItemClick = useCallback((value: any) => {
    setSelectedLegendItem((prev: any) => (prev === value ? null : value));
  }, []);

  const mapViewClickHandler = useCallback(() => {
    setMapStyle("https://tiles.openfreemap.org/styles/liberty");
  }, []);

  const satelliteViewClickHandler = useCallback(() => {
      setMapStyle("https://api.maptiler.com/maps/hybrid/style.json?key=tBAEj5fg0DU85lCuGbNM");
    }, []);

  useEffect(() => {
    if (nhles) {
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
    if (isAccordionExpanded && accordionDetailsRef.current) {
      setAccordionHeight(accordionDetailsRef.current.scrollHeight);
    } else if (!isAccordionExpanded) {
      setAccordionHeight(0);
    }
  }, [isAccordionExpanded, validationStatus, error, fileContent]);

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
      updateTriggers: {
        getFillColor: [shapes.data],
        getLineColor: [shapes.data, ogc_fid],
        getLineWidth: [shapes.data, ogc_fid],
      }
    }),

    // Layer for Building centroids (using ScatterplotLayer)
    buildingCentroidsData.length > 0 && new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer-${geoJsonKey}`,
      data: buildingCentroidsData,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius;
        if (category1 === 'Size by Area') {
          const area = d.properties?.area || 0;
          baseRadius = Math.sqrt(area);
        } else { // Fixed Size
          baseRadius = 10;
        }

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = d.properties?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const propertyName = groupByMapping[category2];
        if (!propertyName || !d.properties) return [0, 0, 255, 200];

        const propValue = d.properties[propertyName];
        const uniqueValues = Array.from(new Set(buildingCentroidsData.map(item => item.properties?.[propertyName]).filter(Boolean)));
        const color = getColorForValue(propValue, uniqueValues);

        const isSelected = selectedLegendItem === propValue;
        const alpha = selectedLegendItem === null || isSelected ? 220 : 80;

        return [...color, alpha];
      },
      getLineColor: d => [0, 0, 0, 255],
      onHover: info => {
        getCursor;
        if (info.object && info.object.properties) {  
          setHoverInfo(info as any);
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object && info.object.properties) {
          setSelectedBuilding(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem],
      },
    }),
    
    
    // ScatterplotLayer for polygon centroids
    geoJson && polygonCentroids.length > 0 && new ScatterplotLayer({
      id: `polygon-centroids-${geoJsonKey}`,
      data: polygonCentroids,
      pickable: true,
      opacity: 0.4,
      stroked: true,
      filled: true,
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
        <Accordion 
          style={{ margin: 0 }} 
          expanded={isAccordionExpanded} 
          onChange={(event, isExpanded) => setIsAccordionExpanded(isExpanded)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            Load GeoJson file
          </AccordionSummary>
          <AccordionDetails ref={accordionDetailsRef}>
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
        <div style={{
            width: '100%', 
            position: 'relative',
            height: isAccordionExpanded ? `calc(86vh - ${accordionHeight}px)` : '88vh'
          }}>
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

        {/* Slide-in panel */}
        <div
          className={`fixed top-0 left-0 h-full z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${selectedBuilding ? 'translate-x-0' : '-translate-x-full'}`}
          style={{
            width: 350,
            maxWidth: '90vw',
            top: 'auto',
            bottom: 0,
            maxHeight: isAccordionExpanded ? `calc(100vh - ${125 + accordionHeight}px)` : 'calc(100vh - 110px)'
          }}
        >
          {selectedBuilding && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-bold text-lg">Building Details</span>
                <button onClick={() => setSelectedBuilding(null)} className="text-gray-600 hover:text-black">✕</button>
              </div>
              <div className="p-4 flex-1 overflow-auto">
                {selectedBuilding.properties && Object.entries(selectedBuilding.properties)
                  .filter(([key]) => !['uprn', 'postcode'].includes(key.toLowerCase()))
                  .map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <strong className="uppercase">{key.replace(/_/g, ' ')}:</strong>
                    <div className='text-gray-700'>{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </AuthenticatedLayout>
    </>
  );
}



export default memo(Index);