import { MapWrapper } from "../components/styled-common";
import { DeckglWrapper } from "../components/deckgl-wrapper";
import { Layer, PickingInfo } from "@deck.gl/core";
import { useEffect, useMemo, useState } from "react";
import { Gallery, GalleryImage } from "../types/gallery";
import { get_unassigned_photos, get_photo } from "../api/fetch-gallery";
import { IconLayer } from "@deck.gl/layers";
import { fetchBuilding } from "../api/fetch-building";
import { createBuilding } from "../utils/deckgl-utils";
import { Backdrop, CircularProgress } from "@mui/material";
import { FileContents } from "../types/file";
import { Metrics } from "../types/metrics";
import { UserInputs } from "../types/user-inputs";
import heritageTrail from "../data/heritage-trail";
import { LAZ_FILES_LIST_URL } from "../constants";
import { load } from "@loaders.gl/core";
import { LASLoader } from "@loaders.gl/las";
import { transformLazData } from "../utils/projection";
import { PointCloudLayer } from "@deck.gl/layers";
import {
  computeGeoMatrics,
  getOffsetBehindCamera,
} from "../utils/geo-operations";
import { InfoButton } from "../components/info-button";
import { BuildingAttributes } from "../components/building-attributes";
import { MultiviewMapViewState } from "../types/map-view-state";
import { NginxFile } from "../types/nginx";
import { PropsWithChildren } from "react";
import { Photo } from "@/types";
import {
  ShowcaseTooltip,
  ShowcaseTooltipProps,
} from "../components/showcase-tooltip";
interface Tag {
  description?: string;
}
interface MapShowcaseViewProps {
  view: "firstPerson" | "map" | "orthographic";
  geo: any;
  drawLaz_: () => void;
  setGeo: any;
  onLazChange: (url: NginxFile) => void;
  lazFile: NginxFile | null;
  tags: Record<string, Tag[] | Tag>;
  previewImg?: string | null;
  onImageChange: (value: File | null | undefined) => void;
  onShowcaseClick: () => void;
  setExtractedDrawerOpen: (value: boolean) => void;
  extractedDrawerOpen: boolean;
  drawLaz: boolean;
  bearerToken: string;
  photos:Array<Photo>;
  isUploadTriggered:boolean;
  isMetadataResultsTriggered:boolean
}

export const MapShowcaseView = ({
  view,
  geo,
  setGeo,
  drawLaz_,
  onLazChange,
  lazFile,
  drawLaz,
  tags,
  previewImg,
  onImageChange,
  onShowcaseClick,
  setExtractedDrawerOpen,
  extractedDrawerOpen,
  bearerToken,
  photos,
  isUploadTriggered,
  isMetadataResultsTriggered
}: MapShowcaseViewProps) => {
  const [galleryData, setGalleryData] = useState<Gallery | null>(null);
  const [buildingLayers, setBuldingLayer] = useState<Layer[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState<boolean>(true);
  const [inputs, setInputs] = useState<UserInputs>({
    lotCoverage: 50,
    floorNumber: 10,
    floorHeight: 10,
  });

  const [layers_, setLayers] = useState<Layer[]>([]);
  const [drawLazLayer, setDrawLazLayer] = useState<any>([]);
  const [drawLazLayerData, setDrawLazLayerData] = useState<any>([]);

  const [geoJsonlayer, setGeoJsonlayer] = useState<Layer[]>([]);

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
  const [geojsonFileContents, setGeojsonFileContents] = useState<FileContents>({
    type: "",
    coordinates: [[]],
  });

  const [metrics, setMetrics] = useState<Metrics>({
    landArea: 0,
    buildingArea: 0,
    volume: 0,
    buildingHeight: inputs.floorHeight * inputs.floorNumber,
  });

  //local sotrage
  const [galleryDataForBuilding, setGalleryDataForBuilding] =
    useState<Gallery | null>(null);
  const [showcaseTooltipProps, setShowcaseTooltipProps] =
    useState<ShowcaseTooltipProps>({
      show: false,
      x: 0,
      y: 0,
      imageUrl: null,
      longitude: "",
      latitude: "",
      name: "",
      address: "",
      date: "",
    });

  const onHoverHandler = (info: PickingInfo) => {
    if (info.layer?.id !== "gallery-images") {
      setShowcaseTooltipProps((prev) => ({
        ...prev,
        show: false,
      }));
      return;
    }
    if (!info.picked) {
      return;
    }
    setShowcaseTooltipProps((prev) => ({
      ...prev,
      x: info.x,
      y: info.y,
      longitude: info.object?.["exif_data_longitude"],
      latitude: info.object?.["exif_data_latitude"],
      name: info.object?.["description"],
      address: info.object?.["long_description"],
      date: info.object?.["exif_data_taken_at"],
      imageUrl: info.object?.["photo"]
        ? info.object?.["photo"]
        : `https://buildingshistory.co.uk/galleries/${info.object?.["thumbnail_filename"]}`,
      show: true,
    }));
  };

  useEffect(() => {
    const fetchData = async (response: any) => {
      setBuildingsLoading(true);

      var task_photo_data;
      var map_unassigned_array = [];
      let photos_ids = await get_unassigned_photos(3,bearerToken);
      for (let photo of photos) {
        // photos_array.push(result)
        if (photos.length > 0) {
          task_photo_data = {
            id: photo.id,
            exif_data_latitude: photo?.lat,
            exif_data_longitude: photo?.lng,
            photo: photo.link,
            exif_data_taken_at: photo.created,
            long_description: photo.note,
            exif_data_altitude: photo.altitude,
            exif_data_gps_img_direction:photo.photo_heading,
          };
          map_unassigned_array.push(task_photo_data);
        }
      }
      // setPhotoGallery(map_unassigned_array)
      const modifiedResponse = response;
      modifiedResponse.data.images.data.push(...map_unassigned_array);
      setBuildingsLoading(false);
      setGalleryData(modifiedResponse);
    };
    setBuildingsLoading(false);

    fetchData({
      data: {
        images: {
          data: [],
        },
      },
    });
  }, []);

  useEffect(() => {
    if (drawLaz && lazFile && !drawLazLayer.some((item:any)=>item.id===lazFile.name) ) {
      const drawLaz = async () => {
        const url = `${LAZ_FILES_LIST_URL}${lazFile.name}`;
        const data :any = await load(url, LASLoader);
        const newLayersData = []
        newLayersData.push({data:data,name:lazFile.name})
        setDrawLazLayerData([...drawLazLayerData,...newLayersData])
        transformLazData(data);
        const newLayers = []
        //Todo: Id must be different and there is check if not same laz draw.
          //add name in layer as well to identify it
          
          newLayers.push(
            new PointCloudLayer({
              id: lazFile.name,
              data,
              getNormal: [0, 1, 0],
              getColor: [0, 0, 255],
              opacity: 1,
              pointSize: view === "firstPerson" ? 50 : 1,
              loaders: [LASLoader],
            })
          );
          console.log("Second Laz---",view)
          setDrawLazLayer([...drawLazLayer,...newLayers])
      };
      drawLaz();
    }
    
    // eslint-disable-next-line
  }, [drawLaz, lazFile,view]);

  useEffect(() => {
    
    const updatedLayers = drawLazLayerData.map((item:any) => {
      let data = item.data;

      return new PointCloudLayer({
        id: item.name,
        data,
        getNormal: [0, 1, 0],
        getColor: [0, 0, 255],
        opacity: 1,
        pointSize: view === "firstPerson" ? 50 : 1,
        loaders: [LASLoader],
      });
    });
    console.log("updatedLayers--",updatedLayers)
    setDrawLazLayer(updatedLayers);
  }, [view]); 

  const imageLayers: Layer[] = useMemo(() => {
    const result: Layer[] = [];
    const images = galleryData?.data.images.data;

    if (!images) {
      return result;
    }

    result.push(
      new IconLayer({
        id: `gallery-images`,
        data: images,
        getIcon: (d) => {
          // console.log("Photo data---", d);
          return {
            url: d.photo,
            height: 240,
            width: 180,
            id: d.id,
            mask: false,
          };
        },

        getPosition: (d:any) => [
          parseFloat(d.exif_data_longitude),
          parseFloat(d.exif_data_latitude),
          parseFloat(d.exif_data_altitude) + 10,
        ],
        getSize: () => 5,
        sizeScale: 8,
        billboard: true,
        pickable: true,
      })
    );

    //Here is the result which show image on map
    //   console.log("Gallery Image ---",result)
    // console.log()

    return result;
  }, [galleryData]);

  useEffect(() => {
    console.log("Layers show case---",drawLazLayer)
     }, [drawLazLayer]);

  useEffect(() => {
    if (!galleryData) {
      return;
    }

    const renderBuildingAsync = async (images: GalleryImage[]) => {
      const promises = [];
      for (const image of images) {
        promises.push(
          fetchBuilding(
            image.exif_data_latitude,
            image.exif_data_longitude,
            image.exif_data_altitude,
            image.exif_data_gps_img_direction
          )
        );
      }
      const buildings = await Promise.all(promises);

      let newLayers: Layer[] = [];
      for (let i = 0; i < buildings.length; i++) {
        const buildingData = buildings[i];
        const image = images[i];
        if (buildingData) {
          //Todo:Working here
          setGeo({cameraGPSData:buildingData.cameraGPSData})
          const currentLayers = createBuilding(
            buildingData.geojson,
            buildingData.cameraGPSData,
            image.filename
          );
          // console.log("New layers Show case---",newLayers);
          newLayers = newLayers.concat(currentLayers);
        }
      }
      setBuldingLayer(newLayers);
      setBuildingsLoading(false);
    };
    if (galleryData) {
      renderBuildingAsync(galleryData.data.images.data);
    }
  }, [galleryData]);

  const { lotCoverage, floorNumber, floorHeight } = inputs;

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
    // console.log("Geo json---",geojson)
    // console.log("Building layer ---",buildingLayers)
    setGeoJsonlayer([...geoJsonlayer,...buildingLayers]);
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



  const layers = useMemo(() => {
    return [...buildingLayers, ...imageLayers,...drawLazLayer,...geoJsonlayer];
  }, [imageLayers, buildingLayers,drawLazLayer,geoJsonlayer]);

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
        isUploadTriggered = {isUploadTriggered}
        isMetadataResultsTriggered={isMetadataResultsTriggered}


      />
    
      <MapWrapper component="main">
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={buildingsLoading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        <ShowcaseTooltip {...showcaseTooltipProps} />
        <DeckglWrapper
          parentViewState={null}
          view={view}
          layers={layers}
          onHover={onHoverHandler}
        />
      </MapWrapper>
    </>
  );
};
