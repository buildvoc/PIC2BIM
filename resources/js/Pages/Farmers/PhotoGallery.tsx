import { PageProps, TaskPhotos,Photo } from "@/types";
import { memo, useState, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import ButtonMap from "@/Components/Map/ButtonMap";
import TaskGallery from "@/Components/TaskGallery/TaskGallery";
import { Link } from "@inertiajs/react";
import { FaTrash } from "react-icons/fa";

export function PhotoGallery({ auth, photos }: PageProps) {
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<
        Array<TaskPhotos>
    >([]);
    const [photo_, setPhotos] = useState<
    Array<Photo>
>([]);
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
        setPhotos(photos)

    }
    const handleZoomFilter = (leaves:String[]|undefined ) => {
        const filteredPhotos = photos.filter((photo) =>
          leaves?.includes(photo.digest)
        );

        setPhotos(filteredPhotos)
      };
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Photo Gallery
                </h2>
            }
        >
            <Head title="Photo gallery" />
            <div className="py-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <ButtonMap data={filter_tasks_photos} zoomFilter={handleZoomFilter} isUnassigned={true} />
                        <div className="flex">
                            <div className="flex  flex-1 items-center  mb-6  p-4 dark:text-gray-300  text-lg font-medium">
                                <Link
                                    className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
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
                            <div className=" items-center  mb-6  p-4 dark:text-gray-300  text-lg font-medium flex flex-1  justify-end">
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
            <div className="pb-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <TaskGallery photos={photo_} isUnassigned={true} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(PhotoGallery);
