// Tipe data untuk BuildingAttributes
import type { PageProps } from '@/types';

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface PhotoData {
  id: number;
  lat: string;
  lng: string;
  photo_heading: string;
  file_name: string;
  link: string;
  altitude?: number;
  path?: string;
  angle?: number;
  vertical_view_angle?: number;
  distance?: number;
  nmea_distance?: number;
  [key: string]: any; // Allow for additional properties
}

export interface NearestBuildingData {
  id: number;
  buildingPartId: string;
  distance: number;
  name?: string;
  geometry?: any;
  [key: string]: any;
}

export interface BuildingGeometryData {
  coordinates: any[];
  height: number;
  base: number;
}

export interface Props extends Omit<PageProps, 'photos'> {
  photos: PhotoData[];
  auth: {
    user: {
      id: number;
      name: string;
      email: string;
      login: string;
      surname: string;
      identification_number: string;
      vat: string;
      email_verified_at: string;
      roles: any[];
      [key: string]: any;
    };
  };
}
