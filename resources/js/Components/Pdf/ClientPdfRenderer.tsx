import React, { PropsWithChildren, useEffect } from "react";
import './style.css'
import {
    usePDF,
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    Line,
    Font,
} from "@react-pdf/renderer";
import mapboxgl from "mapbox-gl";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import TaskPhoto from "../Map/TaskPhoto";
import moment from "moment";

import { Photo, Task, User } from "@/types";
Font.register({
    family: "Open Sans",
    fonts: [
        {
            src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf",
        },
        {
            src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf",
            fontWeight: 700,
        },
        {
            src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-400.ttf",
            fontWeight: 400,
        },
        {
            src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf",
            fontWeight: 600,
        },
    ],
});

// Create styles
const styles = StyleSheet.create({
    page: {
        display: "flex",
        flex: 1,
        backgroundColor: "white",
        fontFamily: "Open Sans",
        color: "black",
        fontWeight: 400,
        fontSize: 12,
        padding: 10,
    },
    section: {
        margin: 10,
        padding: 10,
        flexGrow: 1,
    },
    header: {
        padding: 3,
        alignItems: "center",
        backgroundColor: "rgb(50, 173, 230)",
        display: "flex",
        flexDirection: "row",
    },
    second_header: {
        alignItems: "flex-end",
        fontSize: 8,
    },
    title: {
        marginLeft: 15,
        fontSize: 11,
    },
    task_list_container: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginVertical: 20,
    },
    image_brand: {
        width: "150px",
        height: "35px",
        backgroundColor: "black",
    },
    content: {},
    footerLine: {
        borderBottom: "1px solid #000",
    },
    task_title: {
        fontFamily: "Open Sans",
        fontWeight: 700,
        fontSize: 19,
        padding: 0,
    },
    subtitle_container: {
        display: "flex",
        flex: 1,
        alignItems: "flex-end",
        fontSize: 11,
    },
    task_container: {
        marginHorizontal: 5,
        maxWidth: 70,
    },
    task_heading: {
        fontSize: 10,
        fontFamily: "Open Sans",
        fontWeight: 700,
    },
    task_value: {
        fontSize: 9,
        paddingTop: 10,
    },

    task_image: {
        minHeight: 200,
        maxHeight: 300,
        alignSelf: "center",
    },
    bottom_container: {
        flexDirection: "row",
        marginTop: 10,
    },
    map_image: {
        minHeight: 200,
        maxHeight: 300,
        backgroundColor:"red",
        alignSelf: "center",
    },
    photo_details: {
        display: "flex",
        flex: 1,
        marginLeft: 10,
    },
    photo_details_row: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 4,
    },
    photo_details_value: {
        color: "rgb(50, 173, 230)",
    },
    footer: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: "center",
        padding: 10,
    },
    pageNumber: {
        fontSize: 10,
        textAlign: "right",
        top: 10,
    },
});

// Page component
const PdfPage = ({
    photoKey,
    photo,
    totalPages,
    isPhotoGallery,
    task,
    auth,
    exportedPages,
}: PropsWithChildren<{
    photoKey : number;
    photo: Photo;
    totalPages: number;
    isPhotoGallery: boolean;
    task: Task;
    exportedPages: number;
    auth: { user: User };
}>) => {
    const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");
    return (
        <Page size="A4" style={styles.page}>
            {/* PDF Header */}
            <View style={styles.header}>
                <Image
                    src="/logo_egnss4all_white.png"
                    style={styles.image_brand}
                />
                <Text style={styles.title}>PIC2BIM export</Text>
                <View style={styles.subtitle_container}>
                    <Text>
                        {" "}
                        {`${auth.user.name} ${auth.user.surname}`}{" "}
                        {task
                            ? `- task detail ${task.name}`
                            : " Gallery of unassigned photos"}
                    </Text>
                </View>
            </View>

            {/* PDF Content */}

            <View style={styles.content}>
                <View style={styles.second_header}>
                    <Text>Date of export: {formattedDate}</Text>
                    <Text>
                        Exported {exportedPages} out of {totalPages} photos
                    </Text>
                </View>
                {photoKey == 0 && (
                    <Text style={styles.task_title}>
                        {`${auth.user.name} ${auth.user.surname}`}{" "}
                        {task
                            ? `- task detail ${task.name}`
                            : " Gallery of unassigned photos"}
                    </Text>
                )}
                {!isPhotoGallery && (
                    <View style={styles.task_list_container}>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Status</Text>
                            <Text style={styles.task_value}>
                                {task?.status}
                            </Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Verified</Text>
                            <Text style={styles.task_value}></Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Purpose</Text>
                            <Text style={styles.task_value}>{task?.text}</Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Name</Text>
                            <Text style={styles.task_value}>{task?.name}</Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Note</Text>
                            <Text style={styles.task_value}>{task?.note}</Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Guidelines</Text>
                            <Text style={styles.task_value}></Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>
                                Reopen reason
                            </Text>
                            <Text style={styles.task_value}>
                                {task?.text_reason}
                            </Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>
                                Date created
                            </Text>
                            <Text style={styles.task_value}>
                                {task?.date_created!.split(" ")[0]}
                            </Text>
                        </View>
                        <View style={styles.task_container}>
                            <Text style={styles.task_heading}>Due date</Text>
                            <Text style={styles.task_value}>
                                {task?.task_due_date!.split(" ")[0]}
                            </Text>
                        </View>
                    </View>
                )}

                {photo?.img && (
                    <Image src={photo.link} style={styles.task_image} />
                )}

                <View style={styles.bottom_container}>
                    <Image src={photo.mapImg} style={styles.map_image} />
                    <View style={styles.photo_details}>
                        <View style={styles.photo_details_row}>
                            <Text>Latitude</Text>
                            <Text style={styles.photo_details_value}>
                                {photo?.lat}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Longitude</Text>
                            <Text style={styles.photo_details_value}>
                                {photo.lng}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Altitude</Text>
                            <Text style={styles.photo_details_value}>
                                {photo?.altitude}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Azimut</Text>
                            <Text style={styles.photo_details_value}>
                                {" "}
                                {photo.photo_heading} m
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Vertical angle</Text>
                            <Text style={styles.photo_details_value}>
                                {photo?.vertical_view_angle}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Note</Text>
                            <Text style={styles.photo_details_value}>
                                {photo?.note}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Device</Text>
                            <Text style={styles.photo_details_value}>{`${
                                photo?.device_manufacture
                                    ? photo?.device_manufacture
                                    : ""
                            } ${
                                photo?.device_model
                                    ? photo?.device_model
                                    : ""
                            } ${
                                photo.device_platform
                                    ? photo.device_platform
                                    : ""
                            } ${
                                photo.device_version
                                    ? photo.device_version
                                    : ""
                            }`}</Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Accuracy</Text>
                            <Text style={styles.photo_details_value}>
                                {" "}
                                {photo?.accuracy} m
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Distance </Text>
                            <Text style={styles.photo_details_value}>
                                {" "}
                                {photo.distance} m
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Distance (GNSS)</Text>
                            <Text style={styles.photo_details_value}>
                                {photo.nmea_distance}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Timestamp (UTC)</Text>
                            <Text style={styles.photo_details_value}>
                                {photo.timestamp}
                            </Text>
                        </View>
                        <View style={styles.photo_details_row}>
                            <Text>Created(UTC) </Text>
                            <Text style={styles.photo_details_value}>
                                {photo?.created}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.photo_details_row,
                                { justifyContent: "flex-end" },
                            ]}
                        >
                            <Text style={styles.photo_details_value}>
                                Photo location has not been{" "}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.photo_details_row,
                                { justifyContent: "flex-end" },
                            ]}
                        >
                            <Text style={styles.photo_details_value}>
                                verified yet{" "}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.photo_details_row,
                                { justifyContent: "flex-end" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.photo_details_value,
                                    { color: "#31ba51" },
                                ]}
                            >
                                Photo is original{" "}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
            {/* PDF Footer  */}
            <View style={styles.footer}>
                <View style={styles.footerLine} />
                <Text
                    style={styles.pageNumber}
                    render={({ pageNumber, totalPages }) =>
                        `${pageNumber}/${totalPages}`
                    }
                    fixed
                ></Text>
            </View>
        </Page>
    );
};
interface tasksPhoto {
    name?: string; // Make the property optional
    farmer_name: string;
    photo: Photo;
    location: number[];
}
const ClientPdfRenderer = ({
    setIsGenerated,
    isPhotoGallery,
    photos,
    totalPages,
    auth,
    task,
}: PropsWithChildren<{
    setIsGenerated: any;
    photos: Array<Photo>;
    totalPages: number;
    isPhotoGallery: boolean;
    task: Task | null;
    auth: { user: User };
}>) => {
    const [pdfInstance, updatePdfInstance] = usePDF();
    const processPhotos = async () => {
        let photoData = photos;
        // Compress images for each photo
        const processedPages = await Promise.all(
            photoData.map(async (photo, index: any) => {
                var img = null;
                img = `data:image/jpeg;base64,${photo?.photo}`;
                const tasks_photo: tasksPhoto = {
                    farmer_name: `${auth.user.name} ${auth.user.surname}`,
                    photo: photo,
                    location: [photo?.lng, photo.lat],
                };
                task&& (tasks_photo["name"] = task?.name)
   
                let image = await generateMapboxImage(tasks_photo, 350, 400);
                

                const mapImg = `data:image/png;base64,${image}`;

                return getContent(
                    { ...photo, img, mapImg },
                    index,
                    totalPages,
                    isPhotoGallery,
                    auth,
                    photos.length,
                    task!
                );
            })
        );

        return processedPages.filter((page: any) => page !== null);
    };

    function getContent(
        photo: Photo,
        index: number,
        totalPages: number,
        isPhotoGallery: boolean,
        auth: { user: User },
        exportedPages: number,
        task: Task
    ) {
        var photoArray: any = [];
        photoArray[0] = photo;
        return (
            <PdfPage
                key={index}
                photoKey={index}
                photo={photo}
                totalPages={totalPages}
                isPhotoGallery={isPhotoGallery}
                auth={auth}
                task={task}
                exportedPages={exportedPages}
            />
        );
    }

    // Function to get image from map component

    const generateMapboxImage = async (
        map_tasks_array: any,
        width: number,
        height: number
    ): Promise<any> => {
        // Create a container for the map
        const container = document.createElement("div");
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.position = "absolute"; // Offscreen for cleanliness
        container.style.top = "-9999px";
        document.body.appendChild(container);

        // Initialize the map
        const map = new mapboxgl.Map({
            container: container,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [0.166022, 51.288998],
            preserveDrawingBuffer: true, // This allows exporting the canvas to an image
        });

        const coordintates = [map_tasks_array.location];
        let bounds = calculateBoundingBox(coordintates);
        map.fitBounds(bounds, {
            padding: { top: 60, bottom: 60, left: 20, right: 20 },
            duration: 0,
            linear: true,
            zoom: 13,
        });
        // Wait for the map to load
        await new Promise<void>((resolve) =>
            map.on("load", () => {
                // Add Marker
                const el = document.createElement("div");
                const root = createRoot(el);
                root.render(<TaskPhoto data={map_tasks_array} />);
                const marker = new mapboxgl.Marker(el).setLngLat(
                    map_tasks_array?.location
                );
                marker.addTo(map);
                setTimeout(() => {
                    resolve();
                }, 1);
            })
        );

        try {
            const canvas = await html2canvas(container);
            const imgData = canvas.toDataURL("image/png");
            // Cleanup
            map.remove();
            container.parentNode?.removeChild(container);
            return imgData.replace(/^data:image\/\w+;base64,/, "");
        } catch (e) {}
    };

    useEffect(() => {
        const createPdfDocument = async () => {
            const pages = await processPhotos();

            let name = `${moment().format(
                "YYYY.M.D"
            )}_${`${auth.user.name} ${auth.user.surname}`} ${
                !isPhotoGallery
                    ? "- task detail " + `${task?.name}`
                    : "Gallery of unassigned photos"
            }  `;

            const pdfDocument = (
                <Document title={name + ".pdf"}>
                    {pages.map((page: any, index: any) => (
                        <React.Fragment key={index}>{page}</React.Fragment>
                    ))}
                </Document>
            );
            updatePdfInstance(pdfDocument);
        };

        createPdfDocument();
    }, []);

    useEffect(() => {
        (async () => {
            if (pdfInstance.blob) {
                const {
                    blob: pdfBlob,
                    loading: pdfLoading,
                    error: pdfError,
                } = pdfInstance;

                let blob: any = pdfBlob;

                const formData = new FormData();

                let formatedName = `${moment().format(
                    "YYYY.M.D"
                )}_${`${auth.user.name} ${auth.user.surname}`} ${
                    !isPhotoGallery
                        ? "- task detail " +
                          `${auth.user.name} ${auth.user.surname}`
                        : ""
                } `;
                let name: string = `${formatedName}.pdf`;
                formData.append("file", blob, name);

                try {
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    setIsGenerated(false)
                } catch (error) {
                    console.error(error);
                }
            }
        })();
    }, [pdfInstance.blob]);

    // Function to calculate bounding box
    const calculateBoundingBox = (coordinates: any) => {
        let bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
        coordinates.forEach((coord: any) => {
            bounds.extend(coord);
        });
        return bounds;
    };

    return (
        <>
            <div style={{ backgroundColor: "#fffffffc", height: "100vh" }}>
                <div className="pdf_loader ">
                    <div className="inner_cont">
                        <p>{`${photos.length} out of ${photos.length}`}</p>
                        <img src="/tail-spin.svg" className="my-3" alt="spinner_loader" />
                        <p>Wait</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientPdfRenderer;
