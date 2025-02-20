import { PageProps, Photo, Task } from "@/types";
import { memo, useEffect, useState } from "react";
import { cnvrtImgUrl } from "@/helpers";
import Map from "@/Components/Map/Map";
import ClientPdfRenderer from "@/Components/Pdf/ClientPdfRenderer";
import styles from "./pdf_preview.module.css";
export function PdfPreview({ tasks, photos, auth, total }: PageProps) {
    const [isGenerate, setIsGenerated] = useState(false);

    const getContent = (photo: Photo, index: number) => {
        const imageSrc: any = photo?.link;

        var photoArray: any = [];
        if (tasks.length > 0) {
            let tasks_photos_data = {
                name: tasks[0].name,
                farmer_name: `${auth.user.name} ${auth.user.surname}`,
                photo: photo,
                location: [photo.lng, photo.lat],
            };
            photoArray[0] = tasks_photos_data;
        } else {
            let tasks_photos_data = {
                farmer_name: `${auth.user.name} ${auth.user.surname}`,
                photo: photo,
                location: [photo.lng, photo.lat],
            };
            photoArray[0] = tasks_photos_data;
        }

        return (
            <div
                key={index}
                className={`border-b-0 ${styles.pdf_image_row}`}
                data-image_id="{{ image.id }}"
            >
                <div className={`flex flex-1 justify-center items-center`}>
                    <div className={`col col-6 `}>
                        <img
                            src={imageSrc}
                            className="w-full max-w-xs md:max-w-sm lg:max-w-sm xl:max-w-sm h-auto"
                        />
                    </div>
                </div>
                <div className="flex flex-1 flex-row mt-10">
                    <div className="w-full lg:w-1/2 px-3 lg:order-2">
                        <table className={`${styles.table}`}>
                            <tbody>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_lat_title }}"
                                        >
                                            Latitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_lat }}"
                                        >
                                            {photo?.lat}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_lng_title }}"
                                        >
                                            Longitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_lng }}"
                                        >
                                            {photo?.lng}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_alt_title }}"
                                        >
                                            Altitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_alt }}"
                                        >
                                            {} m
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_azimuth_title }}"
                                        >
                                            Azimuth
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_azimuth }}"
                                        >
                                            {photo?.photo_heading}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_angle_title }}"
                                        >
                                            Vertical angle
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_angle }}"
                                        >
                                            {}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_note_title }}"
                                        >
                                            Note
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_note }}"
                                        >
                                            {photo?.note}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_device_title }}"
                                        >
                                            Device
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_device }}"
                                        >
                                            {`${
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
                                            }`}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_accuracy_title }}"
                                        >
                                            Accuracy
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_accuracy }}"
                                        >
                                            {" "}
                                            {photo.accuracy} m
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_distance_title }}"
                                        >
                                            Distance
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_distance }}"
                                        >
                                            {" "}
                                            {photo.distance} m
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_timestamp_title }}"
                                        >
                                            Distance (GNSS)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_timestamp }}"
                                        >
                                            {photo.nmea_distance}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_created_date_title }}"
                                        >
                                            Timestamp (UTC)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_created_date }}"
                                        >
                                            {photo.timestamp}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                            title="{{ pht_created_date_title }}"
                                        >
                                            Created (UTC)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                            title="{{ pht_created_date }}"
                                        >
                                            {" "}
                                            {photo?.created}{" "}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <label></label>
                                    </td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        <label></label>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="w-full lg:w-1/2 px-3 lg:order-1 bg-re">
                        <div
                            className="h-100"
                            style={{ width: "100%", minHeight: "400px" }}
                        >
                            <Map
                                data={photoArray}
                                className="h-100"
                                style={{ width: "100%", minHeight: "500px" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    async function handleGenerate() {
        setIsGenerated(true);
    }

    return (
        <div className={styles.container} style={{ height: "auto" }}>
            {isGenerate ? (
                <ClientPdfRenderer
                    isPhotoGallery={tasks.length === 0 ? true : false}
                    setIsGenerated={setIsGenerated}
                    photos={photos}
                    task={tasks.length > 0 ? tasks[0]:null}
                    auth={auth}
                    totalPages={total}
                />
            ) : (
                <>
                    <h2 className=" py-2  text-3xl font-medium ">
                        Generating of PDF document
                    </h2>
                    <div className="w-100 py-2">
                        <button
                            id="js_confirm_pdf_generate"
                            type="button"
                            className="w-32 font-semibold text-white py-1.5 rounded-lg text-lg bg-brand-primary hover:bg-brand-primaryHover"
                            onClick={handleGenerate}
                        >
                            Generate
                        </button>
                    </div>
                    {photos.map((photo, index: number) => {
                        return getContent(photo, index);
                    })}
                </>
            )}
        </div>
    );
}
export default memo(PdfPreview);
