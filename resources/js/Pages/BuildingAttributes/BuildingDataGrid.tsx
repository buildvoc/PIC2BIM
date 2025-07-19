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

  useEffect(() => {
    if (!osid) return;
    const controller = new AbortController();
    const fetchAttributes = async () => {
      try {
        const response = await fetchAllBuildingData(selectedPhoto.lat, selectedPhoto.lng, "", "", osid, true);

        const codepointFeatures = response?.codepoint?.data?.features || [];
        const nearestCodepoint = findNearestFeature(codepointFeatures, selectedPhoto.lat, selectedPhoto.lng);

        const uprnFeatures = response?.uprn?.data?.features || [];
        const nearestUprn = findNearestFeature(uprnFeatures, selectedPhoto.lat, selectedPhoto.lng);

        setCodepointData(nearestCodepoint?.properties ?? null);
        setUprnData(nearestUprn?.properties ?? null);
        setBuildingAttributes(response?.attributes?.data?.features?.[0]?.properties ?? null);
        console.log(uprnData);

      } catch (error) {
        console.error('Failed to fetch building attributes', error);
      }
    };
    fetchAttributes();
    return () => controller.abort();
  }, [osid]);

  return (
    <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
      <div className="grid grid-cols-2 gap-y-2">
        {/* UPRN */}
        <div className="text-gray-500 dark:text-gray-400">UPRN</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{uprnData?.uprn}</div>

        {/* Postcode */}
        <div className="text-gray-500 dark:text-gray-400">Postcode</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{codepointData?.postcode}</div>

        {/* Absolute Height Min */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Min</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.absoluteheightminimum} m</div>

        {/* Absolute Height Roof Base */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Roof Base</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.absoluteheightroofbase} m</div>

        {/* Absolute Height Max */}
        <div className="text-gray-500 dark:text-gray-400">Absolute Height Max</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.absoluteheightmaximum} m</div>

        {/* Relative Height Min */}
        <div className="text-gray-500 dark:text-gray-400">Relative Height Min</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.relativeheightminimum} m</div>

        {/* Relative Height Roof Base */}
        <div className="text-gray-500 dark:text-gray-400">Relative Height Roof Base</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.relativeheightroofbase} m</div>

        {/* Building Height Confidence */}
        <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{selectedPhoto.accuracy}</div>

        {/* Description */}
        <div className="text-gray-500 dark:text-gray-400">Description</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.description}</div>

        {/* Construction Material */}
        <div className="text-gray-500 dark:text-gray-400">Construction Material</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes?.constructionmaterial}</div>

        {/* Roof Material */}
        <div className="text-gray-500 dark:text-gray-400">Roof Material </div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes?.roofmaterial}</div>

        {/* Building Use */}
        <div className="text-gray-500 dark:text-gray-400">Building Use</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.buildinguse}</div>

        {/* Number of Floors */}
        <div className="text-gray-500 dark:text-gray-400">Number of Floors</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.numberoffloors}</div>
      </div>
    </div>
  );
};

export default BuildingDataGrid;
