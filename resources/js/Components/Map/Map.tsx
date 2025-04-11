import { useRef, useEffect, useState, memo } from "react";
import mapboxgl, { LngLat, LngLatLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./map.css";
import ToggleControl from "./ToggleControl";
import { createRoot } from "react-dom/client";
import TaskPhoto from "./TaskPhoto";
import { loadJQuery } from "@/helpers";
import CustomPopup from "./CustomPopup";
import { MapProps, Path, TaskPhotos } from "@/types";
import classNames from "classnames";
import axios from 'axios';

function Map({
    data,
    onClick,
    isSelected,
    isUnassigned,
    zoomFilter,
    paths,
    className,
    style
}: MapProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<any>([]);
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
    }, [data, mapStyle]);

    const loadMapBox = () => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: mapStyle,
            center: [0.166022, 51.288998],
            zoom: 2.7,
            maxBounds: [
                [-180, -85],
                [180, 85],
            ],
        });
        mapRef.current.addControl(toggleControl, "top-left");
        mapRef.current.addControl(new mapboxgl.NavigationControl());

        if (paths && data && paths.length > 0 ) {
            const coordintates = paths.map((path: any) => {
                let coordsArray = path.points.map((coord: any) => [
                    coord.lng,
                    coord.lat,
                ]);
                return coordsArray;
            });

            let bounds = calculateBoundingBox(coordintates.flat());
            if(bounds)
            mapRef.current.fitBounds(bounds, {
                padding: { top: 60, bottom: 60, left: 20, right: 20 },
                duration: 0,
                linear: true,
            });

            paths?.map((path) => {
                loadPaths(path);
            });
        } else {
            data.length > 0 && loadClustersAndImage();
        }
    };

    const loadClustersAndImage = () => {
        const coordintates = data.map((task: TaskPhotos) => task.location);
        let bounds = calculateBoundingBox(coordintates);
        onSuddenchange();

        mapRef.current?.on("load", () => {

            data.forEach((task: TaskPhotos) => {
                addMarkers(task);
            });
            if (isSelected) {
                insertMarkers();
            }
            if (data.length == 1 && bounds) {
                mapRef.current?.fitBounds(bounds, {
                    padding: { top: 60, bottom: 60, left: 20, right: 20 },
                    duration: 0,
                    linear: true,
                    zoom: 16,
                });

                insertMarkers();
            } else {
                if (data.length > 0 && bounds) {
                    mapRef.current?.fitBounds(bounds, {
                        padding: { top: 60, bottom: 200, left: 60, right: 60 },
                        duration: 0,
                        linear: true,
                    });
                }
            }
            if (isUnassigned) {
                mapRef.current?.on("moveend", async () => {
                    filterData();
                });
            }
            mapRef.current?.on("zoom", () => {
                const zoomLevel = mapRef.current?.getZoom();
                updateUnclusteredIcon();
            });

            // Load your custom image
            mapRef.current?.loadImage(
                "/group_marker/m5.png",
                function (error: any, image: any) {
                    if (error) throw error;
                    mapRef.current?.addImage("m5", image);
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
                        mapRef.current?.loadImage(
                            markerImages[status],
                            (error: any, image: any) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    mapRef.current?.addImage(
                                        `marker-${status}`,
                                        image
                                    );
                                    resolve("success");
                                }
                            }
                        );
                    })
            );

            Promise.all(loadImagePromises).then(() => {
                mapRef.current?.addSource("tasks_photos", {
                    type: "geojson",
                    data: {
                        type: "FeatureCollection",
                        features: data.map((task: TaskPhotos) => ({
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
                    clusterMaxZoom: 14,
                    clusterRadius: 50,
                });

                mapRef.current?.addSource("filter_source", {
                    type: "geojson",

                    data: {
                        type: "FeatureCollection",
                        features: data.map((task: any) => ({
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

                mapRef.current?.addLayer({
                    id: "circles-layer",
                    type: "circle",
                    source: "filter_source",
                    paint: {
                        "circle-opacity": 0,
                    },
                });

                mapRef.current?.addLayer({
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
                        "text-font": [
                            "DIN Offc Pro Medium",
                            "Arial Unicode MS Bold",
                        ],
                        "text-size": 12,
                    },
                });

                mapRef.current?.addLayer({
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

                mapRef.current?.on("mouseenter", "unclustered-point", () => {
                    if (mapRef.current)
                        mapRef.current.getCanvas().style.cursor = "pointer";
                });

                mapRef.current?.on("mouseleave", "unclustered-point", () => {
                    if (mapRef.current)
                        mapRef.current.getCanvas().style.cursor = "";
                });

                mapRef.current?.on("click", "clusters", (e: any) => {
                    const features: any = mapRef.current?.queryRenderedFeatures(
                        e.point,
                        {
                            layers: ["clusters"],
                        }
                    );
                    const clusterId = features[0].properties.cluster_id;
                    const source = mapRef.current?.getSource(
                        "tasks_photos"
                    ) as mapboxgl.GeoJSONSource;
                    source.getClusterExpansionZoom(
                        clusterId,
                        (err: any, zoom: any) => {
                            if (err) return;

                            mapRef.current?.jumpTo({
                                center: features[0].geometry.coordinates,
                                zoom: zoom,
                            });
                        }
                    );
                });

                mapRef.current?.on("click", "unclustered-point", (e: any) => {
                    // Ensure that the unclustered points may appear on the screen
                    const coordinates = JSON.parse(
                        e.features[0].properties.location
                    );

                    mapRef.current?.jumpTo({
                        center: coordinates,
                        zoom: 16, // Specify your zoom level here
                    });
                });

                mapRef.current?.on("mouseenter", "clusters", () => {
                    if (mapRef.current)
                        mapRef.current.getCanvas().style.cursor = "pointer";
                });
                mapRef.current?.on("mouseleave", "clusters", () => {
                    if (mapRef.current)
                        mapRef.current.getCanvas().style.cursor = "";
                });
            });
        });
    };

    const addMarkers = (data_: any) => {
        const el = document.createElement("div");
        const root = createRoot(el);
        root.render(<TaskPhoto data={data_} onClick={onClick} />);
        const marker = new mapboxgl.Marker(el).setLngLat(data_?.location);
        markerRef.current.push(marker);
    };

    function insertMarkers() {
        try {
            markerRef.current.forEach((marker: any) => {
                if (!marker.getElement().parentElement) {
                    marker.addTo(mapRef.current);
                }
            });
        } catch (err) {}
    }
    const calculateBoundingBox = (coordinates: any) => {
        if (coordinates[0][1] >= -90 && coordinates[0][1]  <= 90 && coordinates[0][0] >= -180 && coordinates[0][0] <= 180) {
            
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

    async function filterData() {
        const clusters = mapRef.current?.queryRenderedFeatures({
            layers: ["circles-layer"],
        });
        zoomFilter!(clusters?.map((photo): String => photo.properties?.digest));
    }

    const updateUnclusteredIcon = () => {
        const zoomLevel: number | undefined = mapRef.current?.getZoom();
        if (zoomLevel! > 14.999) {
            insertMarkers();
            mapRef.current?.setLayoutProperty(
                "unclustered-point",
                "visibility",
                "none"
            );
        } else {
                mapRef.current?.setLayoutProperty(
                    "unclustered-point",
                    "visibility",
                    "visible"
                );
            markerRef.current.forEach((marker: any) => {
                if (marker.getElement().parentElement) {
                    marker.remove();
                }
            });
        }
    };

    const loadPaths = (path: Path) => {
        mapRef.current?.on("load", () => {
            const coordinates = path?.points.map((point) => [
                parseFloat(point.lng.toString()),
                parseFloat(point.lat.toString()),
            ]);

            // Add the first point at the end to close the loop
            coordinates.push(coordinates[0]);
            // Add a data source containing GeoJSON data.
            mapRef.current?.addSource(path.id.toString(), {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [coordinates],
                    },
                    properties: {},
                },
            });
            // Add a new layer to visualize the polygon.
            mapRef.current?.addLayer({
                id: path.id.toString(),
                type: "fill",
                source: path.id.toString(), // reference the data source
                layout: {},
                paint: {
                    "fill-color": "#9a97f2", // blue color fill
                    "fill-opacity": 0.2,
                },
            });
            // Add a black outline around the polygon.
            mapRef.current?.addLayer({
                id: `outline_${path.id}`,
                type: "line",
                source: path.id.toString(),
                layout: {},
                paint: {
                    "line-color": "#0401fc",
                    "line-width": 2,
                },
            });

            // Prepare point data for circles
            const pointFeatures: any = coordinates.map(
                (coord: any, index: number) => ({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: coord,
                    },
                    properties: {
                        details: path.points[--index],
                        points: index,
                    },
                })
            );

            // Add a data source containing GeoJSON data for the points.
            mapRef.current?.addSource(`points_${path.id}`, {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: pointFeatures,
                },
            });

            mapRef.current?.addLayer({
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
            mapRef.current?.on("click", path.id.toString(), () => {
                mapRef.current?.setPaintProperty(
                    path.id.toString(),
                    "fill-color",
                    "#ffd219"
                ); // yellow color
                mapRef.current?.setPaintProperty(
                    path.id.toString(),
                    "fill-opacity",
                    0.7
                ); // yellow color
                mapRef.current?.setPaintProperty(
                    `outline_${path.id}`,
                    "line-color",
                    "#ffd219"
                ); // yellow outline
                mapRef.current?.setPaintProperty(
                    `circles_${path.id}`,
                    "circle-color",
                    "#ffd219"
                ); // yellow circles
                mapRef.current?.setPaintProperty(
                    `circles_${path.id}`,
                    "circle-stroke-color",
                    "#ffd219"
                ); // yellow circles
            });

            mapRef.current?.on("click", `circles_${path.id}`, (e: any) => {
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
                    .addTo(mapRef.current!);
            });

            mapRef.current?.on("mouseenter", path.id.toString(), () => {
                mapRef.current!.getCanvas().style.cursor = "pointer";
            });

            mapRef.current?.on("mouseleave", path.id.toString(), () => {
                mapRef.current!.getCanvas().style.cursor = "";
            });

            // Click event on the map to detect if the click is outside the polygon
            mapRef.current?.on("click", (e: any) => {
                const features = mapRef.current?.queryRenderedFeatures(
                    e.point,
                    {
                        layers: [path.id.toString()], // check for clicks on the 'maine' polygon
                    }
                );

                if (!features?.length) {
                    // If no features are returned, the click was outside the polygon
                    mapRef.current?.setPaintProperty(
                        path.id.toString(),
                        "fill-color",
                        "#9a97f2"
                    ); // reset to initial color
                    mapRef.current?.setPaintProperty(
                        `outline_${path.id}`,
                        "line-color",
                        "#0401fc"
                    ); // reset outline to initial color
                    mapRef.current?.setPaintProperty(
                        `circles_${path.id}`,
                        "circle-color",
                        "#0401fc"
                    ); // yellow circles
                    mapRef.current?.setPaintProperty(
                        `circles_${path.id}`,
                        "circle-stroke-color",
                        "#0401fc"
                    ); // yellow circles
                }
            });

            // Get the first point of the polygon
            let firstPoint: any = coordinates[0];

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
            if (firstPoint[1] >= -90 && firstPoint[1] <= 90 && firstPoint[0] >= -180 && firstPoint[0] <= 180) {

            const marker = new mapboxgl.Marker({
                element: textBox, // Use the custom div element
                anchor: "bottom", // Position marker relative to the element
            })
                .setLngLat(firstPoint) // Position at the first point
                .addTo(mapRef.current!); // Add to the map
            }
        });
    };


    function onSuddenchange (){
        let previousZoom: any;
        let previousCenter: any;
        mapRef.current?.on("movestart", () => {
            previousZoom = mapRef.current?.getZoom();
            previousCenter = mapRef.current?.getCenter();
        });

        mapRef.current?.on("moveend", () => {
            const currentZoom = mapRef.current?.getZoom();
            const currentCenter = mapRef.current?.getCenter();
            if (previousZoom && Math.abs(currentZoom! - previousZoom) > 2) {
                if (Math.abs(currentZoom! - previousZoom) > 12) {
                    insertMarkers();
                }
            }
        });
    }

    const debounce = (func: (...args: any[]) => void, wait: number) => {
        let timeout: NodeJS.Timeout;
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    useEffect(() => {
        if (mapRef.current) {
            const debouncedMoveEnd = debounce(() => {
                if (mapRef.current && mapRef.current.getZoom() > 9) {
                    let bounds = getBoundingBox();
                    if (bounds) showPolygons(bounds);
                }
            }, 1000);
    
            mapRef.current.on('moveend', debouncedMoveEnd);
    
            return () => {
                mapRef.current?.off('moveend', debouncedMoveEnd);
            };
        }
    }, []);

    const showPolygons = async ({maxLat, minLat, maxLng, minLng}: {maxLat: number|undefined, minLat: number|undefined, maxLng: number|undefined, minLng: number|undefined}) => {
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
                    id: `outline_${polygon.id}`,
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

    const getBoundingBox = () => {
        if (mapRef.current) {
            const bounds = mapRef.current.getBounds();
            const maxLat = bounds?.getNorth();
            const minLat = bounds?.getSouth();
            const maxLng = bounds?.getEast();
            const minLng = bounds?.getWest();
            
    
            return {
                maxLat,
                minLat,
                maxLng,
                minLng
            };
        }
        return null;
    };

    const calculateCentroid = (coordinates: number[][]) => {
        let x = 0, y = 0, n = coordinates.length;
        coordinates.forEach(coord => {
            x += coord[0];
            y += coord[1];
        });
        return [x / n, y / n];
    };

    return (
        <div
            id="map-container"
            className={className}
            style={style}
            ref={mapContainerRef}
        />
    );
}

export default memo(Map);
