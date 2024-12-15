import { PageProps, Task, TaskPhotos, Photo } from "@/types";
import { memo, useEffect, useState } from "react";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import Table from "@/Components/Table/Table";
import { FaSignOutAlt } from "react-icons/fa";
import { Link } from "@inertiajs/react";
import ButtonMap from "@/Components/Map/ButtonMap";
import TaskGallery from "@/Components/TaskGallery/TaskGallery";

export function Task_({ auth, task, photos }: PageProps) {
    const [photo_, setPhotos] = useState<Array<Photo>>([]);
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<
        Array<TaskPhotos>
    >([]);
    useEffect(() => {
        loadData();
    }, []);

    function loadData() {
        const tasks_photos_array: Array<TaskPhotos> = [];
        for (let item of photos) {
            let tasks_photos_data = {
                ...task,
                farmer_name: `${auth.user.name} ${auth.user.surname}`,
                photo: item,
                location: [item?.lng, item?.lat],
            };
            tasks_photos_array.push(tasks_photos_data);
        }
        set_filter_tasks_photos(tasks_photos_array);
        setPhotos(photos);
    }

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">{`${auth.user.name} ${auth.user.surname} task detail`}</h2>
            }
        >
            <Head title="Task detail" />

            <div className="py-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <Table
                            columns={[
                                {
                                    label: "Status",
                                    name: "status",
                                },
                                {
                                    label: "Purpose",
                                    name: "text_reason",
                                },
                                {
                                    label: "Name",
                                    name: "name",
                                },
                                {
                                    label: "Note",
                                    name: "note",
                                },
                                {
                                    label: "Description",
                                    name: "text",
                                },
                                {
                                    label: "Reopen reason",
                                    name: "text_reason_",
                                },
                                {
                                    label: "Date Created",
                                    name: "date_created",
                                },
                                {
                                    label: "Due date",
                                    name: "task_due_date",
                                },
                                {
                                    label: "Actions",
                                    name: "action",

                                    renderCell: (row: Task) => (
                                        <>
                                            {(row.status === "new" ||
                                                row.status === "open") && (
                                                <Link
                                                    href={""}
                                                    className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                                >
                                                    <FaSignOutAlt />
                                                </Link>
                                            )}
                                        </>
                                    ),
                                },
                            ]}
                            rows={[task]}
                        />
                        <ButtonMap data={filter_tasks_photos} />
                    </div>
                </div>
            </div>
            <div className="pb-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="flex items-center  mb-6 border-gray-200 dark:border-gray-700 p-4 dark:text-gray-300 border-b text-lg font-medium">
                            <button
                                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                onClick={() => {
                                    const queryString = new URLSearchParams({
                                        task:task.id?.toString()!,
                                        total:photos.length.toString()
                                    }).toString();
                                    const pdfUrl = route("pdf_preview")+'?'+queryString; 
                                    window.open(pdfUrl,'_blank');
                                }}
                            >
                                <span>Export To PDF</span>
                            </button>
                            <button
                                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md ml-3"
                                onClick={() => {
       
                                    const photosIds = photo_
                                        .filter((photo) => photo.check)
                                        .map((photo) => photo.id);
                                    const ids = photosIds.join(",");
                                    if (ids.length > 0) {
                                        const queryString = new URLSearchParams({
                                            selected: 'true',
                                            ids:ids,
                                            task:task.id?.toString()!,
                                            total:photos.length.toString()
                                        }).toString();
                                        const eUrl = route("pdf_preview")+'?'+queryString;
                                        window.open(eUrl,'_blank');

                                    } else {
                                        confirm("Please select a photo!");

                                    }
                                }}
                            >
                                <span>Export Selected To PDF</span>
                            </button>
                        </div>
                        <TaskGallery photos={photo_} setPhotos={setPhotos} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(Task_);
