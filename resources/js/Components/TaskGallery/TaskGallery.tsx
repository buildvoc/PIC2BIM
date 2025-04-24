import { useState, useEffect } from "react";
import { GalleryProps } from "@/types";
import { FaTrash } from "react-icons/fa";
import { FaSync } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaEye } from "react-icons/fa";
import { loadJQuery } from "@/helpers";
import "./style.css";
import Modal_ from "./Modal_";
import axios from "axios";
import { router } from "@inertiajs/react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const TaskGallery = ({
    photos,
    isUnassigned,
    destroy,
    setPhotos,
    isSplitView,
}: GalleryProps) => {
    const [showModal, setShowModal] = useState({ isShow: false, index: -1 });
    const [ekfIndex, setEkfIndex] = useState(-1);

    const NextArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute -right-8 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg"
                onClick={onClick}
            >
                <FaChevronRight className="text-gray-600 dark:text-gray-400" />
            </div>
        );
    };

    const PrevArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute -left-8 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg"
                onClick={onClick}
            >
                <FaChevronLeft className="text-gray-600 dark:text-gray-400" />
            </div>
        );
    };

    const settings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: isSplitView ? 2 : 4,
        slidesToScroll: 1,
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        responsive: [
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: isSplitView ? 1 : 3,
                    slidesToScroll: 1,
                    dots: true
                }
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: isSplitView ? 1 : 2,
                    slidesToScroll: 1,
                    dots: true
                }
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    dots: true,
                    arrows: false
                }
            }
        ]
    };

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
            <div className={`mx-auto px-3 py-6 dark:bg-gray-900 ${isSplitView ? 'split-view-mode' : ''}`}>
                <div className={`slider-container mb-4 px-4 relative mx-auto ${isSplitView ? 'max-w-full' : 'max-w-[90%]'}`}>
                    <Slider {...settings} className={`gallery-slider py-2 ${isSplitView ? 'split-view-slider' : ''}`}>
                        {photos?.map((photo, index) => {
                            const imageSrc = photo?.link ? photo.link : '/images/dummy-image.jpg';
                            return (
                                <div className="slide-item px-2 mt-3" key={index}>
                                    <div className={`bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden p-3 mx-2 h-full group ${
                                        photo.check ? 'ring-2 ring-blue-500' : ''
                                    } ${isSplitView ? 'split-view-item' : ''}`}>
                                        {/* Image Section */}
                                        <div className="relative">
                                            <div className={`w-full aspect-square relative overflow-hidden rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-700 ${isSplitView ? 'split-view-image-container' : ''}`}>
                                                <img
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/images/dummy-image.jpg';
                                                        e.currentTarget.onerror = null;
                                                    }}
                                                    src={imageSrc}
                                                    className={`absolute inset-0 w-full h-full object-contain hover:opacity-90 transition-opacity cursor-pointer dark:opacity-90 ${isSplitView ? 'split-view-image' : ''}`}
                                                    style={{
                                                        transform: `rotate(${photo?.angle}deg)`,
                                                    }}
                                                    onClick={() => {
                                                        setShowModal({
                                                            isShow: true,
                                                            index: index, 
                                                        });
                                                    }}
                                                />
                                                
                                                <div 
                                                    className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer ${isSplitView ? 'split-view-overlay' : ''}`}
                                                    onClick={() => {
                                                        setShowModal({
                                                            isShow: true,
                                                            index: index, 
                                                        });
                                                    }}
                                                >
                                                    <div 
                                                        className={`flex gap-3 p-2 rounded-lg bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 ${isSplitView ? 'split-view-buttons' : ''}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {isUnassigned && (
                                                            <FaTrash
                                                                className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer transition-colors text-base sm:text-lg"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    destroy!([photo.id].join(","));
                                                                }}
                                                                title="Delete photo"
                                                            />
                                                        )}
                                                        <FaSync
                                                            className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-base sm:text-lg"
                                                            style={{ transform: "scaleX(-1)" }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRotate(photo.digest, "left");
                                                            }}
                                                            title="Rotate left"
                                                        />
                                                        <FaSync
                                                            className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-base sm:text-lg"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRotate(photo.digest, "right");
                                                            }}
                                                            title="Rotate right"
                                                        />
                                                        <FaCheck 
                                                            className={`text-base sm:text-lg cursor-pointer transition-colors ${
                                                                photo.check ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePhotoCheckBox(photo?.digest);
                                                            }}
                                                            title="Select photo"
                                                        />
                                                        <FaEye 
                                                            className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-base sm:text-lg"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.get(route("photo_detail", photo.id));
                                                            }}
                                                            title="View photo details"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {photo.check && (
                                            <div className="flex justify-center mt-2">
                                                <div className="bg-blue-500 h-1.5 w-1/3 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </Slider>
                </div>
            </div>

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
