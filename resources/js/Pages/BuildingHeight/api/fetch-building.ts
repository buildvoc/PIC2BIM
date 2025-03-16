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
