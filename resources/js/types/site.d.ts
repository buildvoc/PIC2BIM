export interface SiteProperties {
    [key: string]: any;
    osid: string;
    toid?: string;
    versiondate?: string;
    versionavailablefromdate?: string;
    versionavailabletodate?: string;
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
    oslandusetiera?: string;
    oslandusetierb?: string;
    oslanduse_evidencedate?: string;
    oslanduse_updatedate?: string;
    oslanduse_capturemethod?: string;
    stakeholder?: string;
    name1_text?: string;
    name1_language?: string;
    name1_evidencedate?: string;
    name1_updatedate?: string;
    name2_text?: string;
    name2_language?: string;
    name2_evidencedate?: string;
    name2_updatedate?: string;
    extentdefinition?: string;
    matcheduprn?: number;
    matcheduprn_method?: string;
    address_classificationcode?: string;
    address_primarydescription?: string;
    address_secondarydescription?: string;
    address_classificationcorrelation?: string;
    address_classificationsource?: string;
    addresscount_total?: number;
    addresscount_residential?: number;
    addresscount_commercial?: number;
    addresscount_other?: number;
    nlud_code?: string;
    nlud_orderdescription?: string;
    nlud_groupdescription?: string;
    mainbuildingid?: string;
    status?: string;
    status_updatedate?: string;
    
    // Relationship fields
    buildings?: { osid: string }[];
    buildingparts?: { osid: string }[];
    
    // Legacy field mappings for backward compatibility
    uprn?: string;
    buildinguse?: string;
    area?: number;
    building?: string[];
    buildingpart?: string[];
}

export interface SiteFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, SiteProperties> {
    id: string;
}

export interface SiteGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, SiteProperties> {
    features: SiteFeature[];
}