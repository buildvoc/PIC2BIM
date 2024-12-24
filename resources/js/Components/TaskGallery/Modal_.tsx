import { useEffect, useState } from "react";
import { FaSync, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { cnvrtImgUrl } from "@/helpers";
import { GalleryModalProps } from "@/types";
import { router } from "@inertiajs/react";

const Modal_ = ({
    modal,
    setModal,
    handleClose,
    photos,
    rotateLeft,
    rotateRight,
}: GalleryModalProps) => {
    // const imageSrc = cnvrtImgUrl(photos[modal.index]?.link);
    const imageSrc = photos[modal.index]?.link;
    const [image, setImage] = useState(imageSrc);

    useEffect(() => {
        setImage(imageSrc);
    }, [imageSrc]);

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-3/4  bg-white dark:bg-gray-800 rounded-md shadow-lg   xl:max-w-2xl  mx-4 md:w-2/4 sm:w-3/4">
                {/* Header */}
                <div className="flex justify-end p-4">
                    <button
                        className=" text-gray-800 dark:text-gray-200 hover:text-gray-400 text-4xl "
                        onClick={handleClose}
                    >
                        <span aria-hidden="true">×</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 justify-center p-4 items-center">
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
                            className="max-w-full max-h-96 object-contain4"
                            style={{
                                transform: `rotate(${
                                    photos[modal.index]?.angle
                                }deg)`,
                            }}
                        />
                    </a>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-4">
                    <button
                        className={`btn btn-primary ${
                            modal.index !== 0 ? "opacity-100" : "opacity-0"
                        }
                     hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md
                        `}
                        onClick={handleImageLeft}
                        disabled={modal.index === 0}
                    >
                        <FaArrowLeft className="" />
                    </button>

                    <div className="flex space-x-4">
                        {rotateLeft && (
                            <div
                                className="cursor-pointer flex items-center space-x-1  text-gray-800 dark:text-gray-200 hover:text-gray-400"
                                onClick={() => {
                                    return rotateLeft(
                                        photos[modal.index].digest,
                                        "left"
                                    );
                                }}
                            >
                                <FaSync />
                                <span>Rotate Left</span>
                            </div>
                        )}

                        {rotateRight && (
                            <div
                                className="cursor-pointer flex items-center space-x-1   text-gray-800 dark:text-gray-200 hover:text-gray-400"
                                onClick={() => {
                                    return rotateRight(
                                        photos[modal.index].digest,
                                        "right"
                                    );
                                }}
                            >
                                <FaSync />
                                <span>Rotate Right</span>
                            </div>
                        )}
                    </div>

                    <button
                        className={`btn btn-primary  ${
                            modal.index < photos.length - 1
                                ? "opacity-100"
                                : "opacity-0"
                        }
                     hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md
                        `}
                        onClick={handleImageRight}
                        disabled={modal.index >= photos.length - 1}
                    >
                        <FaArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal_;
