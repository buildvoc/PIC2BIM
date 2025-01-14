import { toRadians } from "@math.gl/core";
import { polygon, area, centerOfMass } from "@turf/turf";

const round = (number: number): number => {
  return parseFloat(number.toFixed(2));
};

// calculate land area of the whole land from the coordinates in the geojson file
// use above value to calculate building metrics based on lot coverage and floor height
export const computeGeoMatrics = (
  coordinates: any,
  floorHeight: number,
  floorNumber: number,
  lotCoverage: number
) => {
  const areaPolygon = polygon(coordinates);
  const landArea = round(area(areaPolygon));
  const buildingHeight = floorHeight * floorNumber;
  const buildingArea = round(landArea * (lotCoverage / 100));
  const volume = round(
    landArea * (lotCoverage / 100) * floorHeight * floorNumber
  );
  // calculate center of polygon which will be used for scaling and rotating the building layer
  const center = centerOfMass(areaPolygon);

  return { center, landArea, buildingArea, volume, buildingHeight };
};

export const getOffsetBehindCamera = (
  bearing: number,
  polygonElevation: number,
  cameraCoordinates?: number[]
) => {
  if (!cameraCoordinates) {
    return [0, 0, polygonElevation + 3];
  }
  const radBearing = toRadians(bearing);
  const yOffset = -5 * Math.sin(radBearing);
  const xOffset = -5 * Math.cos(radBearing);
  return [yOffset, xOffset, cameraCoordinates[2] + 3];
};
