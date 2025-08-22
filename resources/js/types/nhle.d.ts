import type { Feature, FeatureCollection, MultiPoint } from 'geojson';

export interface NhleProperties {
    gid?:        number;
    objectid?:   number;
    listentry?:  number;
    nhle_id?:    number;
    name?:       string;
    grade?:      string;
    hyperlink?:  string;
    ngr?:        string;
    geom?:       any;
}