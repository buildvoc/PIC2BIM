export interface BuildingProperties {
    [key: string]: any;
    osid: string;
    versiondate?: string;
    versionavailablefromdate?: string;
    versionavailabletodate?: string;
    changetype?: string;
    geometry_area_m2?: number;
    geometry_updatedate?: string;
    theme?: string;
    description?: string;
    description_updatedate?: string;
    physicalstate?: string;
    physicalstate_updatedate?: string;
    buildingpartcount?: number;
    isinsite?: boolean;
    primarysiteid?: string;
    containingsitecount?: number;
    mainbuildingid?: string;
    mainbuildingid_ismainbuilding?: string;
    mainbuildingid_updatedate?: string;
    buildinguse?: string;
    buildinguse_oslandusetiera?: string;
    buildinguse_addresscount_total?: number;
    buildinguse_addresscount_residential?: number;
    buildinguse_addresscount_commercial?: number;
    buildinguse_addresscount_other?: number;
    buildinguse_updatedate?: string;
    connectivity?: string;
    connectivity_count?: number;
    connectivity_updatedate?: string;
    constructionmaterial?: string;
    constructionmaterial_evidencedate?: string;
    constructionmaterial_updatedate?: string;
    constructionmaterial_source?: string;
    constructionmaterial_capturemethod?: string;
    constructionmaterial_thirdpartyprovenance?: string;
    buildingage_period?: string;
    buildingage_year?: number;
    buildingage_evidencedate?: string;
    buildingage_updatedate?: string;
    buildingage_source?: string;
    buildingage_capturemethod?: string;
    buildingage_thirdpartyprovenance?: string;
    basementpresence?: string;
    basementpresence_selfcontained?: string;
    basementpresence_evidencedate?: string;
    basementpresence_updatedate?: string;
    basementpresence_source?: string;
    basementpresence_capturemethod?: string;
    basementpresence_thirdpartyprovenance?: string;
    numberoffloors?: number;
    numberoffloors_evidencedate?: string;
    numberoffloors_updatedate?: string;
    numberoffloors_source?: string;
    numberoffloors_capturemethod?: string;
    height_absolutemin_m?: number;
    height_absoluteroofbase_m?: number;
    height_absolutemax_m?: number;
    height_relativeroofbase_m?: number;
    height_relativemax_m?: number;
    height_confidencelevel?: string;
    height_evidencedate?: string;
    height_updatedate?: string;
    roofmaterial_primarymaterial?: string;
    roofmaterial_solarpanelpresence?: string;
    roofmaterial_greenroofpresence?: string;
    roofmaterial_confidenceindicator?: string;
    roofmaterial_evidencedate?: string;
    roofmaterial_updatedate?: string;
    roofmaterial_capturemethod?: string;
    roofshapeaspect_shape?: string;
    roofshapeaspect_areapitched_m2?: number;
    roofshapeaspect_areaflat_m2?: number;
    roofshapeaspect_areafacingnorth_m2?: number;
    roofshapeaspect_areafacingnortheast_m2?: number;
    roofshapeaspect_areafacingeast_m2?: number;
    roofshapeaspect_areafacingsoutheast_m2?: number;
    roofshapeaspect_areafacingsouth_m2?: number;
    roofshapeaspect_areafacingsouthwest_m2?: number;
    roofshapeaspect_areafacingwest_m2?: number;
    roofshapeaspect_areafacingnorthwest_m2?: number;
    roofshapeaspect_areaindeterminable_m2?: number;
    roofshapeaspect_areatotal_m2?: number;
    roofshapeaspect_confidenceindicator?: string;
    roofshapeaspect_evidencedate?: string;
    roofshapeaspect_updatedate?: string;
    roofshapeaspect_capturemethod?: string;
    
    // Relationship fields
    uprn?: { uprn: string }[];
    postcode?: string;
    sites?: { site_id: string }[];
    
    // Legacy compatibility fields
    area?: number;
    roofmaterial?: string;
}

export interface BuildingFeature extends GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingProperties> {
    id: string;
}

export interface BuildingGeoJson extends GeoJSON.FeatureCollection<GeoJSON.MultiPolygon | GeoJSON.Polygon, BuildingProperties> {
    features: BuildingFeature[];
}
