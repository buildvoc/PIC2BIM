import { useState, useEffect } from "react";
import { GalleryProps } from "@/types";
import { FaTrash } from "react-icons/fa";
import { FaSync } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { FaTimesCircle } from "react-icons/fa";
import { loadJQuery } from "@/helpers";
import "./style.css";
import Modal_ from "./Modal_";
import axios from "axios";
const TaskGallery = ({
    photos,
    isUnassigned,
    destroy,
    setPhotos,
}: GalleryProps) => {
    const [showModal, setShowModal] = useState({ isShow: false, index: -1 });
    const [ekfIndex, setEkfIndex] = useState(-1);
    useEffect(() => {
        const initJQuery = async () => {
            const $ = await loadJQuery();
            $(document)
                .on("click", ".js_open_ekf", async function () {
                    $(".js_hidden_ekf").fadeIn(200);
                })
                .on("click", ".close_popup", function () {
                    $(this).parent().fadeOut(200);
                });
            return () => {
                $("click").off("click");
            };
        };
        if (typeof window !== "undefined") {
            initJQuery();
        }
    }, []);

    const handleRotate = async (id: string, direction: string) => {
        let newAngle = 0;
        let pId = 0;
        const withAngleUpdate = photos.map((photo) => {
            if (photo.digest === id) {
                pId = photo.id;
                newAngle = photo?.angle
                    ? direction === "left"
                        ? photo?.angle - 90
                        : photo?.angle + 90
                    : direction === "left"
                    ? -90
                    : 90;
                return { ...photo, angle: newAngle };
            }
            return photo;
        });
        setPhotos(withAngleUpdate);
        await axios.post(route('rotate-photo'),{id : pId, angle : newAngle});
        alert('Photo rotated successfully.')
    };
    const handleClose = () => setShowModal({ isShow: false, index: -1 });

    const handlePhotoCheckBox = (id: string) => {
        const withCheckUpdate = photos.map((photo) => {
            if (photo?.digest === id) {
                const check = !photo.hasOwnProperty("check")
                    ? true
                    : !photo?.check;
                return { ...photo, check: check };
            }
            return photo;
        });
        setPhotos(withCheckUpdate);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos?.map((photo, index) => {
                    const imageSrc = photo?.link ? photo.link : '/images/dummy-image.jpg';

                    return (
                        <div className=" p-4" key={index}>
                            <div className="flex gap-2 mb-4">
                                {isUnassigned && (
                                    <FaTrash
                                        className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75"
                                        onClick={() =>
                                            destroy!([photo.id].join(","))
                                        }
                                    />
                                )}
                                <FaSync
                                    className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75"
                                    style={{ transform: "scaleX(-1)" }}
                                    onClick={() => {
                                        return handleRotate(
                                            photo.digest,
                                            "left"
                                        );
                                    }}
                                />
                                <div>
                                    <FaSync
                                        className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75"
                                        onClick={() => {
                                            return handleRotate(
                                                photo.digest,
                                                "right"
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                            <label
                                className={`flex flex-1  justify-center mr-[5px] text-center  w-[300px] h-[300px] hover:border-indigo-500 cursor-pointer rounded-sm border-4 ${
                                    photo.check
                                        ? "border-indigo-500"
                                        : "dark:border-gray-200"
                                }`}
                                style={{
                                    transform: `rotate(${photo?.angle}deg)`,
                                }}
                                onClick={() => {
                                    setShowModal({
                                        isShow: true,
                                        index: index,
                                    });
                                }}
                            >
                                <img
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.src = '/images/dummy-image.jpg';
                                        e.currentTarget.onerror = null;
                                    }}
                                    src={imageSrc}
                                    className="max-w-full max-h-full w-auto h-auto m-0 transition-opacity duration-200 hover:opacity-75 object-cover"
                                />
                            </label>

                            <button
                                onClick={() =>
                                    handlePhotoCheckBox(photo?.digest)
                                }
                                className="flex flex-1 items-center gap-2 my-4 text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75"
                            >
                                <FaCheck />
                                <p className="font-semibold text- ">Select</p>
                            </button>

                            <div className="  rounded-md border-2 border-[#dee2e6]  ">
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Latitude</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.lat}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Longitude</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.lng}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Altitude</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.altitude}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Azimut</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.photo_heading}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Vectical angle</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.vertical_view_angle}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Note</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.note}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Device</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{`${photo.device_platform} ${photo.device_model} ${photo.device_version} ${photo.device_manufacture}`}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Accuracy</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.accuracy}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Distance</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.distance}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Distance (GNSS)</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.distance}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Timestamp</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.timestamp}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Created (UTC)</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.created}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Network status</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.network_info ? 'Online': '-'}</p>
                                    </div>
                                </div>
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>OSNMA validation</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        {photo.osnma_enabled == "1" ? <p className="text-green-500">Enabled</p>: <p className="text-red-500">Photo has not been verified yet</p>}
                                    </div>
                                </div>
                                {photo.osnma_enabled == "1" && 
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p>Validated satellites</p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        <p>{photo.validated_sats}</p>
                                    </div>
                                </div>
                                }
                                <div className="flex text-gray-800 dark:text-gray-200 p-4">
                                    <div className="flex-1 ">
                                        <p></p>
                                    </div>
                                    <div className="flex flex-1  justify-end ">
                                        {photo.osnma_validated == "1" ? <p className="text-green-500">Photo location is OSNMA validated</p>: <p className="text-red-500">Photo location is not validated</p>}
                                    </div>
                                </div>
                                <div className="flex justify-end p-4 text-indigo-600 dark:text-indigo-400">
                                    <label
                                        className="js_open_ekf"
                                        data-id="123"
                                        onClick={() => {
                                            setEkfIndex(index);
                                        }}
                                    >
                                        Show EKF metadata
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {ekfIndex > -1 && (
                <div className="js_hidden_ekf">
                    <span className="close_popup py-2 mb-2">
                        <FaTimesCircle />
                    </span>
                    <table className="my-4">
                        <tbody>
                            <tr>
                                <td></td>
                                <td className="bold">GPS L1</td>
                                <td className="bold">GPS L5</td>
                                <td className="bold">GPS Iono Free (L1/L5)</td>
                                <td className="bold">Galileo E1</td>
                                <td className="bold">Galileo E5a</td>
                                <td className="bold">
                                    Galileo Iono Free (E1/E5a)
                                </td>
                            </tr>
                            <tr>
                                <td className="bold">Latitude</td>
                                <td>{photos[ekfIndex].efkLatGpsL1}</td>
                                <td>{photos[ekfIndex].efkLatGpsL5}</td>
                                <td>{photos[ekfIndex].efkLatGpsIf}</td>
                                <td>{photos[ekfIndex].efkLatGalE1}</td>
                                <td>{photos[ekfIndex].efkLatGalE5}</td>
                                <td>{photos[ekfIndex].efkLatGalIf}</td>
                            </tr>
                            <tr>
                                <td className="bold">Longitude</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className="bold">Altitude</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className="bold">Reference</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className="bold">Time</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <Modal_
                modal={showModal}
                handleClose={handleClose}
                photos={photos}
                setModal={setShowModal}
                rotateLeft={(digest: string) => handleRotate(digest, "left")}
                rotateRight={(digest: string) => handleRotate(digest, "right")}
            />
        </>
    );
};

export default TaskGallery;
