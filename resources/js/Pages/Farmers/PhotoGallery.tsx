import { PageProps, TaskPhotos, Photo,SplitViewState } from "@/types";
import { memo, useState, useEffect,useCallback } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import ButtonMap from "@/Components/Map/ButtonMap";
import TaskGallery from "@/Components/TaskGallery/TaskGallery";
import { Link } from "@inertiajs/react";
import { FaTrash } from "react-icons/fa";
import { router } from "@inertiajs/react";

export function PhotoGallery({ auth, photos }: PageProps) {
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<
        Array<TaskPhotos>
    >([]);
    const [photo_, setPhotos] = useState<Array<Photo>>([]);
    const [splitView, setSplitView] = useState<SplitViewState>({
        split: true,
        single: false,
    });
    useEffect(() => {
        loadData();
    }, []);
    function loadData() {
        const tasks_photos_array: Array<TaskPhotos> = [];
        for (let item of photos) {
            let tasks_photos_data = {
                farmer_name: `${auth.user.name} ${auth.user.surname}`,
                photo: item,
                location: [item?.lng, item?.lat],
            };
            tasks_photos_array.push(tasks_photos_data);
        }
        set_filter_tasks_photos(tasks_photos_array);
        setPhotos(photos);
    }

    function destroy(id: number | string): void {
        if (confirm("Are you sure you want to delete this photo?")) {
            router.delete(route("photo_gallery.destroy", id), {
                onSuccess: () => {
                    set_filter_tasks_photos(
                        filter_tasks_photos.filter((photo) => {
                            if (photo.photo.id !== id) {
                                return photo;
                            }
                        })
                    );
                    setPhotos(
                        photo_.filter((photo) => {
                            if (photo.id !== id) {
                                return photo;
                            }
                        })
                    );
                },
            });
        }
    }

    const handleZoomFilter = (leaves: String[] | undefined) => {
        const filteredPhotos = photos.filter((photo) =>
            leaves?.includes(photo.digest)
        );

        setPhotos(filteredPhotos);
    };

    const LeftPane = () => {
        return (
            <div
            className={`w-full py-12  ${
                splitView.split ? "md:w-1/2" : ""
            } `}
        >                    <div className="max-w mx-auto sm:px-4 ">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                    <div
                        className={` ${
                            splitView.split ? "overflow-y-auto h-3/4-screen" : ""
                        } `}
                    >                                <TaskGallery
                                photos={photo_}
                                isUnassigned={true}
                                destroy={destroy}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const RightPane = useCallback(() => {
        return (

            <div
            className={`w-full py-12  ${
                splitView.split ? "md:w-1/2  " : ""
            } `}
        >                    <div className="max-w mx-auto sm:px-4 ">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <ButtonMap
                            data={filter_tasks_photos}
                            zoomFilter={handleZoomFilter}
                            isUnassigned={true}
                        />
                        <div className="flex pt-2 px-2">
                            <div className="flex flex-wrap  items-center  mb-6 gap-y-2 dark:text-gray-300  text-lg font-medium">
                                <Link
                                    className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                    href={""}
                                >
                                    <span>Select All</span>
                                </Link>
                                <Link
                                    className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                    href={""}
                                >
                                    <span>Cancel Selection</span>
                                </Link>
                                <Link
                                    className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                    href={""}
                                >
                                    <FaTrash size={16} className="mr-2" />
                                    <span>Delete Selected</span>
                                </Link>
                            </div>
                            <div className=" items-center  mb-6   gap-2 dark:text-gray-300  text-lg font-medium flex flex-wrap  justify-end">
                                <Link
                                    className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                    href={""}
                                >
                                    <span>Export To PDF</span>
                                </Link>
                                <Link
                                    className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                    href={""}
                                >
                                    <span>Export Selected To PDF</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }, [filter_tasks_photos,splitView.split]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Photo Gallery
                </h2>
            }
            setSplitView={setSplitView}
            splitView={splitView}
        >
            <Head title="Photo gallery" />
            <div className="flex flex-wrap ">
            {splitView.split ? (
                    <>
                        <LeftPane />
                        <RightPane />
                    </>
                ) : (
                    <>
                        <RightPane />
                        <LeftPane />
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(PhotoGallery);
