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
import { DeckGL } from "@deck.gl/react";
import { MultiviewMapViewState } from "../types/map-view-state";
import { ViewStateChangeParameters } from "@deck.gl/core";
import { useEffect, useMemo, useState,useRef } from "react";
import maplibregl from "maplibre-gl";

import Map, {MapRef} from 'react-map-gl/maplibre';

// Basemap
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
  "/output.pmtiles";
  const NEW_STYLE = "https://tiles.openfreemap.org/styles/liberty"; // New style to switch

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
  const mapRef = useRef<MapRef>(null);
  const mapContainerRef = useRef<any>(null);
  const [commonLayers, setCommonLayers] = useState<Layer[]>([]);

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

  useEffect(() => {
    if (mapRef.current) {
      const protocol = new Protocol()
      maplibregl.addProtocol('pmtiles', protocol.tile)
      const map = mapRef.current.getMap();
      map.addSource('terrainSource', {
          type: "raster-dem",
          url: "pmtiles://" + PMTILES_URL,
          tileSize: 256,
      });
      map.addSource('hillshadeSource', {
        type: "raster-dem",
        url: "pmtiles://" + PMTILES_URL,
        tileSize: 256,
      });
      map.setTerrain({
        source: "terrainSource",
        exaggeration: 1
      });
      map.addLayer({
            id: 'hillshadeLayer',
            type: 'hillshade',
            source: 'terrainSource',
            paint: {
                'hillshade-shadow-color': '#000000', 
                'hillshade-highlight-color': '#ffffff',
                'hillshade-accent-color': '#888888'
            }
        });
    }
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, [mapRef.current]); 


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
      <Map 
            ref={mapRef}
            mapStyle={NEW_STYLE}
      />
      </DeckGL> 
  
  );
};
