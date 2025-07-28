import { memo, useEffect, useRef, useState } from 'react';
import "mapbox-gl/dist/mapbox-gl.css";
import { Head, router, usePage, } from '@inertiajs/react';
import type { PageProps } from '@/types';
import type { Feature } from "geojson";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import mapboxgl, { LngLatBoundsLike, LngLatLike } from 'mapbox-gl';
import "mapbox-gl/dist/mapbox-gl.css";
import ToggleControl from "@/Components/Map/ToggleControl";
import * as checkGeoJson from '@placemarkio/check-geojson';

export function Index({ auth }: PageProps) {

  const { shapes, selectedShape: mSelectedShape, nhles, ogc_fid } = usePage<{
    shapes: any;
    selectedShape?: any;
    nhles: any;
    ogc_fid: string|null;
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

  useEffect(() => {
    if (mapRef.current) {
      showPolygons();
    }
  }, []);

  const showPolygons = async () => {
    //console.log(shapes.data);

    mapRef.current?.on("load", () => {
      mapRef.current?.addSource('shapes-data', {
        type: 'geojson',
        data: shapes.data
      });
      mapRef.current?.addLayer({
        'id': 'shapes-layer',
        'type': 'fill',
        'source': 'shapes-data',
        'layout': {},
        'paint': {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.1
        }
      });
      mapRef.current?.addLayer({
        'id': 'shapes-layer-highlighted',
        'type': 'line',
        'source': 'shapes-data',
        'layout': {},
        'paint': {
            'line-color': '#ea3122',
            'line-width': 2,
        },
        'filter': ['in', 'ogc_fid', '']
      });

      mapRef.current?.on('click', 'shapes-layer', (e) => {
        const bbx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
          [e.point.x, e.point.y],
          [e.point.x, e.point.y]
        ];
        const selectedFeatures = mapRef.current?.queryRenderedFeatures(bbx, {
          layers: ['shapes-layer']
        });
        const ogc_fid = selectedFeatures?.map((feature) => feature?.properties?.ogc_fid);
        if (ogc_fid && Array.isArray(ogc_fid)) {
          mapRef.current?.setFilter('shapes-layer-highlighted', [
            'in',
            'ogc_fid',
            ...ogc_fid
          ]);
        }

        applyFilters({ogc_fid: ogc_fid && ogc_fid[0]});
      });

      if (mapRef.current && mSelectedShape) {
        const selectedShape = mSelectedShape.data;
        const ogc_fid = [selectedShape.id];
        mapRef.current?.jumpTo({
          center: [selectedShape.properties.longitude, selectedShape.properties.latitude],
          zoom: 10,
        });
        mapRef.current?.setFilter('shapes-layer-highlighted', [
          'in',
          'ogc_fid',
          ...ogc_fid
        ]);
      }
    });
  };

  const applyFilters = (params: { bbox?: string; ogc_fid?: string }) => {
    router.visit(route('nhle.index'), {
      method: 'get',
      preserveState: true,
      data: {
        ogc_fid: params.ogc_fid || '',
      },
      except: ['shapes'],
    });
  }

  useEffect(() => {
    if (mapRef.current && ogc_fid && nhles) {
      setTimeout(() => showNhle(), 1000);
      return () => clearNhle();
    }
  }, [ogc_fid, nhles]);

  const showNhle = () => {
    //console.log(nhles.data);

    mapRef.current?.addSource(`nhle-${ogc_fid}`, {
      type: 'geojson',
      data: nhles ? nhles.data : []
    });
    mapRef.current?.addLayer({
      'id': `nhle-layer-${ogc_fid}`,
      'type': 'circle',
      'source': `nhle-${ogc_fid}`,
      'layout': {},
      'paint': {
        'circle-radius': 6,
        'circle-color': '#007cbf'
      }
    });

    const bounds = new mapboxgl.LngLatBounds();
    nhles && nhles.data && nhles.data.features && nhles.data.features.forEach((feature: { geometry: { coordinates: any }; }) => {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = getCoordinatesFromFeature(feature as Feature)[0] as LngLatLike | LngLatBoundsLike;
        bounds.extend(coords);
      }
    });

    mapRef.current?.jumpTo({
      center: bounds.getCenter(),
      zoom: 10,
    });

    // mapRef.current?.on('click', `nhle-layer-${ogc_fid}`, (e) => {
    //   new mapboxgl.Popup()
    //     .setLngLat(e.lngLat)
    //     .setHTML(e.features && e.features[0]?.properties?.name)
    //     .addTo(mapRef.current!!);
    // });

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    mapRef.current?.on('mouseenter', `nhle-layer-${ogc_fid}`, (e) => {
      mapRef.current && (mapRef.current.getCanvas().style.cursor = 'pointer');

      const coordinates = e.features && (e.features[0].geometry as any).coordinates?.slice();
      const description = e.features && e.features[0] && e.features[0].properties?.name;

      while (Math.abs(e.lngLat.lng - coordinates) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      popup.setLngLat(e.lngLat).setHTML(description).addTo(mapRef.current!);
    });

    mapRef.current?.on('mouseleave', `nhle-layer-${ogc_fid}`, () => {
      mapRef.current && (mapRef.current.getCanvas().style.cursor = '');
      popup.remove();
    });
  };

  const clearNhle = () => {
    const geojsonSource = mapRef.current?.getSource(`nhle-${ogc_fid}`);
    if (geojsonSource) {
      mapRef.current?.removeLayer(`nhle-layer-${ogc_fid}`);
      mapRef.current?.removeSource(`nhle-${ogc_fid}`);
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
    <>
      <Head title="The National Heritage List for England" />
      <AuthenticatedLayout user={auth.user}>
        <div
          id="map-container"
          ref={mapContainerRef}
          className="w-full min-h-[91vh] rounded-xl shadow-md overflow-hidden "
        />
      </AuthenticatedLayout>
    </>
  );
}

export default memo(Index);