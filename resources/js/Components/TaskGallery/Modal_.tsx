import { useEffect, useState } from "react";
import {FaSync, FaTimes, FaEye } from "react-icons/fa";
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
    const [buildingData, setBuildingData] = useState<any>(null);
    const [shapeData, setShapeData] = useState<any>(null);
    const [codepointData, setCodepointData] = useState<any>(null);
    const [uprnData, setUprnData] = useState<any>(null);
    const [landData, setLandData] = useState<any>(null);

    useEffect(() => {
        setImage(imageSrc);
    }, [imageSrc]);

    useEffect(() => {
        const distance = 0.0005;

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
        
        const fetchShapeData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                
                if (photo.lat && photo.lng) {
                    try {
                        const lat = typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat;
                        const lng = typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng;
                        
                        const params = {
                            max_lat: (lat + distance).toString(),
                            min_lat: (lat - distance).toString(),
                            max_lng: (lng + distance).toString(),
                            min_lng: (lng - distance).toString()
                        };
                        
                        const response = await axios.post("/comm_shapes", params);

                        if (response.data && response.data.data.features && response.data.data.features.length > 0) {
                            setShapeData(response.data.data.features[0].properties);
                        } else {
                            setShapeData(null);
                        }
                    } catch (error) {
                        console.error("Error fetching shape data:", error);
                        setShapeData(null);
                    }
                }
            }
        };

        const fetchCodepointData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                
                if (photo.lat && photo.lng) {
                    try {
                        const lat = typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat;
                        const lng = typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng;
                        
                        const params = {
                            min_lat: (lat - distance).toString(),
                            max_lat: (lat + distance).toString(),
                            min_lng: (lng - distance).toString(),
                            max_lng: (lng + distance).toString()
                        };
                        
                        const response = await axios.get("/comm_codepoint2", { params });
                        console.log(response.data);
                        
                        if (response.data && 
                            response.data.data && 
                            response.data.data.features && 
                            response.data.data.features.length > 0) {
                            
                            const features = response.data.data.features;

                            if (features.length === 1) {
                                setCodepointData(features[0].properties);
                            } else {
                                let closestFeature = features[0];
                                let minDistance = calculateDistance(
                                    lat, 
                                    lng, 
                                    features[0].geometry.coordinates[1], 
                                    features[0].geometry.coordinates[0]
                                );
                                
                                for (let i = 1; i < features.length; i++) {
                                    const feature = features[i];
                                    const distance = calculateDistance(
                                        lat, 
                                        lng, 
                                        feature.geometry.coordinates[1], 
                                        feature.geometry.coordinates[0]
                                    );
                                    
                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        closestFeature = feature;
                                    }
                                }
                                
                                setCodepointData(closestFeature.properties);
                            }
                        } else {
                            setCodepointData(null);
                        }
                    } catch (error) {
                        console.error("Error fetching codepoint data:", error);
                        setCodepointData(null);
                    }
                }
            }
        };
        
        const fetchUprnData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                
                if (photo.lat && photo.lng) {
                    try {
                        const lat = typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat;
                        const lng = typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng;
                        
                        const params = {
                            min_lat: (lat - distance).toString(),
                            max_lat: (lat + distance).toString(),
                            min_lng: (lng - distance).toString(),
                            max_lng: (lng + distance).toString()
                        };
                        
                        const response = await axios.get("/comm_uprn", { params });
                        
                        if (response.data && 
                            response.data.data && 
                            response.data.data.features && 
                            response.data.data.features.length > 0) {
                            
                            const features = response.data.data.features;
                            
                            // Find the closest UPRN
                            if (features.length === 1) {
                                setUprnData(features[0].properties);

                            } else {
                                let closestUprn = null;
                                let minDistance = Number.MAX_VALUE;
                                
                                for (const feature of features) {
                                    if (feature.geometry && feature.geometry.coordinates) {
                                        const distance = calculateDistance(
                                            lat, 
                                            lng, 
                                            feature.geometry.coordinates[1], // latitude 
                                            feature.geometry.coordinates[0]  // longitude
                                        );
                                        
                                        if (distance < minDistance) {
                                            minDistance = distance;
                                            closestUprn = feature.properties;
                                        }
                                    }
                                }

                                setUprnData(closestUprn);
                                
                            }
                        }
                    } catch (error) {
                        setUprnData(null);
                        console.error("Error fetching UPRN data:", error);
                    }
                }
            }
        };
        
        const fetchLandData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                
                if (photo.lat && photo.lng) {
                    try {
                        const lat = typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat;
                        const lng = typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng;
                        
                        const bbox = `${lng - distance},${lat - distance},${lng + distance},${lat + distance}`;
                        const params = { bbox };
                        
                        const response = await axios.get("/comm_get_lpis", { params });
                        
                        if (response.data && 
                            response.data.features && 
                            response.data.features.length > 0) {
                            
                            const features = response.data.features;
                            
                            // Find the closest land feature
                            if (features.length === 1) {
                                setLandData(features[0]);
                            } else {
                                let closestLand = null;
                                let minDistance = Number.MAX_VALUE;
                                
                                for (const feature of features) {
                                    if (feature.geometry && feature.geometry.coordinates) {
                                        // For Point geometries
                                        if (feature.geometry.type === 'Point' && feature.geometry.coordinates) {
                                            const distance = calculateDistance(
                                                lat, 
                                                lng, 
                                                feature.geometry.coordinates[1], // latitude 
                                                feature.geometry.coordinates[0]  // longitude
                                            );
                                            
                                            if (distance < minDistance) {
                                                minDistance = distance;
                                                closestLand = feature;
                                            }
                                        }
                                        // For Polygon geometries, use the first coordinate of the first ring
                                        else if ((feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') 
                                                && feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
                                            // Get center of bbox instead
                                            setLandData(feature);
                                            break;
                                        }
                                    }
                                }

                                if (!landData) {
                                    setLandData(closestLand);
                                }
                            }
                        } else {
                            setLandData(null);
                        }
                    } catch (error) {
                        setLandData(null);
                        console.error("Error fetching land data:", error);
                    }
                }
            }
        };
        
        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371e3; // radius of Earth in meters
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            
            return R * c; // distance in meters
        };
        
        fetchBuildingData();
        fetchShapeData();
        fetchCodepointData();
        fetchUprnData();
        fetchLandData();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
            <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header with close button */}
                <div className="flex justify-end pt-3 pr-3 flex-shrink-0">
                    <button
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl"
                        onClick={handleClose}
                    >
                        <FaTimes />
                    </button>
                </div>
                
                {/* Action buttons row */}
                <div className="flex px-5 gap-4 -mt-1 flex-shrink-0 mb-4">
                    <FaSync className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer transition-colors text-lg" 
                           style={{ transform: "scaleX(-1)" }}
                           onClick={() => rotateLeft(photo.digest, "left")}
                           title="Rotate left" />
                    <FaSync className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer transition-colors text-lg"
                           onClick={() => rotateRight(photo.digest, "right")}
                           title="Rotate right" />
                    <div 
                        className="cursor-pointer"
                        onClick={() => {
                            router.get(route("photo_detail", photos[modal.index]?.id));
                        }}
                    >
                        <FaEye className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors text-lg" />
                    </div>
                </div>

                {/* Scrollable content area */}
                <div className="overflow-y-auto flex-grow scrollbar-hide">
                    {/* Image section */}
                    <div className="px-6 py-4">
                        <div className="relative overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                            <a
                                onClick={() => {
                                    router.get(route("photo_detail", photos[modal.index]?.id));
                                }}
                                className="flex-1 flex items-center justify-center cursor-pointer"
                            >
                                <img
                                    src={image!}
                                    className="max-w-full max-h-96 object-contain"
                                    style={{
                                        transform: `rotate(${photos[modal.index]?.angle}deg)`,
                                    }}
                                    alt="Photo"
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
                            
                            <div className="text-gray-500 dark:text-gray-400">Postcode</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{codepointData?.postcode ? codepointData.postcode : ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">UPRN</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{uprnData?.uprn ? uprnData.uprn : ''}</div>
                            
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
                            
                            <div className="text-gray-500 dark:text-gray-400">Height Absolute Min</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                                {buildingData?.absoluteheightminimum}
                            </div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Physical Level</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                                {buildingData?.physicallevel}
                            </div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.accuracy ? Number(photo.accuracy).toFixed(2) : ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Created (UTC)</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.created}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">WD24NM</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{shapeData?.wd24nm ? shapeData.wd24nm : ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Parcel Ref</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{landData?.parcel_ref || ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">OSNMA Validated</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{(photo as any)?.['OSNMA Validated'] || 'False'}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Note</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.note}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal_;

/* Add these styles at the end of the file */
/* Hide scrollbar for Chrome, Safari and Opera */
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

// Append styles to head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = scrollbarHideStyles;
  document.head.appendChild(styleSheet);
}
