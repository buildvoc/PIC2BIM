export const searchableFields = {
  nhle: [
    'gid', 'objectid', 'listentry', 'name', 'grade', 'listdate', 'amenddate', 'capturesca',
    'hyperlink', 'ngr', 'easting', 'northing', 'longitude', 'latitude', 'nhle_id', 'list_entry'
  ],
  building: [
    'osid', 'versiondate', 'versionavailablefromdate', 'versionavailabletodate', 'changetype',
    'geometry_area_m2', 'geometry_updatedate', 'theme', 'description', 'description_updatedate',
    'physicalstate', 'physicalstate_updatedate', 'buildingpartcount', 'isinsite', 'primarysiteid',
    'containingsitecount', 'mainbuildingid', 'mainbuildingid_ismainbuilding', 'mainbuildingid_updatedate',
    'buildinguse', 'buildinguse_oslandusetiera', 'buildinguse_addresscount_total', 'buildinguse_addresscount_residential',
    'buildinguse_addresscount_commercial', 'buildinguse_addresscount_other', 'buildinguse_updatedate',
    'connectivity', 'connectivity_count', 'connectivity_updatedate', 'constructionmaterial',
    'constructionmaterial_evidencedate', 'constructionmaterial_updatedate', 'constructionmaterial_source',
    'constructionmaterial_capturemethod', 'constructionmaterial_thirdpartyprovenance', 'buildingage_period',
    'buildingage_year', 'buildingage_evidencedate', 'buildingage_updatedate', 'buildingage_source',
    'buildingage_capturemethod', 'buildingage_thirdpartyprovenance', 'basementpresence', 'basementpresence_selfcontained',
    'basementpresence_evidencedate', 'basementpresence_updatedate', 'basementpresence_source',
    'basementpresence_capturemethod', 'basementpresence_thirdpartyprovenance', 'numberoffloors',
    'numberoffloors_evidencedate', 'numberoffloors_updatedate', 'numberoffloors_source', 'numberoffloors_capturemethod',
    'height_absolutemin_m', 'height_absoluteroofbase_m', 'height_absolutemax_m', 'height_relativeroofbase_m',
    'height_relativemax_m', 'height_confidencelevel', 'height_evidencedate', 'height_updatedate',
    'roofmaterial_primarymaterial', 'roofmaterial_solarpanelpresence', 'roofmaterial_greenroofpresence',
    'roofmaterial_confidenceindicator', 'roofmaterial_evidencedate', 'roofmaterial_updatedate', 'roofmaterial_capturemethod',
    'roofshapeaspect_shape', 'roofshapeaspect_areapitched_m2', 'roofshapeaspect_areaflat_m2',
    'roofshapeaspect_areafacingnorth_m2', 'roofshapeaspect_areafacingnortheast_m2', 'roofshapeaspect_areafacingeast_m2',
    'roofshapeaspect_areafacingsoutheast_m2', 'roofshapeaspect_areafacingsouth_m2', 'roofshapeaspect_areafacingsouthwest_m2',
    'roofshapeaspect_areafacingwest_m2', 'roofshapeaspect_areafacingnorthwest_m2', 'roofshapeaspect_areaindeterminable_m2',
    'roofshapeaspect_areatotal_m2', 'roofshapeaspect_confidenceindicator', 'roofshapeaspect_evidencedate',
    'roofshapeaspect_updatedate', 'roofshapeaspect_capturemethod', 'uprn', 'postcode', 'sites', 'area', 'roofmaterial'
  ],
  buildingpart: [
    'osid', 'toid', 'versiondate', 'versionavailablefromdate', 'versionavailabletodate', 'firstdigitalcapturedate',
    'changetype', 'geometry_area_m2', 'geometry_evidencedate', 'geometry_updatedate', 'geometry_capturemethod',
    'theme', 'description', 'description_evidencedate', 'description_updatedate', 'description_capturemethod',
    'oslandcovertiera', 'oslandcovertierb', 'oslandcover_evidencedate', 'oslandcover_updatedate', 'oslandcover_capturemethod',
    'oslandusetiera', 'oslandusetierb', 'oslanduse_evidencedate', 'oslanduse_updatedate', 'oslanduse_capturemethod',
    'height_absoluteroofbase_m', 'height_relativeroofbase_m', 'height_absolutemax_m', 'height_relativemax_m',
    'height_absolutemin_m', 'height_confidencelevel', 'height_evidencedate', 'height_updatedate',
    'associatedstructure', 'isobscured', 'physicallevel', 'capturespecification', 'containingsitecount',
    'smallestsite_siteid', 'smallestsite_landusetiera', 'smallestsite_landusetierb', 'largestsite_landusetiera',
    'largestsite_landusetierb', 'nlud_code', 'nlud_orderdescription', 'nlud_groupdescription',
    'address_classificationcode', 'address_primarydescription', 'address_secondarydescription',
    'lowertierlocalauthority_gsscode', 'lowertierlocalauthority_count', 'status', 'status_updatedate',
    'sites', 'area', 'absoluteheightroofbase', 'relativeheightroofbase', 'absoluteheightmaximum',
    'relativeheightmaximum', 'absoluteheightminimum', 'heightconfidencelevel'
  ],
  site: [
    'osid', 'toid', 'versiondate', 'versionavailablefromdate', 'versionavailabletodate', 'changetype',
    'geometry_area_m2', 'geometry_evidencedate', 'geometry_updatedate', 'geometry_capturemethod',
    'theme', 'description', 'description_evidencedate', 'description_updatedate', 'description_capturemethod',
    'oslandusetiera', 'oslandusetierb', 'oslanduse_evidencedate', 'oslanduse_updatedate', 'oslanduse_capturemethod',
    'stakeholder', 'name1_text', 'name1_language', 'name1_evidencedate', 'name1_updatedate',
    'name2_text', 'name2_language', 'name2_evidencedate', 'name2_updatedate', 'extentdefinition',
    'matcheduprn', 'matcheduprn_method', 'address_classificationcode', 'address_primarydescription',
    'address_secondarydescription', 'address_classificationcorrelation', 'address_classificationsource',
    'addresscount_total', 'addresscount_residential', 'addresscount_commercial', 'addresscount_other',
    'nlud_code', 'nlud_orderdescription', 'nlud_groupdescription', 'mainbuildingid', 'status', 'status_updatedate',
    'buildings', 'buildingparts', 'uprn', 'buildinguse', 'area'
  ],
  uprn: [
    'uprn', 'latitude', 'longitude'
  ],
  photo: [
    'id', 'path', 'file_name', 'user_name', 'user_id', 'photo_heading'
  ],
  osmBuildingPart: [
    'id', 'source', 'osm_id', 'name', 'ref_gb_uprn', 'base_shape', 'base_orientation', 
    'building', 'building_part', 'building_levels', 'roof_shape', 'height_m', 'roof_shape'
  ],
  osmLanduseArea: [
    'id', 'source', 'osm_id', 'name', 'landuse', 'operator', 'ref'
  ],
  epcCertificate: [
    'lmk_key', 'address1', 'address2', 'address3', 'postcode', 'building_reference_number',
    'current_energy_rating', 'potential_energy_rating', 'current_energy_efficiency',
    'potential_energy_efficiency', 'property_type', 'built_form', 'inspection_date',
    'local_authority', 'constituency', 'county', 'lodgement_date', 'transaction_type',
    'environment_impact_current', 'environment_impact_potential', 'energy_consumption_current',
    'energy_consumption_potential', 'co2_emissions_current', 'co2_emissions_potential',
    'co2_emiss_curr_per_floor_area', 'lighting_cost_current', 'heating_cost_current',
    'hot_water_cost_current', 'total_floor_area', 'energy_tariff', 'mains_gas_flag',
    'floor_level', 'flat_top_storey', 'flat_storey_count', 'main_heating_controls',
    'multi_glaze_proportion', 'glazed_type', 'glazed_area', 'extension_count',
    'number_habitable_rooms', 'number_heated_rooms', 'low_energy_lighting',
    'number_open_fireplaces', 'hotwater_description', 'hot_water_energy_eff',
    'hot_water_env_eff', 'floor_description', 'floor_energy_eff', 'floor_env_eff',
    'windows_description', 'windows_energy_eff', 'windows_env_eff', 'walls_description',
    'walls_energy_eff', 'walls_env_eff', 'secondheat_description', 'sheating_energy_eff',
    'sheating_env_eff', 'roof_description', 'roof_energy_eff', 'roof_env_eff',
    'mainheat_description', 'mainheat_energy_eff', 'mainheat_env_eff',
    'mainheatcont_description', 'mainheatc_energy_eff', 'mainheatc_env_eff',
    'lighting_description', 'lighting_energy_eff', 'lighting_env_eff',
    'main_fuel', 'wind_turbine_count', 'heat_loss_corridor', 'unheated_corridor_length',
    'floor_height', 'photo_supply', 'solar_water_heating_flag', 'mechanical_ventilation',
    'address', 'local_authority_label', 'constituency_label', 'certificate_hash',
    'uprn', 'uprn_source'
  ]
};

export type SearchableFieldsType = typeof searchableFields;
