const API_URL = "https://pic2bim.co.uk/";

export const fetchBuilding = async (
  lat: string,
  lon: string,
  camAltitude: string,
  camDirection: string
) => {

  // console.log(`Lat: ${lat} Long: ${lon} camAltitude: ${camAltitude} camDirection: ${camDirection}`)

  let lng = parseFloat(lon);
  if (lng > 0) lng = -Math.abs(parseFloat(lon));

  const response = await fetch(
    // prettier-ignore
    `/comm_building_part_nearest?latitude=${parseFloat(lat)}&longitude=${lng}&imagedirection=${camDirection}`
  );
  const data = await response.json();

  if (
    data.data.building_part.length > 0 &&
    data.data.building_part[0].geojson
  ) {
    return {
      geojson: data.data.building_part[0].geojson,
      cameraGPSData: [
        {
          coordinates: [lng, parseFloat(lat), parseFloat(camAltitude)],
          bearing: parseFloat(camDirection),
          altitude: parseFloat(camAltitude),
        },
      ],
    };
  }

  // alert("No records found in our database");
  return null;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // radius of Earth in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
};

export function findNearestFeature(features: any[], lat: number, lng: number, mode: 'simple' | 'allPoints' = 'simple') {
  if (!features || features.length === 0) return null;
  let nearest = features[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    if (!feature.geometry || !feature.geometry.coordinates) continue;
    let geometry = feature.geometry;
    let distance = Number.POSITIVE_INFINITY;

    if (geometry.type === 'Point') {
      const [lng2, lat2] = geometry.coordinates;
      distance = calculateDistance(lat, lng, lat2, lng2);
    } else if (geometry.type === 'Polygon') {
      if (mode === 'allPoints') {
        for (const ring of geometry.coordinates) {
          for (const [lng2, lat2] of ring) {
            const d = calculateDistance(lat, lng, lat2, lng2);
            if (d < distance) distance = d;
          }
        }
      } else {
        if (geometry.coordinates.length && geometry.coordinates[0].length) {
          const [lng2, lat2] = geometry.coordinates[0][0];
          distance = calculateDistance(lat, lng, lat2, lng2);
        }
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (mode === 'allPoints') {
        for (const polygon of geometry.coordinates) {
          for (const ring of polygon) {
            for (const [lng2, lat2] of ring) {
              const d = calculateDistance(lat, lng, lat2, lng2);
              if (d < distance) distance = d;
            }
          }
        }
      } else {
        if (
          geometry.coordinates.length &&
          geometry.coordinates[0].length &&
          geometry.coordinates[0][0].length
        ) {
          const [lng2, lat2] = geometry.coordinates[0][0][0];
          distance = calculateDistance(lat, lng, lat2, lng2);
        }
      }
    }
    if (distance < minDistance) {
      minDistance = distance;
      nearest = feature;
    }
  }
  return nearest;
}

export const fetchAllBuildingData = async (
  lat?: string,
  lon?: string,
  camAltitude?: string,
  camDirection?: string,
  osid?: string,
  panel?: boolean
) => {
  const distance = 0.0009;
  let latitude = parseFloat(lat ?? "0");
  let longitude = parseFloat(lon ?? "0");
  if (longitude > 0) longitude = -Math.abs(longitude);

  const min_lat = latitude - distance;
  const max_lat = latitude + distance;
  const min_lng = longitude - distance;
  const max_lng = longitude + distance;

  const shapeParams = {
    max_lat: max_lat.toString(),
    min_lat: min_lat.toString(),
    max_lng: max_lng.toString(),
    min_lng: min_lng.toString()
  };

  const bboxParams = `min_lat=${min_lat}&max_lat=${max_lat}&min_lng=${min_lng}&max_lng=${max_lng}`;

  const pointParams = `latitude=${latitude}&longitude=${longitude}&imagedirection=${camDirection}`;

  const boundsParams = `min_lat=${min_lat}&max_lat=${max_lat}&min_lng=${min_lng}&max_lng=${max_lng}`;

  const fetches = panel
  ? [
      fetch(`/comm_codepoint?${boundsParams}`).then(res => res.json()),
      fetch(`/comm_get_building_attributes?osid=${osid}`).then(res => res.json()),
      fetch(`/comm_uprn?${boundsParams}`).then(res => res.json()),
    ]
  : [
      fetch(`/comm_building_part_nearest?${pointParams}`).then(res => res.json()),
      fetch(`/comm_shapes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shapeParams)
      }).then(res => res.json()),
      fetch(`/comm_codepoint?${boundsParams}`).then(res => res.json()),
      fetch(`/comm_uprn?${boundsParams}`).then(res => res.json()),
      fetch(`/comm_get_lpis?${bboxParams}`).then(res => res.json()),
      fetch(`/comm_nhle?${pointParams}`).then(res => res.json()),
      fetch(`/comm_land_registry_inspire?${boundsParams}`).then(res => res.json())
    ];

let building, shape, codepoint, uprn, land, nhle, inspire, attributes;
if (panel) {
  [codepoint, attributes, uprn] = await Promise.all(fetches);
  shape = land = nhle = inspire = undefined;
} else {
  [building, shape, codepoint, uprn, land, nhle, inspire] = await Promise.all(fetches);
}

  return {
    building,
    shape,
    codepoint,
    uprn,
    land,
    nhle,
    inspire,
    attributes,
  };
};

export const fetchBuildingAttributes = async (osid: string) => {
  const response = await fetch(`/comm_get_building_attributes?osid=${osid}`);
  const data = await response.json();
  return data;
};
