import React from "react";

interface BuildingDataGridProps {
  buildingData: any;
  selectedPhoto: any;
  properties: any;
}

const BuildingDataGrid: React.FC<BuildingDataGridProps> = ({ buildingData, selectedPhoto, properties }) => (
  console.log(buildingData),
  <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
    <div className="grid grid-cols-2 gap-y-2">
      {/* UPRN */}
      <div className="text-gray-500 dark:text-gray-400">UPRN</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingData.uprn}</div>

      {/* Postcode */}
      <div className="text-gray-500 dark:text-gray-400">Postcode</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{buildingData.postcode}</div>

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
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.accuracy}</div>

      {/* Description */}
      <div className="text-gray-500 dark:text-gray-400">Description</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.description}</div>

      {/* Construction Material */}
      <div className="text-gray-500 dark:text-gray-400">Construction Material</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.constructionMaterial}</div>

      {/* Roof Material */}
      <div className="text-gray-500 dark:text-gray-400">Roof Material </div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.roofMaterial}</div>

      {/* Building Use */}
      <div className="text-gray-500 dark:text-gray-400">Building Use</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.buildingUse}</div>

      {/* Number of Floors */}
      <div className="text-gray-500 dark:text-gray-400">Number of Floors</div>
      <div className="text-right font-medium text-gray-700 dark:text-gray-200">{properties.numberOfFloors}</div>
    </div>
  </div>
);

export default BuildingDataGrid;
