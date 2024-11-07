import { useRef, useEffect, useState,memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ToggleControl from "./ToggleControl";
import { createRoot } from "react-dom/client";
import TaskPhoto from "./TaskPhoto";
import { MapProps, TaskPhotos } from "@/types";
function Map({
    data,
    onClick,
    isSelected,
    isUnassigned,
    zoomFilter,
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
    }, [data,mapStyle]);

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
        data.length>0&&loadClustersAndImage();
    };

    const loadClustersAndImage = () => {
        const coordintates = data.map((task: TaskPhotos) => task.location);
        let bounds = calculateBoundingBox(coordintates);

        mapRef.current?.on("load", () => {
            data.forEach((task: TaskPhotos) => {
                addMarkers(task);
            });
            if (isSelected) {
                insertMarkers();
            }
            if (data.length == 1) {
                mapRef.current?.fitBounds(bounds, {
                    padding: { top: 60, bottom: 60, left: 20, right: 20 },
                    duration: 0,
                    linear: true,
                    zoom: 16,
                });
                insertMarkers();
            } else {
                mapRef.current?.fitBounds(bounds, {
                    padding: { top: 60, bottom: 60, left: 20, right: 20 },
                    duration: 0,
                    linear: true,
                });
            }
            if (isUnassigned) {
                mapRef.current?.on("moveend", async () => {
                    filterData();
                });
            }
            mapRef.current?.on("zoom", () => {
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
        let bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        coordinates.forEach((coord: any) => {
            bounds.extend(coord);
        });
        return bounds;
    };

    async function filterData() {
        const clusters = mapRef.current?.queryRenderedFeatures({
            layers: ["circles-layer"],
        });
        zoomFilter!(clusters?.map((photo) => photo.properties?.id));
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
            // Remove markers if they are currently added
            !isUnassigned &&
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

    const loadPaths = () => {};

    return (
        <div
            id="map-container"
            className={`w-full h-3/4-screen`}
            ref={mapContainerRef}
        />
    );
}

export default memo(Map);
