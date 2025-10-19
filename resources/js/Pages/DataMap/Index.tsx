import React, { memo, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import "maplibre-gl/dist/maplibre-gl.css";
import { Head, router, usePage, useRemember, } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import DeckGL from '@deck.gl/react';
import MapGL from 'react-map-gl/maplibre';
import axios, { AxiosResponse, AxiosError } from 'axios';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import booleanIntersects from '@turf/boolean-intersects';
import { GeoJsonLayer, ScatterplotLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { MapViewState, WebMercatorViewport, FlyToInterpolator } from '@deck.gl/core';
import { PathStyleExtension } from '@deck.gl/extensions';
import { createMapLayers } from './layers/MapLayers';
import { useDataFilters } from './hooks/useDataFilters';
import ConnectionsModal from '@/Components/DataMap/ConnectionsModal';
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
import { searchableFields } from '@/Constants/searchableFields';
import MetadataGrid from '@/Components/DataMap/MetadataGrid';
import PhotoPanel from '@/Components/DataMap/PhotoPanel';
import { fetchAllBuildingData, findNearestFeature } from '@/Pages/BuildingHeight/api/fetch-building';

import type { Feature, Geometry, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { BuildingProperties as BuildingPropertiesV4, BuildingGeoJson } from '@/types/buildingv4';
import type { BuildingPartProperties, BuildingPartGeoJson } from '@/types/buildingpartv2';
import type { SiteGeoJson } from '@/types/site';
import type { PageProps } from '@/types';
import type { 
    BuildingCentroidState, 
    BuildingPartCentroidState,
    SiteCentroidState,
    NhleFeatureState,
    PhotoCentroidState,
    BuiltupAreaGeoJson,
    MGeoJson, 
    FetchedPolygonsData,
    LoadedNhleFeatureState,
    ValidationError,
    UprnCentroidState
} from './types';
import { NhleProperties } from '@/types/nhle';
import { connect } from 'node:tls';


export function Index({ auth }: PageProps) {
  const { shapes: mShapes, buildings, buildingParts, sites, nhle, photos, center, uprn, epcCertificates } = usePage<{
    shapes: {data: BuiltupAreaGeoJson} | null;
    buildings: { data: BuildingGeoJson };
    buildingParts: { data: BuildingPartGeoJson };
    sites: { data: SiteGeoJson };
    nhle: NhleProperties[];
    photos: { type: 'FeatureCollection', features: any[] };
    center?: { type: 'Point', coordinates: [number, number] };
    uprn?: { data: any };
    landRegistryInspire?: { data: any };
    osmBuildingParts?: { data: any };
    epcCertificates?: { data: any };
  }>().props;


  // State for shapes data that will be loaded asynchronously
  const [shapes, setShapes] = useState<{data: BuiltupAreaGeoJson} | null>(null);
  const [isLoadingShapes, setIsLoadingShapes] = useState<boolean>(true);
  
  const [mapStyle, setMapStyle] = useState("https://tiles.openfreemap.org/styles/liberty");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0.1,
    latitude: 52.5,
    zoom: 6,
    pitch: 0,
    bearing: 0,
  });

  const [buildingCentroidsData, setBuildingCentroidsData] = useState<BuildingCentroidState[]>([]);
  const [buildingPartCentroidsData, setBuildingPartCentroidsData] = useState<BuildingPartCentroidState[]>([]);
  const [buildingPartPolygonsData, setBuildingPartPolygonsData] = useState<BuildingPartGeoJson | null>(null);
  const [siteCentroidsData, setSiteCentroidsData] = useState<SiteCentroidState[]>([]);
  const [nhleCentroidsData, setNhleCentroidsData] = useState<NhleFeatureState[]>([]);
  const [photoCentroidsData, setPhotoCentroidsData] = useState<PhotoCentroidState[]>([]);
  const [uprnCentroidsData, setUprnCentroidsData] = useState<UprnCentroidState[]>([]);
  const [landRegistryInspireData, setLandRegistryInspireData] = useState<any>(null);
  const [contextualInspireData, setContextualInspireData] = useState<any>(null); // For contextual data near selected feature
  const [osmBuildingPartCentroidsData, setOsmBuildingPartCentroidsData] = useState<any[]>([]);
  const [osmBuildingPartPolygonsData, setOsmBuildingPartPolygonsData] = useState<any>(null); // Store OSM building part polygons for display
  const [osmLanduseAreasCentroidsData, setosmLanduseAreasCentroidsData] = useState<any[]>([]);
  const [epcCertificateCentroidsData, setEpcCertificateCentroidsData] = useState<any[]>([]);
  // Collapsed UPRN groups (30m proximity): show balanced representatives based on FILTERED UPRN
  const UPRN_GROUP_RADIUS_M = 30; // meters
  const MAX_PER_REP = 8; // max members per representative group for balance
  const FLOOR_HEIGHT_METERS = 3; // Height per floor level for vertical spidering
  const ELEVATION_SCALE = 1; // Scale factor for elevation visualization

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number; layer: any, object: any } | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<BuildingCentroidState | BuildingPartCentroidState | SiteCentroidState | NhleFeatureState | PhotoCentroidState | null>(null);
  const [selectedLegendItem, setSelectedLegendItem] = useState<any | null>(null);
  const [category1, setCategory1] = useState<string>('Fixed Size');
  const [category2, setCategory2] = useState<string>('Building');
  const [floorRange, setFloorRange] = useState({ min: 0, max: 50 });
  const [dataType, setDataType] = useState({ buildings: false, buildingParts: false, sites: false, nhle: false, photos: false, uprn: false, osmBuildingParts: false, osmLanduseAreas: false, epcCertificates: false });
  const [showPhotoBearingPolygon, setShowPhotoBearingPolygon] = useState(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [boundarySearch, setBoundarySearch] = useState<string>('');
  const [showSelectedOnly, setShowSelectedOnly] = useState<boolean>(false);
  const [areaDataCache, setAreaDataCache] = useState<{[key: string]: any}>({});
  const [isLoadingAreaData, setIsLoadingAreaData] = useState<boolean>(false);
  const [skipInitialFetch, setSkipInitialFetch] = useState<boolean>(true);

  // Additional metadata states for sidepanel
  const [additionalDataCache, setAdditionalDataCache] = useState<{[key: string]: any}>({});
  const [codepointData, setCodepointData] = useState<any>(null);
  const [uprnData, setUprnData] = useState<any>(null);
  const [landData, setLandData] = useState<any>(null);
  const [shapeData, setShapeData] = useState<any>(null);
  const [buildingApiData, setBuildingApiData] = useState<any>(null);
  const [nhleData, setNhleData] = useState<any>(null);
  const [isLoadingAdditionalData, setIsLoadingAdditionalData] = useState<boolean>(false);

  // Spidering state
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [spideredConnections, setSpideredConnections] = useState<any[]>([]);
  const [spideringRadius] = useState<number>(10); // 10 meters radius

  // Fetch built-up areas on component mount
  useEffect(() => {
    const fetchBuiltupAreas = async () => {
      try {
        setIsLoadingShapes(true);
        const response = await axios.post('/builtup-area');
        mergeAreaData(response.data);

        const shapesData = response.data.shapes;
        if (shapesData?.features) {
          const farnhamShape = shapesData.features.find((shape: any) => 
            shape.properties.bua24nm.toLowerCase() === 'farnham'
          );
          if (farnhamShape) {
            setSelectedShapeIds([farnhamShape.id as string]);
            
            // Set initial view to Farnham area with smooth transition
            try {
              const [minLng, minLat, maxLng, maxLat] = turf.bbox(farnhamShape as any);
              const { longitude, latitude, zoom } = new WebMercatorViewport({
                width: window.innerWidth,
                height: window.innerHeight,
                longitude: 0.1,
                latitude: 52.5,
                zoom: 6
              }).fitBounds(
                [[minLng, minLat], [maxLng, maxLat]],
                { padding: 40 }
              );

              setViewState({
                longitude,
                latitude,
                zoom,
                pitch: 0,
                bearing: 0,
                transitionDuration: 2000,
                transitionInterpolator: new FlyToInterpolator(),
              });
            } catch (e) {
              console.error("Error calculating bounding box for Farnham:", e);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching built-up areas:', error);
      } finally {
        setIsLoadingShapes(false);
      }
    };

    fetchBuiltupAreas();
  }, []);

  const maxFloors = useMemo(() => {
    if (buildingCentroidsData.length === 0) {
      return 50; // Default max if no data
    }
    
    // Debug: Log first building properties to see available fields
    if (buildingCentroidsData.length > 0) {
      //console.log('Building properties sample:', buildingCentroidsData[0].properties);
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
  const [selectedSchema, setSelectedSchema] = useState<'building' | 'site' | 'nhle' | 'buildingpart' | 'uprn' | 'land_registry_inspire' | 'osm_building_part' | 'osm_address' | 'osm_landuse_area' | 'epc_certificate' | ''>('');
  // Fetch additional metadata when a feature is selected
  const fetchAdditionalData = useCallback(async (lat: number, lng: number, photoHeading?: number, altitude?: number) => {
    const cacheKey = `${lat.toFixed(6)}_${lng.toFixed(6)}_${photoHeading || 0}`;
    
    if (additionalDataCache[cacheKey]) {
      const cachedData = additionalDataCache[cacheKey];
      setCodepointData(cachedData.codepoint?.properties || null);
      setUprnData(cachedData.uprn?.properties || null);
      setContextualInspireData(cachedData.inspire?.properties || null);
      setLandData(cachedData.land?.properties || null);
      setShapeData(cachedData.shape?.properties || null);
      setBuildingApiData(cachedData.building || null);
      setNhleData(cachedData.nhle || null);
      return;
    }
    
    try {
      setIsLoadingAdditionalData(true);
      const data = await fetchAllBuildingData(
        lat.toString(),
        lng.toString(),
        altitude?.toString() || "0",
        photoHeading?.toString() || "0",
        "",
        false
      );
      
      const codepointFeatures = data?.codepoint?.data?.features || [];
      const nearestCodepoint = findNearestFeature(codepointFeatures, lat, lng);
      
      const uprnFeatures = data?.uprn?.data?.features || [];
      const nearestUprn = findNearestFeature(uprnFeatures, lat, lng);
      
      const inspireFeatures = data?.inspire?.data?.features || [];
      const nearestInspire = findNearestFeature(inspireFeatures, lat, lng);
      
      const landFeatures = data?.land?.features || [];
      const nearestLand = findNearestFeature(landFeatures, lat, lng);
      
      const shapeFeatures = data?.shape?.data?.features || [];
      const nearestShape = findNearestFeature(shapeFeatures, lat, lng);
      
      const nhleFeatures = data?.nhle?.data?.features || [];
      const nearestNhle = findNearestFeature(nhleFeatures, lat, lng);
      
      const fetchedData = {
        codepoint: nearestCodepoint,
        uprn: nearestUprn,
        inspire: nearestInspire,
        land: nearestLand,
        shape: nearestShape,
        building: data?.building, // Store the building data from API
        nhle: nearestNhle // Store the nhle data from API
      };
      
      // Cache the data
      setAdditionalDataCache(prev => ({
        ...prev,
        [cacheKey]: fetchedData
      }));
      
      // Set the state
      setCodepointData(nearestCodepoint?.properties || null);
      setUprnData(nearestUprn?.properties || null);
      setContextualInspireData(nearestInspire?.properties || null);
      setLandData(nearestLand?.properties || null);
      setShapeData(nearestShape?.properties || null);
      setBuildingApiData(data?.building || null);
      setNhleData(nearestNhle?.properties || null);
      
    } catch (error) {
      console.error('Error fetching additional data:', error);
    } finally {
      setIsLoadingAdditionalData(false);
    }
  }, [additionalDataCache]);

  useEffect(() => {
    if (selectedFeature) {
      setIsImportPanelOpen(false);
      setIsFilterPanelOpen(false);
      
      const isPhotoFeature = 'file_name' in selectedFeature.properties;
      
      if (isPhotoFeature && selectedFeature.coordinates && selectedFeature.coordinates.length >= 2) {
        const [lng, lat] = selectedFeature.coordinates;
        
        const photoHeading = (selectedFeature.properties as any)?.photo_heading;
        const altitude = (selectedFeature.properties as any)?.altitude;
        
        fetchAdditionalData(lat, lng, photoHeading, altitude);
      } else {
        // For non-photo features, reset contextual data immediately (keep global INSPIRE data)
        setCodepointData(null);
        setUprnData(null);
        setContextualInspireData(null);
        setLandData(null);
        setShapeData(null);
        setBuildingApiData(null);
        setIsLoadingAdditionalData(false);
      }
    } else {
      // Reset contextual data when no feature is selected (keep global INSPIRE data)
      setCodepointData(null);
      setUprnData(null);
      setContextualInspireData(null);
      setLandData(null);
      setShapeData(null);
      setBuildingApiData(null);
      setIsLoadingAdditionalData(false);
    }
  }, [selectedFeature, fetchAdditionalData]);


  useEffect(() => {
    if (selectedShapeIds.length === 1 && shapes?.data?.features) {
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
  }, [selectedShapeIds, shapes?.data?.features]);

  const groupByMapping: { [key: string]: string } = {
    'None': 'dataType', // Special case for grouping by data type
    'Change Type': 'changetype',
    'Usage': 'buildingusage',
    'Connectivity': 'connectivity',
    'Material': 'constructionmaterial',
    'OSLandTiera': 'oslandusetiera',
    'Grade': 'grade',
    'User': 'user_name',
  };

  // Auto-update group-by when data types change
  useEffect(() => {
    const optionsMap = {
      buildings: ['Usage', 'Connectivity', 'Material'],
      sites: ['OSLandTiera'],
      nhle: ['Grade'],
      buildingParts: ['OSLandTiera'],
      photos: ['User'],
      uprn: [] as string[],
      osmBuildingParts: [] as string[],
    };

    const activeTypes = Object.keys(dataType).filter(
      (key) => dataType[key as keyof typeof dataType]
    ) as (keyof typeof optionsMap)[];

    let availableOptions: string[];

    if (activeTypes.length > 0) {
      const combinedOptions = activeTypes.reduce((acc, type) => {
        return acc.concat(optionsMap[type] || []);
      }, [] as string[]);
      availableOptions = ['None', ...Array.from(new Set(combinedOptions))];
    } else {
      // If no data types are selected, show all possible options
      const allOptions = Object.values(optionsMap).flat();
      availableOptions = ['None', ...Array.from(new Set(allOptions))];
    }
    
    // If current category2 is not in available options, switch to first available option
    if (!availableOptions.includes(category2) && availableOptions.length > 0) {
      setCategory2(availableOptions[0]);
      setSelectedLegendItem(null); // Reset legend selection when group-by changes
    }
  }, [dataType, category2]);
 
  // Auto-zoom to UPRN extent when UPRN filter is enabled
  useEffect(() => {
    if (!dataType.uprn) return;
    if (!filteredUprnCentroids || filteredUprnCentroids.length === 0) return;

    try {
      const coords = filteredUprnCentroids.map(d => d.coordinates);
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }

      if (!isFinite(minLng) || !isFinite(minLat) || !isFinite(maxLng) || !isFinite(maxLat)) return;

      // If there is only a single point, pad the bbox slightly
      if (minLng === maxLng && minLat === maxLat) {
        const delta = 0.001; // ~100m padding
        minLng -= delta; maxLng += delta; minLat -= delta; maxLat += delta;
      }

      const { longitude, latitude, zoom } = new WebMercatorViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        longitude: 0,
        latitude: 0,
        zoom: 4,
      }).fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 60 }
      );

      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom,
        transitionDuration: 1200,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    } catch (e) {
      console.error('Failed to auto-zoom to UPRN extent:', e);
    }
  }, [dataType.uprn, uprnCentroidsData]);

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
              properties: feature.properties as BuildingPropertiesV4
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
      // Store polygon data for GeoJsonLayer
      setBuildingPartPolygonsData(buildingParts.data);
      
      // Calculate centroids for ScatterplotLayer
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

  useEffect(() => {
    if (photos && photos.features) {
      const centroids: PhotoCentroidState[] = [];
      for (const feature of photos.features) {
        if (feature.geometry && feature.geometry.type === 'Point') {
          try {
            const coordinates = feature.geometry.coordinates as [number, number];
            
            centroids.push({
              id: feature.id?.toString() || '',
              coordinates,
              properties: {
                id: feature.properties.id,
                path: feature.properties.path,
                file_name: feature.properties.file_name,
                user_name: feature.properties.user_name,
                user_id: feature.properties.user_id,
                photo_heading: feature.properties.photo_heading,
                accuracy: feature.properties.accuracy,
                created: feature.properties.created,
                altitude: feature.properties.altitude,
                note: feature.properties.note,
                // device fields from backend resource
                device_manufacture: feature.properties.device_manufacture,
                device_model: feature.properties.device_model,
                device_platform: feature.properties.device_platform,
                device_version: feature.properties.device_version,
                network_info: feature.properties.network_info,
                provider: feature.properties.provider,
                lat: feature.properties.lat,
                lng: feature.properties.lng,
                link: feature.properties.link,
                osnma_enabled: feature.properties.osnma_enabled,
                osnma_validated: feature.properties.osnma_validated,
                validated_sats: feature.properties.validated_sats,
              }
            });
          } catch (error) {
            console.error('Error processing photo feature:', feature.id, error);
          }
        }
      }
      setPhotoCentroidsData(centroids);
    }
  }, [photos]);

  // Map UPRN features from Inertia props to UprnCentroidState
  useEffect(() => {
    if (uprn && uprn.data && Array.isArray(uprn.data.features)) {
      const centroids: UprnCentroidState[] = [];
      for (const feature of uprn.data.features) {
        if (feature.geometry && feature.geometry.type === 'Point') {
          try {
            const coordinates = feature.geometry.coordinates as [number, number];
            centroids.push({
              id: feature.id?.toString() || feature.properties?.id?.toString() || '',
              coordinates,
              properties: {
                uprn: String(feature.properties?.uprn ?? ''),
                id: feature.properties?.id,
                ...feature.properties,
              }
            });
          } catch (error) {
            console.error('Error processing UPRN feature:', feature.id, error);
          }
        }
      }
      setUprnCentroidsData(centroids);
    } else {
      setUprnCentroidsData([]);
    }
  }, [uprn]);

  // Process Land Registry INSPIRE data from Inertia props
  const { landRegistryInspire } = usePage().props as any;
  useEffect(() => {
    if (landRegistryInspire && landRegistryInspire.data && Array.isArray(landRegistryInspire.data.features)) {
      setLandRegistryInspireData(landRegistryInspire.data);
    } else {
      setLandRegistryInspireData(null);
    }
  }, [landRegistryInspire]);

  // Process OSM Building Part data from Inertia props
  const { osmBuildingParts } = usePage().props as any;
  useEffect(() => {
    if (osmBuildingParts && osmBuildingParts.data && Array.isArray(osmBuildingParts.data.features)) {
      // Store polygon data for rendering
      setOsmBuildingPartPolygonsData(osmBuildingParts.data);
      
      // Calculate centroids for point display
      const centroids: any[] = [];
      for (const feature of osmBuildingParts.data.features) {
        if (feature.geometry) {
          try {
            const centroid = turf.centroid(feature.geometry as any);
            const coordinates = centroid.geometry.coordinates as [number, number];
            
            centroids.push({
              id: feature.properties.id?.toString() || '',
              coordinates,
              properties: {
                id: feature.properties.id,
                source: feature.properties.source,
                osm_id: feature.properties.osm_id,
                name: feature.properties.name,
                ref_gb_uprn: feature.properties.ref_gb_uprn,
                base_shape: feature.properties.base_shape,
                base_orientation: feature.properties.base_orientation,
                building: feature.properties.building,
                building_part: feature.properties.building_part,
                building_levels: feature.properties.building_levels,
                roof_shape: feature.properties.roof_shape,
                height_m: feature.properties.height_m,
                hyperlink: 'https://www.openstreetmap.org/way/'.concat(feature.properties.osm_id),
              }
            });
          } catch (error) {
            console.error('Error calculating centroid for OSM building part feature:', feature.properties.id, error);
          }
        }
      }
      setOsmBuildingPartCentroidsData(centroids);
    } else {
      setOsmBuildingPartCentroidsData([]);
      setOsmBuildingPartPolygonsData(null);
    }
  }, [osmBuildingParts]);

  // Process EPC Certificate data from props
  useEffect(() => {
    if (epcCertificates?.data?.features) {
      const centroids: any[] = [];
      for (const feature of epcCertificates.data.features) {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          try {
            centroids.push({
              id: feature.properties.id?.toString() || `epc-${centroids.length}`,
              coordinates: feature.geometry.coordinates as [number, number],
              properties: feature.properties
            });
          } catch (error) {
            console.error('Error processing EPC certificate feature:', feature.properties.id, error);
          }
        }
      }
      setEpcCertificateCentroidsData(centroids);
    } else {
      setEpcCertificateCentroidsData([]);
    }
  }, [epcCertificates]);

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
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [connectionsForModal, setConnectionsForModal] = useState<any[]>([]);
  const [modalSourcePhotoId, setModalSourcePhotoId] = useState<string | undefined>(undefined);
  const [searchDataType, setSearchDataType] = useState('all');
  const [searchMarker, setSearchMarker] = useState<{coordinates: [number, number], data: any, type: string} | null>(null);

  // Function to fetch area data from API
  const fetchAreaData = useCallback(async (areaIds: string[], includeBuaFilter: boolean = true) => {
    if (areaIds.length === 0) return;

    // Check if we already have data for these areas with the same filter setting
    const cacheKey = `${areaIds.sort().join(',')}_bua_${includeBuaFilter}`;
    if (areaDataCache[cacheKey]) {
      return areaDataCache[cacheKey];
    }

    setIsLoadingAreaData(true);
    try {
      const response = await axios.post('/get-area', {
        area_ids: areaIds,
        include_bua_filter: includeBuaFilter
      });

      const newData = response.data;
      
      // Cache the fetched data
      setAreaDataCache(prev => ({
        ...prev,
        [cacheKey]: newData
      }));
//console.log(newData);
      return newData;
    } catch (error) {
      console.error('Error fetching area data:', error);
      return null;
    } finally {
      setIsLoadingAreaData(false);
    }
  }, [areaDataCache]);

  // Function to merge area data with existing data
  const mergeAreaData = useCallback((newData: any) => {
    if (!newData) return;
    
    // Merge buildings
    if (newData.buildings?.features) {
      setBuildingCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newBuildings = newData.buildings.features
          .filter((feature: any) => !existingIds.has(feature.id))
          .map((feature: any) => {
            if (feature.geometry) {
              try {
                const centroid = turf.centroid(feature.geometry as any);
                const coordinates = centroid.geometry.coordinates as [number, number];
                
                return {
                  id: feature.id as string,
                  coordinates,
                  properties: feature.properties
                };
              } catch (error) {
                console.error('Error calculating centroid for building feature:', feature.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        //console.log(newBuildings);
        //console.log(`Adding ${newBuildings.length} new buildings to existing ${prev.length} buildings`);
        return [...prev, ...newBuildings];
      });
    }

    // Merge building parts
    if (newData.buildingParts?.features) {
      // Update polygon data
      setBuildingPartPolygonsData(prev => {
        if (!prev) {
          return newData.buildingParts;
        }
        
        const existingIds = new Set(prev.features.map((f: any) => f.id));
        const newFeatures = newData.buildingParts.features.filter((feature: any) => !existingIds.has(feature.id));
        
        return {
          type: 'FeatureCollection',
          features: [...prev.features, ...newFeatures]
        };
      });
      
      // Update centroid data
      setBuildingPartCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newBuildingParts = newData.buildingParts.features
          .filter((feature: any) => !existingIds.has(feature.id))
          .map((feature: any) => {
            if (feature.geometry) {
              try {
                const centroid = turf.centroid(feature.geometry as any);
                const coordinates = centroid.geometry.coordinates as [number, number];
                
                return {
                  id: feature.id as string,
                  coordinates,
                  properties: feature.properties
                };
              } catch (error) {
                console.error('Error calculating centroid for building part feature:', feature.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newBuildingParts.length} new building parts to existing ${prev.length} building parts`);
        return [...prev, ...newBuildingParts];
      });
    }

    // Merge sites
    if (newData.sites?.features) {
      setSiteCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newSites = newData.sites.features
          .filter((feature: any) => !existingIds.has(feature.id))
          .map((feature: any) => {
            if (feature.geometry) {
              try {
                let geometry = feature.geometry;
                if (geometry.type === 'MultiPolygon' && geometry.coordinates.length === 1) {
                  geometry = { type: 'Polygon', coordinates: geometry.coordinates[0] };
                }

                const centroid = turf.centroid(geometry as any);
                const coordinates = centroid.geometry.coordinates as [number, number];

                return {
                  id: feature.id as string,
                  coordinates,
                  properties: feature.properties
                };
              } catch (error) {
                console.error('Error calculating centroid for site feature:', feature.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newSites.length} new sites to existing ${prev.length} sites`);
        return [...prev, ...newSites];
      });
    }

    // Merge NHLE data
    if (newData.nhle && Array.isArray(newData.nhle)) {
      setNhleCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newNhle = newData.nhle
          .filter((item: any) => !existingIds.has(item.gid?.toString() || ''))
          .map((item: any) => {
            if (item.geom && item.geom.type === 'MultiPoint' && item.geom.coordinates.length > 0) {
              try {
                const coordinates = item.geom.coordinates[0] as [number, number];
                
                return {
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
                };
              } catch (error) {
                console.error('Error processing NHLE feature:', item.gid, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newNhle.length} new NHLE features to existing ${prev.length} NHLE features`);
        return [...prev, ...newNhle];
      });
    }

    // Merge photos data
    if (newData.photos?.features) {
      setPhotoCentroidsData(prev => {
        // Use properties.id as the unique identifier for photos, not feature.id
        const existingIds = new Set(prev.map(item => item.properties.id));
        const newPhotos = newData.photos.features
          .filter((feature: any) => !existingIds.has(feature.properties?.id))
          .map((feature: any) => {
            if (feature.geometry && feature.geometry.type === 'Point') {
              try {
                const coordinates = feature.geometry.coordinates as [number, number];
                
                return {
                  id: feature.properties?.id?.toString() || feature.id?.toString() || '',
                  coordinates,
                  properties: {
                    id: feature.properties.id,
                    path: feature.properties.path,
                    file_name: feature.properties.file_name,
                    user_name: feature.properties.user_name,
                    user_id: feature.properties.user_id,
                    photo_heading: feature.properties.photo_heading,
                    accuracy: feature.properties.accuracy,
                    created: feature.properties.created,
                    altitude: feature.properties.altitude,
                    note: feature.properties.note,
                    // device fields from backend resource
                    device_manufacture: feature.properties.device_manufacture,
                    device_model: feature.properties.device_model,
                    device_platform: feature.properties.device_platform,
                    device_version: feature.properties.device_version,
                    network_info: feature.properties.network_info,
                    provider: feature.properties.provider,
                    lat: feature.properties.lat,
                    lng: feature.properties.lng,
                    link: feature.properties.link,
                    osnma_enabled: feature.properties.osnma_enabled,
                    osnma_validated: feature.properties.osnma_validated,
                    validated_sats: feature.properties.validated_sats,
                  }
                };
              } catch (error) {
                console.error('Error processing photo feature:', feature.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newPhotos.length} new photos to existing ${prev.length} photos`);
        return [...prev, ...newPhotos];
      });
    }

    // Merge UPRN data
    if (newData.uprn?.data?.features) {
      setUprnCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newUprns = newData.uprn.data.features
          .filter((feature: any) => !existingIds.has((feature.id ?? feature.properties?.id ?? feature.properties?.uprn)?.toString()))
          .map((feature: any, idx: number) => {
            if (feature.geometry && feature.geometry.type === 'Point') {
              try {
                const coordinates = feature.geometry.coordinates as [number, number];
                return {
                  id: (feature.id ?? feature.properties?.id ?? feature.properties?.uprn ?? idx).toString(),
                  coordinates,
                  properties: {
                    uprn: String(feature.properties?.uprn ?? feature.properties?.UPRN ?? ''),
                    id: feature.properties?.id ?? feature.properties?.uprn,
                    ...feature.properties,
                  }
                } as UprnCentroidState;
              } catch (error) {
                console.error('Error processing UPRN feature in merge:', feature.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);

        return [...prev, ...newUprns];
      });
    }

    // Merge Land Registry INSPIRE data
    if (newData.landRegistryInspire?.data?.features) {
      setLandRegistryInspireData((prev: any) => {
        if (!prev?.features) {
          // If no existing INSPIRE data, set the new data directly
          //console.log(`Setting ${newData.landRegistryInspire.data.features.length} INSPIRE features`);
          return newData.landRegistryInspire.data;
        }
        
        // Merge with existing INSPIRE data
        const existingIds = new Set(prev.features.map((feature: any) => feature.properties?.gml_id));
        const newInspire = newData.landRegistryInspire.data.features.filter((feature: any) => !existingIds.has(feature.properties?.gml_id));
        
        const mergedFeatures = [...prev.features, ...newInspire];
        //console.log(`Adding ${newInspire.length} new INSPIRE features to existing ${prev.features.length} features`);
        
        return {
          type: 'FeatureCollection',
          features: mergedFeatures
        };
      });
    }

    // Merge OSM Building Parts data
    if (newData.osmBuildingParts?.data?.features) {
      // Merge polygon data
      setOsmBuildingPartPolygonsData((prev: any) => {
        if (!prev?.features) {
          //console.log(`Setting ${newData.osmBuildingParts.data.features.length} OSM building part polygons`);
          return newData.osmBuildingParts.data;
        }
        
        const existingIds = new Set(prev.features.map((feature: any) => feature.properties?.osm_id));
        const newPolygons = newData.osmBuildingParts.data.features.filter((feature: any) => !existingIds.has(feature.properties?.osm_id));
        
        const mergedFeatures = [...prev.features, ...newPolygons];
        //console.log(`Adding ${newPolygons.length} new OSM building part polygons to existing ${prev.features.length} polygons`);
        
        return {
          type: 'FeatureCollection',
          features: mergedFeatures
        };
      });
      
      // Merge centroid data
      setOsmBuildingPartCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newOsmBuildingParts = newData.osmBuildingParts.data.features
          .filter((feature: any) => !existingIds.has(feature.properties?.id?.toString()))
          .map((feature: any) => {
            if (feature.geometry) {
              try {
                const centroid = turf.centroid(feature.geometry as any);
                const coordinates = centroid.geometry.coordinates as [number, number];
                
                return {
                  id: feature.properties.id?.toString() || '',
                  coordinates,
                  properties: {
                    id: feature.properties.id,
                    source: feature.properties.source,
                    osm_id: feature.properties.osm_id,
                    name: feature.properties.name,
                    ref_gb_uprn: feature.properties.ref_gb_uprn,
                    base_shape: feature.properties.base_shape,
                    base_orientation: feature.properties.base_orientation,
                    building: feature.properties.building,
                    building_part: feature.properties.building_part,
                    building_levels: feature.properties.building_levels,
                    roof_shape: feature.properties.roof_shape,
                    height_m: feature.properties.height_m,
                    hyperlink: 'https://www.openstreetmap.org/way/'.concat(feature.properties.osm_id),
                  }
                };
              } catch (error) {
                console.error('Error calculating centroid for OSM building part feature:', feature.properties.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newOsmBuildingParts.length} new OSM building parts to existing ${prev.length} OSM building parts`);
        return [...prev, ...newOsmBuildingParts];
      });
    }

    // Merge OSM Landuse Areas data
    if (newData.osmLanduseAreas?.data?.features) {
      setosmLanduseAreasCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newOsmLanduseAreas = newData.osmLanduseAreas.data.features
          .filter((feature: any) => !existingIds.has(feature.properties?.id?.toString()))
          .map((feature: any) => {
            if (feature.geometry) {
              try {
                const centroid = turf.centroid(feature.geometry as any);
                const coordinates = centroid.geometry.coordinates as [number, number];
                
                return {
                  id: feature.properties.id?.toString() || '',
                  coordinates,
                  properties: {
                    id: feature.properties.id,
                    source: feature.properties.source,
                    osm_id: feature.properties.osm_id,
                    name: feature.properties.name,
                    landuse: feature.properties.landuse,
                    operator: feature.properties.operator,
                    ref: feature.properties.ref,
                    hyperlink: 'https://www.openstreetmap.org/way/'.concat(feature.properties.osm_id),
                  },
                  geometry: feature.geometry // Keep full geometry for polygon display
                };
              } catch (error) {
                console.error('Error calculating centroid for OSM landuse area feature:', feature.properties.id, error);
                return null;
              }
            }
            return null;
          })
          .filter(Boolean);
        
        //console.log(`Adding ${newOsmLanduseAreas.length} new OSM landuse areas to existing ${prev.length} OSM landuse areas`);
        return [...prev, ...newOsmLanduseAreas];
      });
    }

    // Merge EPC Certificate data
    if (newData.epcCertificates?.data?.features) {
      setEpcCertificateCentroidsData(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newEpcCertificates = newData.epcCertificates.data.features
          .filter((feature: any) => !existingIds.has(feature.properties?.id?.toString()))
          .map((feature: any) => {
            if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
              return {
                id: feature.properties.id?.toString() || '',
                coordinates: feature.geometry.coordinates as [number, number],
                properties: feature.properties
              };
            }
            return null;
          })
          .filter(Boolean);
        
        console.log(`Adding ${newEpcCertificates.length} new EPC certificates to existing ${prev.length} EPC certificates`);
        return [...prev, ...newEpcCertificates];
      });
    }

    // Merge shapes data
    if (newData.shapes?.features) {
      setShapes(prev => {
        if (!prev?.data?.features) {
          // If no existing shapes, set the new data directly
          //console.log(`Setting ${newData.shapes.features.length} shapes features`);
          return { data: newData.shapes };
        }
        
        // Merge with existing shapes data
        const existingIds = new Set(prev.data.features.map((feature: any) => feature.id));
        const newShapes = newData.shapes.features.filter((feature: any) => !existingIds.has(feature.id));
        
        const mergedFeatures = [...prev.data.features, ...newShapes];
        //console.log(`Adding ${newShapes.length} new shapes to existing ${prev.data.features.length} shapes`);
        
        return {
          data: {
            ...prev.data,
            features: mergedFeatures
          }
        };
      });
    }
  }, []);

  // Auto-fetch area data when selectedShapeIds changes
  useEffect(() => {
    if (skipInitialFetch) {
      setSkipInitialFetch(false);
      return;
    }
    
    if (selectedShapeIds.length > 0) {
      // Only fetch data for areas we don't have in cache
      const cacheKey = selectedShapeIds.sort().join(',');
      const missingAreaIds = selectedShapeIds.filter(id => {
        // Check if we have data for this individual area
        return !Object.keys(areaDataCache).some(key => key.includes(id));
      });
      
      if (missingAreaIds.length > 0) {
        fetchAreaData(missingAreaIds, true).then(newData => {
          if (newData) {
            mergeAreaData(newData);
          }
        });
      }
    }
  }, [selectedShapeIds, fetchAreaData, mergeAreaData, skipInitialFetch, areaDataCache]);



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

        // Skip GeoJSON validation for non-GeoJSON schemas
        const skipGeoJsonValidation = selectedSchema === 'epc_certificate';

        const performServerValidation = () => {
          setStatusMessage('Validating on the server...');
          let validationRoute;
          //console.log(selectedSchema);
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
            case 'uprn':
              validationRoute = route('data_map.validateUprn');
              break;
            case 'land_registry_inspire':
              validationRoute = route('data_map.validateLandRegistryInspire');
              break;
            case 'osm_building_part':
              validationRoute = route('data_map.validateOsmBuildingPart');
              break;
            case 'osm_address':
              validationRoute = route('data_map.validateOsmAddress');
              break;
            case 'osm_landuse_area':
              validationRoute = route('data_map.validateOsmLanduseArea');
              break;
            case 'epc_certificate':
              validationRoute = route('data_map.validateEpcCertificate');
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
              console.error('Validation error:', error);
              setStatusMessage('An error occurred while validating on the server.');
              setIsValidationSuccessful(false);
            });
        };

        if (skipGeoJsonValidation) {
          // For non-GeoJSON schemas, skip local validation and go straight to server
          setFileContent(content);
          performServerValidation();
        } else {
          // For GeoJSON schemas, validate locally first
          validate(text).then((res) => {
            if (!res.valid) {
              setStatusMessage('GeoJSON has validation errors. See details below.');
              setIsValidationSuccessful(false);
            } else {
              setStatusMessage('Local validation passed. Checking for duplicates on the server...');
              performServerValidation();
            }
            setFileContent(content);
          }).catch((err: any) => {
            setStatusMessage(`Validation error: ${err?.message || 'Unknown error'}`);
            setFileContent(content);
            setIsValidationSuccessful(false);
          });
        }
      } catch (err: any) {
        setStatusMessage(`Error parsing JSON: ${err.message}`);
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
        case 'uprn':
          validationRoute = route('data_map.validateUprn');
          break;
        case 'land_registry_inspire':
          validationRoute = route('data_map.validateLandRegistryInspire');
          break;
        case 'osm_building_part':
          validationRoute = route('data_map.validateOsmBuildingPart');
          break;
        case 'osm_address':
          validationRoute = route('data_map.validateOsmAddress');
          break;
        case 'osm_landuse_area':
          validationRoute = route('data_map.validateOsmLanduseArea');
          break;
        case 'epc_certificate':
          validationRoute = route('data_map.validateEpcCertificate');
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
          const featureCollection = turf.featureCollection(shapes?.data?.features || []);
          
          if (!shapes?.data?.features) {
            setIconLayerData([]);
            setPolygonCentroids([]);
            return;
          }

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

  // Use custom hook for data filtering
  const {
    filteredBuildingCentroids,
    filteredBuildingPartCentroids,
    filteredSiteCentroids,
    filteredNhleCentroids,
    filteredPhotoCentroids,
    filteredUprnCentroids,
    filteredOsmBuildingPartCentroids,
    filteredOsmLanduseAreasCentroids,
    filteredEpcCertificateCentroids,
    availableGrades,
    filteredShapes,
    allFilteredData
  } = useDataFilters({
    buildingCentroidsData,
    buildingPartCentroidsData,
    siteCentroidsData,
    nhleCentroidsData,
    photoCentroidsData,
    uprnCentroidsData,
    osmBuildingPartCentroidsData,
    osmLanduseAreasCentroidsData,
    epcCertificateCentroidsData,
    shapes,
    selectedShapeIds,
    floorRange,
    selectedGrades,
    dataType,
    boundarySearch,
    showSelectedOnly
  });

  // Pre-computed NHLE-INSPIRE mapping for performance optimization
  const nhleInspireMapping = useMemo(() => {
    if (!landRegistryInspireData?.features || !filteredNhleCentroids?.length) {
      return [];
    }
    
    const mapping: Array<{ inspireIndex: number; inspireFeature: any; nhlePoints: any[] }> = [];
    
    // Pre-compute which INSPIRE polygons contain which NHLE points
    landRegistryInspireData.features.forEach((inspireFeature: any, inspireIndex: number) => {
      if (inspireFeature.geometry?.type === 'Polygon' || inspireFeature.geometry?.type === 'MultiPolygon') {
        const containedNhle: any[] = [];
        
        filteredNhleCentroids.forEach((nhlePoint: any) => {
          try {
            const point = turf.point(nhlePoint.coordinates);
            if (booleanPointInPolygon(point, inspireFeature)) {
              containedNhle.push(nhlePoint);
            }
          } catch (e) {
            // Skip invalid geometries
          }
        });
        
        if (containedNhle.length > 0) {
          mapping.push({
            inspireIndex,
            inspireFeature,
            nhlePoints: containedNhle
          });
        }
      }
    });
    
    return mapping;
  }, [landRegistryInspireData, filteredNhleCentroids]);

  // Build collapsed UPRN representatives from FILTERED UPRN set
  const uprnCollapsed = useMemo(() => {
    const src = filteredUprnCentroids || [];
    if (src.length === 0) return [] as UprnCentroidState[];

    // Proximity clusters within UPRN_GROUP_RADIUS_M
    const remaining = [...src];
    const clusters: UprnCentroidState[][] = [];
    while (remaining.length) {
      const seed = remaining.pop()!;
      const seedPt = turf.point(seed.coordinates);
      const c: UprnCentroidState[] = [seed];
      for (let i = remaining.length - 1; i >= 0; i--) {
        const cand = remaining[i];
        const d = turf.distance(seedPt, turf.point(cand.coordinates), 'kilometers') * 1000;
        if (d <= UPRN_GROUP_RADIUS_M) {
          c.push(cand);
          remaining.splice(i, 1);
        }
      }
      clusters.push(c);
    }

    // Split large clusters evenly by angle, choose representative nearest sub-centroid
    const reps: any[] = [];
    for (const cluster of clusters) {
      if (cluster.length <= MAX_PER_REP) {
        const clng = cluster.reduce((s, p) => s + p.coordinates[0], 0) / cluster.length;
        const clat = cluster.reduce((s, p) => s + p.coordinates[1], 0) / cluster.length;
        let rep = cluster[0];
        let best = Infinity;
        for (const p of cluster) {
          const dd = turf.distance(turf.point([clng, clat]), turf.point(p.coordinates), 'kilometers');
          if (dd < best) { best = dd; rep = p; }
        }
        reps.push({
          ...rep,
          properties: { ...rep.properties, uprn_group_size: cluster.length },
          __uprnGroupMembers: cluster
        });
        continue;
      }

      const clng = cluster.reduce((s, p) => s + p.coordinates[0], 0) / cluster.length;
      const clat = cluster.reduce((s, p) => s + p.coordinates[1], 0) / cluster.length;
      const withAng = cluster.map(p => {
        const dx = p.coordinates[0] - clng;
        const dy = p.coordinates[1] - clat;
        return { p, ang: Math.atan2(dy, dx) };
      }).sort((a, b) => a.ang - b.ang);

      for (let i = 0; i < withAng.length; i += MAX_PER_REP) {
        const slice = withAng.slice(i, i + MAX_PER_REP).map(x => x.p);
        const slng = slice.reduce((s, p) => s + p.coordinates[0], 0) / slice.length;
        const slat = slice.reduce((s, p) => s + p.coordinates[1], 0) / slice.length;
        let rep = slice[0];
        let best = Infinity;
        for (const p of slice) {
          const dd = turf.distance(turf.point([slng, slat]), turf.point(p.coordinates), 'kilometers');
          if (dd < best) { best = dd; rep = p; }
        }
        reps.push({
          ...rep,
          properties: { ...rep.properties, uprn_group_size: slice.length },
          __uprnGroupMembers: slice
        });
      }
    }

    return reps as UprnCentroidState[] as any;
  }, [filteredUprnCentroids]);

  // Helper function to get fill color based on category2
  const getFillColorForData = useCallback((d: any, defaultColor: number[], dataTypeColor: number[]): [number, number, number, number] => {
    const propertyName = groupByMapping[category2];
    
    if (category2 === 'None') {
      // Group by data type - use the provided data type color
      const isSelected = selectedLegendItem === d.dataType;
      const alpha = selectedLegendItem === null || isSelected ? 220 : 80;
      return [dataTypeColor[0], dataTypeColor[1], dataTypeColor[2], alpha];
    }
    
    if (!propertyName || !d.properties) return defaultColor as [number, number, number, number];

    const propValue = d.properties[propertyName];
    const allData = [...filteredBuildingCentroids, ...filteredBuildingPartCentroids, ...filteredSiteCentroids, ...filteredNhleCentroids, ...filteredPhotoCentroids, ...filteredUprnCentroids];
    const uniqueValues = Array.from(new Set(allData.map(item => (item.properties as any)?.[propertyName]).filter(Boolean)));
    const color = getColorForValue(propValue, uniqueValues);

    const isSelected = selectedLegendItem === propValue;
    const alpha = selectedLegendItem === null || isSelected ? 220 : 80;

    return [color[0], color[1], color[2], alpha];
  }, [category2, selectedLegendItem, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids, filteredUprnCentroids, groupByMapping]);


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
      site: filteredSiteCentroids,
      uprn: uprnCentroidsData,
      photo: filteredPhotoCentroids,
      osmBuildingPart: filteredOsmBuildingPartCentroids,
      osmLanduseArea: filteredOsmLanduseAreasCentroids,
      epcCertificate: filteredEpcCertificateCentroids
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

        // Search in nested sites array
        const sitesMatch = props?.sites?.some((site: any) => 
          site.site_id && String(site.site_id).toLowerCase().includes(searchTerm)
        );
        const matchedUprn = props?.uprn && Array.isArray(props.uprn) ? props.uprn.find((uprn: any) => 
          uprn?.uprn && String(uprn.uprn).toLowerCase().includes(searchTerm)
        ) : null;
        
        if (matches || sitesMatch || matchedUprn) {
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
        // Search in nested sites array
        const sitesMatch = props?.sites?.some((site: any) => 
            site.site_id && String(site.site_id).toLowerCase().includes(searchTerm)
          );
        
        if (matches || sitesMatch) {
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

        const buildingMatch = props?.buildings?.some((building: any) => 
            building.osid && String(building.osid).toLowerCase().includes(searchTerm)
          );

        const buildingPartMatch = props?.buildingparts?.some((buildingPart: any) => 
            buildingPart.osid && String(buildingPart.osid).toLowerCase().includes(searchTerm)
          );

        if (matches || buildingMatch || buildingPartMatch) {
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

    // Search UPRN data (only within selected shapes)
    dataToSearch.uprn.forEach(item => {
      const props = item.properties as any;
      if (field === 'all' || searchableFields.uprn?.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.uprn : [field];
        const matches = fieldsToSearch.some((f: string) => {
          const value = props?.[f];
          return value && String(value).toLowerCase().includes(searchTerm);
        });
        if (matches) {
          results.push({
            type: 'UPRN',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.uprn || props.id || 'UPRN'
          });
        }
      }
    });

    // Search Photo data (only within selected shapes)
    dataToSearch.photo.forEach(item => {
      const props = item.properties;
      if (field === 'all' || ['file_name', 'user_name', 'id'].includes(field)) {
        const fieldsToSearch = field === 'all' ? ['file_name', 'user_name', 'id'] : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });

        if (matches) {
          results.push({
            type: 'Photo',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.file_name || `Photo ${props.id}` || 'Unnamed Photo'
          });
        }
      }
    });

    // Search OSM Building Part data (only within selected shapes)
    dataToSearch.osmBuildingPart.forEach(item => {
      const props = item.properties;
      if (field === 'all' || searchableFields.osmBuildingPart.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.osmBuildingPart : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });

        if (matches) {
          results.push({
            type: 'OSM Building Part',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.name || props.building || `OSM Building Part ${props.osm_id}` || 'Unnamed OSM Building Part'
          });
        }
      }
    });

    // Search OSM Landuse Area data (only within selected shapes)
    dataToSearch.osmLanduseArea.forEach((item: any) => {
      const props = item.properties;
      if (field === 'all' || searchableFields.osmLanduseArea.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.osmLanduseArea : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });

        if (matches) {
          results.push({
            type: 'OSM Landuse Area',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.name || props.landuse || `OSM Landuse Area ${props.osm_id}` || 'Unnamed OSM Landuse Area'
          });
        }
      }
    });

    // Search EPC Certificate data (only within selected shapes)
    dataToSearch.epcCertificate.forEach((item: any) => {
      const props = item.properties;
      if (field === 'all' || searchableFields.epcCertificate.includes(field)) {
        const fieldsToSearch = field === 'all' ? searchableFields.epcCertificate : [field];
        const matches = fieldsToSearch.some(f => {
          const value = props[f as keyof typeof props];
          return value && String(value).toLowerCase().includes(searchTerm);
        });

        if (matches) {
          results.push({
            type: 'EPC Certificate',
            id: item.id,
            coordinates: item.coordinates,
            data: props,
            displayText: props.address || props.address1 || props.postcode || props.lmk_key || 'EPC Certificate'
          });
        }
      }
    });

    setSearchResults(results.slice(0, 50)); // Limit to 50 results
  }, [filteredNhleCentroids, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredUprnCentroids, uprnCentroidsData, filteredPhotoCentroids, filteredOsmBuildingPartCentroids, filteredOsmLanduseAreasCentroids, filteredEpcCertificateCentroids]);

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
  const userInteractedWithMap = useRef(false);
  const lastSelectedShapeIds = useRef<string[]>([]);
  const lastDataType = useRef(dataType);

  // Track user interaction with map (excluding UI interactions)
  const handleViewStateChange = useCallback((params: any) => {
    // Only mark as user interaction if it's not a programmatic change
    if (!params.viewState.transitionDuration) {
      userInteractedWithMap.current = true;
    }
    setViewState(params.viewState as MapViewState);
  }, []);

  // Reset user interaction flag when filters change (side panel interactions)
  useEffect(() => {
    const shapeIdsChanged = JSON.stringify(selectedShapeIds) !== JSON.stringify(lastSelectedShapeIds.current);
    const dataTypeChanged = JSON.stringify(dataType) !== JSON.stringify(lastDataType.current);
    
    if (shapeIdsChanged || dataTypeChanged) {
      userInteractedWithMap.current = false; // Reset to allow auto-zoom
    }
  }, [selectedShapeIds, dataType]);

  useEffect(() => {
    if (!initialZoomApplied.current && (buildingCentroidsData.length > 0 || buildingPartCentroidsData.length > 0 || siteCentroidsData.length > 0 || nhleCentroidsData.length > 0 || photoCentroidsData.length > 0 || uprnCentroidsData.length > 0)) {
      const allData = [...buildingCentroidsData, ...buildingPartCentroidsData, ...siteCentroidsData, ...nhleCentroidsData, ...photoCentroidsData, ...uprnCentroidsData];
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
  }, [buildingCentroidsData, buildingPartCentroidsData, siteCentroidsData, nhleCentroidsData, photoCentroidsData, uprnCentroidsData]);

  useEffect(() => {
    if (isInitialLoad.current) {
        if (buildingCentroidsData.length > 0 || buildingPartCentroidsData.length > 0 || siteCentroidsData.length > 0) {
            isInitialLoad.current = false;
        }
        return;
    }

    const shapeIdsChanged = JSON.stringify(selectedShapeIds) !== JSON.stringify(lastSelectedShapeIds.current);
    const dataTypeChanged = JSON.stringify(dataType) !== JSON.stringify(lastDataType.current);
    
    const shouldAutoZoom = !userInteractedWithMap.current || shapeIdsChanged || dataTypeChanged;
    
    if (!shouldAutoZoom) {
        return;
    }

    lastSelectedShapeIds.current = [...selectedShapeIds];
    lastDataType.current = { ...dataType };

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
      } else if (selectedShapeIds.length > 0 && shapes?.data?.features) {
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
  }, [allFilteredData, selectedShapeIds, shapes?.data?.features, floorRange, dataType]);

  const zoomBasedRadius = useMemo(() => {
    return Math.max(1, Math.pow(2, 14 - viewState.zoom));
  }, [viewState.zoom]);

  // Helper function for bearing-only candidate matching
  const bearingMatch = useCallback((photoLngLat: [number, number], photoHeadingDeg: number, candidateLngLat: [number, number], tolDeg: number = 20): boolean => {
    const photoPoint = turf.point(photoLngLat);
    const candidatePoint = turf.point(candidateLngLat);
    const brg = turf.bearing(photoPoint, candidatePoint);
    const delta = Math.abs(((brg - photoHeadingDeg + 540) % 360) - 180);
    return delta <= tolDeg;
  }, []);

  // Helper function for creating Bézier paths in pixel space
  const bezierPath = useCallback((sourceLngLat: [number, number], targetLngLat: [number, number], viewport: WebMercatorViewport) => {
    const sPx = viewport.project(sourceLngLat);
    const tPx = viewport.project(targetLngLat);
    const mid = [(sPx[0] + tPx[0]) / 2, (sPx[1] + tPx[1]) / 2];
    const dx = tPx[0] - sPx[0], dy = tPx[1] - sPx[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // perpendicular
    const cPx = [mid[0] + nx * 24, mid[1] + ny * 24];

    const ptsPx = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const x = (1 - t) * (1 - t) * sPx[0] + 2 * (1 - t) * t * cPx[0] + t * t * tPx[0];
      const y = (1 - t) * (1 - t) * sPx[1] + 2 * (1 - t) * t * cPx[1] + t * t * tPx[1];
      ptsPx.push([x, y]);
    }
    return ptsPx.map(p => viewport.unproject(p));
  }, []);

  // Constants for link rendering
  const LINK_MIN_ZOOM = 10;

  // Active photo detection - only when a photo is selected
  const activePhoto = useMemo(() => {
    if (selectedFeature && 'file_name' in selectedFeature.properties) {
      return selectedFeature as PhotoCentroidState;
    }
    return null;
  }, [selectedFeature]);

  // Viewport for link calculations
  const viewportForLinks = useMemo(() => {
    return new WebMercatorViewport(viewState);
  }, [viewState]);

  // Bidirectional linking logic (photo ↔ candidates)
  // Helper function to get spidered position for a connection
  const getSpideredPosition = useCallback((connection: any, index: number) => {
    if (selectedPoint && spideredConnections.length > 0) {
      const angle = (index / spideredConnections.length) * Math.PI * 2;
      const offsetX = spideringRadius * Math.cos(angle);
      const offsetY = spideringRadius * Math.sin(angle);
      
      // Convert meter offsets to lng/lat coordinates
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = 111320 * Math.cos(selectedPoint.coordinates[1] * Math.PI / 180);
      
      return [
        selectedPoint.coordinates[0] + offsetX / metersPerDegreeLng,
        selectedPoint.coordinates[1] + offsetY / metersPerDegreeLat
      ];
    }
    return connection.coordinates;
  }, [selectedPoint, spideredConnections, spideringRadius]);

  const bidirectionalLinks = useMemo(() => {
    if (!selectedFeature || viewState.zoom < LINK_MIN_ZOOM) {
      return [];
    }

    const maxDistance = 10; // meters
    const links: Array<{
      coordinates: [number, number];
      type: string;
      properties: any;
      id: string;
      path: any;
      offset: number;
      sourceCoords: [number, number];
      targetCoords: [number, number];
      linkDirection: 'photo-to-candidate' | 'candidate-to-photo' | 'building-to-site' | 'buildingpart-to-site' | 'site-to-building' | 'site-to-buildingpart';
    }> = [];

    // Check if selected feature is a photo
    const isPhotoSelected = 'file_name' in selectedFeature.properties;
    
    if (isPhotoSelected) {
      // Photo → Candidates (existing logic)
      const activePhoto = selectedFeature as PhotoCentroidState;
      const photoCoords: [number, number] = [activePhoto.coordinates[0], activePhoto.coordinates[1]];
      const photoHeading = typeof activePhoto.properties.photo_heading === 'string' 
        ? parseFloat(activePhoto.properties.photo_heading) 
        : (activePhoto.properties.photo_heading || 0);
      
      const candidates: Array<{
        coordinates: [number, number];
        type: string;
        properties: any;
        id: string;
      }> = [];

    // Filter buildings within radius and bearing match
    filteredBuildingCentroids.forEach(building => {
      const candidateCoords: [number, number] = [building.coordinates[0], building.coordinates[1]];
      const photoPoint = turf.point(photoCoords);
      const candidatePoint = turf.point(candidateCoords);
      const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
      
      if (distance <= maxDistance && bearingMatch(photoCoords, photoHeading, candidateCoords)) {
        candidates.push({
          coordinates: candidateCoords,
          type: 'building',
          properties: building.properties,
          id: `building-${building.properties.id}`
        });
      }
    });

    // Filter building parts within radius and bearing match
    filteredBuildingPartCentroids.forEach(part => {
      const candidateCoords: [number, number] = [part.coordinates[0], part.coordinates[1]];
      const photoPoint = turf.point(photoCoords);
      const candidatePoint = turf.point(candidateCoords);
      const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
      
      if (distance <= maxDistance && bearingMatch(photoCoords, photoHeading, candidateCoords)) {
        candidates.push({
          coordinates: candidateCoords,
          type: 'buildingPart',
          properties: part.properties,
          id: `part-${part.properties.id}`
        });
      }
    });

    // Filter sites within radius and bearing match
    filteredSiteCentroids.forEach(site => {
      const candidateCoords: [number, number] = [site.coordinates[0], site.coordinates[1]];
      const photoPoint = turf.point(photoCoords);
      const candidatePoint = turf.point(candidateCoords);
      const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
      
      if (distance <= maxDistance && bearingMatch(photoCoords, photoHeading, candidateCoords)) {
        candidates.push({
          coordinates: candidateCoords,
          type: 'site',
          properties: site.properties,
          id: `site-${site.properties.id}`
        });
      }
    });

    // Filter NHLE within radius and bearing match
    filteredNhleCentroids.forEach(nhle => {
      const candidateCoords: [number, number] = [nhle.coordinates[0], nhle.coordinates[1]];
      const photoPoint = turf.point(photoCoords);
      const candidatePoint = turf.point(candidateCoords);
      const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
      
      if (distance <= maxDistance && bearingMatch(photoCoords, photoHeading, candidateCoords)) {
        candidates.push({
          coordinates: candidateCoords,
          type: 'nhle',
          properties: nhle.properties,
          id: `nhle-${nhle.properties.id}`
    });
  }
});

  // Create Bézier paths with offsets for parallel lines (Photo → Candidates)
  candidates.forEach((candidate, index) => {
    // Use spidered position if spidering is active for this candidate
    const targetCoords = selectedPoint && spideredConnections.some(conn => 
      conn.type === candidate.type && 
      conn.properties.id === candidate.properties.id &&
      conn.coordinates[0] === candidate.coordinates[0] &&
      conn.coordinates[1] === candidate.coordinates[1]
    ) ? getSpideredPosition(candidate, spideredConnections.findIndex(conn => 
      conn.type === candidate.type && 
      conn.properties.id === candidate.properties.id &&
      conn.coordinates[0] === candidate.coordinates[0] &&
      conn.coordinates[1] === candidate.coordinates[1]
    )) : candidate.coordinates;
    
    const path = bezierPath(photoCoords, targetCoords, viewportForLinks);
    const offset = (index % 5 - 2) * 3; // Offsets: -6, -3, 0, 3, 6 pixels
    
    links.push({
      ...candidate,
      path,
      offset,
      sourceCoords: photoCoords,
      targetCoords,
      linkDirection: 'photo-to-candidate'
    });
  });

      // Add Building → Site relationships (using primarysiteid)
      candidates.filter(c => c.type === 'building').forEach((building, index) => {
        const primarySiteId = building.properties.primarysiteid;
        if (primarySiteId) {
          const relatedSite = filteredSiteCentroids.find(site => site.properties.osid === primarySiteId);
          if (relatedSite) {
            const path = bezierPath(building.coordinates, relatedSite.coordinates, viewportForLinks);
            const offset = (index % 5 - 2) * 3;
            
            links.push({
              coordinates: relatedSite.coordinates,
              type: 'site',
              properties: relatedSite.properties,
              id: `site-${relatedSite.properties.id}`,
              path,
              offset,
              sourceCoords: building.coordinates,
              targetCoords: relatedSite.coordinates,
              linkDirection: 'building-to-site'
            });
          }
        }
      });

      // Add BuildingPart → Site relationships (using smallest_siteid)
      candidates.filter(c => c.type === 'buildingPart').forEach((buildingPart, index) => {
        const smallestSiteId = buildingPart.properties.smallestsite_siteid;
        if (smallestSiteId) {
          const relatedSite = filteredSiteCentroids.find(site => site.properties.osid === smallestSiteId);
          if (relatedSite) {
            const path = bezierPath(buildingPart.coordinates, relatedSite.coordinates, viewportForLinks);
            const offset = (index % 5 - 2) * 3;
            
            links.push({
              coordinates: relatedSite.coordinates,
              type: 'site',
              properties: relatedSite.properties,
              id: `site-${relatedSite.properties.id}`,
              path,
              offset,
              sourceCoords: buildingPart.coordinates,
              targetCoords: relatedSite.coordinates,
              linkDirection: 'buildingpart-to-site'
            });
          }
        }
      });
    } else {
      const selectedCoords: [number, number] = [selectedFeature.coordinates[0], selectedFeature.coordinates[1]];
      const selectedType = 'file_name' in selectedFeature.properties ? 'photo' : 
                          'roofmaterial' in selectedFeature.properties ? 'building' :
                          'smallestsite_siteid' in selectedFeature.properties ? 'buildingPart' :
                          'matcheduprn' in selectedFeature.properties ? 'site' : 'nhle';
      
      const candidatePhotos: Array<{
        coordinates: [number, number];
        type: string;
        properties: any;
        id: string;
      }> = [];

      // Find photos that would link to this selected feature
      filteredPhotoCentroids.forEach(photo => {
        const photoCoords: [number, number] = [photo.coordinates[0], photo.coordinates[1]];
        const photoHeading = typeof photo.properties.photo_heading === 'string' 
          ? parseFloat(photo.properties.photo_heading) 
          : (photo.properties.photo_heading || 0);
        
        const photoPoint = turf.point(photoCoords);
        const selectedPoint = turf.point(selectedCoords);
        const distance = turf.distance(photoPoint, selectedPoint, 'kilometers') * 1000;
        
        // Check if this photo would link to the selected feature
        if (distance <= maxDistance && bearingMatch(photoCoords, photoHeading, selectedCoords)) {
          candidatePhotos.push({
            coordinates: photoCoords,
            type: 'photo',
            properties: photo.properties,
            id: `photo-${photo.properties.id}`
          });
        }
      });

      // Create Bézier paths with offsets for parallel lines (Candidate → Photos)
      candidatePhotos.forEach((photo, index) => {
        const path = bezierPath(selectedCoords, photo.coordinates, viewportForLinks);
        const offset = (index % 5 - 2) * 3; // Offsets: -6, -3, 0, 3, 6 pixels
        
        links.push({
          ...photo,
          path,
          offset,
          sourceCoords: selectedCoords,
          targetCoords: photo.coordinates,
          linkDirection: 'candidate-to-photo'
        });
      });

      // Add Site → Buildings/BuildingParts connections when site is selected
      if (selectedType === 'site') {
        const siteProperties = selectedFeature.properties as any;
        const siteId = siteProperties.osid || siteProperties.id;

        // Get site's matched UPRN for building matching
        const siteMatchedUprn = siteProperties.matcheduprn;

        // Find buildings that have this site as their primary site OR match by UPRN
        const relatedBuildings = filteredBuildingCentroids.filter(building => {
          // Check by primarysiteid
          if (building.properties.primarysiteid === siteId) {
            return true;
          }
          
          // Check by UPRN match if site has matcheduprn
          if (siteMatchedUprn && building.properties.uprn && Array.isArray(building.properties.uprn)) {
            return building.properties.uprn.some((uprnObj: any) => 
              uprnObj.uprn && uprnObj.uprn.toString() === siteMatchedUprn.toString()
            );
          }
          
          return false;
        });
        
        // Find building parts that have this site as their smallest site
        const relatedBuildingParts = filteredBuildingPartCentroids.filter(part => 
          part.properties.smallestsite_siteid === siteId
        );

        // Create links to related buildings
        relatedBuildings.forEach((building, index) => {
          const path = bezierPath(selectedCoords, building.coordinates, viewportForLinks);
          const offset = (index % 5 - 2) * 3;
          
          links.push({
            coordinates: building.coordinates,
            type: 'building',
            properties: building.properties,
            id: `building-${building.properties.id}`,
            path,
            offset,
            sourceCoords: selectedCoords,
            targetCoords: building.coordinates,
            linkDirection: 'site-to-building'
          });
        });
        
        // Create links to related building parts
        relatedBuildingParts.forEach((part, index) => {
          const path = bezierPath(selectedCoords, part.coordinates, viewportForLinks);
          const offset = ((relatedBuildings.length + index) % 5 - 2) * 3; // Offset after buildings
          
          links.push({
            coordinates: part.coordinates,
            type: 'buildingPart',
            properties: part.properties,
            id: `part-${part.properties.id}`,
            path,
            offset,
            sourceCoords: selectedCoords,
            targetCoords: part.coordinates,
            linkDirection: 'site-to-buildingpart'
          });
        });
      }
    }

    return links;
  }, [selectedFeature, viewState.zoom, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, filteredPhotoCentroids, bearingMatch, bezierPath, viewportForLinks]);

  // Connections data for PhotoPanel (supports photo and site selection)
  const photoConnectionsData = useMemo(() => {
    if (!selectedFeature) {
      return [];
    }

    const isPhotoSelected = 'file_name' in selectedFeature.properties;
    const isSiteSelected = 'matcheduprn' in selectedFeature.properties || 
                          (!('file_name' in selectedFeature.properties) && 
                           !('area' in selectedFeature.properties) && 
                           !('smallestsite_siteid' in selectedFeature.properties));

    if (!isPhotoSelected && !isSiteSelected) {
      return [];
    }

    const selectedCoords: [number, number] = [selectedFeature.coordinates[0], selectedFeature.coordinates[1]];
    const connections: Array<{
      coordinates: [number, number];
      type: string;
      properties: any;
      id: string;
      distance: number;
      bearing: number;
    }> = [];

    if (isPhotoSelected) {
      // Photo-centric connections (existing logic)
      const photoHeading = typeof selectedFeature.properties.photo_heading === 'string' 
        ? parseFloat(selectedFeature.properties.photo_heading) 
        : (selectedFeature.properties.photo_heading || 0);
      const maxDistance = 10; // meters

      // Helper function to add photo connections
      const addConnection = (candidate: any, type: string) => {
        const candidateCoords: [number, number] = [candidate.coordinates[0], candidate.coordinates[1]];
        const photoPoint = turf.point(selectedCoords);
        const candidatePoint = turf.point(candidateCoords);
        const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
        const bearing = turf.bearing(photoPoint, candidatePoint);
        
        if (distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, candidateCoords)) {
          const uniqueId = `${type}-${candidate.properties.id || 'unknown'}-${candidateCoords[0].toFixed(6)}-${candidateCoords[1].toFixed(6)}`;
          connections.push({
            coordinates: candidateCoords,
            type,
            properties: candidate.properties,
            id: uniqueId,
            distance: Math.round(distance),
            bearing: Math.round(bearing)
          });
        }
      };

      // Create bearing sector for intersection checks (same method as spidering)
      const [lng, lat] = selectedCoords;
      const headingRad = (photoHeading * Math.PI) / 180;
      const radius = 0.0001; // 10m radius in degrees (same as spidering)
      const sectorAngle = Math.PI / 3; // 60 degrees
      const startAngle = headingRad - sectorAngle / 2;
      const endAngle = headingRad + sectorAngle / 2;
      
      const latCos = Math.cos(lat * Math.PI / 180);
      const adjustedRadius = radius / latCos;
      
      const arcPoints = [];
      const numPoints = 30;
      arcPoints.push([lng, lat]);
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
        const x = lng + Math.sin(angle) * adjustedRadius;
        const y = lat + Math.cos(angle) * radius;
        arcPoints.push([x, y]);
      }
      arcPoints.push([lng, lat]);
      
      const bearingSector = turf.polygon([arcPoints]);

      // Enhanced addConnection for building parts with polygon intersection
      const addBuildingPartConnection = (part: any) => {
        const partCoords: [number, number] = [part.coordinates[0], part.coordinates[1]];
        const photoPoint = turf.point(selectedCoords);
        const partPoint = turf.point(partCoords);
        const distance = turf.distance(photoPoint, partPoint, 'kilometers') * 1000;
        const bearing = turf.bearing(photoPoint, partPoint);
        
        let shouldInclude = false;
        let inclusionReason = '';
        
        // Check 1: Traditional bearing match (centroid within bearing)
        const traditionalMatch = distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, partCoords);
        if (traditionalMatch) {
          shouldInclude = true;
          inclusionReason = 'Traditional bearing match (centroid)';
        }
        
        // Check 2: Photo point inside building part polygon OR polygon intersection with bearing sector
        if (!shouldInclude && buildingPartPolygonsData?.features) {
          const partPolygon = buildingPartPolygonsData.features.find((feature: any) => 
            feature.properties.osid === part.properties.osid
          );
          
          if (partPolygon) {
            try {
              // Check 1: Is photo point inside the building part polygon?
              const photoPoint = turf.point(selectedCoords);
              const photoInsidePolygon = booleanPointInPolygon(photoPoint, partPolygon);
              
              // Check 2: Does bearing sector intersect with building part polygon?
              const intersects = booleanIntersects(bearingSector, partPolygon);
              
              if (photoInsidePolygon) {
                shouldInclude = true;
                inclusionReason = `Photo point inside building part polygon - ${Math.round(distance)}m`;
              } else if (intersects) {
                shouldInclude = true;
                inclusionReason = `Bearing sector intersects with polygon - ${Math.round(distance)}m`;
              }
            } catch (error) {
              // Fallback to centroid check
              const fallbackMatch = bearingMatch(selectedCoords, photoHeading, partCoords);
              shouldInclude = fallbackMatch;
              if (fallbackMatch) {
                inclusionReason = 'Fallback bearing match after intersection error';
              }
            }
          }
        }
        
        if (shouldInclude) {
          const uniqueId = `buildingPart-${part.properties.osid || 'unknown'}-${partCoords[0].toFixed(6)}-${partCoords[1].toFixed(6)}`;
          connections.push({
            coordinates: partCoords,
            type: 'buildingPart',
            properties: part.properties,
            id: uniqueId,
            distance: Math.round(distance),
            bearing: Math.round(bearing)
          });
        }
      };

      const addOsmBuildingPartConnection = (part: any) => {
          const partCoords: [number, number] = [part.coordinates[0], part.coordinates[1]];
          const photoPoint = turf.point(selectedCoords);
          const partPoint = turf.point(partCoords);
          const distance = turf.distance(photoPoint, partPoint, 'kilometers') * 1000;
          const bearing = turf.bearing(photoPoint, partPoint);
          
          let shouldInclude = false;
          let connectionType = 'photo_bearing_match';
          
          // Check 1: Traditional bearing match (centroid within bearing)
          const traditionalMatch = distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, partCoords);
          if (traditionalMatch) {
            shouldInclude = true;
          }
          
          // Check 2: Photo point inside building part polygon OR polygon intersection with bearing sector
          if (!shouldInclude && osmBuildingPartPolygonsData?.features) {
            const partPolygon = osmBuildingPartPolygonsData.features.find((feature: any) => 
              feature.properties.osm_id === part.properties.osm_id
            );
            
            if (partPolygon && partPolygon.geometry && partPolygon.geometry.coordinates) {
              try {                
                // Check if photo point is inside polygon
                const photoInsidePolygon = booleanPointInPolygon(photoPoint, partPolygon);
                
                // Check if bearing sector intersects with polygon
                const intersects = booleanIntersects(bearingSector, partPolygon);
                
                if (photoInsidePolygon) {
                  shouldInclude = true;
                  connectionType = 'photo_inside_polygon';
                } else if (intersects) {
                  shouldInclude = true;
                  connectionType = 'bearing_polygon_intersection';
                }
              } catch (error) {
                // Fallback to centroid check
                const fallbackMatch = bearingMatch(selectedCoords, photoHeading, partCoords);
                shouldInclude = fallbackMatch;
                if (fallbackMatch) {
                  connectionType = 'fallback_bearing_match';
                }
              }
            }
          }
          
          if (shouldInclude) {
            const candidateId = part.properties.osm_id || part.properties.id || 'unknown';
            const uniqueId = `osmBuildingPart-${candidateId}-${partCoords[0].toFixed(6)}-${partCoords[1].toFixed(6)}`;
            connections.push({
              coordinates: partCoords,
              type: 'osmBuildingPart',
              properties: part.properties,
              id: uniqueId,
              distance: Math.round(distance),
              bearing: Math.round(bearing)
            });
          }
        };
      
      // Add all candidate types for photo
      if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.buildings)){
        filteredBuildingCentroids.forEach(building => addConnection(building, 'building'));
      }
      if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.buildingParts)){
        filteredBuildingPartCentroids.forEach(part => addBuildingPartConnection(part)); // Use enhanced function
      }
      if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.osmBuildingParts)){
        filteredOsmBuildingPartCentroids.forEach(part => addOsmBuildingPartConnection(part));
      }
      if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.sites)){
        filteredSiteCentroids.forEach(site => addConnection(site, 'site'));
      }
      if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.nhle)){
        filteredNhleCentroids.forEach(nhle => addConnection(nhle, 'nhle'));
      }

      // Add NHLE points from Land Registry INSPIRE polygons intersected by photo bearing
      if (landRegistryInspireData?.features && filteredNhleCentroids?.length > 0 && (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.nhle)) {
        // Create the photo bearing polygon (same logic as in MapLayers.tsx)
        const [lng, lat] = selectedCoords;
        const headingRad = (photoHeading * Math.PI) / 180;
        const radius = 0.0001; // Same radius as in bearing visualization
        const sectorAngle = Math.PI / 3; // 60 degrees sector angle
        const startAngle = headingRad - sectorAngle / 2;
        const endAngle = headingRad + sectorAngle / 2;
        
        // Adjust for latitude distortion
        const latCos = Math.cos(lat * Math.PI / 180);
        const adjustedRadius = radius / latCos;
        
        // Create arc points for bearing polygon
        const arcPoints = [];
        const numPoints = 30;
        
        // Start from center
        arcPoints.push([lng, lat]);
        
        // Create arc points
        for (let i = 0; i <= numPoints; i++) {
          const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
          const x = lng + Math.sin(angle) * adjustedRadius;
          const y = lat + Math.cos(angle) * radius;
          arcPoints.push([x, y]);
        }
        
        // Close the polygon
        arcPoints.push([lng, lat]);
        
        const bearingPolygon = turf.polygon([arcPoints]);
        
        // Find intersecting Land Registry INSPIRE polygons that contain NHLE features
        const intersectingPolygons: any[] = [];
        const inspirePolygonsWithNhle: any[] = [];
        
        // First, filter INSPIRE polygons that contain NHLE features
        landRegistryInspireData.features.forEach((inspireFeature: any) => {
          if (inspireFeature.geometry?.type === 'Polygon' || inspireFeature.geometry?.type === 'MultiPolygon') {
            // Check if this INSPIRE polygon contains any NHLE features
            const hasNhle = filteredNhleCentroids.some((nhlePoint: any) => {
              try {
                const point = turf.point(nhlePoint.coordinates);
                return booleanPointInPolygon(point, inspireFeature);
              } catch (e) {
                return false;
              }
            });
            
            if (hasNhle) {
              inspirePolygonsWithNhle.push(inspireFeature);
            }
          }
        });
        
        // Then check which of these polygons intersect with photo bearing
        inspirePolygonsWithNhle.forEach((inspireFeature: any) => {
          try {
            if (booleanIntersects(bearingPolygon, inspireFeature)) {
              intersectingPolygons.push(inspireFeature);
            }
          } catch (e) {
            console.warn('Error checking intersection with INSPIRE polygon:', e);
          }
        });
        
        // Find NHLE points within intersecting polygons
        intersectingPolygons.forEach((polygon: any) => {
          filteredNhleCentroids.forEach((nhlePoint: any) => {
            try {
              const point = turf.point(nhlePoint.coordinates);
              if (booleanPointInPolygon(point, polygon)) {
                // Check if this NHLE point is not already added to connections
                const alreadyAdded = connections.some(existing => 
                  existing.type === 'nhle' && existing.properties.nhle_id === nhlePoint.properties.nhle_id
                );
                if (!alreadyAdded) {
                  const nhleCoords: [number, number] = [nhlePoint.coordinates[0], nhlePoint.coordinates[1]];
                  const photoPoint = turf.point(selectedCoords);
                  const nhlePointTurf = turf.point(nhleCoords);
                  const distance = turf.distance(photoPoint, nhlePointTurf, 'kilometers') * 1000;
                  const bearing = turf.bearing(photoPoint, nhlePointTurf);
                  
                  const uniqueId = `nhle-inspire-${nhlePoint.properties.nhle_id}-${nhleCoords[0].toFixed(6)}-${nhleCoords[1].toFixed(6)}`;
                  connections.push({
                    coordinates: nhleCoords,
                    type: 'nhle',
                    properties: {
                      ...nhlePoint.properties,
                      connection_source: 'land_registry_inspire_bearing_intersection',
                      intersected_inspire_gml_id: polygon.properties?.gml_id,
                      intersected_inspire_id: polygon.properties?.INSPIREID,
                      intersected_inspire_label: polygon.properties?.LABEL
                    },
                    id: uniqueId,
                    distance: Math.round(distance),
                    bearing: Math.round(bearing)
                  });
                }
              }
            } catch (e) {
              console.warn('Error checking NHLE point in polygon:', e);
            }
          });
        });
        
      }
    } else if (isSiteSelected) {
      // Site-centric connections
      const siteProperties = selectedFeature.properties as any;
      const siteId = siteProperties.osid || siteProperties.id;

      // Helper function to add site connections
      const addSiteConnection = (candidate: any, type: string) => {
        const candidateCoords: [number, number] = [candidate.coordinates[0], candidate.coordinates[1]];
        const sitePoint = turf.point(selectedCoords);
        const candidatePoint = turf.point(candidateCoords);
        const distance = turf.distance(sitePoint, candidatePoint, 'kilometers') * 1000;
        const bearing = turf.bearing(sitePoint, candidatePoint);
        
        const uniqueId = `${type}-${candidate.properties.id || 'unknown'}-${candidateCoords[0].toFixed(6)}-${candidateCoords[1].toFixed(6)}`;
        connections.push({
          coordinates: candidateCoords,
          type,
          properties: candidate.properties,
          id: uniqueId,
          distance: Math.round(distance),
          bearing: Math.round(bearing)
        });
      };

      const siteMatchedUprn = siteProperties.matcheduprn;

      const relatedBuildings = filteredBuildingCentroids.filter(building => {
        if (building.properties.primarysiteid === siteId) {
          return true;
        }

        if (siteMatchedUprn && building.properties.uprn && Array.isArray(building.properties.uprn)) {
          return building.properties.uprn.some((uprnObj: any) => 
            uprnObj.uprn && uprnObj.uprn.toString() === siteMatchedUprn.toString()
          );
        }

        return false;
      });
      
      // Find building parts that have this site as their smallest site
      const relatedBuildingParts = filteredBuildingPartCentroids.filter(part => 
        part.properties.smallestsite_siteid === siteId
      );

      // Add related buildings and building parts
      relatedBuildings.forEach(building => addSiteConnection(building, 'building'));
      relatedBuildingParts.forEach(part => addSiteConnection(part, 'buildingPart'));
    }

    // Add Building → Site relationships (using primarysiteid)
    const buildingCandidates = connections.filter(c => c.type === 'building');
    buildingCandidates.forEach(building => {
      const primarySiteId = building.properties.primarysiteid;
      if (primarySiteId) {
        const relatedSite = filteredSiteCentroids.find(site => site.properties.id === primarySiteId);
        if (relatedSite && !connections.some(c => c.id === `site-${relatedSite.properties.id}-${relatedSite.coordinates[0].toFixed(6)}-${relatedSite.coordinates[1].toFixed(6)}`)) {
          const siteCoords: [number, number] = [relatedSite.coordinates[0], relatedSite.coordinates[1]];
          const buildingPoint = turf.point([building.coordinates[0], building.coordinates[1]]);
          const sitePoint = turf.point(siteCoords);
          const distance = turf.distance(buildingPoint, sitePoint, 'kilometers') * 1000;
          const bearing = turf.bearing(buildingPoint, sitePoint);
          
          connections.push({
            coordinates: siteCoords,
            type: 'site',
            properties: relatedSite.properties,
            id: `site-${relatedSite.properties.id}-${siteCoords[0].toFixed(6)}-${siteCoords[1].toFixed(6)}`,
            distance: Math.round(distance),
            bearing: Math.round(bearing)
          });
        }
      }
    });

    // Add BuildingPart → Site relationships (using smallest_siteid)
    const buildingPartCandidates = connections.filter(c => c.type === 'buildingPart');
    buildingPartCandidates.forEach(buildingPart => {
      const smallestSiteId = buildingPart.properties.smallest_siteid;
      if (smallestSiteId) {
        const relatedSite = filteredSiteCentroids.find(site => site.properties.id === smallestSiteId);
        if (relatedSite && !connections.some(c => c.id === `site-${relatedSite.properties.id}-${relatedSite.coordinates[0].toFixed(6)}-${relatedSite.coordinates[1].toFixed(6)}`)) {
          const siteCoords: [number, number] = [relatedSite.coordinates[0], relatedSite.coordinates[1]];
          const partPoint = turf.point([buildingPart.coordinates[0], buildingPart.coordinates[1]]);
          const sitePoint = turf.point(siteCoords);
          const distance = turf.distance(partPoint, sitePoint, 'kilometers') * 1000;
          const bearing = turf.bearing(partPoint, sitePoint);
          
          connections.push({
            coordinates: siteCoords,
            type: 'site',
            properties: relatedSite.properties,
            id: `site-${relatedSite.properties.id}-${siteCoords[0].toFixed(6)}-${siteCoords[1].toFixed(6)}`,
            distance: Math.round(distance),
            bearing: Math.round(bearing)
          });
        }
      }
    });

    // Sort by distance
    return connections.sort((a, b) => a.distance - b.distance);
  }, [selectedFeature, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, bearingMatch, buildingPartPolygonsData, landRegistryInspireData]);

  const handleOpenConnectionsModal = useCallback(() => {
    setConnectionsForModal(photoConnectionsData);
    // Capture source photo id at the time the modal opens to avoid later changes to selectedFeature
    if (selectedFeature && 'file_name' in (selectedFeature as any).properties) {
      const pid = (selectedFeature as any).properties.id?.toString?.() || undefined;
      setModalSourcePhotoId(pid);
    } else {
      setModalSourcePhotoId(undefined);
    }
    setIsConnectionsModalOpen(true);
  }, [photoConnectionsData, selectedFeature]);

  const handleUpdateConnection = useCallback((connectionId: string, status: 'proposed' | 'verified' | 'rejected') => {
    setConnectionsForModal(prev => 
      prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status }
          : conn
      )
    );
  }, []);

  // Helper function to create bearing polygon (cached to avoid duplication)
  const createBearingPolygon = useCallback((coords: [number, number], photoHeading: number) => {
    const [lng, lat] = coords;
    const headingRad = (photoHeading * Math.PI) / 180;
    const radius = 0.0001; // 10m radius in degrees
    const sectorAngle = Math.PI / 3; // 60 degrees sector angle
    const startAngle = headingRad - sectorAngle / 2;
    const endAngle = headingRad + sectorAngle / 2;
    
    // Adjust for latitude distortion
    const latCos = Math.cos(lat * Math.PI / 180);
    const adjustedRadius = radius / latCos;
    
    // Create arc points for bearing polygon
    const arcPoints = [];
    const numPoints = 15; // Reduced from 30 to 15 for better performance
    
    // Start from center
    arcPoints.push([lng, lat]);
    
    // Create arc points
    for (let i = 0; i <= numPoints; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / numPoints);
      const x = lng + Math.sin(angle) * adjustedRadius;
      const y = lat + Math.cos(angle) * radius;
      arcPoints.push([x, y]);
    }
    
    // Close the polygon
    arcPoints.push([lng, lat]);
    
    return turf.polygon([arcPoints]);
  }, []);

  // Spidering functionality
  const handlePointClick = useCallback((point: any) => {
    if (!point || point === selectedPoint) {
      // Deactivate spidering
      setSelectedPoint(null);
      setSpideredConnections([]);
      
      // Reset camera pitch to default 2D view
      setViewState(prev => ({
        ...prev,
        pitch: 0,
        transitionDuration: 500
      }));
      
    } else {
      // Compute connections based on point type; spider only if there are any
      const isPhotoSelected = 'file_name' in point.properties;
      // UPRN centroid has properties.uprn as a scalar (string/number) and lacks other type markers (site/building/part/photo/nhle)
      const propsAny = point.properties as any;
      const uprnVal = propsAny?.uprn;
      const isUprnSelected = (typeof uprnVal === 'string' || typeof uprnVal === 'number') &&
                              !('osid' in propsAny) &&
                              !('primarysiteid' in propsAny) &&
                              !('smallestsite_siteid' in propsAny) &&
                              !('file_name' in propsAny) &&
                              !('nhle_id' in propsAny);
      const isBuildingSelected = 'area' in point.properties &&
                                 !('smallestsite_siteid' in point.properties) &&
                                 !('matcheduprn' in point.properties) &&
                                 ('primarysiteid' in point.properties);
      const isBuildingPartSelected = 'smallestsite_siteid' in point.properties;
      const isSiteSelected = ('matcheduprn' in point.properties ||
                              ('osid' in point.properties &&
                               !('file_name' in point.properties) &&
                               !('smallestsite_siteid' in point.properties) &&
                               !('nhle_id' in point.properties) &&
                               !('primarysiteid' in point.properties) &&
                               !('uprn' in point.properties))) &&
                              !('file_name' in point.properties) &&
                              !('smallestsite_siteid' in point.properties);

      const selectedCoords: [number, number] = [point.coordinates[0], point.coordinates[1]];
      const connections: Array<{ id: string; coordinates: [number, number]; type: string; properties: any }>[] = [] as any;
      let result: Array<{ id: string; coordinates: [number, number]; type: string; properties: any }> = [];

      if (isUprnSelected) {
        // UPRN neighbours (within 30m) - grouped vertically by floor_level
        const centerPt = turf.point(selectedCoords);
        // Prefer precomputed group members on the representative; otherwise, search in RAW uprnCentroidsData
        let members: UprnCentroidState[] = (point as any).__uprnGroupMembers || uprnCentroidsData.filter((u: UprnCentroidState) => {
          const d = turf.distance(centerPt, turf.point(u.coordinates), 'kilometers') * 1000;
          return d <= UPRN_GROUP_RADIUS_M;
        });
        members = members.filter(m => !(m.coordinates[0] === point.coordinates[0] && m.coordinates[1] === point.coordinates[1]));
        
        // Group by floor_level for vertical spidering
        const floorGroups = new Map<number, UprnCentroidState[]>();
        members.forEach(m => {
          const floorLevel = (m.properties as any)?.floor_level ?? 0; // Default to ground floor if no floor_level
          if (!floorGroups.has(floorLevel)) {
            floorGroups.set(floorLevel, []);
          }
          floorGroups.get(floorLevel)!.push(m);
        });
        
        // Create spidered result with floor_level metadata
        result = [];
        floorGroups.forEach((floorMembers, floorLevel) => {
          floorMembers.forEach(m => {
            result.push({
              id: m.id,
              coordinates: m.coordinates, // Keep original coordinates from database
              type: 'uprn',
              properties: {
                ...m.properties,
                __floorLevel: floorLevel // Store floor level for positioning
              }
            });
          });
        });
      } else if (isPhotoSelected) {
        // Photo → candidates within 10m and bearing match (with connection data)
        const maxDistance = 10; // meters
        const photoHeading = typeof point.properties.photo_heading === 'string'
          ? parseFloat(point.properties.photo_heading)
          : (point.properties.photo_heading || 0);
        
        const addCandidate = (candidate: any, type: string) => {
          const candidateCoords: [number, number] = [candidate.coordinates[0], candidate.coordinates[1]];
          const photoPoint = turf.point(selectedCoords);
          const candidatePoint = turf.point(candidateCoords);
          const distance = turf.distance(photoPoint, candidatePoint, 'kilometers') * 1000;
          const bearing = turf.bearing(photoPoint, candidatePoint);
          
          if (distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, candidateCoords)) {
            // Generate proper ID based on type
            let candidateId;
            if (type === 'nhle') {
              candidateId = candidate.properties.nhle_id || candidate.properties.id || 'unknown';
            } else if (type === 'building' || type === 'buildingPart' || type === 'site') {
              candidateId = candidate.properties.osid || candidate.properties.id || 'unknown';
            } else {
              candidateId = candidate.properties.id || 'unknown';
            }
            
            const uniqueId = `${type}-${candidateId}-${candidateCoords[0].toFixed(6)}-${candidateCoords[1].toFixed(6)}`;
            result.push({ 
              id: uniqueId,
              coordinates: candidateCoords,
              type,
              properties: {
                ...candidate.properties,
                // Add connection data for spidering
                distance: Math.round(distance),
                bearing: Math.round(bearing),
                connection_type: 'photo_bearing_match'
              }
            });
          }
        };

        // Enhanced building part candidate with polygon intersection (optimized)
        const addBuildingPartCandidate = (part: any, cachedBearingPolygon: any) => {
          const partCoords: [number, number] = [part.coordinates[0], part.coordinates[1]];
          const photoPoint = turf.point(selectedCoords);
          const partPoint = turf.point(partCoords);
          const distance = turf.distance(photoPoint, partPoint, 'kilometers') * 1000;
          const bearing = turf.bearing(photoPoint, partPoint);
          
          let shouldInclude = false;
          let connectionType = 'photo_bearing_match';
          
          // Check 1: Traditional bearing match (centroid within bearing)
          const traditionalMatch = distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, partCoords);
          if (traditionalMatch) {
            shouldInclude = true;
          }
          
          // Check 2: Photo point inside building part polygon OR polygon intersection with bearing sector
          if (!shouldInclude && buildingPartPolygonsData?.features) {
            const partPolygon = buildingPartPolygonsData.features.find((feature: any) => 
              feature.properties.osid === part.properties.osid
            );
            
            if (partPolygon) {
              try {
                // Use cached bearing polygon instead of recreating
                const bearingSector = cachedBearingPolygon;
                
                // Check if photo point is inside polygon
                const photoInsidePolygon = booleanPointInPolygon(photoPoint, partPolygon);
                
                // Check if bearing sector intersects with polygon
                const intersects = booleanIntersects(bearingSector, partPolygon);
                
                if (photoInsidePolygon) {
                  shouldInclude = true;
                  connectionType = 'photo_inside_polygon';
                } else if (intersects) {
                  shouldInclude = true;
                  connectionType = 'bearing_polygon_intersection';
                }
              } catch (error) {
                // Fallback to centroid check
                const fallbackMatch = bearingMatch(selectedCoords, photoHeading, partCoords);
                shouldInclude = fallbackMatch;
                if (fallbackMatch) {
                  connectionType = 'fallback_bearing_match';
                }
              }
            }
          }
          
          if (shouldInclude) {
            const candidateId = part.properties.osid || part.properties.id || 'unknown';
            const uniqueId = `buildingPart-${candidateId}-${partCoords[0].toFixed(6)}-${partCoords[1].toFixed(6)}`;
            result.push({ 
              id: uniqueId,
              coordinates: partCoords,
              type: 'buildingPart',
              properties: {
                ...part.properties,
                distance: Math.round(distance),
                bearing: Math.round(bearing),
                connection_type: connectionType
              }
            });
          }
        };

        const addOsmBuildingPartCandidate = (part: any, cachedBearingPolygon: any) => {
          const partCoords: [number, number] = [part.coordinates[0], part.coordinates[1]];
          const photoPoint = turf.point(selectedCoords);
          const partPoint = turf.point(partCoords);
          const distance = turf.distance(photoPoint, partPoint, 'kilometers') * 1000;
          const bearing = turf.bearing(photoPoint, partPoint);
          
          let shouldInclude = false;
          let connectionType = 'photo_bearing_match';
          
          // Check 1: Traditional bearing match (centroid within bearing)
          const traditionalMatch = distance <= maxDistance && bearingMatch(selectedCoords, photoHeading, partCoords);
          if (traditionalMatch) {
            shouldInclude = true;
          }
          
          // Check 2: Photo point inside building part polygon OR polygon intersection with bearing sector
          if (!shouldInclude && osmBuildingPartPolygonsData?.features) {
            const partPolygon = osmBuildingPartPolygonsData.features.find((feature: any) => 
              feature.properties.osm_id === part.properties.osm_id
            );
            
            if (partPolygon && partPolygon.geometry && partPolygon.geometry.coordinates) {
              try {
                // Use cached bearing polygon instead of recreating
                const bearingSector = cachedBearingPolygon;
                
                // Check if photo point is inside polygon
                const photoInsidePolygon = booleanPointInPolygon(photoPoint, partPolygon);
                
                // Check if bearing sector intersects with polygon
                const intersects = booleanIntersects(bearingSector, partPolygon);
                
                if (photoInsidePolygon) {
                  shouldInclude = true;
                  connectionType = 'photo_inside_polygon';
                } else if (intersects) {
                  shouldInclude = true;
                  connectionType = 'bearing_polygon_intersection';
                }
              } catch (error) {
                // Fallback to centroid check
                const fallbackMatch = bearingMatch(selectedCoords, photoHeading, partCoords);
                shouldInclude = fallbackMatch;
                if (fallbackMatch) {
                  connectionType = 'fallback_bearing_match';
                }
              }
            }
          }
          
          if (shouldInclude) {
            const candidateId = part.properties.osm_id || part.properties.id || 'unknown';
            const uniqueId = `osmBuildingPart-${candidateId}-${partCoords[0].toFixed(6)}-${partCoords[1].toFixed(6)}`;
            result.push({ 
              id: uniqueId,
              coordinates: partCoords,
              type: 'osmBuildingPart',
              properties: {
                ...part.properties,
                distance: Math.round(distance),
                bearing: Math.round(bearing),
                connection_type: connectionType
              }
            });
          }
        };
        
        // Create cached bearing polygon once for reuse
        const cachedBearingPolygon = createBearingPolygon(selectedCoords, photoHeading);
        
        if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.buildings)){
          filteredBuildingCentroids.forEach(b => addCandidate(b, 'building'));
        }
        if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.buildingParts)){
          filteredBuildingPartCentroids.forEach(p => addBuildingPartCandidate(p, cachedBearingPolygon)); // Pass cached polygon
        }
        if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.sites)){
          filteredSiteCentroids.forEach(s => addCandidate(s, 'site'));
        }
        if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.nhle)){
          filteredNhleCentroids.forEach(n => addCandidate(n, 'nhle'));
        }
        if((!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.osmBuildingParts)){
          filteredOsmBuildingPartCentroids.forEach(osm => addOsmBuildingPartCandidate(osm, cachedBearingPolygon));
        }

        // Optimized NHLE Land Registry INSPIRE logic using pre-computed mapping
        if (nhleInspireMapping.length > 0 && (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) ||dataType.nhle)) {
          // Use cached bearing polygon for intersection checks
          const bearingPolygon = cachedBearingPolygon;
          
          // Only check pre-computed INSPIRE polygons that contain NHLE points
          for (const mappingData of nhleInspireMapping) {
            const { inspireFeature, nhlePoints } = mappingData;
            
            try {
              // Check if this INSPIRE polygon intersects with photo bearing
              if (booleanIntersects(bearingPolygon, inspireFeature)) {
                // Add all NHLE points from this intersecting polygon
                nhlePoints.forEach((nhlePoint: any) => {
                  // Check if this NHLE point is not already added to result
                  const alreadyAdded = result.some(existing => 
                    existing.type === 'nhle' && existing.properties.nhle_id === nhlePoint.properties.nhle_id
                  );
                  
                  if (!alreadyAdded) {
                    const nhleCoords: [number, number] = [nhlePoint.coordinates[0], nhlePoint.coordinates[1]];
                    const photoPoint = turf.point(selectedCoords);
                    const nhlePointTurf = turf.point(nhleCoords);
                    const distance = turf.distance(photoPoint, nhlePointTurf, 'kilometers') * 1000;
                    const bearing = turf.bearing(photoPoint, nhlePointTurf);
                    
                    const uniqueId = `nhle-inspire-${nhlePoint.properties.nhle_id}-${nhleCoords[0].toFixed(6)}-${nhleCoords[1].toFixed(6)}`;
                    result.push({
                      id: uniqueId,
                      coordinates: nhleCoords,
                      type: 'nhle',
                      properties: {
                        ...nhlePoint.properties,
                        distance: Math.round(distance),
                        bearing: Math.round(bearing),
                        connection_type: 'land_registry_inspire_bearing_intersection',
                        intersected_inspire_gml_id: inspireFeature.properties?.gml_id,
                        intersected_inspire_id: inspireFeature.properties?.INSPIREID,
                        intersected_inspire_label: inspireFeature.properties?.LABEL
                      }
                    });
                  }
                });
              }
            } catch (e) {
              console.warn('Error checking intersection with INSPIRE polygon:', e);
            }
          }
        }
      } else if (isSiteSelected) {
        // Site → related buildings and parts
        const siteProps = point.properties as any;
        const siteId = siteProps.osid || siteProps.id;
        const siteMatchedUprn = siteProps.matcheduprn;
        const relatedBuildings = filteredBuildingCentroids.filter(building => {
          if (building.properties.primarysiteid === siteId) return true;
          if (siteMatchedUprn && building.properties.uprn && Array.isArray(building.properties.uprn)) {
            return building.properties.uprn.some((uprnObj: any) => uprnObj.uprn && uprnObj.uprn.toString() === siteMatchedUprn.toString());
          }
          return false;
        });
        const relatedParts = filteredBuildingPartCentroids.filter(part => part.properties.smallestsite_siteid === siteId);
        result = [
          ...relatedBuildings.map(b => ({ id: `building-${b.properties.id}`, coordinates: b.coordinates, type: 'building', properties: b.properties })),
          ...relatedParts.map(p => ({ id: `part-${p.properties.id}`, coordinates: p.coordinates, type: 'buildingPart', properties: p.properties })),
        ];
      } else if (isBuildingSelected) {
        // Building → related site via primarysiteid
        const primarySiteId = point.properties.primarysiteid;
        if (primarySiteId) {
          const relatedSite = filteredSiteCentroids.find(site => site.properties.osid === primarySiteId);
          if (relatedSite) {
            result = [{ id: `site-${relatedSite.properties.id}`, coordinates: relatedSite.coordinates, type: 'site', properties: relatedSite.properties }];
          }
        }
      } else if (isBuildingPartSelected) {
        // BuildingPart → related site via smallestsite_siteid
        const smallestSiteId = point.properties.smallestsite_siteid;
        if (smallestSiteId) {
          const relatedSite = filteredSiteCentroids.find(site => site.properties.osid === smallestSiteId);
          if (relatedSite) {
            result = [{ id: `site-${relatedSite.properties.id}`, coordinates: relatedSite.coordinates, type: 'site', properties: relatedSite.properties }];
          }
        }
      } else {
        // Default: no spidering
        result = [];
      }

      if (result.length >= 1) {
        setSelectedPoint(point);
        setSpideredConnections(result);
        
        // Auto-adjust camera pitch for 3D view when UPRN with floor levels is spidered
        if (isUprnSelected) {
          const hasFloorLevels = result.some((conn: any) => 
            (conn.properties as any)?.__floorLevel !== undefined && 
            (conn.properties as any)?.__floorLevel !== 0
          );
          
          if (hasFloorLevels) {
            // Tilt camera to see vertical distribution
            setViewState(prev => ({
              ...prev,
              pitch: 45, // Tilt 45 degrees to see 3D structure
              bearing: prev.bearing || 0,
              transitionDuration: 500
            }));
          }
          
          const updatedSelected = {
            ...point,
            properties: {
              ...point.properties,
              uprn_group_size: result.length + 1
            }
          };
          setSelectedFeature(updatedSelected as any);
        } else {
          setSelectedFeature(point);
        }
      } else {
        setSelectedPoint(null);
        setSpideredConnections([]);
        if (isUprnSelected) {
          const updatedSelected = {
            ...point,
            properties: {
              ...point.properties,
              uprn_group_size: 1
            }
          };
          setSelectedFeature(updatedSelected as any);
        } else {
          const normalized = (point as any).__uprnGroupMembers
            ? { ...point, properties: { ...point.properties, uprn_group_size: (point as any).__uprnGroupMembers.length } }
            : point;
          setSelectedFeature(normalized);
        }
      }
    }
  }, [selectedPoint, selectedFeature, uprnCentroidsData, filteredBuildingCentroids, filteredBuildingPartCentroids, filteredSiteCentroids, filteredNhleCentroids, nhleInspireMapping, buildingPartPolygonsData, createBearingPolygon, bearingMatch, dataType]);

  // Clear spidered connections when dataType filter changes to prevent delay
  useEffect(() => {
    if (selectedPoint && spideredConnections.length > 0) {
      // Re-filter spidered connections based on current dataType
      const filteredConnections = spideredConnections.filter(conn => {
        if (conn.type === 'buildingPart') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.buildingParts);
        }
        if (conn.type === 'building') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.buildings);
        }
        if (conn.type === 'site') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.sites);
        }
        if (conn.type === 'nhle') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.nhle);
        }
        if (conn.type === 'photo') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.photos);
        }
        if (conn.type === 'uprn') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.uprn);
        }
        if (conn.type === 'osmBuildingPart') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.osmBuildingParts);
        }
        if (conn.type === 'osmLanduseArea') {
          return (!(dataType.buildings || dataType.buildingParts || dataType.sites || dataType.nhle || dataType.photos || dataType.uprn || dataType.osmBuildingParts || dataType.osmLanduseAreas) || dataType.osmLanduseAreas);
        }
        return true;
      });
      
      // If filtered connections are different, update state
      if (filteredConnections.length !== spideredConnections.length) {
        if (filteredConnections.length === 0) {
          // Clear spidering completely if no connections remain
          setSelectedPoint(null);
          setSpideredConnections([]);
        } else {
          // Update with filtered connections
          setSpideredConnections(filteredConnections);
        }
      }
    }
  }, [dataType, selectedPoint, spideredConnections]);

  const layers = createMapLayers({
    filteredBuildingCentroids,
    filteredBuildingPartCentroids,
    filteredSiteCentroids,
    filteredNhleCentroids,
    filteredPhotoCentroids,
    // Use collapsed UPRN representatives so only one point shows per 30m cluster
    filteredUprnCentroids: uprnCollapsed as any,
    filteredOsmBuildingPartCentroids,
    filteredOsmLanduseAreasCentroids,
    landRegistryInspireData,
    polygonCentroids,
    bidirectionalLinks,
    shapes,
    selectedShapeIds,
    buildingPartPolygons: buildingPartPolygonsData,
    osmBuildingPartPolygons: osmBuildingPartPolygonsData,
    dataType,
    category1,
    category2,
    selectedLegendItem,
    zoomBasedRadius,
    geoJson,
    fetchedPolygons,
    searchMarker,
    selectedFeature,
    selectedPoint,
    spideredConnections,
    spideringRadius,
    onPointClick: handlePointClick,
    groupByMapping,
    getFillColorForData,
    getCursor,
    setHoverInfo,
    setSelectedFeature,
    iconLayerData,
    showPhotoBearingPolygon,
    osmBuildingParts
  });

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
            onViewStateChange={handleViewStateChange}
            getCursor={getCursor}
          >
            <MapGL
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
              onViewStateChange={handleViewStateChange}
            />
          </div>

          <Legend 
            data={allFilteredData}
            category={category2}
            groupByMapping={groupByMapping}
            onItemClick={handleLegendItemClick}
            selectedItem={selectedLegendItem}
            dataType={dataType}
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
                (hoverInfo.object.properties?.oslandusetiera ||
                 `Building Part: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('site-layer') && 
                (hoverInfo.object.properties?.description ||
                 `Site ID: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('nhle-layer') && 
                (hoverInfo.object.properties?.name || 
                 `NHLE ID: ${hoverInfo.object.id}`)
              }
              {hoverInfo.layer?.id.startsWith('building-layer') && 
                (hoverInfo.object.properties?.buildinguse || 
                 `Building ID: ${hoverInfo.object.properties?.osid}`)
              }
              {hoverInfo.layer?.id.startsWith('photo-layer') && 
                (hoverInfo.object.properties?.buildinguse || 
                 `Photo ID: ${hoverInfo.object.properties?.id}`)
              }
              {hoverInfo.layer?.id.startsWith('osm-building-part-layer') && 
                (hoverInfo.object.properties?.name || 
                 hoverInfo.object.properties?.building || 
                 `OSM Building Part ID: ${hoverInfo.object.properties?.id}`)
              }
              {hoverInfo.layer?.id.startsWith('osm-landuse-areas-layer') && 
                (hoverInfo.object.properties?.name || 
                 hoverInfo.object.properties?.landuse || 
                 `OSM Landuse Area ID: ${hoverInfo.object.properties?.id}`)
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
              ? ('uprn_group_size' in selectedFeature.properties ? 'UPRN Details' :
                'file_name' in selectedFeature.properties ? 'Photo Details' :
                'roofmaterial' in selectedFeature.properties ? 'Building Details' : 
                'absoluteheightroofbase' in selectedFeature.properties ? 'Building Part Details' :
                'building' in selectedFeature.properties ? 'OSM Building Part Details' :
                'landuse' in selectedFeature.properties ? 'OSM Landuse Area Details' :
                'oslanduse_capturemethod' in selectedFeature.properties ? 'Site Details' :
                'grade' in selectedFeature.properties ? 'NHLE Details' : 'UPRN Details')
              : isImportPanelOpen
              ? 'Import GeoJSON'
              : 'Filter Options'
          }
        >
          {selectedFeature ? (
            'file_name' in selectedFeature.properties ? (
              // Photo Panel with Enhanced Metadata
              <PhotoPanel 
                selectedFeature={selectedFeature}
                buildingApiData={buildingApiData}
                codepointData={codepointData}
                uprnData={uprnData}
                landRegistryInspireData={contextualInspireData}
                landData={landData}
                shapeData={shapeData}
                nhleData={nhleData}
                isLoadingAdditionalData={isLoadingAdditionalData}
                connectionsData={photoConnectionsData}
                onOpenConnectionsModal={handleOpenConnectionsModal}
              />
            ) : (
              // Default Panel for Building/NHLE/Site Details
              <div>
                {selectedFeature.properties && Object.entries(selectedFeature.properties)
                  .filter(([key]) => !['postcode'].includes(key.toLowerCase()))
                  .map(([key, value]) => {
                    const renderValue = (val: any): React.ReactNode => {
                      if (val === null || val === undefined) {
                        return <span className="text-gray-400 italic">null</span>;
                      }
                      
                      if (Array.isArray(val)) {
                        if (val.length === 0) {
                          return <span className="text-gray-400 italic">empty array</span>;
                        }
                        return (
                          <div className="space-y-1">
                            {val.map((item, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 mt-0.5">#{index + 1}:</span>
                                <div className="flex-1">{renderValue(item)}</div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      if (typeof val === 'object') {
                        return (
                          <div className="space-y-1">
                            {Object.entries(val).map(([objKey, objValue]) => (
                              <div key={objKey} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600 min-w-0">{objKey}:</span>
                                <div className="flex-1">{renderValue(objValue)}</div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      // Check if the value is a URL/hyperlink
                      const stringVal = String(val);
                      const isUrl = /^https?:\/\/.+/i.test(stringVal);
                      
                      if (isUrl) {
                        return (
                          <div className="flex items-center gap-2">
                            <a
                              href={stringVal}
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View
                            </a>
                          </div>
                        );
                      }
                      
                      return <span>{stringVal}</span>;
                    };
                  
                    return (
                      <div key={key} className="mb-3">
                        <strong className="uppercase text-gray-800">{key.replace(/_/g, ' ')}:</strong>
                        <div className='text-gray-700 mt-1'>{renderValue(value)}</div>
                      </div>
                    );
                  })}
              </div>
            )
          ) : isImportPanelOpen ? (
            // Import GeoJSON View
            <div className='flex flex-col gap-4'>
              <div>
                <label htmlFor="schema-select" className="block text-sm font-medium text-gray-700 mb-1">Select Schema</label>
                <select 
                  id="schema-select"
                  value={selectedSchema}
                  onChange={(e) => setSelectedSchema(e.target.value as 'building' | 'site' | 'nhle' | 'buildingpart' | 'uprn' | 'land_registry_inspire' | 'osm_building_part' | 'osm_address' | 'osm_landuse_area' | 'epc_certificate' | '')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>Select a schema</option>
                  <option value="building">Building V4</option>
                  <option value="site">Site V2</option>
                  <option value="nhle">NHLE</option>
                  <option value="buildingpart">Building Part V2</option>
                  <option value="uprn">UPRN</option>
                  <option value="land_registry_inspire">Land Registry INSPIRE</option>
                  <optgroup label="OSM Data">
                    <option value="osm_building_part">OSM Building Part</option>
                    <option value="osm_address">OSM Address</option>
                    <option value="osm_landuse_area">OSM Landuse Area</option>
                  </optgroup>
                  <option value="epc_certificate">EPC Certificate</option>
                </select>
              </div>
              <input type='file' placeholder="Select files" onChange={handleFileChange} accept='.geojson, .json' className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" disabled={!selectedSchema}/>
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">Built-up Areas</h4>
                {isLoadingAreaData && (
                  <div className="flex items-center text-sm text-blue-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading data...
                  </div>
                )}
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search boundaries..."
                  value={boundarySearch}
                  onChange={(e) => setBoundarySearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              {/* Selected Areas Tags */}
              {selectedShapeIds.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Selected Areas:</span>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSelectedOnly}
                        onChange={(e) => setShowSelectedOnly(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">Show selected only</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {selectedShapeIds.map(shapeId => {
                      const shape = shapes?.data?.features?.find(s => s.id === shapeId);
                      const shapeName = shape?.properties?.bua24nm || shapeId;
                      const isLastSelected = selectedShapeIds.length === 1;
                      return (
                        <div
                          key={shapeId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
                        >
                          <span className="max-w-32 truncate" title={shapeName}>
                            {shapeName}
                          </span>
                          <button
                            onClick={() => {
                              if (!isLastSelected) {
                                setSelectedShapeIds(prev => prev.filter(id => id !== shapeId));
                              }
                            }}
                            className={`ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-150 ${
                              isLastSelected 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'hover:bg-indigo-200 cursor-pointer'
                            }`}
                            title={isLastSelected ? "Cannot remove last area" : "Remove area"}
                            disabled={isLastSelected}
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {isLoadingShapes ? (
                  <div className="text-gray-500 text-sm text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      Loading boundaries...
                    </div>
                  </div>
                ) : (
                  <>
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
                    {!isLoadingShapes && filteredShapes.length === 0 && (
                      <div className="text-gray-500 text-sm text-center py-4">
                        {boundarySearch ? `No boundaries found matching "${boundarySearch}"` : 'No boundaries available'}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">Data Types</h4>
                <button
                  onClick={() => {
                    // Show all data types
                    setDataType({ buildings: false, buildingParts: false, sites: false, nhle: false, photos: false, uprn: false, osmBuildingParts: false, osmLanduseAreas: false, epcCertificates: false });
                    setSelectedGrades([]);
                    setSelectedShapeIds([]);
                    setFloorRange({ min: 0, max: maxFloors });

                    // Ensure data from ALL boundaries is loaded, not just default
                    try {
                      const allIds = (shapes?.data?.features || []).map((f: any) => f.id as string);
                      if (allIds.length > 0) {
                        const missingAreaIds = allIds.filter(id =>
                          !Object.keys(areaDataCache).some(key => key.includes(id))
                        );
                        if (missingAreaIds.length > 0) {
                          fetchAreaData(missingAreaIds, false).then(newData => {
                            if (newData) {
                              mergeAreaData(newData);
                            }
                          });
                        }
                      }
                    } catch (e) {
                      console.error('Error ensuring all boundaries data is loaded on clear:', e);
                    }
                  }}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors duration-200 font-medium"
                >
                  Clear Filter
                </button>
              </div>
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
                <label 
                  htmlFor="show-photos"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.photos
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-photos"
                    checked={dataType.photos}
                    onChange={() => {
                      setDataType(prev => ({ ...prev, photos: !prev.photos }));
                    }}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    Photos
                  </span>
                </label>

                <label 
                  htmlFor="show-uprn"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.uprn
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-uprn"
                    checked={dataType.uprn}
                    onChange={() => {
                      setDataType(prev => ({ ...prev, uprn: !prev.uprn }));
                    }}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    UPRN
                  </span>
                </label>

                <label 
                  htmlFor="show-osm-building-parts"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.osmBuildingParts
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-osm-building-parts"
                    checked={dataType.osmBuildingParts}
                    onChange={() => {
                      setDataType(prev => ({ ...prev, osmBuildingParts: !prev.osmBuildingParts }));
                    }}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    OSM Building Parts
                  </span>
                </label>

                <label
                  htmlFor="show-osm-landuse-areas"
                  className={`flex items-center w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                    dataType.osmLanduseAreas
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 border'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}>
                  <input
                    type="checkbox"
                    id="show-osm-landuse-areas"
                    checked={dataType.osmLanduseAreas}
                    onChange={() => {
                      setDataType(prev => ({ ...prev, osmLanduseAreas: !prev.osmLanduseAreas }));
                    }}
                    className="h-5 w-5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-3">
                    OSM Landuse Areas
                  </span>
                </label>

                <div>
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

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800">Photo Bearing Polygon</h4>
                    <button
                      onClick={() => setShowPhotoBearingPolygon(prev => !prev)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        showPhotoBearingPolygon ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showPhotoBearingPolygon ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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

        {/* Connections Modal */}
        {isConnectionsModalOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsConnectionsModalOpen(false);
              }
            }}
          >
            <ConnectionsModal
              isOpen={isConnectionsModalOpen}
              onClose={() => setIsConnectionsModalOpen(false)}
              connections={connectionsForModal}
              onUpdateConnection={handleUpdateConnection}
              sourcePhotoId={modalSourcePhotoId}
            />
          </div>
        )}

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
                  {searchDataType === 'all' ? (
                    <select
                      value={searchDataType}
                      onChange={(e) => {
                        setSearchDataType(e.target.value);
                        setSearchField('all');
                      }}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Select Data Type</option>
                      <option value="nhle">NHLE</option>
                      <option value="building">Building</option>
                      <option value="buildingpart">Building Part</option>
                      <option value="site">Site</option>
                      <option value="uprn">UPRN</option>
                      <option value="osmBuildingPart">OSM Building Part</option>
                      <option value="osmLanduseArea">OSM Landuse Area</option>
                      <option value="epcCertificate">EPC Certificate</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSearchDataType('all');
                          setSearchField('all');
                        }}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"
                      >
                        ← Back
                      </button>
                      <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All {searchDataType.charAt(0).toUpperCase() + searchDataType.slice(1)} Fields</option>
                        {searchableFields[searchDataType as keyof typeof searchableFields]?.map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                  )}
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
                                result.type === 'NHLE' ? 'bg-red-100 text-red-800' :
                                result.type === 'Building' ? 'bg-blue-100 text-blue-800' :
                                result.type === 'Building Part' ? 'bg-orange-100 text-orange-800' :
                                result.type === 'Site' ? 'bg-green-100 text-green-800' :
                                result.type === 'UPRN' ? 'bg-cyan-100 text-cyan-800' :
                                result.type === 'OSM Building Part' ? 
                                  (result.data.building_part === 'yes' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800') :
                                result.type === 'OSM Landuse Area' ? 'bg-green-100 text-green-800' :
                                result.type === 'EPC Certificate' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {result.type}
                              </span>
                              <h4 className="font-medium text-gray-900 truncate">{result.displayText}</h4>
                            </div>
                            <div className="text-sm text-gray-600">
                              {(() => {
                                // Check if this is a sites match for BuildingPart
                                if ((result.type === 'Building Part' || result.type === 'Building') && (result.data.sites || result.data.uprn)){
                                  const matchedSite = result.data.sites.find((site: any) => 
                                    site.site_id && String(site.site_id).toLowerCase().includes(searchQuery.toLowerCase())
                                  );
                                  const matchedUprn = result.data.uprn && Array.isArray(result.data.uprn) ? result.data.uprn.find((uprn: any) => 
                                    uprn?.uprn && String(uprn.uprn).toLowerCase().includes(searchQuery.toLowerCase())
                                  ) : null;
                                  if (matchedSite || matchedUprn) {
                                    return (
                                      <div className="mb-1 truncate">
                                        <span className="font-medium">Matched {matchedSite ? 'Site' : 'UPRN'}:</span> {matchedSite?.site_id || matchedUprn?.uprn}
                                      </div>
                                    );
                                  }
                                }
                                
                                // Default behavior for regular field matches
                                return Object.entries(result.data)
                                  .filter(([key, value]) => value && String(value).toLowerCase().includes(searchQuery.toLowerCase()))
                                  .slice(0, 2)
                                  .map(([key, value]) => (
                                    <div key={key} className="mb-1 truncate">
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                  ));
                              })()}
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