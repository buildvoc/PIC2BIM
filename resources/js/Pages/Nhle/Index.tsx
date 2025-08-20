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
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import { Button } from '@mui/material';
import useGeoJsonValidation from '@/hooks/useGeoJsonValidation';
import ValidationReportModal from './components/ValidationReportModal';
import ToggleControl from './components/ToggleControl';
import FilterPanel from './components/FilterPanel';
import { getColorForValue } from '@/utils/colors';
import Legend from '@/Components/DataMap/Legend';
import SidePanel from './components/SidePanel';

import type { Feature, Geometry, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { BuildingProperties, BuildingGeoJson } from '@/types/building';
import type { SiteGeoJson } from '@/types/site';
import type { PageProps } from '@/types';
import type { 
    BuildingCentroidState, 
    SiteCentroidState,
    ShapesGeoJson, 
    SelectedShapeData, 
    MGeoJson, 
    FetchedPolygonsData,
    LoadedNhleFeatureState,
    ValidationError
} from './types';



export function Index({ auth }: PageProps) {
  const { shapes: mShapes, buildings, sites, center } = usePage<{
    shapes: {data: ShapesGeoJson};
    buildings: { data: BuildingGeoJson }; // Changed from NhleGeoJson to BuildingGeoJson
    sites: { data: SiteGeoJson };
    center?: { type: 'Point', coordinates: [number, number] };
  }>().props;
  const [shapes] = useRemember(mShapes, `shapes`);
  
  const [mapStyle, setMapStyle] = useState("https://tiles.openfreemap.org/styles/liberty");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: center ? center.coordinates[0] : (0.1),
    latitude: center ? center.coordinates[1] : (52.5),
    zoom: center ? 15 : (6),
    pitch: 0,
    bearing: 0,
  });

  const [buildingCentroidsData, setBuildingCentroidsData] = useState<BuildingCentroidState[]>([]);
  const [siteCentroidsData, setSiteCentroidsData] = useState<SiteCentroidState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<BuildingCentroidState | SiteCentroidState | null>(null);
  const [selectedLegendItem, setSelectedLegendItem] = useState<any | null>(null);
  const [category1, setCategory1] = useState<string>('Fixed Size');
  const [category2, setCategory2] = useState<string>('Usage');
  const [floorRange, setFloorRange] = useState({ min: 0, max: 50 });
  const [dataType, setDataType] = useState({ buildings: false, sites: false });
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);

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

  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<'building' | 'site' | ''>('');
  useEffect(() => {
    if (selectedFeature) {
      setIsImportPanelOpen(false);
      setIsFilterPanelOpen(false);
    }
  }, [selectedFeature]);

  useEffect(() => {
    if (selectedShapeIds.length === 1) {
      const selectedShape = shapes.data.features.find(shape => shape.id === selectedShapeIds[0]);
      if (selectedShape) {
        try {
          const [minLng, minLat, maxLng, maxLat] = turf.bbox(selectedShape as any);
          const { longitude, latitude, zoom } = new WebMercatorViewport(viewState).fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            {
              padding: 40
            }
          );

          setViewState(currentViewState => ({
            ...currentViewState,
            longitude,
            latitude,
            zoom,
            transitionDuration: 1000,
            transitionInterpolator: new FlyToInterpolator(),
          }));
        } catch (e) {
          console.error("Error calculating bounding box for the selected shape:", e);
        }
      }
    }
  }, [selectedShapeIds, shapes.data.features]);

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
    if (buildings) {
      const centroids: BuildingCentroidState[] = [];
      for (const feature of buildings.data.features) {
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
  }, [buildings]);

  useEffect(() => {
    if (sites) {
      const centroids: SiteCentroidState[] = [];
      for (const feature of sites.data.features) {
        if (feature.geometry) {
          try {
            let geometry = feature.geometry;

            // Ensure the geometry is a valid GeoJSON geometry object for turf
            if (geometry.type === 'MultiPolygon' && geometry.coordinates.length === 1) {
                // If it's a MultiPolygon with a single polygon, treat it as a Polygon
                geometry = { type: 'Polygon', coordinates: geometry.coordinates[0] };
            } else if (geometry.type === 'MultiPolygon') {
            }

            const centroid = turf.centroid(geometry as any);
            const coordinates = centroid.geometry.coordinates as [number, number];

            centroids.push({
              id: feature.id as string,
              coordinates,
              properties: feature.properties
            });
          } catch (error) {
            console.error('Error calculating centroid for feature:', feature.id, feature.geometry, error);
          }
        }
      }
      setSiteCentroidsData(centroids);
    }
  }, [sites]);

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidationSuccessful, setIsValidationSuccessful] = useState(false);
  const [geoJson, setGeoJson] = useState<MGeoJson>();
  const [iconLayerData, setIconLayerData] = useState<LoadedNhleFeatureState[]>([]);
  const [fetchedPolygons, setFetchedPolygons] = useState<FetchedPolygonsData | null>(null);
  const [polygonCentroids, setPolygonCentroids] = useState<{coordinates: [number, number], properties: any}[]>([]);
  const { status: validationStatus, result: validationResultFull, limited: validationLimited, validate } = useGeoJsonValidation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setStatusMessage('File selected. Click Validate to check.');
    setValidationResults([]);
    setFileContent(null);
    setGeoJson(undefined);
    setIsValidationSuccessful(false);
  };

  const handleValidation = () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file first.');
      return;
    }

    setStatusMessage('Validating... please wait.');
    setValidationResults([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const content = JSON.parse(text);

        validate(text).then((res) => {
          if (!res.valid) {
            setStatusMessage('GeoJSON has validation errors. See details below.');
            setIsValidationSuccessful(false);
          } else {
            setStatusMessage('Local validation passed. Checking for duplicates on the server...');
            const validationRoute = selectedSchema === 'building'
                ? route('data_map.validateBuilding')
                : route('data_map.validateSite');

            axios.post(validationRoute, { geojson: content })
              .then((response: { data: { results: any[]; }; }) => {
                const results = response.data.results || [];
                setValidationResults(results);
                const readyCount = results.filter(r => r.status === 'ok').length;
                const warningCount = results.length - readyCount;
                setStatusMessage(`Validation complete: ${readyCount} features ready to import, ${warningCount} with warnings.`);
                setIsValidationSuccessful(true); // Set validation as successful
              })
              .catch((error: any) => {
                console.error('Duplicate check error:', error);
                setStatusMessage('An error occurred while checking for duplicates on the server.');
                setIsValidationSuccessful(false);
              });
          }
          setFileContent(content);
        }).catch((err: any) => {
          setStatusMessage(`Validation error: ${err?.message || 'Unknown error'}`);
          setFileContent(content);
          setIsValidationSuccessful(false);
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

    reader.readAsText(selectedFile);
  };

  const handleDraw = () => {
    if (fileContent && isValidationSuccessful) {
      setGeoJson(fileContent as MGeoJson);
      setStatusMessage('Data drawn on map.');
    } else {
      setStatusMessage('Please validate a file successfully before drawing.');
    }
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
      const validationRoute = selectedSchema === 'building'
        ? route('data_map.validateBuilding')
        : route('data_map.validateSite');
      const response = await axios.post(validationRoute, { geojson: sourceGeoJson });
      setValidationResults(response.data.results);
      setValidationGeoJson(sourceGeoJson); // Set the correct geojson for import
      setIsReportModalOpen(true);
    } catch (error) { 
      console.error('Validation failed:', error);
      alert('An error occurred during validation.');
    }
  };

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

  const filteredBuildingCentroids = useMemo(() => {
    const selectedPolygons = shapes.data.features.filter(shape => selectedShapeIds.includes(shape.id as string));
    const hasSelectedShapes = selectedPolygons.length > 0;

    return buildingCentroidsData.filter(d => {
      if (hasSelectedShapes) {
        const point = turf.point(d.coordinates);
        const isInSelectedShape = selectedPolygons.some(polygon => {
          try {
            return booleanPointInPolygon(point, polygon as any);
          } catch (e) {
            return false;
          }
        });
        if (!isInSelectedShape) {
          return false;
        }
      }

      const floors = d.properties?.numberoffloors || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [buildingCentroidsData, floorRange, selectedShapeIds, shapes.data.features]);

  const filteredSiteCentroids = useMemo(() => {
    const selectedPolygons = shapes.data.features.filter(shape => selectedShapeIds.includes(shape.id as string));
    const hasSelectedShapes = selectedPolygons.length > 0;

    return siteCentroidsData.filter(d => {
      if (hasSelectedShapes) {
        const point = turf.point(d.coordinates);
        const isInSelectedShape = selectedPolygons.some(polygon => {
          try {
            return booleanPointInPolygon(point, polygon as any);
          } catch (e) {
            return false;
          }
        });
        if (!isInSelectedShape) {
          return false;
        }
      }

      const floors = d.properties?.numberoffloors || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [siteCentroidsData, floorRange, selectedShapeIds, shapes.data.features]);

  const allFilteredData = useMemo(() => {
    const isAnyTypeSelected = dataType.buildings || dataType.sites;
    if (!isAnyTypeSelected) {
      return [...filteredBuildingCentroids, ...filteredSiteCentroids];
    }
    const data = [];
    if (dataType.buildings) data.push(...filteredBuildingCentroids);
    if (dataType.sites) data.push(...filteredSiteCentroids);
    return data;
  }, [filteredBuildingCentroids, filteredSiteCentroids, dataType]);

  const isInitialLoad = useRef(true);
  const initialZoomApplied = useRef(false);

  useEffect(() => {
    if (!initialZoomApplied.current && (buildingCentroidsData.length > 0 || siteCentroidsData.length > 0)) {
      const allData = [...buildingCentroidsData, ...siteCentroidsData];
      if (allData.length > 0) {
        try {
          const points = turf.featureCollection(
            allData.map(c => turf.point(c.coordinates))
          );
          const bbox = turf.bbox(points);
          const [minLng, minLat, maxLng, maxLat] = bbox;

          const viewport = new WebMercatorViewport({ ...viewState, width: window.innerWidth, height: window.innerHeight });
          const { longitude, latitude, zoom } = viewport.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 100 }
          );

          setViewState(prev => ({
            ...prev,
            longitude,
            latitude,
            zoom: zoom,
            transitionDuration: 1000,
            transitionInterpolator: new FlyToInterpolator(),
          }));

          initialZoomApplied.current = true;
        } catch (error) {
          console.error("Error adjusting initial zoom to data:", error);
        }
      }
    }
  }, [buildingCentroidsData, siteCentroidsData]);

  useEffect(() => {
    if (isInitialLoad.current) {
        if (buildingCentroidsData.length > 0 || siteCentroidsData.length > 0) {
            isInitialLoad.current = false;
        }
        return;
    }

    const dataToBound = allFilteredData;

    if (dataToBound.length > 0) {
        try {
            const points = turf.featureCollection(dataToBound.map(c => turf.point(c.coordinates)));
            const bbox = turf.bbox(points);
            const [minLng, minLat, maxLng, maxLat] = bbox;

            const viewport = new WebMercatorViewport({ ...viewState, width: window.innerWidth, height: window.innerHeight });
            const { longitude, latitude, zoom } = viewport.fitBounds(
                [[minLng, minLat], [maxLng, maxLat]],
                { padding: 100 }
            );

            setViewState(prev => ({
                ...prev,
                longitude,
                latitude,
                zoom,
                transitionDuration: 800,
                transitionInterpolator: new FlyToInterpolator(),
            }));
        } catch (error) {
            console.error("Error adjusting zoom to filtered data:", error);
        }
    } else if (selectedShapeIds.length > 0) {
        const selectedPolygons = shapes.data.features.filter(shape => selectedShapeIds.includes(shape.id as string));
        if (selectedPolygons.length > 0) {
            try {
                const featureCollection = turf.featureCollection(selectedPolygons as any[]);
                const bbox = turf.bbox(featureCollection);
                const [minLng, minLat, maxLng, maxLat] = bbox;

                const viewport = new WebMercatorViewport({ ...viewState, width: window.innerWidth, height: window.innerHeight });
                const { longitude, latitude, zoom } = viewport.fitBounds(
                    [[minLng, minLat], [maxLng, maxLat]],
                    { padding: 100 }
                );

                setViewState(prev => ({
                    ...prev,
                    longitude,
                    latitude,
                    zoom,
                    transitionDuration: 800,
                    transitionInterpolator: new FlyToInterpolator(),
                }));
            } catch (error) {
                console.error("Error adjusting zoom to selected wards:", error);
            }
        }
    }
}, [allFilteredData, selectedShapeIds, shapes.data.features]);


  const zoomBasedRadius = useMemo(() => {
    return Math.max(1, Math.pow(2, 14 - viewState.zoom));
  }, [viewState.zoom]);

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

    (! (dataType.buildings || dataType.sites) || dataType.sites) && filteredSiteCentroids.length > 0 && new ScatterplotLayer<SiteCentroidState>({
      id: `site-layer`,
      data: filteredSiteCentroids,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
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
        if (!propertyName || !d.properties) return [0, 255, 0, 200]; // Default green for sites

        const propValue = d.properties[propertyName];
        const allData = [...filteredBuildingCentroids, ...filteredSiteCentroids];
        const uniqueValues = Array.from(new Set(allData.map(item => item.properties?.[propertyName]).filter(Boolean)));
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
          setSelectedFeature(info.object as SiteCentroidState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Layer for Building centroids (using ScatterplotLayer)
    (! (dataType.buildings || dataType.sites) || dataType.buildings) && filteredBuildingCentroids.length > 0 && new ScatterplotLayer<BuildingCentroidState>({
      id: `building-layer`,
      data: filteredBuildingCentroids,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
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
          setSelectedFeature(info.object);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
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
        <div className="flex flex-col h-[calc(100vh-65px)]">
        <div className="flex items-center justify-between p-2 pr-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Data Map</h2>
          <div className="flex gap-2">
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setIsFilterPanelOpen(true);
                setSelectedFeature(null);
                setIsImportPanelOpen(false);
              }}
            >
              Filter
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setIsImportPanelOpen(true);
                setSelectedFeature(null);
                setIsFilterPanelOpen(false);
              }}
            >
              Import GeoJSON
            </Button>
          </div>
        </div>
        <div style={{
            width: '100%', 
            position: 'relative',
            flexGrow: 1,
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
            data={allFilteredData}
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
              {hoverInfo.layer?.id.startsWith('site-layer') && 
                (hoverInfo.object.properties?.description ||
                 `Site ID: ${hoverInfo.object.id}`)
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

        <SidePanel
          isOpen={!!selectedFeature || isImportPanelOpen || isFilterPanelOpen}
          onClose={() => {
            setSelectedFeature(null);
            setIsImportPanelOpen(false);
            setIsFilterPanelOpen(false);
          }}
          title={
            selectedFeature
              ? ('roofmaterial' in selectedFeature.properties ? 'Building Details' : 'Site Details')
              : isImportPanelOpen
              ? 'Import GeoJSON'
              : 'Filter Options'
          }
        >
          {selectedFeature ? (
            // Building Details View
            <div>
              {selectedFeature.properties && Object.entries(selectedFeature.properties)
                .filter(([key]) => !['uprn', 'postcode'].includes(key.toLowerCase()))
                .map(([key, value]) => (
                <div key={key} className="mb-2">
                  <strong className="uppercase">{key.replace(/_/g, ' ')}:</strong>
                  <div className='text-gray-700'>{String(value)}</div>
                </div>
              ))}
            </div>
          ) : isImportPanelOpen ? (
            // Import GeoJSON View
            <div className='flex flex-col gap-4'>
              <div>
                <label htmlFor="schema-select" className="block text-sm font-medium text-gray-700 mb-1">Select Schema</label>
                <select 
                  id="schema-select"
                  value={selectedSchema}
                  onChange={(e) => setSelectedSchema(e.target.value as 'building' | 'site' | '')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>Select a schema</option>
                  <option value="building">Building V4</option>
                  <option value="site">Site V2</option>
                </select>
              </div>
              <input type='file' placeholder="Select files" onChange={handleFileChange} accept='.geojson' className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={!selectedSchema}/>
              <div className="flex gap-2">
                <Button size='small' variant="contained" onClick={handleValidation} disabled={!selectedFile}>Validate File</Button>
                {isValidationSuccessful && (
                  <Button size='small' variant="outlined" onClick={handleDraw} disabled={!fileContent}>Draw</Button>
                )}
              </div>
              {statusMessage && (
                <div style={{ color: validationResults.length > 0 ? 'orange' : (statusMessage.includes('error') || statusMessage.includes('invalid') ? 'red' : 'green'), marginTop: '10px' }}>
                  {statusMessage}
                </div>
              )}
              {validationResults.length > 0 && (
                <Button variant="contained" onClick={handleReviewForImport} style={{ marginTop: '10px' }}>
                  Review for Import
                </Button>
              )}
              {validationStatus !== 'idle' && !validationLimited.valid && (
                <div className={`p-2 rounded mt-2 bg-red-100 text-red-800`}>
                  <div className='flex items-center justify-between'>
                    <strong>Validation Errors:</strong>
                  </div>
                  <ul className='list-disc pl-5 mt-2'>
                    {validationLimited.errors.map((errItem, index) => {
                      const ve = errItem as ValidationError;
                      return <li key={index}>{ve.message || JSON.stringify(ve)}</li>;
                    })}
                  </ul>
                  {validationLimited.warnings.length > 0 && (
                    <div className='mt-2'>
                      <strong>Warnings:</strong>
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
            </div>
          ) : (
            // Filter Options
            <div className="p-4">
              <h4 className="font-semibold mb-4 text-gray-800">Ward Boundary</h4>
              <div className="space-y-3 mb-4">
                {shapes.data.features.map(shape => (
                  <label 
                    key={shape.id}
                    htmlFor={`shape-${shape.id}`}
                    className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                      selectedShapeIds.includes(shape.id as string)
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }`}>
                    <input
                      type="checkbox"
                      id={`shape-${shape.id}`}
                      checked={selectedShapeIds.includes(shape.id as string)}
                      onChange={() => {
                        const shapeId = shape.id as string;
                        setSelectedShapeIds(prev => 
                          prev.includes(shapeId) 
                            ? prev.filter(id => id !== shapeId) 
                            : [...prev, shapeId]
                        );
                      }}
                      className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-3">
                      {shape.properties.wd24nm}
                    </span>
                  </label>
                ))}
              </div>
              <h4 className="font-semibold mb-4 text-gray-800">Data Types</h4>
              <div className="space-y-3">
                <label 
                  htmlFor="show-buildings"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.buildings
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-buildings"
                    checked={dataType.buildings}
                    onChange={() => setDataType(prev => ({ ...prev, buildings: !prev.buildings }))}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    Buildings
                  </span>
                </label>
                <label 
                  htmlFor="show-sites"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.sites
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-sites"
                    checked={dataType.sites}
                    onChange={() => setDataType(prev => ({ ...prev, sites: !prev.sites }))}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    Sites
                  </span>
                </label>
              </div>
            </div>
          )}
        </SidePanel>

        <ValidationReportModal 
          open={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          results={validationResults}
          geoJson={validationGeoJson}
          onImportSuccess={handleImportSuccess}
          schema={selectedSchema}
        />
        </div>
      </AuthenticatedLayout>
    </>
  );
}



export default memo(Index);