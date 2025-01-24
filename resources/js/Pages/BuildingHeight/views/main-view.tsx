import React, { useState, useEffect} from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import ExifReader from "exifreader";
import { Backdrop, CircularProgress, Snackbar, Alert } from "@mui/material";
import { MapResultView } from "./map-result-view";
import { InfoModal } from "../components/info-modal";
import { BottomNav } from "../components/bottom-navigation";
import { PhotoView } from "./photo-view";
import { InfoButton } from "../components/info-button";
import { NginxFile } from "../types/nginx";
import { useKeyboard } from "../hooks/useKeyboard";
import { MapShowcaseView } from "./map-showcase-view";
import { LAYOUT } from "../types/layout";
import { fetchBuilding } from "../api/fetch-building";
import { PropsWithChildren } from "react";
import { Photo } from "@/types";


export const MainView = ({photos,isUploadTriggered,isMetadataResultsTriggered}:PropsWithChildren<{photos:Array<Photo>,isUploadTriggered:boolean,isMetadataResultsTriggered:boolean}>) => {
  const [activeLayout, setActiveLayout] = React.useState(LAYOUT.SHOWCASE);
  const ref = React.useRef<HTMLDivElement>(null);
  const [selectedImg, setSelectedImg] = useState<File | null | undefined>(
    undefined
  );
  const [view, setView] = useState<"firstPerson" | "map" | "orthographic">(
    "firstPerson"
  );
  useKeyboard(setView);
  const [lazFile, setLazFile] = useState<null | NginxFile>(null);
  const [drawLaz, setDrawLaz] = useState<boolean>(false);
  const [bearerToken, setBearerToken] = useState<string>('');

  useEffect(() => {
    (ref.current as HTMLDivElement).ownerDocument.body.scrollTop = 0;
    (ref.current as HTMLDivElement).ownerDocument.body.style.overflow = 'hidden';

  }, [activeLayout]);

  const [extractedDrawerOpen, setExtractedDrawerOpen] =
    useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [tags, setTags] = useState<any>();
  useEffect(() => {
    if (!selectedImg) {
      return;
    }
    handleImage(selectedImg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImg]);

  const [previewImg, setPreviewImg] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedImg) {
      setPreviewImg(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedImg as any);
    setPreviewImg(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImg]);

  const handleImage = async (img: any) => {
    try {
      setLoading(true);
      const tags = await ExifReader.load(img);
      delete tags["MakerNote"];
      setTags(tags);
      setExtractedDrawerOpen(true);
      if (
        tags?.GPSLatitude?.description &&
        tags?.GPSLongitude?.description &&
        tags.GPSAltitude?.description &&
        tags.GPSImgDirection?.description
      ) {
        const areGPSContainsNaN = ["NaN", "NaN m", ""].some((r: any) =>
          [
            tags?.GPSLongitude?.description,
            tags.GPSAltitude?.description,
          ].includes(r)
        );
        if (!areGPSContainsNaN)
          getPolygon(
            tags.GPSLatitude.description,
            tags.GPSLongitude.description,
            tags.GPSAltitude?.description,
            tags.GPSImgDirection?.description
          );
        else {
          alert("Image reader can't read gps");
          setLoading(false);
        }
      } else {
        alert("Image doesn't have gps");
        setLoading(false);
      }
    } catch (error: any) {
      const errMsg =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      setErrMsg(errMsg);
      setLoading(false);
    }
  };

  const [errMsg, setErrMsg] = useState<any>();
  const [geo, setGeo] = useState<any>();

  const getPolygon = async (
    lat: string,
    lon: string,
    camAltitude: string,
    camDirection: string
  ) => {
    try {
      setLoading(true);
      setErrMsg(null);
      const data = await fetchBuilding(lat, lon, camAltitude, camDirection);
      if (data) {
        setGeo(data);
        setActiveLayout(LAYOUT.RESULT);
      }
      setLoading(false);
    } catch (error: any) {
      const errMsg =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();

      setErrMsg(errMsg);
      setLoading(false);
    }
  };

  const [infoOpen, setInfoOpen] = React.useState(false);
  const toggleInfo = () => setInfoOpen(!infoOpen);

  const onLayoutChange = (newLayout: number) => {
    if (geo) setActiveLayout(newLayout);
    else {
      alert("Please upload a photo");
      setActiveLayout(LAYOUT.PHOTO);
    }
  };

  const onViewSetHandler = (view: "firstPerson" | "map" | "orthographic") => {
    setView(view);
  };

  const onLazChangeHandler = (file: NginxFile) => {
    setDrawLaz(false);
    setLazFile(file);
  };

  const drawLazHandler = () =>  {
    setDrawLaz(true);
  };
  const handleLogin = () => {
    setActiveLayout(LAYOUT.SHOWCASE)
  };
  return (
    <Box sx={{ display: "flex", height: "100vh",paddingRight:"10px" }} ref={ref}>
      
      <CssBaseline />
      {activeLayout === LAYOUT.PHOTO && (
        <PhotoView
          tags={tags}
          previewImg={previewImg}
          extractedDrawerOpen={extractedDrawerOpen}
          onImageChange={(result) => setSelectedImg(result)}
          onShowcaseClick={() => setActiveLayout(LAYOUT.SHOWCASE)}
          setExtractedDrawerOpen={setExtractedDrawerOpen}
        />
      )}
      {activeLayout === LAYOUT.RESULT && (
        <MapResultView
          geo={geo}
          view={view}
          imageUrl={previewImg}
          drawLaz={drawLaz}
          lazFile={lazFile}
          onLazChange={onLazChangeHandler}
          drawLaz_={drawLazHandler}
          tags={tags}
          previewImg={previewImg}
          onImageChange={(result) => setSelectedImg(result)}
          onShowcaseClick={() => setActiveLayout(LAYOUT.SHOWCASE)}
          setExtractedDrawerOpen={setExtractedDrawerOpen}
          extractedDrawerOpen={extractedDrawerOpen}
          isUploadTriggered={isUploadTriggered}
          isMetadataResultsTriggered={isMetadataResultsTriggered}
          />
      )}
      {activeLayout === LAYOUT.SHOWCASE && <MapShowcaseView photos={photos} view={view} 
                geo={geo}
                drawLaz_={drawLazHandler}
                lazFile={lazFile}
                onLazChange={onLazChangeHandler}
                tags={tags}
                previewImg={previewImg}
                onImageChange={(result) => setSelectedImg(result)}
                setGeo={setGeo}
                onShowcaseClick={() => setActiveLayout(LAYOUT.SHOWCASE)}
                setExtractedDrawerOpen={setExtractedDrawerOpen}
                extractedDrawerOpen={extractedDrawerOpen}
                drawLaz={drawLaz}
                bearerToken={bearerToken}
                isUploadTriggered = {isUploadTriggered}
                isMetadataResultsTriggered={isMetadataResultsTriggered}

      />}

      <BottomNav
        layout={activeLayout}
        view={view}
        lazFile={lazFile}
        onChange={onLayoutChange}
        onViewSet={onViewSetHandler}
        onLazChange={onLazChangeHandler}
        drawLaz={drawLazHandler}
        
      />

      <Snackbar open={errMsg} autoHideDuration={6000}>
        <Alert severity="success" sx={{ width: "100%" }}>
          {errMsg}
        </Alert>
      </Snackbar>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <InfoButton toggleInfo={toggleInfo} />
      <InfoModal infoOpen={infoOpen} toggleInfo={toggleInfo} />

    </Box>
  );
};
