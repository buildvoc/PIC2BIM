import { PageProps, TaskPhotos, Photo, SplitViewState, Tasks, Task } from "@/types";
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
import { Dialog } from "@headlessui/react";
import PrimaryButton from "@/Components/PrimaryButton";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import BackButton from "@/Components/BackButton";
import Filter from "@/Components/PhotoGallery/Filter";
import Pagination from "@/Components/Pagination/Pagination";

export function PhotoGallery({ auth, photos, splitMode, paginatedPhotos }: PageProps) {
    console.log(paginatedPhotos,"paginatedPhotos")
    const [isMapVisible, setIsMapVisible] = useState(true);
    const [selectedTask, setSelectedTask] = useState("");     
    const [photosIds, setPhotosIds] = useState("");    
   
    const [unassignedTasks, setUnassignedTasks] = useState<Array<Task>>([]);

    const [isChooseTaskPopupOpen, setIsChooseTaskPopupOpen] = useState(false);
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

    useEffect(() => {
        console.log("Photo: " , isMapVisible)
    }, [isMapVisible]);

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

    function setMapVisibility(){
        let mapVisibility = isMapVisible;
        setIsMapVisible(!mapVisibility);
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
                ids: ids,
                unassigned: 'true',
                total: photos.length.toString()

            }).toString();
            let url = route("pdf_preview") + '?' + queryString;
            window.open(url,'_blank');
        } else {
            confirm("Please select photo!");
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

    const chooseTask = async () => {
        const photosIds = photo_
            .filter((photo) => photo.check)
            .map((photo) => photo.id);
        const ids = photosIds.join(",");
        setPhotosIds(ids);
        if (ids.length > 0) {
            const response = await axios.get(route('get-unassigned-task'));
            const taskData = response.data;
            setUnassignedTasks(taskData);
            setIsChooseTaskPopupOpen(true);
        } else {
            alert("No photo selected!");
        }
    };

    const assignTask = () => {
        if(selectedTask == '') {
            alert('Please select a task');
            return;
        }

        router.post(route('assign-task'),{
            photo_ids : photosIds,
            task_id : selectedTask
        }, {    
            onSuccess: () => {
                const deselectIds = photosIds.split(",");
                set_filter_tasks_photos(
                    filter_tasks_photos.filter(
                        (photo) => !deselectIds.includes(photo.photo.id.toString())
                    )
                );

                setPhotos(
                    photo_.filter(
                        (photo) => !deselectIds.includes(photo.id.toString())
                    )
                );
                setIsChooseTaskPopupOpen(false);
            },
            onError: (errors) => {
                console.error("Error:", errors);
                alert("Failed to assign task. Please try again.");
            }
        });
    };

    
    const selectAll = () => {
        const allPhotos = photo_;
        const withCheckUpdate = allPhotos.map((photo) => {
            let check = !photo.hasOwnProperty("check")
                ? true
                : !photo?.check;
            return { ...photo, check: check };
        });
        setPhotos(withCheckUpdate);
    };

    const exportToPdf = () => {
        const queryString = new URLSearchParams({
            unassigned: 'true',
            total: photos.length.toString()
        }).toString();
        const exportUrl = route("pdf_preview") + '?' + queryString;
        window.open(exportUrl,'_blank')
    }


    const LeftPane = useCallback (({
        photo_,
        destroy,
        setPhotos
    }:PropsWithChildren<{
    photo_: Photo[];
    destroy: (ids: string)=>void;
    setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
    }>) => {
        return (
            <div
                className={`w-full py-2  ${splitView.split ? "md:w-[20%]" : ""
                    } `}
            >
                {" "}
                <div className="max-w mx-auto sm:px-4 ">
                    <div className="overflow-hidden sm:rounded-lg">
                        <div
                            className={` ${splitView.split
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
                            <Pagination pagination={paginatedPhotos}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    },[splitView.split]);


    const RightPane = useCallback(
        ({
            onDeleteHandler,
            selectAllPdfHandler,
            chooseTask
        }: PropsWithChildren<{
            onDeleteHandler: () => void;
            selectAllPdfHandler: () => void;
            chooseTask: () => void;

        }>) => {
            return (
                <div
                    className={`w-full py-2 m-auto  ${splitView.split ? "md:w-[80%]  " : ""
                        } `}
                >
                    {" "}
                    <div className="max-w mx-auto">
                        <div className="overflow-hidden sm:rounded-lg">
                            <ButtonMap
                                data={filter_tasks_photos}
                                zoomFilter={handleZoomFilter}
                                isUnassigned={true}
                                isMapVisible={isMapVisible}
                                setIsMapVisible={setMapVisibility}
                                splitView={splitView.split}
                            />
                            {/* <div className="flex pt-2 px-2">
                                <div className="flex flex-wrap  items-center my-2 gap-y-2 dark:text-gray-300  text-lg font-medium">
                                    <button className="focus:outline-none  flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md mr-3"
                                        onClick={selectAll}
                                    >
                                        <span>Select All</span>
                                    </button>
                                    <Link
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md mr-3"
                                        href={""}
                                    >
                                        <span>Cancel Selection</span>
                                    </Link>
                                    <button
                                        className="focus:outline-none  flex items-center border border-red-600 text-red-600 dark:text-red-400 px-4 py-2 rounded-md mr-3"
                                        onClick={onDeleteHandler}
                                    >
                                        <FaTrash size={16} className="mr-2" />
                                        <span>Delete Selected</span>
                                    </button>
                                    <button
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md mr-3"
                                        onClick={chooseTask}
                                    >
                                        <span>Choose Task</span>
                                    </button>
                                    <button
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md mr-3"
                                        onClick={() => {
                                            const queryString = new URLSearchParams({
                                                unassigned: 'true',
                                                total: photos.length.toString()
                                            }).toString();
                                            const exportUrl = route("pdf_preview") + '?' + queryString;
                                            window.open(exportUrl,'_blank')
                                        }}
                                    >
                                        <span>Export To PDF</span>
                                    </button>
                                    <button
                                        className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md mr-3"
                                        onClick={selectAllPdfHandler}
                                    >
                                        <span>Export Selected To PDF</span>
                                    </button>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            );
        },
        [filter_tasks_photos, splitView.split, isMapVisible]
    );

    const ChooseTaskPopup = () => {
        return (
            <Dialog
                open={isChooseTaskPopupOpen}
                onClose={() => setIsChooseTaskPopupOpen(false)}
                className="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
                    <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                        <Dialog.Title className="flex justify-between text-lg font-bold text-center sm:text-left">
                            <div>Choose Task</div>
                            <FontAwesomeIcon icon={faClose} onClick={() => setIsChooseTaskPopupOpen(false)} className="text-gray cursor-pointer" />
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm">
                            <select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 w-full text-gray-700 dark:focus:border-indigo-600 dark:focus:ring-indigo-600">
                                <option value="" selected disabled>--Select a task--</option>
                                {unassignedTasks.map((task:Task) => (
                                    <option key={task.id} value={task.id}>
                                        {task.name}
                                    </option>
                                ))}
                            </select>
                        </Dialog.Description>

                        <div className="flex justify-center my-4">
                            <PrimaryButton onClick={() => assignTask()}>
                                Assign Task
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            </Dialog>
        );
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            
            setSplitView={setSplitView}
            splitView={splitView}
        >
            <Head title="Photo gallery" />
            <Filter isMapVisible={isMapVisible} setIsMapVisible={setMapVisibility} exportToPdf={exportToPdf} selectAll={selectAll} onDeleteHandler={onDeleteHandler} selectAllPdfHandler={selectAllPdfHandler} chooseTask={chooseTask} />
            {/* <BackButton label="Back" className="" /> */}
            <div className="flex flex-wrap ">
                {splitView.split ? (
                    <>
                        <LeftPane 
                        photo_={photo_}
                        destroy={destroy}
                        setPhotos={setPhotos}

                        />
                        <RightPane
                            onDeleteHandler={onDeleteHandler}
                            selectAllPdfHandler={selectAllPdfHandler}
                            chooseTask={chooseTask}
                        />
                    </>
                ) : (
                    <>
                        <RightPane
                            onDeleteHandler={onDeleteHandler}
                            selectAllPdfHandler={selectAllPdfHandler}
                            chooseTask={chooseTask}
                        />
                        <LeftPane
                            photo_={photo_}
                            destroy={destroy}
                            setPhotos={setPhotos}
                        />
                    </>
                )}
            </div>
            <ChooseTaskPopup />
        </AuthenticatedLayout>
    );
}
export default memo(PhotoGallery);
