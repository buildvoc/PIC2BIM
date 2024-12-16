import { PageProps, Task, TaskPhotos, Photo, Tasks } from "@/types";
import { memo, useEffect, useState } from "react";

import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Table from "@/Components/Table/Table";
import { FaSignOutAlt } from "react-icons/fa";
import { Link } from "@inertiajs/react";
import ButtonMap from "@/Components/Map/ButtonMap";
import TaskGallery from "@/Components/TaskGallery/TaskGallery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faReply, faSignOutAlt, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";

interface Tsk {
    id: number;
    status: string;
    photo_taken: number;
    verified: string;
    name: string;
    text: string;
    date_created: string;
    task_due_date: string;
    flag_id: number;
    note: string;
    text_returned: string;
    purpose: string;
    created_id: number;
}

export function Task_({ auth, photos }: PageProps) {
    const { task, user, errors } = usePage<{
        task: Tsk;
        errors: string[]
    }>().props;
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

    const deleteTask = (id: number) => {
        if (confirm('Delete task?')) {
            router.delete(route('tasks.destroy', id));
        }
    }

    const moveFromOpenTask = (task: Tsk) => {
        const textNote = prompt('Change status to "Data provided"?', task.note);
        if (textNote && textNote.length > 0) {
            router.post(route('task.moveOpen', task.id), { note: textNote });
        }
    }
    const acceptTask = (task: Tsk) => {
        if (confirm('Accept task?')) {
            router.post(route('tasks.bulkAccept', task.id), { tasks: [task.id] }, {
                onSuccess: ((res) => {
                }),
                onError: ((err) => {
                    console.log(err);
                })
            })
        }
    }

    const declineTask = (task: Tsk) => {
        const textNote = prompt('Decline task? Enter reason of decline, please.', "");
        if (textNote && textNote.length > 0) {
            router.post(route('tasks.decline'), { id: task.id, reason: textNote })
        }
    }

    const returnTask = (task: Tsk) => {
        const textNote = prompt('Return task to farmer? Enter reason of reopening, please..', "");
        if (textNote && textNote.length > 0) {
            router.post(route('tasks.return'), { id: task.id, reason: textNote }, {
                onSuccess: ((res) => {
                    console.log(res);
                }),
                onError: ((err) => {
                    console.log(err);
                })
            })
        }
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
                                    renderCell: row => (
                                        <>
                                            <button
                                                className={`w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none
                                                ${row.status === 'new' ? 'bg-yellow-500 dark:text-white' :
                                                        row.status === 'open' ? 'bg-blue-500 dark:text-white' :
                                                            row.status === 'data checked' && row.flag_id === 2 ? 'bg-red-500 dark:text-white' :
                                                                row.status === 'data checked' ? 'bg-green-500 dark:text-white' :
                                                                    row.status === 'returned' ? 'bg-purple-500 dark:text-white' :
                                                                        'bg-gray-200 text-gray-800'}`}
                                                type='button'
                                            >
                                                {row.status}
                                            </button>
                                        </>
                                    )
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
                                    renderCell: row => (
                                        <>
                                            {(
                                                <>
                                                    {task.flag_id === 1 && (
                                                        <div className="mr-2 btn bg-green-500 dark:text-white px-4 py-2 rounded hover:bg-green-600">Accepted</div>
                                                    )}
                                                    {task.flag_id === 2 && (
                                                        <div className="mr-2 btn bg-red-500 dark:text-white px-4 py-2 rounded hover:bg-red-600">Declined</div>
                                                    )}
                                                    {task.status === 'new' && task.created_id == auth.user.id && (
                                                        <button
                                                            className="mr-2 btn bg-red-500 dark:text-white px-4 py-2 rounded hover:bg-red-600 js_delete tt"
                                                            title="Delete"
                                                            type='button'
                                                            onClick={() => deleteTask(task.id)}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {task.status === 'new' && (
                                                <button
                                                    className="mr-2 btn bg-green-500 dark:text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                                    title="Move to Data provided"
                                                    type='button'
                                                    onClick={() => moveFromOpenTask(task)}
                                                >
                                                    <FontAwesomeIcon icon={faSignOutAlt} />
                                                </button>
                                            )}
                                            {task.status === 'open' && (
                                                <button
                                                    className="mr-2 btn bg-green-500 dark:text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                                    title="Move to Data provided"
                                                    type='button'
                                                    onClick={() => moveFromOpenTask(task)}
                                                >
                                                    <FontAwesomeIcon icon={faSignOutAlt} />
                                                </button>
                                            )}
                                            {task.status === 'returned' && (
                                                <button
                                                    className="mr-2 btn bg-green-500 dark:text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt"
                                                    title="Move to Data provided"
                                                    type='button'
                                                    onClick={() => moveFromOpenTask(task)}
                                                >
                                                    <FontAwesomeIcon icon={faSignOutAlt} />
                                                </button>
                                            )}
                                        </>
                                    )
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
                                        task: task.id?.toString()!,
                                        total: photos.length.toString()
                                    }).toString();
                                    const pdfUrl = route("pdf_preview") + '?' + queryString;
                                    window.open(pdfUrl, '_blank');
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
                                            ids: ids,
                                            task: task.id?.toString()!,
                                            total: photos.length.toString()
                                        }).toString();
                                        const eUrl = route("pdf_preview") + '?' + queryString;
                                        window.open(eUrl, '_blank');

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
