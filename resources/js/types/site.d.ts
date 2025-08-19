export interface SiteProperties {
    [key: string]: any;
    osid: string;
    toid?: string;
    uprn?: string;
    changetype?: string;
    description?: string;
    buildinguse?: string;
    theme?: string;
    area?: number;
}

export interface SiteFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, SiteProperties> {
    id: string;
}

export interface SiteGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, SiteProperties> {
    features: SiteFeature[];
}