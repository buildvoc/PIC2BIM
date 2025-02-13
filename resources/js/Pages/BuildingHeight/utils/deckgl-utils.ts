import { Layer } from "@deck.gl/core";
import { GeoJsonLayer, IconLayer, PolygonLayer } from "@deck.gl/layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";

export const createBuilding = (
  building: any,
  cameraGPSData: any,
  nameSuffix?: string
): Layer[] => {
  const ground = new GeoJsonLayer({
    id: nameSuffix
      ? `geojson-ground-layer-${nameSuffix}`
      : "geojson-ground-layer",
    data: building,
    getLineColor: [0, 0, 0, 255],
    getFillColor: [183, 244, 216, 255],
    getLineWidth: () => 0.3,
    opacity: 1,
  });

  const buildingDataCopy = [
    ...(building.features[0].geometry as any).coordinates,
  ];
  const buildingHeight = parseFloat(
    building.features[0].properties?.relativeheightmaximum
  );
  let buildingCoords = buildingDataCopy[0].map((item: any) => {
    item.push(building.features[0].properties!.absoluteheightminimum);
    return item;
  });
  const polygonData = [
    {
      contour: buildingCoords,
    },
  ];

  const storey = new PolygonLayer({
    id: nameSuffix
      ? `geojson-storey-building-${nameSuffix}`
      : "geojson-storey-building",
    data: polygonData,
    extruded: true,
    wireframe: true,
    getPolygon: (d) => {
      return d.contour;
    },
    getFillColor: [249, 180, 45, 255],
    getLineColor: [0, 0, 0, 255],
    getElevation: buildingHeight,
    opacity: 1,
  });
  const url = "./cam.gltf";
  const exif3dCameraLayer = new ScenegraphLayer({
    id: nameSuffix
      ? `exif3d-camera-layer-${nameSuffix}`
      : "exif3d-camera-layer",
    data: cameraGPSData,
    scenegraph: url,
    getPosition: (d) => d.coordinates,
    getColor: (d) => [203, 24, 226],
    getOrientation: (d) => [0, -d.bearing, 90],
    pickable: true,
    opacity: 1,
  });

  const deckglMarkerLayer = new IconLayer({
    id: nameSuffix ? `exif-icon-kayer-${nameSuffix}` : "exif-icon-layer",
    data: cameraGPSData,
    getIcon: () => "marker",
    iconAtlas:
      "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
    iconMapping: {
      marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
    },
    getPosition: (d) => d.coordinates,
    getColor: (d) => [Math.sqrt(d.exits), 140, 0],
    getSize: () => 5,
    sizeScale: 8,
    billboard: true,
    pickable: true,
  });

  return [ground, storey, exif3dCameraLayer, deckglMarkerLayer];
};
