export interface BuildingPartProperties {
    [key: string]: any;
    osid: string;
    toid?: string;
    versiondate?: string;
    versionavailablefromdate?: string;
    versionavailabletodate?: string;
    firstdigitalcapturedate?: string;
    changetype?: string;
    geometry_area_m2?: number;
    geometry_evidencedate?: string;
    geometry_updatedate?: string;
    geometry_capturemethod?: string;
    theme?: string;
    description?: string;
    description_evidencedate?: string;
    description_updatedate?: string;
    description_capturemethod?: string;
    oslandcovertiera?: string;
    oslandcovertierb?: string;
    oslandcover_evidencedate?: string;
    oslandcover_updatedate?: string;
    oslandcover_capturemethod?: string;
    oslandusetiera?: string;
    oslandusetierb?: string;
    oslanduse_evidencedate?: string;
    oslanduse_updatedate?: string;
    oslanduse_capturemethod?: string;
    height_absoluteroofbase_m?: number;
    height_relativeroofbase_m?: number;
    height_absolutemax_m?: number;
    height_relativemax_m?: number;
    height_absolutemin_m?: number;
    height_confidencelevel?: string;
    height_evidencedate?: string;
    height_updatedate?: string;
    associatedstructure?: string;
    isobscured?: boolean;
    physicallevel?: string;
    capturespecification?: string;
    containingsitecount?: number;
    smallestsite_siteid?: string;
    smallestsite_landusetiera?: string;
    smallestsite_landusetierb?: string;
    largestsite_landusetiera?: string;
    largestsite_landusetierb?: string;
    nlud_code?: string;
    nlud_orderdescription?: string;
    nlud_groupdescription?: string;
    address_classificationcode?: string;
    address_primarydescription?: string;
    address_secondarydescription?: string;
    lowertierlocalauthority_gsscode?: string;
    lowertierlocalauthority_count?: number;
    status?: string;
    status_updatedate?: string;
    
    // Relationship fields
    sites?: { site_id: string }[];
    
    // Legacy field mappings for backward compatibility
    area?: number;
    absoluteheightroofbase?: number;
    relativeheightroofbase?: number;
    absoluteheightmaximum?: number;
    relativeheightmaximum?: number;
    absoluteheightminimum?: number;
    heightconfidencelevel?: string;
}

export interface BuildingPartFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingPartProperties> {
    id: string;
}

export interface BuildingPartGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingPartProperties> {
    features: BuildingPartFeature[];
}
