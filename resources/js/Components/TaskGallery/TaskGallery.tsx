import { useState, useEffect } from "react";
import { GalleryProps } from "@/types";
import { FaTrash } from "react-icons/fa";
import { FaSync } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaChevronUp, FaChevronDown, FaEye } from "react-icons/fa";
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
    isMapVisible = true,
}: GalleryProps) => {
    const [showModal, setShowModal] = useState({ isShow: false, index: -1 });
    const [ekfIndex, setEkfIndex] = useState(-1);

    // Add CSS styles for single image mode
    const singleImageStyles = photos.length === 1 ? {
        maxWidth: '300px',
        maxHeight: '300px',
        minWidth: '200px',
        minHeight: '200px',
        margin: '0 auto'
    } : {};

    // For horizontal carousel (non-split view)
    const NextArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-white dark:bg-gray-800 p-2 md:p-3 rounded-full shadow-lg"
                onClick={onClick}
            >
                <FaChevronRight className="text-gray-600 dark:text-gray-400 text-xs md:text-base" />
            </div>
        );
    };

    // For horizontal carousel (non-split view)
    const PrevArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-white dark:bg-gray-800 p-2 md:p-3 rounded-full shadow-lg"
                onClick={onClick}
            >
                <FaChevronLeft className="text-gray-600 dark:text-gray-400 text-xs md:text-base" />
            </div>
        );
    };

    // For vertical carousel (split view)
    const NextArrowVertical = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute right-1/2 bottom-0 z-20 cursor-pointer bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg"
                onClick={onClick}
                style={{ transform: 'translate(50%, 50%)' }}
            >
                <FaChevronDown className="text-gray-600 dark:text-gray-400 text-xs" />
            </div>
        );
    };

    // For vertical carousel (split view)
    const PrevArrowVertical = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="absolute right-1/2 top-0 z-20 cursor-pointer bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg"
                onClick={onClick}
                style={{ transform: 'translate(50%, -50%)' }}
            >
                <FaChevronUp className="text-gray-600 dark:text-gray-400 text-xs" />
            </div>
        );
    };

    // Custom arrows for grid view
    const GridNextArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="grid-next-arrow absolute right-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg flex items-center justify-center"
                onClick={onClick}
            >
                <FaChevronRight className="text-gray-600 dark:text-gray-400 text-lg" />
            </div>
        );
    };

    const GridPrevArrow = (props: any) => {
        const { onClick } = props;
        return (
            <div
                className="grid-prev-arrow absolute left-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg flex items-center justify-center"
                onClick={onClick}
            >
                <FaChevronLeft className="text-gray-600 dark:text-gray-400 text-lg" />
            </div>
        );
    };

    // Calculate slidesToShow based on available photos, split view, and ensure it's at least 1
    const slidesToShow = photos.length > 0 
        ? Math.min(photos.length, isSplitView ? 1 : 4)
        : 1;

    // Settings for horizontal carousel (non-split view)
    const horizontalSettings = {
        dots: true,
        infinite: false,
        speed: 500,
        slidesToShow: Math.min(photos.length || 1, 6),
        slidesToScroll: 1,
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        responsive: [
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: Math.min(photos.length || 1, 4),
                    slidesToScroll: 1,
                    dots: true
                }
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: Math.min(photos.length || 1, 3),
                    slidesToScroll: 1,
                    dots: false
                }
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                    dots: false,
                    arrows: true
                }
            }
        ]
    };

    // Settings for vertical carousel (split view)
    const verticalSettings = {
        dots: false,
        infinite: false,
        speed: 500,
        slidesToShow: Math.min(photos.length, 2), // Show up to 2 photos at once for larger photos
        slidesToScroll: 1,
        vertical: true,
        verticalSwiping: true,
        nextArrow: <NextArrowVertical />,
        prevArrow: <PrevArrowVertical />,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: Math.min(photos.length, 2),
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                }
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    arrows: true,
                }
            }
        ]
    };

    // Settings for grid view (5x3 layout)
    const gridSettings = {
        dots: false,
        infinite: false,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        nextArrow: <GridNextArrow />,
        prevArrow: <GridPrevArrow />,
        centerMode: false,
        variableWidth: false,
        fade: true,
        cssEase: 'linear',
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    arrows: true,
                    dots: true
                }
            },
            {
                breakpoint: 768,
                settings: {
                    arrows: true,
                    dots: false
                }
            },
            {
                breakpoint: 480,
                settings: {
                    arrows: true,
                    dots: false
                }
            }
        ]
    };

    // Choose the appropriate settings based on view mode
    const settings = isSplitView ? verticalSettings : horizontalSettings;

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

    // If there are no photos, show a message instead
    if (photos.length === 0) {
        return (
            <div className="flex justify-center items-center p-8 text-gray-500 dark:text-gray-400">
                No photos available
            </div>
        );
    }

    // Render photo card (used in both carousel and grid view)
    const renderPhotoCard = (photo: any, index: number) => {
        const imageSrc = photo?.link ? photo.link : '/images/dummy-image.jpg';
        return (
            <div 
                className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden p-2 md:p-3 h-full group 
                    ${photo.check ? 'ring-2 ring-blue-500' : ''}
                    ${isSplitView ? 'split-view-item' : ''} 
                    ${photos.length === 1 ? 'single-image-item' : ''}`}
                style={photos.length === 1 ? singleImageStyles : {}}
            >
                <div className="relative">
                    <div 
                        className={`w-full relative overflow-hidden rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-700 
                            ${isSplitView ? 'split-view-image-container' : ''} 
                            ${photos.length === 1 ? 'single-image-container' : ''}`}
                        style={photos.length === 1 ? { 
                            maxWidth: '300px', 
                            maxHeight: '300px', 
                            minWidth: '200px', 
                            minHeight: '200px' 
                        } : isSplitView ? {
                            height: '220px'
                        } : {
                            aspectRatio: '1/1'
                        }}
                    >
                        <img
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.src = '/images/dummy-image.jpg';
                                e.currentTarget.onerror = null;
                            }}
                            src={imageSrc}
                            className={`absolute inset-0 w-full h-full object-contain hover:opacity-90 transition-opacity cursor-pointer dark:opacity-90 
                                ${isSplitView ? 'split-view-image' : ''} 
                                ${photos.length === 1 ? 'single-image' : ''}`}
                            style={{
                                transform: `rotate(${photo?.angle || 0}deg)`,
                                ...(photos.length === 1 ? { maxWidth: '300px', maxHeight: '300px' } : {})
                            }}
                            onClick={() => {
                                setShowModal({
                                    isShow: true,
                                    index: index, 
                                });
                            }}
                        />
                        
                        <div 
                            className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer 
                                ${isSplitView ? 'split-view-overlay' : ''}`}
                            onClick={() => {
                                setShowModal({
                                    isShow: true,
                                    index: index, 
                                });
                            }}
                        >
                            <div 
                                className={`flex gap-2 md:gap-3 p-1 md:p-2 rounded-lg bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 
                                    ${isSplitView ? 'split-view-buttons' : ''}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {isUnassigned && (
                                    <FaTrash
                                        className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer transition-colors text-sm md:text-base"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            destroy!([photo.id].join(","));
                                        }}
                                        title="Delete photo"
                                    />
                                )}
                                <FaSync
                                    className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-sm md:text-base"
                                    style={{ transform: "scaleX(-1)" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRotate(photo.digest, "left");
                                    }}
                                    title="Rotate left"
                                />
                                <FaSync
                                    className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-sm md:text-base"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRotate(photo.digest, "right");
                                    }}
                                    title="Rotate right"
                                />
                                <FaCheck 
                                    className={`text-sm md:text-base cursor-pointer transition-colors ${
                                        photo.check ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePhotoCheckBox(photo?.digest);
                                    }}
                                    title="Select photo"
                                />
                                <FaEye 
                                    className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-sm md:text-base"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        localStorage.setItem("map_from_photo_detail", "true");
                                        router.get(route("photo_detail", photo.id));
                                    }}
                                    title="View photo details"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                {photo.check && (
                    <div className="flex justify-center mt-1 md:mt-2">
                        <div className="bg-blue-500 h-1 md:h-1.5 w-1/3 rounded-full"></div>
                    </div>
                )}
            </div>
        );
    };

    // Render carousel view (used when map is visible)
    const renderCarouselView = () => {
        return (
            <div className={`mx-auto px-1 md:px-3 py-2 dark:bg-gray-900 ${isSplitView ? 'split-view-mode' : ''}`}>
                <div 
                    className={`slider-container mb-2 md:mb-4 px-2 md:px-4 relative mx-auto 
                        ${isSplitView ? 'max-w-full vertical-carousel' : 'max-w-[90%]'} 
                        ${photos.length === 1 ? 'single-image-container' : ''}`} 
                    style={{ 
                        width: '100%',
                        ...(isSplitView ? { 
                            height: '80vh', 
                            overflow: 'hidden',
                            paddingTop: '20px', 
                            paddingBottom: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        } : {})
                    }}
                >
                    <Slider 
                        {...settings} 
                        className={`gallery-slider py-1 md:py-2 
                            ${isSplitView ? 'split-view-slider vertical-slider' : ''} 
                            ${photos.length === 1 ? 'single-image-slider' : ''}`}
                    >
                        {photos?.map((photo, index) => {
                            return (
                                <div 
                                    className={`slide-item px-1 md:px-2 ${isSplitView ? 'py-2 mb-4' : 'mt-1 md:mt-3'}`} 
                                    key={index} 
                                    style={{ width: '100%' }}
                                >
                                    {renderPhotoCard(photo, index)}
                                </div>
                            );
                        })}
                    </Slider>
                </div>
            </div>
        );
    };

    // Render grid view (used when map is hidden)
    const renderGridView = () => {
        const getPhotosPerSlide = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const aspect = width / height;
                if (width <= 640) {
                    if (aspect < 0.8) return 8;
                    if (aspect >= 1.2) return 8;
                }
                if (width <= 1024 && aspect >= 0.8 && aspect < 1.2) {
                    return 12;
                }
                return 15;
            }
            return 15;
        };

        const photosPerSlide = getPhotosPerSlide();
        const photoChunks = [];
        for (let i = 0; i < photos.length; i += photosPerSlide) {
            photoChunks.push(photos.slice(i, i + photosPerSlide));
        }

        const getGridClass = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const aspect = width / height;
                if (width <= 640) {
                    if (aspect < 0.8) return 'grid-2x4';
                    if (aspect >= 1.2) return 'grid-4x2';
                }
                if (width <= 1024 && aspect >= 0.8 && aspect < 1.2) {
                    return 'grid-4x3';
                }
                return 'grid-5x3';
            }
            return 'grid-5x3';
        };
        
        return (
            <div className="mx-auto px-2 md:px-4 py-4 dark:bg-gray-900">
                <div className="grid-container">
                    <Slider {...gridSettings} className="grid-slider">
                        {photoChunks.map((chunk, slideIndex) => (
                            <div key={slideIndex} className="grid-slide">
                                <div className={`grid ${getGridClass()}`}>
                                    {chunk.map((photo, photoIndex) => (
                                        <div key={slideIndex * photosPerSlide + photoIndex} className="photo-grid-item">
                                            {renderPhotoCard(photo, slideIndex * photosPerSlide + photoIndex)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            </div>
        );
    };

    return (
        <>
            {isSplitView
                ? (isMapVisible ? renderCarouselView() : renderGridView())
                : (isMapVisible ? renderCarouselView() : renderGridView())}

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