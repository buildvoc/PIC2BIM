import type { MultiPoint } from 'geojson';

export interface NhleData {
    gid:        number;
    objectid:   number;
    listentry:  number;
    name:       string;
    grade:      string;
    hyperlink:  string;
    ngr:        string;
    geom:       MultiPoint;
}

export interface NhleProperties {
    [key: string]: any;
    gid?: number;
    objectid?: number;
    listentry?: number;
    name?: string;
    grade?: string;
    listdate?: string;
    amenddate?: string;
    capturesca?: string;
    hyperlink?: string;
    ngr?: string;
    easting?: string;
    northing?: string;
    longitude?: number;
    latitude?: number;
    
    // Legacy field mappings for backward compatibility
    nhle_id?: number;
    list_entry?: number;
    geometry?: MultiPoint;
}