import type { Feature, Geometry, GeoJSON, Position } from 'geojson';
import type { ShapeProperties } from '@/types/shape';
import type { NhleProperties } from '@/types/nhle';
import type { BuildingProperties } from '@/types/building';

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
