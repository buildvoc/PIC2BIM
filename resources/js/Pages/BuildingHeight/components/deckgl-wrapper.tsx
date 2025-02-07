import {
  AmbientLight,
  FirstPersonController,
  FirstPersonView,
  Layer,
  LightingEffect,
  MapController,
  MapView,
  PickingInfo,
} from "@deck.gl/core";
import Map from 'react-map-gl';
import { DeckGL } from "@deck.gl/react";
import { MultiviewMapViewState } from "../types/map-view-state";
import { ViewStateChangeParameters } from "@deck.gl/core";
import { useEffect, useMemo, useState,useRef } from "react";
import { BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { PMTiles } from "pmtiles";

// Basemap
import maplibregl from 'maplibre-gl';
import { Protocol } from "pmtiles";
import { FullscreenWidget,ZoomWidget, CompassWidget} from '@deck.gl/widgets';
import '@deck.gl/widgets/stylesheet.css';
import { sample } from "turf";
import { map } from "jquery";
interface DeckglWrapperProps {
  parentViewState: MultiviewMapViewState | null;
  view: "firstPerson" | "map" | "orthographic";
  layers: Layer[];
  onHover: (info: PickingInfo) => void;
}

const PMTILES_URL =
  "https://r2-public.protomaps.com/protomaps-sample-datasets/terrarium_z9.pmtiles";

export const DeckglWrapper = ({
  parentViewState,
  view,
  layers,
  onHover,
}: DeckglWrapperProps) => {
  const [viewState, setViewState] = useState<MultiviewMapViewState>({
    mapView: {
      latitude: 51.212834405074766,
      longitude: -0.8013357346147122,
      zoom: 13,
      pitch: 45,
      maxPitch: 85,
    },
    firstPersonView: {
      latitude: 51.212834405074766,
      longitude: -0.8013357346147122,
      position: [0, -60, 120],
      pitch: 20,
      maxPitch: 89,
      bearing: 0,
    },
  });


  //BaseMap
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (parentViewState !== null) {
      setViewState(parentViewState);
    }
  }, [parentViewState]);

  useEffect(() => {
    let newPitch = viewState.mapView.pitch;
    let newMaxPitch = viewState.mapView.maxPitch;
    if (view === "orthographic") {
      newPitch = 0;
      newMaxPitch = 60;
    } else if (view === "map") {
      newMaxPitch = 85;
    } else if (view === "firstPerson") {
      newPitch = viewState.firstPersonView.pitch;
      newMaxPitch = 89;
    }

    setViewState({
      ...viewState,
      mapView: {
        ...viewState.mapView,
        pitch: newPitch,
        maxPitch: newMaxPitch,
      },
    });
    // eslint-disable-next-line
  }, [view]);

  // useEffect(() => {
  //   const layer = new TileLayer({
  //     id: 'TileLayer',
  //     data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
  //     maxZoom: 19,
  //     minZoom: 0,
    
  //     renderSubLayers: props => {
  //       const {boundingBox} = props.tile;
    
  //       return new BitmapLayer(props, {
  //         data: null,
  //         image: props.data,
  //         bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
  //       });
  //     },
  //     pickable: true
  //   });
  //     setCommonLayers((res)=>[...res,layer]);
  // }, []);


  // useEffect(()=>{
  //   const URL = "https://r2-public.protomaps.com/protomaps-sample-datasets/terrarium_z9.pmtiles"
  //   let tileSource = createDataSource(URL
  //     ,
  //     [PMTilesSource, MVTSource], {}
  // )
  // const tileLayer = new TileSourceLayer({ tileSource });
  // setTerrainLayer([tileLayer])
  // },[])


  useEffect(() => {
    if(mapContainerRef.current)
    {
      let protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
       mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [-0.7960, 51.2140], 
        zoom: 16,
        pitch: 61,
        bearing: 0,
        maxPitch: 85,
        maxZoom: 20
      });
      console.log("Map call ----------->")
      mapRef.current.on("load", () => {
        mapRef.current?.addSource('terrainSource', {
          type: "raster-dem",
          url: "pmtiles://" + PMTILES_URL,
          tileSize: 256,
          encoding:"terrarium"
      });
      mapRef.current?.addSource('hillshadeSource', {
        type: "raster-dem",
        url: "pmtiles://" + PMTILES_URL,
        tileSize: 256,
      });

  
      mapRef.current?.addLayer({
            id: 'hillshadeLayer',
            type: 'hillshade',
            source: 'terrainSource',
            paint: {
                'hillshade-shadow-color': '#000000', 
                'hillshade-highlight-color': '#ffffff',
                'hillshade-accent-color': '#888888'
            }
        });
      });

      mapRef.current?.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showZoom: true,
          showCompass: true,
        })
      );

      mapRef.current?.addControl(
        new maplibregl.TerrainControl({
          source: "terrainSource",
          exaggeration: 1
        }))
    }


    return () => mapRef.current?.remove();
  }, [mapContainerRef.current]);


  const onViewStateChangeHandler = (parameters: ViewStateChangeParameters) => {
    const { viewState: deckViewState } = parameters;

    let newViewState;
    if (view === "map" || view === "orthographic") {
      newViewState = {
        mapView: {
          ...deckViewState,
          maxPitch: view === "orthographic" ? 60 : 85
        },
        firstPersonView: {
          ...viewState.firstPersonView,
          longitude: deckViewState.longitude,
          latitude: deckViewState.latitude,
        },
      };
    } else {
      newViewState = {
        mapView: {
          ...viewState.mapView,
          longitude: deckViewState.longitude,
          latitude: deckViewState.latitude,
        },
        firstPersonView: deckViewState,
      };
    } 
    setViewState(newViewState);
  };

  const VIEWS = useMemo(
    () =>
      view === "map" || view === "orthographic"
        ? [
            new MapView({
              id: "mapView",
              controller: {
                type: MapController,
                touchRotate: true,
                touchZoom: true,
              },
              farZMultiplier: 2.02,
              altitude: 10,
              orthographic: view === "orthographic",
            }),

          ]
        : [
            new FirstPersonView({
              id: "firstPersonView",
              controller: {
                type: FirstPersonController,
              },
            }),
          ],
    [view]
  );

  return (
    <DeckGL
      viewState={
        view === "map" || view === "orthographic"
          ? viewState.mapView
          : viewState.firstPersonView
      }
      onViewStateChange={onViewStateChangeHandler}
      onHover={onHover}
      views={VIEWS}
      controller={true}
      widgets={view !== "firstPerson"? [
        new FullscreenWidget({
          placement:"top-right",
          style:{top:"40px",position:"absolute",
            right:"5px"
          }
          
        }),
        new ZoomWidget({
          placement:"top-right",
          style:{top:"80px",position:"absolute",right:"5px"

          }
        }),
        
        new CompassWidget({
          placement:"top-right",
          style:{top:"150px",position:"absolute",right:"5px" }
        })

      ]:[]}
      style={{ width: "100vw", height: "100vh" }}

      effects={[
        new LightingEffect({
          ambientLight: new AmbientLight({
            color: [255, 255, 255],
            intensity: 3,
          }),
        }),
      ]}
      layers={[ ...layers]}

    >

<div ref={mapContainerRef} style={{ width: "100vw", height: "100vh" }}  />
      </DeckGL>
  
  );
};
