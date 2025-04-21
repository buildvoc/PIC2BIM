import { useEffect, useState } from "react";
import {FaSync, FaTimes, FaEye, FaTimesCircle } from "react-icons/fa";
import { GalleryModalProps } from "@/types";
import { router } from "@inertiajs/react";
import axios from "axios";

const Modal_ = ({
    modal,
    setModal,
    handleClose,
    photos,
    rotateLeft,
    rotateRight,
}: GalleryModalProps) => {
    const imageSrc = photos[modal.index]?.link;
    const [image, setImage] = useState(imageSrc);
    const [buildingData, setBuildingData] = useState(null);

    useEffect(() => {
        setImage(imageSrc);
    }, [imageSrc]);

    useEffect(() => {
        const fetchBuildingData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                
                if (photo.lat && photo.lng) {
                    try {
                        const response = await axios.get("/comm_building_part_nearest", {
                            params: {
                                latitude: photo.lat,
                                longitude: photo.lng,
                                imagedirection: photo.photo_heading || 0
                            }
                        });
                        
                        if (response.data.success && response.data.data.building_part.length > 0) {
                            setBuildingData(response.data.data.building_part[0].geojson.features[0].properties);
                            console.log(response.data.data.building_part[0].geojson.features[0].properties);
                        } else {
                            setBuildingData(null);
                        }
                    } catch (error) {
                        console.error("Error fetching building data:", error);
                        setBuildingData(null);
                    }
                }
            }
        };
        
        fetchBuildingData();
    }, [modal.isShow, modal.index, photos]);

    const handleImageLeft = () => {
        let indexCheck = modal.index;
        if (--indexCheck >= 0) {
            let image = photos[indexCheck];
            setModal((prevData: any) => ({
                ...prevData,
                index: indexCheck,
            }));
            setImage(image.link);
        }
    };

    const handleImageRight = () => {
        let indexCheck = modal.index;
        if (++indexCheck < photos.length) {
            let image = photos[indexCheck];
            setModal((prevData: any) => ({
                ...prevData,
                index: indexCheck,
            }));
            setImage(image.link);
        }
    };

    if (!modal?.isShow) return null;
    
    const photo = photos[modal.index];
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden">
                {/* Header with close button */}
                <div className="flex justify-end pt-3 pr-3">
                    <button
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl"
                        onClick={handleClose}
                    >
                        <FaTimes />
                    </button>
                </div>
                
                {/* Action buttons row */}
                <div className="flex px-5 gap-4 -mt-1">
                    <FaSync className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer transition-colors text-lg" 
                           style={{ transform: "scaleX(-1)" }}
                           onClick={() => rotateLeft(photo.digest, "left")}
                           title="Rotate left" />
                    <FaSync className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer transition-colors text-lg"
                           onClick={() => rotateRight(photo.digest, "right")}
                           title="Rotate right" />
                    <FaEye className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer transition-colors text-lg"
                           onClick={() => {
                            router.get(route("photo_detail", photos[modal.index]?.id));
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                    />
                </div>

                {/* Image section */}
                <div className="px-6 py-4">
                    <div className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <a
                            onClick={() => {
                                router.get(route("photo_detail", photos[modal.index]?.id));
                            }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center"
                        >
                            <img
                                src={image!}
                                className="max-w-full max-h-96 object-contain cursor-pointer"
                                style={{
                                    transform: `rotate(${photos[modal.index]?.angle}deg)`,
                                }}
                            />
                        </a>
                    </div>
                </div>

                {/* Metadata section */}
                <div className="px-6 py-4 text-sm bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-2 gap-y-2">
                        <div className="text-gray-500 dark:text-gray-400">TOID</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.TOID}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Latitude</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.lat ? Number(photo.lat).toFixed(3) : ''}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Longitude</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.lng ? Number(photo.lng).toFixed(3) : ''}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Altitude</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.altitude ? Number(photo.altitude).toFixed(2) : ''}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Azimuth</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.photo_heading ? Number(photo.photo_heading).toFixed(3) : ''}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">OS Land Cover Tier A</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.oslandusetiera}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Height Absolute Roofbase</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.absoluteheightroofbase}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Height Relative Roofbase</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.relativeheightroofbase}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Height Absolute Max</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.absoluteheightmaximum}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Height Relative Max</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.relativeheightmaximum}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Physical Level</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                            {buildingData?.physicallevel}
                        </div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.accuracy ? Number(photo.accuracy).toFixed(2) : ''}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Created (UTC)</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.created}</div>
                        
                        <div className="text-gray-500 dark:text-gray-400">Note</div>
                        <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.note}</div>
                    </div>
                    
                    {/* <div className="mt-4 text-center">
                        <button 
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium js_open_ekf"
                            onClick={() => setEkfIndex(modal.index)}
                        >
                            Show EKF metadata
                        </button>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default Modal_;
