import React, { useState, useEffect } from "react";

interface BuildingDataGridProps {
  selectedPhoto: any;
  osid: string;
  properties: any;
}

const BuildingDataGrid: React.FC<BuildingDataGridProps> = ({ selectedPhoto, osid, properties }) => {
  const [buildingAttributes, setBuildingAttributes] = useState<any>(properties);

  useEffect(() => {
    if (!osid) return;
    const controller = new AbortController();
    const fetchAttributes = async () => {
      try {
        console.log(selectedPhoto);
        const response = await fetch(`/comm_get_building_attributes?osid=${osid}&latitude=${selectedPhoto.lat}&longitude=${selectedPhoto.lng}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data && data.data) {
          setBuildingAttributes(data.data.features[0].properties);
        }
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
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.uprn}</div>

        {/* Postcode */}
        <div className="text-gray-500 dark:text-gray-400">Postcode</div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.postcode}</div>

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
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.constructionmaterial}</div>

        {/* Roof Material */}
        <div className="text-gray-500 dark:text-gray-400">Roof Material </div>
        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingAttributes.roofmaterial}</div>

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
