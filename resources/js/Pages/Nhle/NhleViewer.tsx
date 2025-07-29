import { useRef, useEffect, useState, memo } from "react";
import type { Feature } from "geojson";
import axios from "axios";
import mapboxgl, { LngLatBoundsLike, LngLatLike } from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import ToggleControl from "@/Components/Map/ToggleControl";

function NhleViewer({ geoJsonKey, geoJson }: { geoJsonKey: string, geoJson: any}) {

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

  const showPolygons = async ({ maxLat, minLat, maxLng, minLng }: { maxLat: number | undefined, minLat: number | undefined, maxLng: number | undefined, minLng: number | undefined }) => {
    try {
      const response = await axios.post(route('comm_shapes'), {
        max_lat: maxLat, min_lat: minLat, max_lng: maxLng, min_lng: minLng,
      });
      const polygons = response.data.data.features;

      polygons.forEach((polygon: any) => {
        const coordinates = polygon.geometry.coordinates[0];

        mapRef.current?.addSource(`polygon_${polygon.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: coordinates,
            },
            properties: {},
          },
        });

        mapRef.current?.addLayer({
          id: `polygon_${polygon.id}`,
          type: 'fill',
          source: `polygon_${polygon.id}`,
          layout: {},
          paint: {
            'fill-color': '#ea3122',
            'fill-opacity': 0.0,
          },
        });

        mapRef.current?.addLayer({
          id: `polygon_outline_${polygon.id}`,
          type: 'line',
          source: `polygon_${polygon.id}`,
          layout: {},
          paint: {
            'line-color': '#ea3122',
            'line-width': 2,
          },
        });
      });
    } catch (error) {
      console.error('Error fetching polygons:', error);
    }
  };

  useEffect(() => {
    if (mapRef.current && geoJsonKey && geoJson) {
      showNhle();
      return () => {
        clearNhle();
        clearShapes();
      }
    }
  }, [geoJsonKey, geoJson]);

  const showNhle = () => {
    //console.log(geoJson);

    mapRef.current?.addSource(geoJsonKey, {
      type: 'geojson',
      data: geoJson
    });
    mapRef.current?.addLayer({
      'id': `nhle-layer-${geoJsonKey}`,
      'type': 'circle',
      'source': geoJsonKey,
      'layout': {},
      'paint': {
        'circle-radius': 6,
        'circle-color': '#007cbf'
      }
    });

    const bounds = new mapboxgl.LngLatBounds();
    geoJson && geoJson.features && geoJson.features.forEach((feature: { geometry: { coordinates: any }; }) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = getCoordinatesFromFeature(feature as Feature)[0] as LngLatLike | LngLatBoundsLike;
          bounds.extend(coords);
        }
    });

    mapRef.current?.jumpTo({
      center: bounds.getCenter(),
      zoom: 9,
    });

    showPolygons({ maxLat: bounds.getNorth(), minLat: bounds.getSouth(), maxLng: bounds.getEast(), minLng: bounds.getWest() })

    mapRef.current?.on('click', `nhle-layer-${geoJsonKey}`, (e) => {
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(e.features && e.features[0]?.properties?.Name)
        .addTo(mapRef.current!!);
    });
    mapRef.current?.on('mouseenter', `nhle-layer-${geoJsonKey}`, () => {
      mapRef.current && (mapRef.current.getCanvas().style.cursor = 'pointer');
    });
    mapRef.current?.on('mouseleave', `nhle-layer-${geoJsonKey}`, () => {
      mapRef.current && (mapRef.current.getCanvas().style.cursor = '');
    });
  };

  const clearNhle = () => {
    const layers = mapRef.current?.getStyle()?.layers;
    const sources = mapRef.current?.getStyle()?.sources;

    layers?.forEach(layer => {
      if (layer.id == `nhle-layer-${geoJsonKey}`) {
        mapRef.current?.removeLayer(layer.id);
      }
    });

    for (const sourceId in sources) {
      if (sourceId == geoJsonKey) {
        mapRef.current?.removeSource(sourceId);
      }
    }
  }

  const clearShapes = () => {
    const layers = mapRef.current?.getStyle()?.layers;
    const sources = mapRef.current?.getStyle()?.sources;

    layers?.forEach(layer => {
      if (layer.id.startsWith('polygon_')) {
        mapRef.current?.removeLayer(layer.id);
      }
    });

    for (const sourceId in sources) {
      if (sourceId.startsWith('polygon_')) {
        mapRef.current?.removeSource(sourceId);
      }
    }
  }

  const getCoordinatesFromFeature = (feature: Feature) => {
    const geometry = feature.geometry;
    if (!geometry) return [];
    
    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates];
      case 'LineString':
      case 'MultiPoint':
        return geometry.coordinates;
      case 'Polygon':
      case 'MultiLineString':
        return geometry.coordinates.flat();
      case 'MultiPolygon':
        return geometry.coordinates.flat(2);
      default:
        return [];
    }
  };

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      className="w-full min-h-[75vh]"
    />
  );
}

export default memo(NhleViewer);