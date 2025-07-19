import { useEffect, useState } from "react";
import {FaSync, FaTimes, FaEye } from "react-icons/fa";
import { GalleryModalProps } from "@/types";
import { router } from "@inertiajs/react";
import axios from "axios";
import { fetchAllBuildingData, findNearestFeature } from "@/Pages/BuildingHeight/api/fetch-building";

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
    const [nhleData, setNhleData] = useState<any>(null);
    const [landRegistryInspireData, setLandRegistryInspireData] = useState<any>(null);
    useEffect(() => {
        setImage(imageSrc);
    }, [imageSrc]);

    useEffect(() => {
        const distance = 0.0009;

        const fetchBuildingData = async () => {
            if (modal.isShow && photos[modal.index]) {
                const photo = photos[modal.index];
                if (photo.lat && photo.lng) {
                    const lat = typeof photo.lat === 'string' ? parseFloat(photo.lat) : photo.lat;
                    const lng = typeof photo.lng === 'string' ? parseFloat(photo.lng) : photo.lng;
                    const data = await fetchAllBuildingData(
                        lat.toString(),
                        lng.toString(),
                        photo.altitude?.toString() ?? "0",
                        photo.photo_heading?.toString() ?? "0",
                        "",
                        false
                    );
        
                    const buildingPart = data?.building?.data?.building_part?.[0];
        
                    const codepointFeatures = data?.codepoint?.data?.features || [];
                    const nearestCodepoint = findNearestFeature(codepointFeatures, lat, lng);
        
                    const uprnFeatures = data?.uprn?.data?.features || [];
                    const nearestUprn = findNearestFeature(uprnFeatures, lat, lng);
        
                    const inspireFeatures = data?.inspire?.data?.features || [];
                    const nearestInspire = findNearestFeature(inspireFeatures, lat, lng);
        
                    const landFeatures = data?.land?.features || [];
                    const nearestLand = findNearestFeature(landFeatures, lat, lng);
        
                    const nhleFeatures = data?.nhle?.data?.features || [];
                    const nearestNhle = findNearestFeature(nhleFeatures, lat, lng);
        
                    const shapeFeatures = data?.shape?.data?.features || [];
                    const nearestShape = findNearestFeature(shapeFeatures, lat, lng);
        
                    setBuildingData(buildingPart?.geojson?.features?.[0]?.properties ?? null);
                    setCodepointData(nearestCodepoint?.properties ?? null);
                    setUprnData(nearestUprn?.properties ?? null);
                    setLandRegistryInspireData(nearestInspire?.properties ?? null);
                    setLandData(nearestLand?.properties ?? null);
                    setNhleData(nearestNhle?.properties ?? null);
                    setShapeData(nearestShape?.properties ?? null);
                }
            }
        };

        fetchBuildingData();

        // Reset all data when modal is closed
        if (!modal.isShow) {
            setBuildingData(null);
            setShapeData(null);
            setCodepointData(null);
            setUprnData(null);
            setLandData(null);
            setNhleData(null);
            setLandRegistryInspireData(null);
        }
    }, [modal.isShow, modal.index, photos]);

    // Modified handleClose function to reset all data
    const onCloseModal = () => {
        setBuildingData(null);
        setShapeData(null);
        setCodepointData(null);
        setUprnData(null);
        setLandData(null);
        setNhleData(null);
        setLandRegistryInspireData(null);
        handleClose();
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
                        onClick={onCloseModal}
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
                            
                            <div className="text-gray-500 dark:text-gray-400">Land Registry Inspire</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{landRegistryInspireData?.inspire_id ? landRegistryInspireData.inspire_id : ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Name</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                                {nhleData?.name 
                                    ? (nhleData.name.length > 30 
                                        ? nhleData.name.substring(0, 27) + '...'   
                                        : nhleData.name) 
                                    : ''}
                            </div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Grade</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{nhleData?.grade ? nhleData.grade : ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Hyperlink</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">
                                {nhleData?.hyperlink ? (
                                    <a href={nhleData.hyperlink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                                        view
                                    </a>
                                ) : ''}
                            </div>
                            
                            <div className="text-gray-500 dark:text-gray-400">NGR</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{nhleData?.ngr ? nhleData.ngr : ''}</div>

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
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{landData?.description || ''}</div>
                            
                            <div className="text-gray-500 dark:text-gray-400">Note</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo?.note}</div>

                            <div className="text-gray-500 dark:text-gray-400">Network status</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo.network_info ? 'Online': '-'}</div>

                            <div className="text-gray-500 dark:text-gray-400">OSNMA validation</div>
                            {photo.osnma_enabled == "1" ?
                            <div className="text-right font-medium text-green-700 dark:text-green-200">Enabled</div>:
                            <div className="text-right font-medium text-red-700 dark:text-red-200">Photo has not been verified yet</div>
                            }

                            {photo.osnma_enabled == "1" && <>
                            <div className="text-gray-500 dark:text-gray-400">Validated satellites</div>
                            <div className="text-right font-medium text-gray-700 dark:text-gray-200">{photo.validated_sats}</div>
                            </>}

                            <div className="text-gray-500 dark:text-gray-400"></div>
                            {photo.osnma_validated == "1" ?
                            <div className="text-right font-medium text-green-700 dark:text-green-200">Photo location is OSNMA validated</div>:
                            <div className="text-right font-medium text-red-700 dark:text-red-200">Photo location is not validated</div>
                            }
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