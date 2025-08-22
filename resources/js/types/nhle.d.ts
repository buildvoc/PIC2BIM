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
    nhle_id:    number;
    list_entry: number;
    name:       string;
    grade:      string;
    hyperlink:  string;
    ngr:        string;
}