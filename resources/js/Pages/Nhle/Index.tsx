import React, { memo, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import "maplibre-gl/dist/maplibre-gl.css";
import { Head, router, usePage, useRemember, } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import axios, { AxiosResponse, AxiosError } from 'axios';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { GeoJsonLayer, ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import { Button } from '@mui/material';
import useGeoJsonValidation from '@/hooks/useGeoJsonValidation';
import ValidationReportModal from './components/ValidationReportModal';
import ToggleControl from './components/ToggleControl';
import MapControls from './components/MapControls';
import FilterPanel from './components/FilterPanel';
import { getColorForValue } from '@/utils/colors';
import Legend from '@/Components/DataMap/Legend';
import SidePanel from './components/SidePanel';
import MinMaxRangeSlider from './components/MinMaxRangeSlider';

import type { Feature, Geometry, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { BuildingProperties, BuildingGeoJson } from '@/types/building';
import type { BuildingPartProperties, BuildingPartGeoJson } from '@/types/buildingpart';
import type { SiteGeoJson } from '@/types/site';
import type { PageProps } from '@/types';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    BuiltupAreaGeoJson,
    SelectedShapeData, 
    MGeoJson, 
    FetchedPolygonsData,
    LoadedNhleFeatureState,
    ValidationError
} from './types';
import { NhleData } from '@/types/nhle';



export function Index({ auth }: PageProps) {
  const { shapes: mShapes, buildings, buildingParts, sites, nhle, center } = usePage<{
    shapes: {data: BuiltupAreaGeoJson};
    buildings: { data: BuildingGeoJson };
    buildingParts: { data: BuildingPartGeoJson };
    sites: { data: SiteGeoJson };
    nhle: NhleData[];
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
  const [buildingPartCentroidsData, setBuildingPartCentroidsData] = useState<BuildingPartCentroidState[]>([]);
  const [siteCentroidsData, setSiteCentroidsData] = useState<SiteCentroidState[]>([]);
  const [nhleCentroidsData, setNhleCentroidsData] = useState<NhleFeatureState[]>([]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<BuildingCentroidState | BuildingPartCentroidState | SiteCentroidState | NhleFeatureState | null>(null);
  const [selectedLegendItem, setSelectedLegendItem] = useState<any | null>(null);
  const [category1, setCategory1] = useState<string>('Fixed Size');
  const [category2, setCategory2] = useState<string>('Building');
  const [floorRange, setFloorRange] = useState({ min: 0, max: 50 });
  const [dataType, setDataType] = useState({ buildings: false, buildingParts: false, sites: false, nhle: false });
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>(() => {
    const farnhamShape = mShapes.data.features.find(shape => 
      shape.properties.bua24nm.toLowerCase() === 'farnham'
    );
    return farnhamShape ? [farnhamShape.id as string] : [];
  });
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [boundarySearch, setBoundarySearch] = useState<string>('');

  const maxFloors = useMemo(() => {
    if (buildingCentroidsData.length === 0) {
      return 50; // Default max if no data
    }
    
    // Debug: Log first building properties to see available fields
    if (buildingCentroidsData.length > 0) {
      console.log('Building properties sample:', buildingCentroidsData[0].properties);
    }
    
    const max = Math.max(...buildingCentroidsData.map(d => {
      const floors = d.properties?.numberoffloors || d.properties?.floors || d.properties?.numFloors || d.properties?.floor_count || 0;
      return floors;
    }));
    return max > 0 ? max : 50;
  }, [buildingCentroidsData]);

  useEffect(() => {
    setFloorRange(prev => ({ ...prev, max: maxFloors }));
  }, [maxFloors]);

  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<'building' | 'site' | 'nhle' | 'buildingpart' | ''>('');
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
    'Change Type': 'changetype',
    'Usage': 'buildingusage',
    'Connectivity': 'connectivity',
    'Material': 'constructionmaterial',
    'OSLandTiera': 'oslandusetiera',
    'Grade': 'grade',
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
    if (buildingParts) {
      const centroids: BuildingPartCentroidState[] = [];
      for (const feature of buildingParts.data.features) {
        if (feature.geometry) {
          try {
            const centroid = turf.centroid(feature.geometry as any);
            const coordinates = centroid.geometry.coordinates as [number, number];
            
            centroids.push({
              id: feature.id as string,
              coordinates,
              properties: feature.properties as BuildingPartProperties
            });
          } catch (error) {
            console.error('Error calculating centroid for building part feature:', feature.id, error);
          }
        }
      }
      setBuildingPartCentroidsData(centroids);
    }
  }, [buildingParts]);

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

  useEffect(() => {
    if (nhle) {
      const centroids: NhleFeatureState[] = [];
      for (const item of nhle) {
        if (item.geom && item.geom.type === 'MultiPoint' && item.geom.coordinates.length > 0) {
          try {
            const coordinates = item.geom.coordinates[0] as [number, number];
            
            centroids.push({
              id: item.gid?.toString() || '',
              coordinates,
              properties: {
                nhle_id: item.objectid,
                list_entry: item.listentry,
                name: item.name,
                grade: item.grade,
                hyperlink: item.hyperlink,
                ngr: item.ngr,
              }
            });
          } catch (error) {
            console.error('Error processing NHLE feature:', item.gid, error);
          }
        }
      }
      setNhleCentroidsData(centroids);
    }
  }, [nhle]);

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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchField, setSearchField] = useState('all');
  const [searchMarker, setSearchMarker] = useState<{coordinates: [number, number], data: any, type: string} | null>(null);

  // Search functionality
  const searchableFields = {
    nhle: ['name', 'grade', 'hyperlink', 'ngr', 'list_entry'],
    building: ['osid', 'uprn', 'postcode', 'description', 'constructionmaterial', 'roofmaterial', 'buildinguse', 'numberoffloors'],
    buildingpart: ['osid', 'toid', 'description', 'theme', 'oslandcovertiera', 'oslandcovertierb', 'oslandusetiera', 'oslandusetierb', 'associatedstructure'],
    site: ['osid', 'toid', 'uprn', 'changetype', 'description', 'buildinguse', 'theme', 'area']
  };


  const handleSearchResultClick = useCallback((result: any) => {
    // Create selected feature object based on result type
    const selectedFeatureData = {
      id: result.id,
      coordinates: result.coordinates,
      properties: result.data
    };

    // Set the selected feature to open side panel
    setSelectedFeature(selectedFeatureData);
    
    // Set search marker
    setSearchMarker({
      coordinates: result.coordinates,
      data: result.data,
      type: result.type
    });

    // Fly to the selected location
    setViewState({
      ...viewState,
      longitude: result.coordinates[0],
      latitude: result.coordinates[1],
      zoom: 18,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator()
    });
    
    setIsSearchModalOpen(false);
  }, [viewState]);

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
            let validationRoute;
            switch (selectedSchema) {
              case 'building':
                validationRoute = route('data_map.validateBuilding');
                break;
              case 'site':
                validationRoute = route('data_map.validateSite');
                break;
              case 'nhle':
                validationRoute = route('data_map.validateNhle');
                break;
              case 'buildingpart':
                validationRoute = route('data_map.validateBuildingPart');
                break;
              default:
                setStatusMessage('Invalid schema selected');
                setIsValidationSuccessful(false);
                return;
            }

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
      let validationRoute;
      switch (selectedSchema) {
        case 'building':
          validationRoute = route('data_map.validateBuilding');
          break;
        case 'site':
          validationRoute = route('data_map.validateSite');
          break;
        case 'nhle':
          validationRoute = route('data_map.validateNhle');
          break;
        case 'buildingpart':
          validationRoute = route('data_map.validateBuildingPart');
          break;
        default:
          alert('Invalid schema selected');
          return;
      }
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

      // Check multiple possible property names for floors
      const floors = d.properties?.numberoffloors || d.properties?.floors || d.properties?.numFloors || d.properties?.floor_count || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [buildingCentroidsData, floorRange, selectedShapeIds, shapes.data.features]);

  const filteredBuildingPartCentroids = useMemo(() => {
    const selectedPolygons = shapes.data.features.filter(shape => selectedShapeIds.includes(shape.id as string));
    const hasSelectedShapes = selectedPolygons.length > 0;

    return buildingPartCentroidsData.filter(d => {
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

      return true;
    });
  }, [buildingPartCentroidsData, selectedShapeIds, shapes.data.features]);

  const filteredNhleCentroids = useMemo(() => {
    const selectedPolygons = shapes.data.features.filter(shape => selectedShapeIds.includes(shape.id as string));
    const hasSelectedShapes = selectedPolygons.length > 0;

    return nhleCentroidsData.filter(d => {
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

      // Filter by grade if grades are selected
      if (selectedGrades.length > 0) {
        const grade = d.properties?.grade;
        if (!grade || !selectedGrades.includes(grade)) {
          return false;
        }
      }

      return true;
    });
  }, [nhleCentroidsData, selectedShapeIds, shapes.data.features, selectedGrades]);

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

      // Check multiple possible property names for floors
      const floors = d.properties?.numberoffloors || d.properties?.floors || d.properties?.numFloors || d.properties?.floor_count || 0;
      return floors >= floorRange.min && floors <= floorRange.max;
    });
  }, [siteCentroidsData, floorRange, selectedShapeIds, shapes.data.features]);

  const availableGrades = useMemo(() => {
    const grades = nhleCentroidsData.map(d => d.properties?.grade).filter(Boolean);
    return Array.from(new Set(grades)).sort();
  }, [nhleCentroidsData]);

  const filteredShapes = useMemo(() => {
    if (!boundarySearch) return shapes.data.features;
    return shapes.data.features.filter(shape => 
      shape.properties.bua24nm.toLowerCase().includes(boundarySearch.toLowerCase())
    );
  }, [shapes.data.features, boundarySearch]);

  const allFilteredData = useMemo(() => {
    const isAnyTypeSelected = dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle;
    if (!isAnyTypeSelected) {
      return [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids, ...filteredNhleCentroids];
    }
    const data = [];
    if (dataType.buildings) data.push(...filteredBuildingCentroids);
    if (dataType.buildingParts) data.push(...filteredBuildingPartCentroids);
    if (dataType.sites) data.push(...filteredSiteCentroids);
    if (dataType.nhle) data.push(...filteredNhleCentroids);
    return data;
  }, [filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, dataType]);

  const performSearch = useCallback((query: string, field: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: any[] = [];
    const searchTerm = query.toLowerCase();

    // Use filtered data instead of raw data to respect selected shapes
    const dataToSearch = {
      nhle: filteredNhleCentroids,
      building: filteredBuildingCentroids,
      buildingPart: filteredBuildingPartCentroids,
      site: filteredSiteCentroids
    };

    // Search NHLE data (only within selected shapes)
    dataToSearch.nhle.forEach(item => {
      const props = item.properties;
      if (field === 'all' || searchableFields.nhle.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.nhle : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
        if (matches) {
          results.push({
            type: 'NHLE',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.name || 'Unnamed NHLE'
          });
        }
      }
    });

    // Search Building data (only within selected shapes)
    dataToSearch.building.forEach(item => {
      const props = item.properties;
      if (field === 'all' || searchableFields.building.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.building : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
        if (matches) {
          results.push({
            type: 'Building',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.description || props.osid || 'Unnamed Building'
          });
        }
      }
    });

    // Search BuildingPart data (only within selected shapes)
    dataToSearch.buildingPart.forEach(item => {
      const props = item.properties;
      if (field === 'all' || searchableFields.buildingpart.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.buildingpart : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
        if (matches) {
          results.push({
            type: 'Building Part',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.description || props.osid || 'Unnamed Building Part'
          });
        }
      }
    });

    // Search Site data (only within selected shapes)
    dataToSearch.site.forEach(item => {
      const props = item.properties;
      if (field === 'all' || searchableFields.site.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.site : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
        if (matches) {
          results.push({
            type: 'Site',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.description || props.osid || 'Unnamed Site'
          });
        }
      }
    });

    setSearchResults(results.slice(0, 50)); // Limit to 50 results
  }, [filteredNhleCentroids, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids]);

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        performSearch(searchQuery, searchField);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchField, performSearch]);

  const isInitialLoad = useRef(true);
  const initialZoomApplied = useRef(false);

  useEffect(() => {
    if (!initialZoomApplied.current && (buildingCentroidsData.length > 0 || buildingPartCentroidsData.length > 0 || siteCentroidsData.length > 0 || nhleCentroidsData.length > 0)) {
      const allData = [...buildingCentroidsData, ...buildingPartCentroidsData, ...siteCentroidsData, ...nhleCentroidsData];
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
  }, [buildingCentroidsData, buildingPartCentroidsData, siteCentroidsData]);

  useEffect(() => {
    if (isInitialLoad.current) {
        if (buildingCentroidsData.length > 0 || buildingPartCentroidsData.length > 0 || siteCentroidsData.length > 0) {
            isInitialLoad.current = false;
        }
        return;
    }

    // Add a small delay to ensure filtering is complete
    const timeoutId = setTimeout(() => {
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
    }, 100); // Small delay to ensure state updates are complete

    return () => clearTimeout(timeoutId);
}, [allFilteredData, selectedShapeIds, shapes.data.features, floorRange, dataType]);


  const zoomBasedRadius = useMemo(() => {
    return Math.max(1, Math.pow(2, 14 - viewState.zoom));
  }, [viewState.zoom]);

  const layers = [
    // new GeoJsonLayer<ShapeProperties>({
    //   id: 'shapes-layer',
    //   data: shapes.data,
    //   pickable: true,
    //   stroked: true,
    //   filled: false,
    //   lineWidthMinPixels: 1,
    //   getLineColor: [100, 100, 100, 100],
    //   getLineWidth: 1
    // }),

    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle) || dataType.buildingParts) && filteredBuildingPartCentroids.length > 0 && new ScatterplotLayer<BuildingPartCentroidState>({
      id: `buildingpart-layer`,
      data: filteredBuildingPartCentroids,
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
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const propertyName = groupByMapping[category2];
        if (!propertyName || !d.properties) return [255, 165, 0, 200]; // Default orange for building parts

        const propValue = d.properties[propertyName];
        const allData = [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids];
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
          setSelectedFeature(info.object as BuildingPartCentroidState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle) || dataType.sites) && filteredSiteCentroids.length > 0 && new ScatterplotLayer<SiteCentroidState>({
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
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const propertyName = groupByMapping[category2];
        if (!propertyName || !d.properties) return [0, 255, 0, 200]; // Default green for sites

        const propValue = d.properties[propertyName];
        const allData = [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids];
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
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids],
        getRadius: [category1, category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle) || dataType.nhle) && filteredNhleCentroids.length > 0 && new ScatterplotLayer<NhleFeatureState>({
      id: `nhle-layer`,
      data: filteredNhleCentroids,
      pickable: true,
      stroked: true,
      filled: true,
      radiusScale: zoomBasedRadius,
      radiusMaxPixels: 15,
      lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => {
        let baseRadius = 10;

        if (selectedLegendItem !== null) {
          const propertyName = groupByMapping[category2];
          const propValue = (d.properties as any)?.[propertyName];
          return propValue === selectedLegendItem ? baseRadius * 1.5 : baseRadius / 2;
        }

        return baseRadius;
      },
      getFillColor: (d: any) => {
        const propertyName = groupByMapping[category2];
        if (!propertyName || !d.properties) return [255, 0, 0, 200]; // Default red for NHLE

        const propValue = (d.properties as any)[propertyName];
        const allData = [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids, ...filteredNhleCentroids];
        const uniqueValues = Array.from(new Set(allData.map(item => (item.properties as any)?.[propertyName]).filter(Boolean)));
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
          setSelectedFeature(info.object as NhleFeatureState);
        }
      },
      updateTriggers: {
        getFillColor: [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids],
        getRadius: [category2, selectedLegendItem, zoomBasedRadius],
      },
    }),

    // Layer for Building centroids (using ScatterplotLayer)
    (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle) || dataType.buildings) && filteredBuildingCentroids.length > 0 && new ScatterplotLayer<BuildingCentroidState>({
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
          const propValue = (d.properties as any)?.[propertyName];
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

    // Search pin marker layer
    searchMarker && new IconLayer({
      id: 'search-pin-marker-layer',
      data: [{
        ...searchMarker,
        icon: 'pin'
      }],
      pickable: true,
      iconAtlas: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2C15.163 2 8 9.163 8 18c0 13.5 16 26 16 26s16-12.5 16-26c0-8.837-7.163-16-16-16z" fill="#FF0000" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="24" cy="18" r="6" fill="#FFFFFF"/>
        </svg>
      `),
      iconMapping: {
        pin: {
          x: 0,
          y: 0,
          width: 48,
          height: 48,
          anchorY: 48,
          anchorX: 24
        }
      },
      getIcon: d => 'pin',
      getPosition: d => d.coordinates,
      getSize: 32,
      getColor: [255, 0, 0, 255],
      onHover: info => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            layer: info.layer,
            object: {
              properties: info.object.data,
              type: info.object.type
            }
          });
        } else {
          setHoverInfo(null);
        }
      },
      onClick: info => {
        if (info.object) {
          const selectedFeatureData = {
            id: `search-${Date.now()}`,
            coordinates: info.object.coordinates,
            properties: info.object.data
          };
          setSelectedFeature(selectedFeatureData);
        }
      },
    }),
  ].filter(Boolean);

  return (
    <>
      <Head title="Data Map" />
      <AuthenticatedLayout user={auth.user}>
        <div className="flex flex-col h-[calc(100vh-65px)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 pr-4 bg-white border-b border-gray-200 gap-2">
          <h2 className="text-lg font-semibold text-gray-800 flex-shrink-0">Data Map</h2>
          
          {/* Search bar - full width on mobile, constrained on desktop */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-md sm:mx-4">
            <div 
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors flex-1 min-w-0"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-gray-500 text-sm truncate hidden sm:inline">Search for addresses or values in the data...</span>
              <span className="text-gray-500 text-sm truncate sm:hidden">Search...</span>
            </div>
          </div>
          
          {/* Buttons - stack on mobile, inline on desktop */}
          <div className="flex gap-2 flex-shrink-0">
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

          <div className="absolute top-2.5 right-2.5 z-10 flex items-start gap-2">
            <FilterPanel
            category1={category1}
            category2={category2}
            dataType={dataType}
            onCategory1Change={setCategory1}
            onCategory2Change={setCategory2}
          />
            <MapControls 
              viewState={viewState} 
              onViewStateChange={(params) => setViewState(params.viewState as MapViewState)}
            />
          </div>

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
              {hoverInfo.layer?.id.startsWith('buildingpart-layer') && 
                (hoverInfo.object.properties?.description ||
                 hoverInfo.object.properties?.theme ||
                 `Building Part ID: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('site-layer') && 
                (hoverInfo.object.properties?.description ||
                 `Site ID: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('nhle-layer') && 
                (hoverInfo.object.properties?.name || 
                 `NHLE ID: ${hoverInfo.object.id}`)
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
            setSearchMarker(null);
            setIsImportPanelOpen(false);
            setIsFilterPanelOpen(false);
          }}
          title={
            selectedFeature
              ? ('roofmaterial' in selectedFeature.properties ? 'Building Details' : 
                 'absoluteheightroofbase' in selectedFeature.properties ? 'Building Part Details' :
                 'listentry' in selectedFeature.properties ? 'NHLE Details' : 'Site Details')
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
                  onChange={(e) => setSelectedSchema(e.target.value as 'building' | 'site' | 'nhle' | 'buildingpart' | '')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>Select a schema</option>
                  <option value="building">Building V4</option>
                  <option value="site">Site V2</option>
                  <option value="nhle">NHLE</option>
                  <option value="buildingpart">Building Part V2</option>
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
              <h4 className="font-semibold mb-4 text-gray-800">Built-up Areas</h4>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search boundaries..."
                  value={boundarySearch}
                  onChange={(e) => setBoundarySearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {filteredShapes.map(shape => (
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
                      {shape.properties.bua24nm}
                    </span>
                  </label>
                ))}
                {filteredShapes.length === 0 && (
                  <div className="text-gray-500 text-sm text-center py-4">
                    No boundaries found matching "{boundarySearch}"
                  </div>
                )}
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
                  htmlFor="show-buildingparts"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.buildingParts
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-buildingparts"
                    checked={dataType.buildingParts}
                    onChange={() => setDataType(prev => ({ ...prev, buildingParts: !prev.buildingParts }))}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    Building Parts
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
                <div>
                  <label 
                    htmlFor="show-nhle"
                    className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                      dataType.nhle
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                    }`}>
                    <input
                      type="checkbox"
                      id="show-nhle"
                      checked={dataType.nhle}
                      onChange={() => {
                        setDataType(prev => ({ ...prev, nhle: !prev.nhle }));
                        if (!dataType.nhle) {
                          setSelectedGrades([]);
                        }
                      }}
                      className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-3">
                      NHLE
                    </span>
                  </label>
                  
                  {/* {dataType.nhle && availableGrades.length > 0 && (
                    <div className="ml-8 mt-2 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Filter by Grade:</h5>
                      <div className="space-y-1">
                        {availableGrades.map(grade => (
                          <label 
                            key={grade}
                            htmlFor={`grade-${grade}`}
                            className={`flex items-center w-full text-left px-3 py-2 rounded text-sm transition-all duration-200 ease-in-out cursor-pointer ${
                              selectedGrades.includes(grade)
                                ? 'bg-blue-50 text-blue-700 border-blue-200 border'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                            }`}>
                            <input
                              type="checkbox"
                              id={`grade-${grade}`}
                              checked={selectedGrades.includes(grade)}
                              onChange={() => {
                                setSelectedGrades(prev => 
                                  prev.includes(grade) 
                                    ? prev.filter(g => g !== grade) 
                                    : [...prev, grade]
                                );
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2">
                              Grade {grade}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )} */}
                  
                  <h4 className="font-semibold mb-4 mt-4 text-gray-800">Floor Range Filter</h4>
                  <div className="mb-4 px-2">
                    <MinMaxRangeSlider
                      min={0}
                      max={maxFloors}
                      minVal={floorRange.min}
                      maxVal={floorRange.max}
                      onChange={setFloorRange}
                    />
                  </div>
                </div>
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

        {/* Search Modal */}
        {isSearchModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-4 sm:pt-20 z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsSearchModalOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }
            }}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] sm:max-h-[70vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Search</h3>
                </div>
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Input and Filter */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600 hidden sm:inline">Search for addresses or values in the data</span>
                  <span className="text-sm text-gray-600 sm:hidden">Search in data</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Fields</option>
                    <optgroup label="NHLE">
                      {searchableFields.nhle.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Building">
                      {searchableFields.building.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Building Part">
                      {searchableFields.buildingpart.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Site">
                      {searchableFields.site.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-y-auto">
                {searchQuery && searchResults.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No results found for "{searchQuery}"
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded self-start ${
                                result.type === 'NHLE' ? 'bg-blue-100 text-blue-800' :
                                result.type === 'Building' ? 'bg-green-100 text-green-800' :
                                result.type === 'Building Part' ? 'bg-purple-100 text-purple-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {result.type}
                              </span>
                              <h4 className="font-medium text-gray-900 truncate">{result.displayText}</h4>
                            </div>
                            <div className="text-sm text-gray-600">
                              {Object.entries(result.data)
                                .filter(([key, value]) => value && String(value).toLowerCase().includes(searchQuery.toLowerCase()))
                                .slice(0, 2)
                                .map(([key, value]) => (
                                  <div key={key} className="mb-1 truncate">
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 flex-shrink-0 self-start sm:ml-4">
                            {result.coordinates[1].toFixed(4)}, {result.coordinates[0].toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Start typing to search through the data...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthenticatedLayout>
    </>
  );
}



export default memo(Index);