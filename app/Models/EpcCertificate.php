<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Attr\Uprn;

class EpcCertificate extends Model
{
    protected $table = 'epc_certificate';

    protected $fillable = [
        'lmk_key',
        'address1',
        'address2',
        'address3',
        'postcode',
        'building_reference_number',
        'current_energy_rating',
        'potential_energy_rating',
        'current_energy_efficiency',
        'potential_energy_efficiency',
        'property_type',
        'built_form',
        'inspection_date',
        'local_authority',
        'constituency',
        'county',
        'lodgement_date',
        'transaction_type',
        'environment_impact_current',
        'environment_impact_potential',
        'energy_consumption_current',
        'energy_consumption_potential',
        'co2_emissions_current',
        'co2_emiss_curr_per_floor_area',
        'co2_emissions_potential',
        'lighting_cost_current',
        'lighting_cost_potential',
        'heating_cost_current',
        'heating_cost_potential',
        'hot_water_cost_current',
        'hot_water_cost_potential',
        'total_floor_area',
        'energy_tariff',
        'mains_gas_flag',
        'floor_level',
        'flat_top_storey',
        'flat_storey_count',
        'main_heating_controls',
        'multi_glaze_proportion',
        'glazed_type',
        'glazed_area',
        'extension_count',
        'number_habitable_rooms',
        'number_heated_rooms',
        'low_energy_lighting',
        'number_open_fireplaces',
        'hotwater_description',
        'hot_water_energy_eff',
        'hot_water_env_eff',
        'floor_description',
        'floor_energy_eff',
        'floor_env_eff',
        'windows_description',
        'windows_energy_eff',
        'windows_env_eff',
        'walls_description',
        'walls_energy_eff',
        'walls_env_eff',
        'secondheat_description',
        'sheating_energy_eff',
        'sheating_env_eff',
        'roof_description',
        'roof_energy_eff',
        'roof_env_eff',
        'mainheat_description',
        'mainheat_energy_eff',
        'mainheat_env_eff',
        'mainheatcont_description',
        'mainheatc_energy_eff',
        'mainheatc_env_eff',
        'lighting_description',
        'lighting_energy_eff',
        'lighting_env_eff',
        'main_fuel',
        'wind_turbine_count',
        'heat_loss_corridor',
        'unheated_corridor_length',
        'floor_height',
        'photo_supply',
        'solar_water_heating_flag',
        'mechanical_ventilation',
        'address',
        'local_authority_label',
        'constituency_label',
        'posttown',
        'construction_age_band',
        'lodgement_datetime',
        'tenure',
        'fixed_lighting_outlets_count',
        'low_energy_fixed_light_count',
        'uprn',
        'uprn_source',
        'report_type',
        'data_jsonb',
    ];

    protected $casts = [
        // Dates
        'inspection_date' => 'date',
        'lodgement_date' => 'date',
        'lodgement_datetime' => 'datetime',
        
        // Boolean
        'flat_top_storey' => 'boolean',
        
        // Integers
        'building_reference_number' => 'integer',
        'current_energy_efficiency' => 'integer',
        'potential_energy_efficiency' => 'integer',
        'environment_impact_current' => 'integer',
        'environment_impact_potential' => 'integer',
        'energy_consumption_current' => 'integer',
        'energy_consumption_potential' => 'integer',
        'co2_emiss_curr_per_floor_area' => 'integer',
        'lighting_cost_current' => 'integer',
        'lighting_cost_potential' => 'integer',
        'heating_cost_current' => 'integer',
        'heating_cost_potential' => 'integer',
        'hot_water_cost_current' => 'integer',
        'hot_water_cost_potential' => 'integer',
        'floor_level' => 'integer',
        'multi_glaze_proportion' => 'integer',
        'low_energy_lighting' => 'integer',
        'number_open_fireplaces' => 'integer',
        'wind_turbine_count' => 'integer',
        'construction_age_band' => 'integer',
        'fixed_lighting_outlets_count' => 'integer',
        'report_type' => 'integer',
        
        // Decimals
        'co2_emissions_current' => 'decimal:3',
        'co2_emissions_potential' => 'decimal:3',
        'total_floor_area' => 'decimal:2',
        'unheated_corridor_length' => 'decimal:2',
        'floor_height' => 'decimal:2',
        
        // JSON
        'data_jsonb' => 'array',
    ];

    /**
     * Relationship to UPRN
     */
    public function uprnRecord()
    {
        return $this->belongsTo(Uprn::class, 'uprn', 'uprn');
    }

    /**
     * Scope to get EPC certificates with geometry from linked UPRN
     */
    public function scopeWithGeometry($query)
    {
        return $query->select('epc_certificate.*')
            ->selectRaw('ST_AsGeoJSON(ST_Transform(osopenuprn_address.geom, 4326)) as geometry')
            ->leftJoin('osopenuprn_address', function($join) {
                $join->on(\DB::raw('epc_certificate.uprn::bigint'), '=', 'osopenuprn_address.uprn');
            })
            ->whereNotNull('osopenuprn_address.geom');
    }

    /**
     * Scope to filter by built-up area geometries
     */
    public function scopeWithinBuiltupAreas($query, $builtupAreaGeometriesQuery)
    {
        // Convert the query builder to SQL string
        $geometriesSubquery = $builtupAreaGeometriesQuery->toSql();
        $bindings = $builtupAreaGeometriesQuery->getBindings();
        
        return $query->whereExists(function ($subQuery) use ($geometriesSubquery, $bindings) {
            $subQuery->select(\DB::raw(1))
                ->from('osopenuprn_address')
                ->whereRaw('osopenuprn_address.uprn = epc_certificate.uprn::bigint')
                ->whereRaw("ST_Within(osopenuprn_address.geom, (SELECT ST_Union(geometry) FROM ({$geometriesSubquery}) as bua))", $bindings);
        });
    }
}
