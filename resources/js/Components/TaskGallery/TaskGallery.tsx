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

    // Add CSS styles for single image mode
    const singleImageStyles = photos.length === 1 ? {
        maxWidth: '300px',
        maxHeight: '300px',
        minWidth: '200px',
        minHeight: '200px',
        margin: '0 auto'
    } : {};

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
        slidesToShow: Math.min(photos.length, isSplitView ? 2 : 4),
        slidesToScroll: 1,
        nextArrow: <NextArrow />,
        prevArrow: <PrevArrow />,
        responsive: [
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: Math.min(photos.length, isSplitView ? 1 : 3),
                    slidesToScroll: 1,
                    dots: true
                }
            },
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: Math.min(photos.length, isSplitView ? 1 : 2),
                    slidesToScroll: 1,
                    dots: true
                }
            },
            {
                breakpoint: 640,
                settings: {
                    slidesToShow: Math.min(photos.length, 1),
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
            <div className={`photo-gallery-card-view`}>
                {" "}
                <div className={`photo-gallery-card-view-container`}>
                    <div className={`photo-gallery-cards`}>
                        {photos?.map((photo, index) => {
                            const imageSrc = photo?.link ? photo.link : '/images/dummy-image.jpg';
                            return (
                                <div className={`photo-card-item`} key={index}>
                                    <div className={`photo-card-item-container`} 
                                        onClick={() => {
                                            setShowModal({
                                                isShow: true,
                                                index: index, 
                                            });
                                        }}
                                    >
                                        <div className={`photo-card-item-image`}>
                                            <img alt={`Image name`} className={`w-auto block`} src={imageSrc}
                                                onError={(e) => {
                                                    e.currentTarget.src = '/images/dummy-image.jpg';
                                                    e.currentTarget.onerror = null;
                                                }}
                                                style={{
                                                        transform: `rotate(${photo?.angle}deg)`
                                                    }}
                                                    
                                            />
                                        </div>
                                        <div className={`photo-card-item-mask ${photo.check ? 'item-selected' : ''}`}>
                                            <div className={`photo-card-item-mask-badge`}>
                                                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M18.125 9.25C18.125 10.5508 17.457 11.6758 16.4727 12.3086C16.7188 13.4688 16.3672 14.7344 15.4883 15.6133C14.5742 16.5273 13.3086 16.8789 12.1484 16.6328C11.5156 17.6172 10.3906 18.25 9.125 18.25C7.82422 18.25 6.69922 17.6172 6.06641 16.6328C4.90625 16.8789 3.64062 16.5273 2.76172 15.6133C1.84766 14.7344 1.49609 13.4688 1.74219 12.3086C0.757812 11.6758 0.125 10.5508 0.125 9.25C0.125 7.98438 0.757812 6.85938 1.74219 6.22656C1.49609 5.06641 1.84766 3.80078 2.76172 2.88672C3.64062 2.00781 4.90625 1.65625 6.06641 1.90234C6.69922 0.917969 7.82422 0.25 9.125 0.25C10.3906 0.25 11.5156 0.917969 12.1484 1.90234C13.3086 1.65625 14.5742 2.00781 15.4883 2.88672C16.3672 3.80078 16.7188 5.06641 16.4727 6.22656C17.457 6.85938 18.125 7.98438 18.125 9.25ZM12.5352 7.87891C12.8516 7.5625 12.8516 7.03516 12.5352 6.71875C12.1836 6.36719 11.6562 6.36719 11.3398 6.71875L8 10.0586L6.91016 8.96875C6.55859 8.61719 6.03125 8.61719 5.71484 8.96875C5.36328 9.28516 5.36328 9.8125 5.71484 10.1289L7.40234 11.8164C7.54297 11.9922 7.78906 12.0625 8 12.0625C8.21094 12.0625 8.42188 11.9922 8.59766 11.8164L12.5352 7.87891Z" fill="#32ADE6"/>
                                                </svg>
                                            </div>
                                            <div className={`photo-card-item-mask-container`}>
                                                {isUnassigned && (
                                                    <FaTrash
                                                        className="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer transition-colors text-base text-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            destroy!([photo.id].join(","));
                                                        }}
                                                        title="Delete photo"
                                                    />
                                                )}
                                                <FaSync
                                                    className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-base text-sm"
                                                    style={{ transform: "scaleX(-1)" }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRotate(photo.digest, "left");
                                                    }}
                                                    title="Rotate left"
                                                />
                                                <FaSync
                                                    className="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 cursor-pointer transition-colors text-base text-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRotate(photo.digest, "right");
                                                    }}
                                                    title="Rotate right"
                                                />
                                                <button type={`button`} 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePhotoCheckBox(photo?.digest);
                                                    }}
                                                >
                                                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12.6875 2.71484L5.6875 9.71484C5.46875 9.93359 5.19531 10.043 4.92188 10.043C4.64844 10.043 4.34766 9.93359 4.15625 9.71484L0.65625 6.21484C0.21875 5.77734 0.21875 5.09375 0.65625 4.65625C1.06641 4.24609 1.75 4.24609 2.1875 4.65625L4.92188 7.39062L11.1562 1.15625C11.5664 0.746094 12.25 0.746094 12.6875 1.15625C13.125 1.59375 13.125 2.27734 12.6875 2.71484Z" fill="#4B5563"/>
                                                    </svg>
                                                </button>
                                                <button type={`button`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        localStorage.setItem("map_from_photo_detail", "true");
                                                        router.get(route("photo_detail", photo.id));
                                                    }}
                                                >
                                                    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M15.6406 6.28516C15.6953 6.42188 15.75 6.64062 15.75 6.75C15.75 6.88672 15.6953 7.10547 15.6406 7.24219C14.1641 10.6055 11.2109 12.875 7.875 12.875C4.51172 12.875 1.55859 10.6055 0.0820312 7.24219C0.0273438 7.10547 0 6.88672 0 6.75C0 6.64062 0.0273438 6.42188 0.0820312 6.28516C1.55859 2.92188 4.51172 0.625 7.875 0.625C11.2109 0.625 14.1641 2.92188 15.6406 6.28516ZM11.8125 6.77734V6.75C11.8125 4.58984 10.0352 2.8125 7.875 2.8125C5.6875 2.8125 3.9375 4.58984 3.9375 6.75C3.9375 8.9375 5.6875 10.6875 7.875 10.6875C10.0352 10.6875 11.8125 8.9375 11.8125 6.77734ZM7.875 4.125C9.29688 4.125 10.5 5.32812 10.5 6.75C10.5 8.19922 9.29688 9.375 7.875 9.375C6.42578 9.375 5.25 8.19922 5.25 6.75C5.25 6.69531 5.25 6.61328 5.25 6.53125C5.49609 6.66797 5.79688 6.75 6.125 6.75C7.08203 6.75 7.875 5.98438 7.875 5C7.875 4.69922 7.76562 4.42578 7.62891 4.15234C7.71094 4.15234 7.79297 4.15234 7.84766 4.125H7.875Z" fill="#4B5563"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                    </div>
                </div>
            </div>
            {/* <div className={`mx-auto px-3 py-6 dark:bg-gray-900 ${isSplitView ? 'split-view-mode' : ''}`}>
                <div className={`slider-container mb-4 px-4 relative mx-auto ${isSplitView ? 'max-w-full' : 'max-w-[90%]'} ${photos.length === 1 ? 'single-image-container' : ''}`}>
                    <Slider {...settings} className={`gallery-slider py-2 ${isSplitView ? 'split-view-slider' : ''} ${photos.length === 1 ? 'single-image-slider' : ''}`}>
                        {photos?.map((photo, index) => {
                            const imageSrc = photo?.link ? photo.link : '/images/dummy-image.jpg';
                            return (
                                <div className="slide-item px-2 mt-3" key={index}>
                                    <div 
                                        className={`bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden p-3 mx-2 h-full group ${
                                            photo.check ? 'ring-2 ring-blue-500' : ''
                                        } ${isSplitView ? 'split-view-item' : ''} ${photos.length === 1 ? 'single-image-item' : ''}`}
                                        style={photos.length === 1 ? singleImageStyles : {}}
                                    >
                                        
                                        <div className="relative">
                                            <div 
                                                className={`w-full aspect-square relative overflow-hidden rounded-xl sm:rounded-2xl bg-gray-100 dark:bg-gray-700 ${isSplitView ? 'split-view-image-container' : ''} ${photos.length === 1 ? 'single-image-container' : ''}`}
                                                style={photos.length === 1 ? { maxWidth: '300px', maxHeight: '300px', minWidth: '200px', minHeight: '200px' } : {}}
                                            >
                                                <img
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.src = '/images/dummy-image.jpg';
                                                        e.currentTarget.onerror = null;
                                                    }}
                                                    src={imageSrc}
                                                    className={`absolute inset-0 w-full h-full object-contain hover:opacity-90 transition-opacity cursor-pointer dark:opacity-90 ${isSplitView ? 'split-view-image' : ''} ${photos.length === 1 ? 'single-image' : ''}`}
                                                    style={{
                                                        transform: `rotate(${photo?.angle}deg)`,
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
            </div> */}

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
