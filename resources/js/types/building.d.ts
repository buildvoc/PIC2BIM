export interface BuildingProperties {
    [key: string]: any;
    osid: string;
    postcode?: string;
    description?: string;
    constructionmaterial?: string;
    roofmaterial?: string;
    buildinguse?: string;
    numberoffloors?: number;
    sites?: { site_id: string }[];
    uprn?: string[];
}

export interface BuildingFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingProperties> {
    id: string;
}

export interface BuildingGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingProperties> {
    features: BuildingFeature[];
}
