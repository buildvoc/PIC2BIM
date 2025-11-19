export interface BuildingPartProperties {
    [key: string]: any;
    osid: string;
    toid?: string;
    description?: string;
    theme?: string;
    absoluteheightroofbase?: number;
    relativeheightroofbase?: number;
    absoluteheightmaximum?: number;
    relativeheightmaximum?: number;
    absoluteheightminimum?: number;
    heightconfidencelevel?: string;
    oslandcovertiera?: string;
    oslandcovertierb?: string;
    oslandusetiera?: string;
    oslandusetierb?: string;
    associatedstructure?: string;
    isobscured?: boolean;
    physicallevel?: string;
    area?: number;
    sites?: { site_id: string }[];
}

export interface BuildingPartFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingPartProperties> {
    id: string;
}

export interface BuildingPartGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingPartProperties> {
    features: BuildingPartFeature[];
}
