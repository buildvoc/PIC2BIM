"use client";
import React, { useEffect, useState, useRef } from "react";
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
import { compressImageFromUrl } from "@/utils/auth_operations";
import useLocalStorage from "@/hooks/useLocalStorage";
import mapboxgl from "mapbox-gl";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import moment from "moment";
import TaskPhoto from "../dashboard/farmers_tasks/task_photo/task_photo";
import { useRouter } from "next/navigation";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;

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
  photos,
  exportedPages,
  totalPages,
  isPhotoGalelry,
}: any) => {
  const formattedDate = moment().format("YYYY-MM-DD HH:mm:ss");

  return (
    <Page size="A4" style={styles.page}>
      {/* PDF Header */}
      <View style={styles.header}>
        <Image src="/logo_egnss4all_white.png" style={styles.image_brand} />
        <Text style={styles.title}>PIC2BIM export</Text>
        <View style={styles.subtitle_container}>
          <Text>
            {" "}
            {photos[0]?.farmer_name}{" "}
            {isPhotoGalelry != "true" && " - task detail"}{" "}
            {photos[0]?.task_name}{" "}
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

        <Text style={styles.task_title}>
          {photos[0]?.farmer_name} {isPhotoGalelry != "true" && "- task detail"}{" "}
          {photos[0]?.task_name}{" "}
        </Text>
        {isPhotoGalelry == "false" && (
          <View style={styles.task_list_container}>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Status</Text>
              <Text style={styles.task_value}>{photos[0]?.status}</Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Verified</Text>
              <Text style={styles.task_value}></Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Purpose</Text>
              <Text style={styles.task_value}></Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Name</Text>
              <Text style={styles.task_value}>{photos[0]?.task_name}</Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Note</Text>
              <Text style={styles.task_value}>{photos[0]?.note}</Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Guidelines</Text>
              <Text style={styles.task_value}>{photos[0]?.text}</Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Reopen reason</Text>
              <Text style={styles.task_value}></Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Date created</Text>
              <Text style={styles.task_value}>
                {photos[0]?.date_created.split(" ")[0]}
              </Text>
            </View>
            <View style={styles.task_container}>
              <Text style={styles.task_heading}>Due date</Text>
              <Text style={styles.task_value}>
                {photos[0]?.task_due_date.split(" ")[0]}
              </Text>
            </View>
          </View>
        )}

        {photos[0]?.img && (
          <Image src={photos[0]?.img} style={styles.task_image} />
        )}

        <View style={styles.bottom_container}>
          <Image src={photos[0]?.mapImg} style={styles.map_image} />
          <View style={styles.photo_details}>
            <View style={styles.photo_details_row}>
              <Text>Latitude</Text>
              <Text style={styles.photo_details_value}>
                {photos[0]?.photo?.lat}
              </Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Longitude</Text>
              <Text style={styles.photo_details_value}>
                {photos[0]?.photo?.lng}
              </Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Altitude</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Azimut</Text>
              <Text style={styles.photo_details_value}>
                {" "}
                {photos[0]?.photo?.photo_heading} m
              </Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Vertical angle</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Note</Text>
              <Text style={styles.photo_details_value}>
                {photos[0]?.photo?.note}
              </Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Device</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Accuracy</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Distance </Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Distance (GNSS)</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Timestamp (UTC)</Text>
              <Text style={styles.photo_details_value}></Text>
            </View>
            <View style={styles.photo_details_row}>
              <Text>Created(UTC) </Text>
              <Text style={styles.photo_details_value}>
                {photos[0]?.photo?.created}
              </Text>
            </View>
            <View
              style={[styles.photo_details_row, { justifyContent: "flex-end" }]}
            >
              <Text style={styles.photo_details_value}>
                Photo location has not been{" "}
              </Text>
            </View>
            <View
              style={[styles.photo_details_row, { justifyContent: "flex-end" }]}
            >
              <Text style={styles.photo_details_value}>verified yet </Text>
            </View>
            <View
              style={[styles.photo_details_row, { justifyContent: "flex-end" }]}
            >
              <Text style={[styles.photo_details_value, { color: "#31ba51" }]}>
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
          render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          fixed
        ></Text>
      </View>
    </Page>
  );
};

// Image compression function

// Define type for options
interface CompressOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
}

// const compressImageFromBase64 = async (
//   base64Image: any,
//   options: CompressOptions = {}
// ) => {
//   const { maxWidthOrHeight = 430, maxSizeMB = 0.05 } = options;
//   try {
//     // Convert base64 to file
//     const blob = base64StringToBlob(base64Image, "image/jpeg");
//     // Define compression options
//     const compressionOptions = {
//       maxSizeMB: maxSizeMB, // Adjust this value as needed
//       maxWidthOrHeight: maxWidthOrHeight, // Resize option
//       useWebWorker: true, // Use web worker
//       fileType: "image/jpeg", // Output format
//     };

//     // Convert Blob to File
//     let file = blobToFile(blob, "compressed_image.jpg");

//     // Compress the image
//     let compressedFile = await imageCompression(file, compressionOptions);

//     // // Apply rotation if needed
//     // if (rotate !== 0) {
//     //   const rotatedImage = await rotateImage(compressedFile, rotate);
//     //   compressedFile = await imageCompression(rotatedImage, compressionOptions);
//     // }

//     // Convert compressed file to base64
//     const compressedBase64 = await fileToBase64(compressedFile);
//     return compressedBase64;
//   } catch (error) {
//     console.error("Error compressing image:", error);
//     return null;
//   }
// };

// // Helper function to convert Blob to File
// const blobToFile = (blob: any, fileName: any) => {
//   return new File([blob], fileName, {
//     type: blob.type,
//     lastModified: Date.now(),
//   });
// };

// Helper function to convert File to base64
// const fileToBase64 = (file: any) => {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.readAsDataURL(file);
//     reader.onload = () => resolve(reader.result);
//     reader.onerror = (error) => reject(error);
//   });
// };

const ClientPdfRenderer = ({
  selected,
  setIsGenerated,
  length,
  isPhotoGallery,
  data,
  totalPages,
}: any) => {
  const [pdfInstance, updatePdfInstance] = usePDF();
  const [selectedTaskPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );
  const router = useRouter();

  const processPhotos = async () => {
    let photoData =
      selected == "true"
        ? isPhotoGallery == "true"
          ? data
          : selectedTaskPhotos.filter((photo: any) => photo.check)
        : isPhotoGallery == "true"
        ? data
        : selectedTaskPhotos;

    // Compress images for each photo
    const processedPages = await Promise.all(
      photoData.map(async (photo: any, index: any) => {
        var img = null;
        if (photo.photo.photo) {
          //Compress task image
          const compressedImage = await compressImageFromUrl(
            photo.photo.photo,
            {
              resize: 300,
              rotate: 90,
              quality: 80,
            }
          );
          img = `data:image/jpeg;base64,${compressedImage}`;
        }

        let image = await generateMapboxImage(photo, 350, 400);
        const compressedMapImg = await compressImageFromUrl(image, {
          resize: 430,
          rotate: 0,
          quality: 80,
        });
        const mapImg = `data:image/jpeg;base64,${compressedMapImg}`;

        //Take coordinate and fetch image from map canvas with comporession

        return getContent(
          { ...photo, img, mapImg },
          index,
          photoData.length,
          isPhotoGallery == "true" ? totalPages : selectedTaskPhotos.length
        );
      })
    );

    return processedPages.filter((page) => page !== null);
  };

  function getContent(
    photo: any,
    index: number,
    exportedPages: number,
    totalPages: number
  ) {
    var photoArray: any = [];
    photoArray[0] = photo;
    return (
      <PdfPage
        key={index}
        photos={photoArray}
        exportedPages={exportedPages}
        totalPages={totalPages}
        isPhotoGalelry={isPhotoGallery}
      />
    );
  }

  // Function to get image from map component

  const generateMapboxImage = async (
    map_tasks_array: any,
    width: number,
    height: number
  ): Promise<string> => {
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
    }catch(e){
      
    }
  };

  useEffect(() => {
    const createPdfDocument = async () => {
      const pages = await processPhotos();

      let name = `${moment().format("YYYY.M.D")}_${
        isPhotoGallery == "true"
          ? data[0].farmer_name
          : selectedTaskPhotos[0].farmer_name
      } ${
        isPhotoGallery == "false"
          ? "- task detail " + selectedTaskPhotos[0]?.task_name
          : ""
      }  `;

      const pdfDocument = (
        <Document title={name + ".pdf"}>
          {pages.map((page, index) => (
            <React.Fragment key={index}>{page}</React.Fragment>
          ))}
        </Document>
      );
      updatePdfInstance(pdfDocument);
    };

    createPdfDocument();
    // Example usage

    // (async () => {
    //   let image = await generateMapboxImage(selectedTaskPhotos[0], 400, 400);
    //   const compressedImage = await compressImageFromUrl(image,{resize:430,rotate:0,quality:80});
    //   const compressedSrc = `data:image/jpeg;base64,${compressedImage}`;
    //   console.log(compressedImage)
    //   setPdfUrl(compressedSrc);
    // })();
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

        let formatedName = `${moment().format("YYYY.M.D")}_${
          isPhotoGallery == "true"
            ? data[0].farmer_name
            : selectedTaskPhotos[0].farmer_name
        } ${
          isPhotoGallery == "false"
            ? "- task detail " + selectedTaskPhotos[0]?.task_name
            : ""
        } `;
        let name: string = `${formatedName}.pdf`;
        formData.append("file", blob, name);

        try {
          const response = await fetch("/api/generate-pdf", {
            method: "POST",
            body: formData,
          });

          setIsGenerated((values: any) => ({ ...values, generate: false }));
          if (!response.ok) {
            throw new Error("Failed to rename PDF");
          }
          const data = await response.json();
          window.open(`/test/${data.name}/pdf`);
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
        <div className="pdf_loader">
          <div className="inner_cont">
            <p>{`${length} out of ${length}`}</p>
            <img src="/tail-spin.svg" className="my-3" alt="spinner_loader" />
            <p>Wait</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientPdfRenderer;
