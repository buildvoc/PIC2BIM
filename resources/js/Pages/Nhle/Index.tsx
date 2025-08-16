import React, { memo, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import "maplibre-gl/dist/maplibre-gl.css";
import { Head, router, usePage, useRemember, } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import axios, { AxiosResponse, AxiosError } from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import * as checkGeoJson from '@placemarkio/check-geojson';
import * as turf from '@turf/turf';
import { GeoJsonLayer, IconLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import { Accordion, AccordionDetails, AccordionSummary, Button } from '@mui/material';
import useGeoJsonValidation from '@/hooks/useGeoJsonValidation';
import ValidationReportModal from './components/ValidationReportModal';
import ToggleControl from './components/ToggleControl';
import FilterPanel from './components/FilterPanel';
import { getColorForValue } from '@/utils/colors';
import Legend from '@/Components/DataMap/Legend';

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
  const { shapes: mShapes, selectedShape: mSelectedShape, nhles, center } = usePage<{
    shapes: {data: ShapesGeoJson};
    selectedShape?: { data: SelectedShapeData };
    nhles: { data: BuildingGeoJson }; // Changed from NhleGeoJson to BuildingGeoJson
    center?: { type: 'Point', coordinates: [number, number] };
  }>().props;

  const [shapes] = useRemember(mShapes, `shapes`);

  const [mapStyle, setMapStyle] = useState("https://tiles.openfreemap.org/styles/liberty");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: center ? center.coordinates[0] : (mSelectedShape && mSelectedShape.data.properties.longitude || 0.1),
    latitude: center ? center.coordinates[1] : (mSelectedShape && mSelectedShape.data.properties.latitude || 52.5),
    zoom: center ? 15 : (mSelectedShape ? 10: 6),
    pitch: 0,
    bearing: 0,
  });

  const [buildingCentroidsData, setBuildingCentroidsData] = useState<BuildingCentroidState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingCentroidState | null>(null);
  const [selectedLegendItem, setSelectedLegendItem] = useState<any | null>(null);
  const [category1, setCategory1] = useState<string>('Fixed Size');
  const [category2, setCategory2] = useState<string>('Usage');
  const [floorRange, setFloorRange] = useState({ min: 0, max: 50 });

  const maxFloors = useMemo(() => {
    if (buildingCentroidsData.length === 0) {
      return 50; // Default max if no data
    }
    const max = Math.max(...buildingCentroidsData.map(d => d.properties?.numberoffloors || 0));
    return max > 0 ? max : 50;
  }, [buildingCentroidsData]);

  useEffect(() => {
    setFloorRange(prev => ({ ...prev, max: maxFloors }));
  }, [maxFloors]);

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
  }, [nhles]);

  const getCursor = useCallback<any>((info: {
    objects: any; isPicking: any; 
  }) => {
    if (info.isPicking) {
      const interactiveLayerIds = ['shapes-layer', 'building-layer'];
      if (info.objects && info.objects.some((obj: any) => interactiveLayerIds.some(id => obj.layer.id.startsWith(id)))) {
        return 'pointer';
      }
    }
    return 'grab';
  }, []);

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

  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [validationGeoJson, setValidationGeoJson] = useState<any|null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  // Store parsed GeoJSON object
  const [fileContent, setFileContent] = useState<any>(null);
  const [geoJson, setGeoJson] = useState<MGeoJson>();
  const [iconLayerData, setIconLayerData] = useState<LoadedNhleFeatureState[]>([]);
  const [fetchedPolygons, setFetchedPolygons] = useState<FetchedPolygonsData | null>(null);
  const [polygonCentroids, setPolygonCentroids] = useState<{coordinates: [number, number], properties: any}[]>([]);
  const { status: validationStatus, result: validationResultFull, limited: validationLimited, validate } = useGeoJsonValidation();

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatusMessage(null);
    setValidationResults([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const content = JSON.parse(text);

        validate(text).then((res) => {
          if (!res.valid) {
            setStatusMessage('GeoJSON has validation errors. See details below.');
          } else {
            setStatusMessage('Local validation passed. Checking for duplicates on the server...');
            axios.post(route('data_map.validation'), { geojson: content })
              .then((response: { data: { results: any[]; }; }) => {
                const results = response.data.results || [];
                setValidationResults(results);
                const readyCount = results.filter(r => r.status === 'ok').length;
                const warningCount = results.length - readyCount;
                setStatusMessage(`Validation complete: ${readyCount} features ready to import, ${warningCount} with warnings.`);
              })
              .catch((error: any) => {
                console.error('Duplicate check error:', error);
                setStatusMessage('An error occurred while checking for duplicates on the server.');
              });
          }
          setFileContent(content);
        }).catch((err: any) => {
          setStatusMessage(`Validation error: ${err?.message || 'Unknown error'}`);
          setFileContent(content);
        });
      } catch (err: any) {
        setStatusMessage(`Error parsing GeoJSON: ${err.message}`);
        setFileContent(null);
      }
    };

    reader.onerror = () => {
      setStatusMessage('Error reading file');
      setFileContent(null);
    };

    reader.readAsText(file);
  };

  const handleImportSuccess = () => {
    setValidationResults([]);
    setValidationGeoJson(null);
    window.location.reload();
  };

  const handleReviewForImport = async () => {
    const sourceGeoJson = geoJson && geoJson.features.length > 0 ? geoJson : fileContent;

    if (!sourceGeoJson) {
      alert('No GeoJSON data available to review. Please upload a file or draw features on the map.');
      return;
    }

    try {
      const response = await axios.post(route('data_map.validation'), { geojson: sourceGeoJson });
      setValidationResults(response.data.results);
      setValidationGeoJson(sourceGeoJson); // Set the correct geojson for import
      setIsReportModalOpen(true);
    } catch (error) { 
      console.error('Validation failed:', error);
      alert('An error occurred during validation.');
    }
  };

  const handleClick = () => {
    if (!fileContent) {
      setStatusMessage('Invalid GeoJson file!');
      return;
    }

    try {
      console.log("Processing GeoJSON:", fileContent);
      checkGeoJson.check(JSON.stringify(fileContent));
      setGeoJson(fileContent as MGeoJson);
      setStatusMessage(null);
    } catch (e: any) {
      console.log(e.issues || e.message);
      const issues = e?.issues || [e?.message || 'Processing failed'];
      setStatusMessage('GeoJSON invalid. Fix issues before drawing.');
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
  }, [isAccordionExpanded, validationStatus, validationResults, statusMessage]);

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

  const filteredBuildingCentroids = useMemo(() => {
    return buildingCentroidsData.filter(d => {
      const floors = d.properties?.numberoffloors || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [buildingCentroidsData, floorRange]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Skip the first run to avoid overriding the initial viewState zoom
    if (isInitialLoad.current) {
      if (buildingCentroidsData.length > 0) {
        isInitialLoad.current = false;
      }
      return;
    }

    const isFiltered = floorRange.min > 0 || floorRange.max < maxFloors;
    const dataToBound = isFiltered ? filteredBuildingCentroids : buildingCentroidsData;

    if (dataToBound.length > 0) {
      try {
        const points = turf.featureCollection(
          dataToBound.map(c => turf.point(c.coordinates))
        );
        const bbox = turf.bbox(points);
        const [minLng, minLat, maxLng, maxLat] = bbox;

        const viewport = new WebMercatorViewport({ ...viewState, width: window.innerWidth, height: window.innerHeight });
        const { longitude, latitude, zoom } = viewport.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 100 }
        );

        // When filtered, zoom to fit the data (capped at 18). When not filtered, return to a wider view.
        const targetZoom = isFiltered ? Math.min(zoom, 18) : (center ? 15 : (mSelectedShape ? 10 : 6));

        setViewState(prev => ({
          ...prev,
          longitude,
          latitude,
          zoom: targetZoom,
          transitionDuration: 800,
          transitionInterpolator: new FlyToInterpolator(),
        }));
      } catch (error) {
        console.error("Error adjusting zoom to data:", error);
      }
    }
  }, [floorRange, filteredBuildingCentroids, buildingCentroidsData, maxFloors]);


  const layers = [
    new GeoJsonLayer<ShapeProperties>({
      id: 'shapes-layer',
      data: shapes.data,
      pickable: true,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 1,
      getLineColor: [100, 100, 100, 100],
      getLineWidth: 1
    }),

    // Layer for Building centroids (using ScatterplotLayer)
    filteredBuildingCentroids.length > 0 && new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer`,
      data: filteredBuildingCentroids,
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
        const uniqueValues = Array.from(new Set(filteredBuildingCentroids.map(item => item.properties?.[propertyName]).filter(Boolean)));
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
      id: `polygon-centroids`,
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
            {/* Server-side validation summary */}
            {statusMessage && (
              <div style={{ color: validationResults.length > 0 ? 'orange' : (statusMessage.includes('error') || statusMessage.includes('invalid') ? 'red' : 'green'), marginTop: '10px' }}>
                {statusMessage}
              </div>
            )}

            {/* Review for Import button */}
            {validationResults.length > 0 && (
              <Button variant="contained" onClick={handleReviewForImport} style={{ marginTop: '10px' }}>
                Review for Import
              </Button>
            )}

            {/* Detailed local validation errors from the hook */}
            {validationStatus !== 'idle' && !validationLimited.valid && (
              <div className={`p-2 rounded mt-2 bg-red-100 text-red-800`}>
                <div className='flex items-center justify-between'>
                  <strong>Validation Errors (showing up to 50):</strong>
                </div>
                <ul className='list-disc pl-5 mt-2'>
                  {validationLimited.errors.map((errItem, index) => {
                    const ve = errItem as ValidationError;
                    return <li key={index}>{ve.message || JSON.stringify(ve)}</li>;
                  })}
                </ul>
                {validationLimited.warnings.length > 0 && (
                  <div className='mt-2'>
                    <strong>Warnings (showing up to 50):</strong>
                    <ul className='list-disc pl-5 mt-2'>
                      {validationLimited.warnings.map((wItem, index) => {
                        const vw = wItem as ValidationError;
                        return <li key={index}>{vw.message || JSON.stringify(vw)}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </AccordionDetails>
        </Accordion>
        <div style={{
            width: '100%', 
            position: 'relative',
            height: isAccordionExpanded ? `calc(85vh - ${accordionHeight}px)` : '88vh'
          }}>
          <DeckGL
            viewState={viewState}
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
            floorRange={floorRange}
            maxFloors={maxFloors}
            onCategory1Change={setCategory1}
            onCategory2Change={setCategory2}
            onFloorRangeChange={setFloorRange}
          />

          <Legend 
            data={filteredBuildingCentroids}
            category={category2}
            groupByMapping={groupByMapping}
            onItemClick={handleLegendItemClick}
            selectedItem={selectedLegendItem}
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
            maxHeight: isAccordionExpanded ? `calc(100vh - ${129 + accordionHeight}px)` : 'calc(100vh - 113px)',
            border: '1px solid #ccc',
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

        <ValidationReportModal 
          open={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          results={validationResults}
          geoJson={validationGeoJson}
          onImportSuccess={handleImportSuccess}
        />
      </AuthenticatedLayout>
    </>
  );
}



export default memo(Index);