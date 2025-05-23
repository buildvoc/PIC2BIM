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
                                        >
                                            Latitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo?.lat}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Longitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo?.lng}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Altitude
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {} m
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Azimuth
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo?.photo_heading}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Vertical angle
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Note
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo?.note}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Device
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
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
                                        >
                                            Accuracy
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
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
                                        >
                                            Distance
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
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
                                        >
                                            Distance (GNSS)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo.nmea_distance}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Timestamp (UTC)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {photo.timestamp}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Created (UTC)
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {" "}
                                            {photo?.created}{" "}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Network status
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {" "}
                                            {photo?.network_info ? 'Online' : '-'}{" "}
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            OSNMA validation
                                        </label>
                                    </td>
                                    <td>
                                        {" "}
                                        {photo?.osnma_enabled == "1" ? <label className="text-green-500">Enabled</label> : <label className="text-red-500">Disabled</label>}{" "}
                                    </td>
                                </tr>
                                {photo.osnma_enabled == "1" && 
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                            Validated satellites
                                        </label>
                                    </td>
                                    <td>
                                        <label
                                            className="text-brand-primary"
                                        >
                                            {" "}
                                            {photo?.validated_sats}{" "}
                                        </label>
                                    </td>
                                </tr>
                                }
                                <tr>
                                    <td>
                                        <label
                                            className="dark"
                                        >
                                        </label>
                                    </td>
                                    <td>
                                        {" "}
                                        {photo?.osnma_validated == "1" ? <label className="text-green-500">Photo location is OSNMA validated</label> : <label className="text-red-500">Photo location is not validated</label>}{" "}
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
