"use client";
import { useRef, useEffect, memo, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { loadJQuery } from "../utils/helpers";
import mapboxgl from "mapbox-gl";
import ToggleControl from "../dashboard/farmers_tasks/toggle_control/toggle_control";
import { createRoot } from "react-dom/client";
import TaskPhoto from "../dashboard/farmers_tasks/task_photo/task_photo";
mapboxgl.accessToken = import.meta.env.VITE_APP_MAPBOX_TOKEN;
import CustomPopup from "./CustomPopup";
import path from "path";
import { data, map } from "jquery";

const Map = ({
  map_tasks_array,
  onClick,
  style,
  className,
  setIsMapLoad,
  isUnassigned,
  isSelected,
  paths,
  zoomFilter,
}: any) => {
  //Refs
  const mapNode = useRef<any | HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>([]);
  const [filteredData, setFilteredData] = useState([]);
  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v11"
  );

  const mapViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/streets-v11");

    // Add your custom logic here
  };

  const satelliteViewClickHandler = () => {
    setMapStyle("mapbox://styles/mapbox/satellite-v9");
    // Add your custom logic here
  };
  const toggleControl = new ToggleControl({
    onMapViewClick: mapViewClickHandler,
    onSatelliteViewClick: satelliteViewClickHandler,
  });

  useEffect(() => {
    markerRef.current = [];
    loadMapBox();

    return () => {
      mapRef.current = null;
    };
  }, [map_tasks_array, mapStyle]);

  useEffect(() => {
    loadMapBox();
    return () => {
      mapRef.current = null;
    };
  }, []);

  // Map paths

  // useEffect(() => {
  //   console.log("Map points ---", points);
  //   if (points) {
  //     loadPath();
  //   } else {
  //     loadMapBox();
  //   }
  //   return () => {
  //     mapRef.current = null;
  //   };
  // }, [map_tasks_array, points]);

  const loadMapBox = () => {
    if (mapRef.current) {
      mapRef.current.remove();
    }

    if (mapNode.current) {
      mapNode.current.innerHTML = "";
    }
    const node = mapNode.current;
    if (typeof window === "undefined" || node === null) return;
    const mapboxMap = new mapboxgl.Map({
      container: node,
      accessToken: import.meta.env.VITE_APP_MAPBOX_TOKEN,
      style: mapStyle,
      center: [0.166022, 51.288998],
      zoom: 2.7,
      preserveDrawingBuffer: setIsMapLoad != undefined && true,
    });
    mapboxMap.on("load", () => {
      mapboxMap.addLayer({
        id: "satellite-layer",
        source: {
          type: "raster",
          url: "mapbox://mapbox.satellite",
          tileSize: 256,
        },
        type: "raster",
        layout: {
          visibility: "none", // Start with satellite layer hidden
        },
      });
    });

    mapboxMap.addControl(toggleControl, "top-left");
    mapboxMap.addControl(new mapboxgl.NavigationControl());
    const bounds: any = [
      [-180, -85],
      [180, 85],
    ];
    mapboxMap.setMaxBounds(bounds);
    if (setIsMapLoad != undefined) {
      mapboxMap.on("load", () => {
        setTimeout(() => {
          setIsMapLoad(true);
        }, 3000);
      });
    }

    if (map_tasks_array.length > 0 || paths) {
      mapRef.current = mapboxMap;
      // ref.current=mapboxMap
      //Get all coordinates from tasks

      // Path check
      if (paths && map_tasks_array && paths.length > 0) {
        const coordintates = paths.map((path: any) => {
          let coordsArray = path.points.map((coord: any) => [
            coord.lng,
            coord.lat,
          ]);
          return coordsArray;
        });

        let bounds = calculateBoundingBox(coordintates.flat());

        mapboxMap.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 20, right: 20 },
          duration: 0,
          linear: true,
        });

        paths?.map((path: any) => {
          loadPath(path);
        });
      } else {
        const coordintates = map_tasks_array.map((task: any) => task.location);
        //Calculate bounding
        let bounds = calculateBoundingBox(coordintates);

        mapboxMap.on("load", () => {
          //Setup markers
          map_tasks_array.forEach((task: any) => {
            addMarkers(task);
          });
          if (isSelected) {
            insertMarkers();
          }
          if (map_tasks_array.length == 1) {
            mapboxMap.fitBounds(bounds, {
              padding: { top: 60, bottom: 60, left: 20, right: 20 },
              duration: 0,
              linear: true,
              zoom: 16,
            });
            insertMarkers();
          } else {
            if (map_tasks_array.length > 0) {
              mapboxMap.fitBounds(bounds, {
                padding: { top: 60, bottom: 60, left: 20, right: 20 },
                duration: 0,
                linear: true,
              });
            }

   
            if(isUnassigned)
            {
              mapboxMap.on("moveend", async () => {
                filterData(mapboxMap);
              });
            }

            mapboxMap.on("zoom", () => {
              updateUnclusteredIcon(mapboxMap);
            });

            // Load your custom image
            mapboxMap.loadImage(
              "/group_marker/m5.png",
              function (error, image: any) {
                if (error) throw error;
                mapboxMap.addImage("m5", image);
              }
            );

            const markerImages: any = {
              "data checked": "/map_marker/marker_datachecked_1.png",
              "data provided": "/map_marker/marker_dataprovided.png",
              new: "/map_marker/marker_new.png",
              open: "/map_marker/marker_open.png",
              returns: "/map_marker/marker_returned.png",
              unassigned: "/map_marker/marker_unassigned.png",
            };

            // Load all marker images and add them to the map
            const loadImagePromises = Object.keys(markerImages).map(
              (status: any) =>
                new Promise((resolve, reject) => {
                  mapboxMap.loadImage(
                    markerImages[status],
                    (error, image: any) => {
                      if (error) {
                        reject(error);
                      } else {
                        mapboxMap.addImage(`marker-${status}`, image);
                        resolve("success");
                      }
                    }
                  );
                })
            );

            Promise.all(loadImagePromises).then(() => {
              mapboxMap.addSource("tasks_photos", {
                type: "geojson",
                // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
                // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
                data: {
                  type: "FeatureCollection",
                  features: map_tasks_array.map((task: any) => ({
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: task.location,
                    },
                    properties: {
                      id: task.id,
                      status: task.status,
                      location: task.location,
                      digest: task.photo.digest,
                    },
                  })),
                },
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
              });

              mapboxMap.addSource("filter_source", {
                type: "geojson",
                // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
                // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
                data: {
                  type: "FeatureCollection",
                  features: map_tasks_array.map((task: any) => ({
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: task.location,
                    },
                    properties: {
                      id: task.id,
                      status: task.status,
                      location: task.location,
                      digest: task.photo.digest,
                    },
                  })),
                },
              });

              mapboxMap.addLayer({
                id: 'circles-layer',
                type: 'circle',
                source: 'filter_source',
                paint:{
                  "circle-opacity": 0,
                } 
              });

              mapboxMap.addLayer({
                id: "clusters",
                type: "symbol",
                source: "tasks_photos",
                filter: ["has", "point_count"],
                layout: {
                  visibility: "visible",
                  "icon-allow-overlap": true,
                  "icon-image": "m5",
                  "icon-size": 0.5,
                  "text-field": ["get", "point_count_abbreviated"],
                  "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                  "text-size": 12,
                },
              });

              mapboxMap.addLayer({
                id: "unclustered-point",
                type: "symbol",
                source: "tasks_photos",
                filter: ["!", ["has", "point_count"]],
                layout: {
                  visibility: "visible",
                  "icon-allow-overlap": true,
                  "icon-image": ["concat", "marker-", ["get", "status"]],
                },
              });

              mapboxMap.on("mouseenter", "unclustered-point", () => {
                mapboxMap.getCanvas().style.cursor = "pointer";
              });

              mapboxMap.on("mouseleave", "unclustered-point", () => {
                mapboxMap.getCanvas().style.cursor = "";
              });

              // handle zoom level

              // inspect a cluster on click
              mapboxMap.on("click", "clusters", (e: any) => {
                const features: any = mapboxMap.queryRenderedFeatures(e.point, {
                  layers: ["clusters"],
                });
                const clusterId = features[0].properties.cluster_id;

                mapboxMap
                  .getSource("tasks_photos")
                  ?.getClusterExpansionZoom(
                    clusterId,
                    (err: any, zoom: any) => {
                      if (err) return;

                      mapboxMap.jumpTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom,
                      });
                    }
                  );
              });

              mapboxMap.on("click", "unclustered-point", (e: any) => {
                // Ensure that the unclustered points may appear on the screen
                const coordinates = JSON.parse(
                  e.features[0].properties.location
                );

                mapboxMap.jumpTo({
                  center: coordinates,
                  zoom: 16, // Specify your zoom level here
                });
              });

              mapboxMap.on("mouseenter", "clusters", () => {
                mapboxMap.getCanvas().style.cursor = "pointer";
              });
              mapboxMap.on("mouseleave", "clusters", () => {
                mapboxMap.getCanvas().style.cursor = "";
              });
            });
          }
        });
      }
    }
    return mapboxMap;
  };

  async function filterData(map: any) {
    const clusters = map.queryRenderedFeatures({
      layers: ["circles-layer"],
    });
    zoomFilter(clusters.map((photo: any) => photo.properties.id));
  }
  const loadPath = (path: any) => {
    mapRef.current.on("load", () => {
      const coordinates = path.points.map((point: any) => [
        parseFloat(point.lng),
        parseFloat(point.lat),
      ]);

      // Add the first point at the end to close the loop
      coordinates.push(coordinates[0]);
      // Add a data source containing GeoJSON data.
      mapRef.current.addSource(path.id, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            // These coordinates outline Maine.
            coordinates: [coordinates],
          },
        },
      });
      // Add a new layer to visualize the polygon.
      mapRef.current.addLayer({
        id: path.id,
        type: "fill",
        source: path.id, // reference the data source
        layout: {},
        paint: {
          "fill-color": "#9a97f2", // blue color fill
          "fill-opacity": 0.2,
        },
      });
      // Add a black outline around the polygon.
      mapRef.current.addLayer({
        id: `outline_${path.id}`,
        type: "line",
        source: path.id,
        layout: {},
        paint: {
          "line-color": "#0401fc",
          "line-width": 2,
        },
      });

      // Prepare point data for circles
      const pointFeatures = coordinates.map((coord: any, index: number) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coord,
        },
        properties: {
          details: path.points[--index],
          points: index,
        },
      }));

      // Add a data source containing GeoJSON data for the points.
      mapRef.current.addSource(`points_${path.id}`, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pointFeatures,
        },
      });

      mapRef.current.addLayer({
        id: `circles_${path.id}`,
        type: "circle",
        source: `points_${path.id}`,
        layout: {},
        paint: {
          "circle-radius": 5,
          "circle-color": "#0401fc",
          "circle-stroke-width": 1,
          "circle-opacity": 0.8,
          "circle-stroke-color": "#0401fc",
        },
      });

      // Add click event listeners to change colors to yellow
      mapRef.current.on("click", path.id, () => {
        mapRef.current.setPaintProperty(path.id, "fill-color", "#ffd219"); // yellow color
        mapRef.current.setPaintProperty(path.id, "fill-opacity", 0.7); // yellow color
        mapRef.current.setPaintProperty(
          `outline_${path.id}`,
          "line-color",
          "#ffd219"
        ); // yellow outline
        mapRef.current.setPaintProperty(
          `circles_${path.id}`,
          "circle-color",
          "#ffd219"
        ); // yellow circles
        mapRef.current.setPaintProperty(
          `circles_${path.id}`,
          "circle-stroke-color",
          "#ffd219"
        ); // yellow circles
      });

      mapRef.current.on("click", `circles_${path.id}`, (e: any) => {
        (async () => {
          const $ = await loadJQuery();
          $(".mapboxgl-popup-content")
            .removeClass("mapboxgl-popup-content")
            .addClass("cus-mapboxgl-popup-content");
          $(".mapboxgl-popup-close-button")
            .removeClass("mapboxgl-popup-close-button")
            .addClass("cus-mapboxgl-popup-close-button");
        })();

        const coordinates = e.features[0].geometry.coordinates.slice();
        const details = JSON.parse(e.features[0].properties.details);
        const points = JSON.parse(e.features[0].properties.points);

        // Render the React component into the DOM element
        const el: any = document.createElement("div");
        const root = createRoot(el);
        root.render(
          <CustomPopup
            points={points}
            pathText={path.name}
            latitude={details.lat}
            longitude={details.lng}
            altitude={details.altitude}
            accuracy={details.accuracy}
            time={details.created}
          /> // Pass any props you need
        );

        const popup = new mapboxgl.Popup({ maxWidth: "320px" })
          .setLngLat(coordinates)
          .setDOMContent(el)
          .addTo(mapRef.current);
      });

      mapRef.current.on("mouseenter", path.id, () => {
        mapRef.current.getCanvas().style.cursor = "pointer";
      });

      mapRef.current.on("mouseleave", path.id, () => {
        mapRef.current.getCanvas().style.cursor = "";
      });

      // Click event on the map to detect if the click is outside the polygon
      mapRef.current.on("click", (e: any) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, {
          layers: [path.id], // check for clicks on the 'maine' polygon
        });

        if (!features.length) {
          // If no features are returned, the click was outside the polygon
          mapRef.current.setPaintProperty(path.id, "fill-color", "#9a97f2"); // reset to initial color
          mapRef.current.setPaintProperty(
            `outline_${path.id}`,
            "line-color",
            "#0401fc"
          ); // reset outline to initial color
          mapRef.current.setPaintProperty(
            `circles_${path.id}`,
            "circle-color",
            "#0401fc"
          ); // yellow circles
          mapRef.current.setPaintProperty(
            `circles_${path.id}`,
            "circle-stroke-color",
            "#0401fc"
          ); // yellow circles
        }
      });

      // Get the first point of the polygon
      let firstPoint = coordinates[0];

      // Adjust the latitude of the first point to move the text box
      const adjustedLatitude = firstPoint[1] + 0.0003; // Shift up by 0.001 degrees
      firstPoint = [firstPoint[0], adjustedLatitude]; // Update the first point with the new latitude

      // Create a custom HTML element (a simple text box)
      const textBox = document.createElement("div");
      textBox.textContent = path.name; // Set your desired text
      textBox.style.backgroundColor = "white"; // White background
      textBox.style.fontSize = "14px"; // White background
      textBox.style.border = "1px solid #ccc"; // Light grey border
      textBox.style.padding = "10px"; // Padding inside the box
      textBox.style.paddingRight = "20px"; // Padding inside the box

      textBox.style.borderRadius = "3px"; // Rounded corners
      textBox.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)"; // Subtle shadow

      // Create a marker using the custom HTML element
      const marker = new mapboxgl.Marker({
        element: textBox, // Use the custom div element
        anchor: "bottom", // Position marker relative to the element
      })
        .setLngLat(firstPoint) // Position at the first point
        .addTo(mapRef.current); // Add to the map
    });
  };

  const addMarkers = (data: any) => {
    const el = document.createElement("div");
    const root = createRoot(el);
    root.render(<TaskPhoto data={data} onClick={onClick} />);
    const marker = new mapboxgl.Marker(el).setLngLat(data?.location);

    // Store marker instance
    markerRef.current.push(marker);
  };

  const updateUnclusteredIcon = (map: any) => {
    const zoomLevel = map.getZoom();
    if (zoomLevel > 14.999) {
      insertMarkers();
      map.setLayoutProperty("unclustered-point", "visibility", "none");
    } else {
      // Remove markers if they are currently added
      !isUnassigned &&
        map.setLayoutProperty("unclustered-point", "visibility", "visible");
      markerRef.current.forEach((marker: any) => {
        if (marker.getElement().parentElement) {
          marker.remove();
        }
      });
    }
  };

  //Add markers functions
  function insertMarkers() {
    try {
      markerRef.current.forEach((marker: any) => {
        if (!marker.getElement().parentElement) {
          marker.addTo(mapRef.current);
        }
      });
    } catch (err) {}
  }

  // Function to calculate bounding box
  const calculateBoundingBox = (coordinates: any) => {
    let bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
    coordinates.forEach((coord: any) => {
      bounds.extend(coord);
    });
    return bounds;
  };

  return <div ref={mapNode} className={className} style={style} />;
};

export default memo(Map);
