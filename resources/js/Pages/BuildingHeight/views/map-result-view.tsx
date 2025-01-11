import { useState, useEffect } from "react";
import Container from "@mui/material/Container";

import { Layer, PickingInfo } from "@deck.gl/core";
import { PointCloudLayer } from "@deck.gl/layers";
import { LASLoader } from "@loaders.gl/las";

import { FileContents } from "../types/file";
import {
  computeGeoMatrics,
  getOffsetBehindCamera,
} from "../utils/geo-operations";

import heritageTrail from "../data/heritage-trail";
import { BuildingAttributes } from "../components/building-attributes";
import { UserInputs } from "../types/user-inputs";
import { Metrics } from "../types/metrics";
import { transformLazData } from "../utils/projection";
import { load } from "@loaders.gl/core";
import { NginxFile } from "../types/nginx";
import { LAZ_FILES_LIST_URL } from "../constants";
import {
  BuildingTooltip,
  BuildingTooltipProps,
} from "../components/building-tooltip";
import { MultiviewMapViewState } from "../types/map-view-state";
import { DeckglWrapper } from "../components/deckgl-wrapper";
import { MapWrapper } from "../components/styled-common";
import { createBuilding } from "../utils/deckgl-utils";
interface Tag {
  description?: string;
}
interface MapResultViewProps {
  geo: any;
  view: "firstPerson" | "map" | "orthographic";
  imageUrl: string | null;
  drawLaz: boolean;
  lazFile: NginxFile | null;
  onLazChange: (url: NginxFile) => void;
  drawLaz_: () => void;
  tags: Record<string, Tag[] | Tag>;
  previewImg?: string | null;
  onImageChange: (value: File | null | undefined) => void;
  onShowcaseClick: () => void;
  setExtractedDrawerOpen: (value: boolean) => void;
  extractedDrawerOpen: boolean;

}

export const MapResultView = ({
  geo,
  view,
  imageUrl,
  drawLaz,
  lazFile,
  drawLaz_,
  onLazChange,
  tags,
  previewImg,
  setExtractedDrawerOpen,
  onShowcaseClick,
  onImageChange,
  extractedDrawerOpen



}: MapResultViewProps) => {
  const [inputs, setInputs] = useState<UserInputs>({
    lotCoverage: 50,
    floorNumber: 10,
    floorHeight: 10,
  });
  const [geojsonFileContents, setGeojsonFileContents] = useState<FileContents>({
    type: "",
    coordinates: [[]],
  });
  const [layers, setLayers] = useState<Layer[]>([]);
  const [viewState, setViewState] = useState<MultiviewMapViewState>({
    mapView: {
      latitude: 46.203589,
      longitude: 6.1369,
      zoom: 17.5,
      pitch: 45,
      maxPitch: 85,
    },
    firstPersonView: {
      latitude: 46.203589,
      longitude: 6.1369,
      position: [0, -60, 120],
      pitch: 20,
      maxPitch: 89,
      bearing: 0,
    },
  });

  const [metrics, setMetrics] = useState<Metrics>({
    landArea: 0,
    buildingArea: 0,
    volume: 0,
    buildingHeight: inputs.floorHeight * inputs.floorNumber,
  });

  const [buildingTooltipProps, setBuildingTooltipProps] =
    useState<BuildingTooltipProps>({
      show: false,
      x: 0,
      y: 0,
      imageUrl: null,
      altitude: 0,
      heading: 0,
    });

  useEffect(() => {
    setBuildingTooltipProps((prev) => ({
      ...prev,
      imageUrl,
    }));
  }, [imageUrl]);

  useEffect(() => {
    if (drawLaz && lazFile) {
      //TODO confirm implementation on show case as well
      const drawLaz = async () => {
        const url = `${LAZ_FILES_LIST_URL}${lazFile.name}`;
        const data :any = await load(url, LASLoader);
        transformLazData(data);
        const newLayers = layers.filter((layer) => layer.id !== "las");
        newLayers.push(
          new PointCloudLayer({
            id: "las",
            data,
            getNormal: [0, 1, 0],
            getColor: [0, 0, 255],
            opacity: 1,
            pointSize: view === "firstPerson" ? 50 : 1,
            loaders: [LASLoader],
          })
        );
        setLayers(newLayers);
      };
      drawLaz();
    }
    // eslint-disable-next-line
  }, [drawLaz, lazFile, view]);

  const { lotCoverage, floorNumber, floorHeight } = inputs;

  const onHoverHandler = (info: PickingInfo) => {
    if (
      info.layer?.id !== "exif-icon-layer" &&
      info.layer?.id !== "exif3d-camera-layer"
    ) {
      setBuildingTooltipProps((prev) => ({
        ...prev,
        show: false,
      }));
      return;
    }
    if (!info.picked) {
      return;
    }
    setBuildingTooltipProps((prev) => ({
      ...prev,
      x: info.x,
      y: info.y,
      altitude: info.object?.altitude || 0,
      heading: info.object?.bearing || 0,
      show: true,
    }));
  };

  useEffect(() => {
    handleFileRead(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  useEffect(() => {
    console.log("Layers map results---",layers)
     }, [layers]);

  const handleFileRead = (
    isFileUpload: boolean,
    customFileData?: string | ArrayBuffer | null
  ) => {
    let result = JSON.stringify(heritageTrail) as any;
    if (customFileData) result = customFileData;

    let geojson = JSON.parse(result);
    if (!isFileUpload) geojson = geo.geojson;

    const { center, landArea, buildingArea, volume } = computeGeoMatrics(
      geojson.features[0].geometry.coordinates,
      floorHeight,
      floorNumber,
      lotCoverage
    );
    const {
      geometry: {
        coordinates: [longitude, latitude],
      },
    } = center;

    const buildingLayers = createBuilding(geojson, geo.cameraGPSData);
    //TODO: Concat building layer with showcase layer to show building.
    console.log("LOAD GEOJSON ---",buildingLayers);

    setLayers(buildingLayers);
    const polygonElevation =
      geojson.features?.[0]?.geometry?.coordinates?.[0]?.[0]?.[2] || 0;
    const camera = geo?.cameraGPSData?.[0];
    const bearing = camera?.bearing ? camera?.bearing : 0;
    const fpPosition = getOffsetBehindCamera(
      bearing,
      polygonElevation,
      camera?.coordinates
    );
    setViewState({
      mapView: {
        ...viewState.mapView,
        longitude,
        latitude,
        zoom: 17.5,
        position: [0, 0, polygonElevation],
      },
      firstPersonView: {
        ...viewState.firstPersonView,
        longitude: camera?.coordinates?.[0] || longitude,
        latitude: camera?.coordinates?.[1] || latitude,
        position: fpPosition,
        pitch: 0,
        bearing,
      },
    });

    setGeojsonFileContents(geojson);
    setMetrics({
      landArea,
      buildingArea,
      buildingHeight: parseFloat(
        geojson.features[0].properties.relativeheightmaximum
      ),
      volume,
    });
    if (!(lotCoverage === 50 && floorHeight === 10 && floorNumber === 10)) {
      setInputs({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 });
    }
  };

  return (
    <>
      <BuildingAttributes
        geojsonFileContents={geojsonFileContents}
        metrics={metrics}
        handleFileRead={handleFileRead}
        drawLaz_={drawLaz_}
        onLazChange={onLazChange}
        lazFile={lazFile}
        tags={tags}
        previewImg={previewImg}
        onImageChange={onImageChange}
        onShowcaseClick={onShowcaseClick}
        setExtractedDrawerOpen={setExtractedDrawerOpen}
        extractedDrawerOpen={extractedDrawerOpen}
      />
      
      <MapWrapper component="main">
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <BuildingTooltip {...buildingTooltipProps} />
          <DeckglWrapper
            parentViewState={viewState}
            view={view}
            layers={layers}
            onHover={onHoverHandler}
          />
        </Container>
      </MapWrapper>
    </>
  );
};
