import { useRef, useEffect, useState, memo } from "react";
import mapboxgl, { LngLat, LngLatLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { PageProps } from "@/types";
import { usePage } from "@inertiajs/react";
import ToggleControl from "@/Components/Map/ToggleControl";

export function Map({ auth }: PageProps) {

  const { shapes, search } = usePage<{
    shapes: any;
    search: string;
  }>().props;

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v11"
  );

  const mapViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/streets-v11");
  };

  const satelliteViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/satellite-v9");
  };

  const toggleControl = new ToggleControl({
    onMapViewClick: mapViewClickHandler,
    onSatelliteViewClick: satelliteViewClickHandler,
  });

  useEffect(() => {
    loadMapBox();
    return () => {
      mapRef.current?.remove();
    };
  }, [mapStyle]);

  const loadMapBox = () => {
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: mapStyle,
      center: [0.1, 52.5],
      zoom: 6,
      maxBounds: [
        [-180, -85],
        [180, 85],
      ],
    });
    mapRef.current.addControl(toggleControl, "top-left");
    mapRef.current.addControl(new mapboxgl.NavigationControl());
  };

  const calculateBoundingBox = (coordinates: any) => {
    if (coordinates[0][1] >= -90 && coordinates[0][1] <= 90 && coordinates[0][0] >= -180 && coordinates[0][0] <= 180) {

      let bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
      coordinates.forEach((coord: any) => {
        if (coord[1] >= -90 && coord[1] <= 90 && coord[0] >= -180 && coord[0] <= 180) {
          bounds.extend(coord);
        }
      });
      return bounds;
    }
    return null

  };

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    if (mapRef.current) {
      showPolygons();
    }
  }, []);

  const showPolygons = async () => {
    //console.log(shapes.data);
    
    mapRef.current?.on("load", () => {
      mapRef.current?.addSource('shapes', {
        type: 'geojson',
        data: shapes.data
      });
      mapRef.current?.addLayer({
        'id': 'shapes-layer',
        'type': 'fill',
        'source': 'shapes',
        'layout': {},
        'paint': {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.2
        }
      });
      // mapRef.current?.addLayer({
      //   id: 'shape-labels',
      //   type: 'symbol',
      //   source: 'shapes',
      //   layout: {
      //     'text-field': ['get', 'wd24nm'],
      //     'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      //     'text-radial-offset': 0.5,
      //     'text-justify': 'auto',
      //   }
      // });

      mapRef.current?.on('click', 'shapes-layer', (e) => {
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(e.features && e.features[0]?.properties?.wd24nm)
          .addTo(mapRef.current!!);
      });

      mapRef.current?.on('mouseenter', 'shapes-layer', () => {
        mapRef.current && (mapRef.current.getCanvas().style.cursor = 'pointer');
      });

      mapRef.current?.on('mouseleave', 'shapes-layer', () => {
        mapRef.current && (mapRef.current.getCanvas().style.cursor = '')
      });

    });
  };

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      className=" w-full h-screen"
    />
  );
}

export default memo(Map);