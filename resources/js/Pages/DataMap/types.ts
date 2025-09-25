import type { Feature, Geometry, GeoJSON, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { NhleProperties } from '@/types/nhle';
import type { BuildingProperties } from '@/types/buildingv4';
import type { BuildingPartProperties } from '@/types/buildingpart';
import type { SiteProperties } from '@/types/site';
import { BuiltupAreaProperties } from '@/types/builtup-area';

export interface NhleFeatureState { 
  id: string|number; 
  coordinates: [longitude: number, latitude: number];
  properties: NhleProperties;
}

export interface BuildingCentroidState {
  id: string;
  coordinates: [number, number];
  properties: BuildingProperties;
}

export interface BuildingPartCentroidState {
  id: string;
  coordinates: [number, number];
  properties: BuildingPartProperties;
}

export interface SiteCentroidState {
  id: string;
  coordinates: [number, number];
  properties: SiteProperties;
}

// UPRN types
export interface UprnProperties {
  uprn: string;
  id?: string | number;
  [key: string]: any;
}

export interface UprnCentroidState {
  id: string;
  coordinates: [number, number];
  properties: UprnProperties;
}

export interface PhotoProperties {
  id: number;
  path: string;
  file_name: string;
  user_name: string;
  user_id: number;
  photo_heading: string;
  accuracy: string;
  created: string;
  altitude: string;
  note: string;
  // Device info (from backend DataMapPhotoResource)
  device_manufacture?: string | null;
  device_model?: string | null;
  device_platform?: string | null;
  device_version?: string | null;
  network_info: string;
  provider?: string | null;
  lat: string;
  lng: string;
  link: string;
  osnma_enabled: boolean | string;
  osnma_validated: boolean | string;
  validated_sats?: string | null;
}

export interface PhotoCentroidState {
  id: string;
  coordinates: [number, number];
  properties: PhotoProperties;
}

export interface ShapeFeature extends GeoJSON.Feature {
  id: string|number;
  properties: ShapeProperties;
  geometry: GeoJSON.MultiPolygon;
}

export interface ShapesGeoJson extends GeoJSON.FeatureCollection {
  features: ShapeFeature[];
}

export interface SelectedShapeData extends GeoJSON.Feature {
  id: string|number; // Corresponds to ogc_fid
  geometry: GeoJSON.MultiPolygon;
  properties: ShapeProperties;
}

export interface BuiltupAreaFeature extends GeoJSON.Feature {
  id: string|number;
  properties: BuiltupAreaProperties;
  geometry: GeoJSON.MultiPolygon;
}

export interface BuiltupAreaGeoJson extends GeoJSON.FeatureCollection {
  features: BuiltupAreaFeature[];
}

export interface SelectedBuiltupAreaData extends GeoJSON.Feature {
  id: string|number; // Corresponds to ogc_fid
  geometry: GeoJSON.MultiPolygon;
  properties: BuiltupAreaProperties;
}

export interface LoadedNhleFeatureState {
  id: string|number;
  coordinates: [longitude: number, latitude: number];
  properties: {Name: string;}
}

export interface LoadedNhleFeature extends GeoJSON.Feature {
  id: string|number;
  geometry: Geometry;
  properties: {Name: string;};
}

export interface FetchedPolygonsData extends GeoJSON.FeatureCollection {
  features: Feature[];
}

export interface MGeoJson extends GeoJSON.FeatureCollection {
  features: LoadedNhleFeature[];
}

export interface ValidationError {
  message?: string;
  severity?: string;
  from?: number;
  to?: number;
  [key: string]: any; // Allow additional properties
}
