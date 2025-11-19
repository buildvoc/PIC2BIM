import React, { useState, useEffect } from "react";
import { fetchAllBuildingData, findNearestFeature } from "@/Pages/BuildingHeight/api/fetch-building";

interface BuildingDataGridProps {
  selectedPhoto: any;
  osid: string;
  properties: any;
}

const BuildingDataGrid: React.FC<BuildingDataGridProps> = ({ selectedPhoto, osid, properties }) => {
  const [buildingAttributes, setBuildingAttributes] = useState<any>(properties);
  const [codepointData, setCodepointData] = useState<any>(null);
  const [uprnData, setUprnData] = useState<any>(null);
  
  // Check if this is OSM data (has height_m instead of absoluteheightmaximum)
  const isOsmData = properties?.height_m !== undefined;

  useEffect(() => {
    if (!osid) return;
    
    const controller = new AbortController();
    
    const fetchCodepointOnly = async () => {
      try {
        const latitude = parseFloat(selectedPhoto.lat);
        let longitude = parseFloat(selectedPhoto.lng);
        if (longitude > 0) longitude = -Math.abs(longitude);

        // Use optimized endpoint with direct lng/lat parameters
        const response = await fetch(`/comm_codepoint?lng=${longitude}&lat=${latitude}`, { signal: controller.signal });
        const codepointData = await response.json();
        
        // Backend now returns the nearest codepoint directly
        setCodepointData(codepointData?.data?.properties ?? null);
      } catch (error) {
        console.error('Failed to fetch codepoint data', error);
      }
    };

    const fetchLegacyData = async () => {
      try {
        const response = await fetchAllBuildingData(selectedPhoto.lat, selectedPhoto.lng, "", "", osid, true);

        // Backend now returns nearest codepoint and UPRN directly (not arrays)
        setCodepointData(response?.codepoint?.data?.properties ?? null);
        setUprnData(response?.uprn?.data?.properties ?? null);
        setBuildingAttributes(response?.attributes?.data?.features?.[0]?.properties ?? null);
      } catch (error) {
        console.error('Failed to fetch building attributes', error);
      }
    };

    if (isOsmData) {
      fetchCodepointOnly();
    } else {
      fetchLegacyData();
    }

    return () => controller.abort();
  }, [osid, isOsmData]);

  return (
    <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
      <div className="grid grid-cols-2 gap-y-2">
        {/* UPRN */}
        <div className="text-gray-500 dark:text-gray-400">UPRN</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.ref_gb_uprn : uprnData?.uprn}
        </div>

        {/* Postcode */}
        <div className="text-gray-500 dark:text-gray-400">Postcode</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{codepointData?.postcode}</div>

        {/* Absolute Height Min */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Min</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.base_height_m : properties?.absoluteheightminimum} m
        </div>

        {/* Absolute Height Roof Base */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Roof Base</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.roof_height_m : properties?.absoluteheightroofbase} m
        </div>

        {/* Absolute Height Max */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Max</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.height_m : properties?.absoluteheightmaximum} m
        </div>

        {/* Relative Height Min */}
        <div className="text-gray-500 dark:text-gray-400">Relative Height Min</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.min_height_m : properties?.relativeheightminimum} m
        </div>

        {/* Relative Height Roof Base */}
        <div className="text-gray-500 dark:text-gray-400">Relative Height Roof Base</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.roof_height_m : properties?.relativeheightroofbase} m
        </div>

        {/* Building Height Confidence */}
        <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{selectedPhoto?.accuracy}</div>

        {/* Description */}
        <div className="text-gray-500 dark:text-gray-400">Description</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.building : properties?.description}
        </div>

        {/* Construction Material */}
        <div className="text-gray-500 dark:text-gray-400">Construction Material</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.base_material : buildingAttributes?.constructionmaterial}
        </div>

        {/* Roof Material */}
        <div className="text-gray-500 dark:text-gray-400">{isOsmData ? 'Roof Shape' : 'Roof Material'} </div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.roof_shape : buildingAttributes?.roofmaterial}
        </div>

        {/* Building Use */}
        <div className="text-gray-500 dark:text-gray-400">Building Use</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.building : buildingAttributes?.buildinguse}
        </div>

        {/* Number of Floors */}
        <div className="text-gray-500 dark:text-gray-400">Number of Floors</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
          {isOsmData ? properties?.building_levels : buildingAttributes?.numberoffloors}
        </div>
      </div>
    </div>
  );
};

export default BuildingDataGrid;
