import { PageProps, TaskPhotos, Photo, SplitViewState } from "@/types";
import {
    memo,
    useState,
    useEffect,
    useCallback,
    PropsWithChildren,
} from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import ButtonMap from "@/Components/Map/ButtonMap";
import TaskGallery from "@/Components/TaskGallery/TaskGallery";
import { Link } from "@inertiajs/react";
import { FaTrash } from "react-icons/fa";
import { router } from "@inertiajs/react";

export function PhotoGallery({ auth, photos, splitMode }: PageProps) {
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<
        Array<TaskPhotos>
    >([]);
    const [photo_, setPhotos] = useState<Array<Photo>>([]);
    const photoIds = [1, 2, 3, 4];

    const [splitView, setSplitView] = useState<SplitViewState>({
        split: splitMode ? true : false,
        single: splitMode ? false : true,
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

    function destroy(ids: string): void {
        if (confirm("Are you sure you want to delete this photo?")) {
            router.delete(route("photo_gallery.destroy", ids), {
                onSuccess: (res) => {
                    set_filter_tasks_photos(
                        filter_tasks_photos.filter(
                            (photo) => !ids.includes(photo.photo.id.toString())
                        )
                    );

                    setPhotos(
                        photo_.filter(
                            (photo) => !ids.includes(photo.id.toString())
                        )
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

    const selectAllPdfHandler = () => {
        const photosIds = photo_
            .filter((photo) => photo.check)
            .map((photo) => photo.id);
        const ids = photosIds.join(",");
        if (ids.length > 0) {
            const queryString = new URLSearchParams({
                selected: 'true',
                ids:ids,
                unassigned:'true',
                total:photos.length.toString()

            }).toString();
            router.get(route("pdf_preview")+'?'+queryString);
        } else {
            confirm("Please select photo to delete !");
        }
    };

    
    const onDeleteHandler = () => {
        const photosIds = photo_
            .filter((photo) => photo.check)
            .map((photo) => photo.id);
        const ids = photosIds.join(",");
        if (ids.length > 0) {
            destroy(ids);
        } else {
            confirm("Please select photo to delete !");
        }
    };

    const LeftPane = () => {
        return (
            <div
                className={`w-full py-2  ${
                    splitView.split ? "md:w-1/2" : ""
                } `}
            >
                {" "}
                <div className="max-w mx-auto sm:px-4 ">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div
                            className={` ${
                                splitView.split
                                    ? "overflow-y-auto h-3/4-screen"
                                    : ""
                            } `}
                        >
                            {" "}
                            <TaskGallery
                                photos={photo_}
                                isUnassigned={true}
                                destroy={destroy}
                                setPhotos={setPhotos}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const RightPane = useCallback(
        ({
            onDeleteHandler,
            selectAllPdfHandler
        }: PropsWithChildren<{
            onDeleteHandler: () => void;
            selectAllPdfHandler: () => void;

        }>) => {
            return (
                <div
                    className={`w-full py-2  ${
                        splitView.split ? "md:w-1/2  " : ""
                    } `}
                >
                    {" "}
                    <div className="max-w mx-auto sm:px-4 ">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                            <ButtonMap
                                data={filter_tasks_photos}
                                zoomFilter={handleZoomFilter}
                                isUnassigned={true}
                            />
                            <div className="flex pt-2 px-2">
                                <div className="flex flex-wrap  items-center  mb-6 gap-y-2 dark:text-gray-300  text-lg font-medium">
                                    <button className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md">
                                        <span>Select All</span>
                                    </button>
                                    <Link
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                        href={""}
                                    >
                                        <span>Cancel Selection</span>
                                    </Link>
                                    <button
                                        className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                        onClick={onDeleteHandler}
                                    >
                                        <FaTrash size={16} className="mr-2" />
                                        <span>Delete Selected</span>
                                    </button>
                                </div>
                                <div className=" items-center  mb-6   gap-2 dark:text-gray-300  text-lg font-medium flex flex-wrap  justify-end">
                                    <button
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                        onClick={() => {
                                            const queryString = new URLSearchParams({
                                                unassigned: 'true',
                                                total:photos.length.toString()
                                            }).toString();
                                            router.get(route("pdf_preview")+'?'+queryString);
                                        }}
                                    >
                                        <span>Export To PDF</span>
                                    </button>
                                    <button
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                        onClick={selectAllPdfHandler}
                                    >
                                        <span>Export Selected To PDF</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        },
        [filter_tasks_photos, splitView.split]
    );

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
                        <RightPane
                            onDeleteHandler={onDeleteHandler}
                            selectAllPdfHandler={selectAllPdfHandler}
                        />
                    </>
                ) : (
                    <>
                        <RightPane
                            onDeleteHandler={onDeleteHandler}
                            selectAllPdfHandler={selectAllPdfHandler}
                        />
                        <LeftPane />
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(PhotoGallery);
