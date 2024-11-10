import { useState } from "react";
import { GalleryProps, MapProps} from "@/types";
import { FaTrash } from "react-icons/fa";
import { FaSync } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";

const TaskGallery = ({ photos,isUnassigned }: GalleryProps) => {
    const [isMapVisible, setIsMapVisible] = useState(true);
    const handleToggleMapVisibility = () => {
        setIsMapVisible((prevVisibility) => !prevVisibility);
    };
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos?.map((photo, index) => {
                const imageSrc = `data:image/jpeg;base64,${photo.photo}`;

                return (
                    <div className=" p-4" key={index}>
                        <div className="flex gap-2 mb-4">
                            {
                                isUnassigned && (
                                    <FaTrash className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75" />
                                )
                            }

                            <FaSync
                                className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75"
                                style={{ transform: "scaleX(-1)" }}
                            />
                            <FaSync className="text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75" />
                        </div>
                        <input
                            className="hidden"
                            data-field="status"
                            data-fieldtype="new"
                            type="checkbox"
                        />
                        <label className="flex flex-1  justify-center mr-[5px] text-center  w-[300px] h-[300px] rounded-sm border-4 border-[#dee2e6] ">
                            <img
                                src={imageSrc}
                                className="max-w-full max-h-full w-auto h-auto m-0 transition-opacity duration-200 hover:opacity-75"
                            />
                        </label>

                        <button className="flex flex-1 items-center gap-2 my-4 text-gray-800 dark:text-gray-200 transition-opacity duration-200 hover:opacity-75">
                        <FaCheck  />
                        <p className="font-semibold text- ">Select</p>
                        </button>

                        <div className="  rounded-md border-2 border-[#dee2e6]  ">
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Latitude</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.lat}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Longitude</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.lng}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Altitude</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.altitude}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Azimut</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.photo_heading}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Vectical angle</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.vertical_view_angle}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Note</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.note}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Device</p></div>
                            <div className="flex flex-1  justify-end "><p>{`${photo.device_platform} ${photo.device_model} ${photo.device_version} ${photo.device_manufacture}`}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Accuracy</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.accuracy}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Distance</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.distance}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Distance (GNSS)</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.distance}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Timestamp</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.timestamp}</p></div>
                            </div>
                            <div className="flex text-gray-800 dark:text-gray-200 p-4">
                            <div className="flex-1 "><p>Created (UTC)</p></div>
                            <div className="flex flex-1  justify-end "><p>{photo.created}</p></div>
                            </div>        
                            <div className="flex justify-end p-4 text-indigo-600 dark:text-indigo-400">
                            <button title="">Show EKF metadata</button>
                            </div>                         
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TaskGallery;
