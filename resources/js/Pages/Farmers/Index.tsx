import { PageProps } from "@/types";
import { memo, useEffect, useState, useRef, useLayoutEffect } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import TextInput from "@/Components/Form/TextInput";
import { FaSearch } from "react-icons/fa";
import Checkbox from "@/Components/Checkbox";
import { FaTimesCircle } from "react-icons/fa";
import Table from "@/Components/Table/Table";
import { FormEventHandler } from "react";
import { FILTERS_DATA } from "@/Constants/Constants";
import { TaskPhotos, Task,PaginatedData, Tasks } from "@/types";
import ButtonMap from "@/Components/Map/ButtonMap";
export function Index({ auth }: PageProps) {

    const { tasks,sortColumn ,sortOrder,search,user,selectedStatuses,errors,filtersVal  } = usePage<{
        tasks: PaginatedData<Tasks>;
        sortColumn : string;
        sortOrder : 'asc' | 'desc';
        search : string;
        selectedStatuses : string[],
        errors : string[],
        filtersVal : string[]
      }>().props;
      const {
        data,
        total,
        links
      } = tasks;
    function handleSort(column : string, order : 'asc' | 'desc'){
        applyFilters({search : search, sortColumn : column , sortOrder : order});
    }
    const tasks_array: Array<Task> = [];
    const tasks_photos_array: Array<TaskPhotos> = [];
    const previousTasksRef = useRef<any>([]);


    console.log(tasks.data,"TASKS");
    for (let task of tasks.data) {
        let tasks_data: Task = {
            id: task?.id,
            status: task?.status,
            photo_taken: task?.photo_taken,
            name: task?.name,
            text: task?.text,
            date_created: task.date_created,
            task_due_date: task.task_due_date,
            flag_valid: task.flag_valid,
        };
        if (task.photos.length > 0) {
            let tasks_photos_data = {
                ...tasks_data,
                farmer_name: `${auth.user.name} ${auth.user.surname}`,
                photo: task.photos[0],
                location: [task.photos[0]?.lng, task.photos[0]?.lat],
            };
            tasks_photos_array.push(tasks_photos_data);
        }

        tasks_array.push(tasks_data);
    }
    const tasks_ = tasks_array;
    const tasksPhotos = tasks_photos_array;

    const [filter_tasks, set_filter_tasks] = useState<Array<Task>>([]);
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<
        Array<TaskPhotos>
    >([]);

    const [selectedFilters, setSelectedFilters] = useState(() => {
        try {
            const savedFilters = localStorage?.getItem("selectedFilters");
            return savedFilters ? JSON.parse(savedFilters) : {};
        } catch (e) {
            return null;
        }
    });

    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: "asc",
    });

    // useEffect(() => {
    //     set_filter_tasks(tasks_);
    //     set_filter_tasks(tasksPhotos);
    // }, []);

    // useEffect(() => {
    //     if (!Object.keys(selectedFilters).length) {
    //         let filters_json = {};
    //         for (let item of FILTERS_DATA) {
    //             filters_json = { ...filters_json, [item]: true };
    //         }
    //         setSelectedFilters(filters_json);
    //     }
    //     applyFilters(false);
    // }, [tasks]);

    // useEffect(() => {
    //     previousTasksRef.current = filter_tasks_photos;
    //     update_map_source(filter_tasks);
    // }, [filter_tasks]);

    const update_map_source = async (filter_data: Array<Task>) => {
        const task_1 = new Set(filter_data.map((task: any) => task.id));

        const task_2 = new Set(tasksPhotos.map((task: any) => task.id));

        const common_id = [...task_1].filter((id) => task_2.has(id));
        const filter_tasks_photos = tasksPhotos.filter((task: any) =>
            common_id.includes(task.id)
        );

        if (!areTasksEqual(previousTasksRef.current, filter_tasks_photos)) {
            set_filter_tasks_photos(filter_tasks_photos);
        }
    };

    const areTasksEqual = (
        prevTasks: Array<Task>,
        nextTasks: Array<Task>
    ): boolean => {
        if (prevTasks.length !== nextTasks.length) {
            return false;
        }
        return prevTasks.every(
            (task: Task, index) => task === nextTasks[index]
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name: any = formData.get("name");
        if (name.length > 0) {
            const filtered = filter_tasks.filter((task: any) =>
                task.name.toLowerCase().includes(name.toLowerCase())
            );
            set_filter_tasks(filtered);
        } else {
            applyFilters(true);
        }
    };

    async function applyFilters(params : {search : string;sortColumn : string;sortOrder : string}){
        const queryString = new URLSearchParams({
          search: params.search || '',
          sortColumn: params.sortColumn || '',
          sortOrder: params.sortOrder || '',
        }).toString();
        router.get(route('user_task.index')+'?'+queryString);
      }
    // const applyFilters = (force_filter: any) => {
    //     if (tasks_.length == 0 || force_filter) {
    //         var data: any = [];

    //         for (const key in selectedFilters) {
    //             switch (key) {
    //                 case "new":
    //                     if (selectedFilters["new"]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.status === key
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 case "open":
    //                     if (selectedFilters["open"]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.status === key
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 case "data provided":
    //                     if (selectedFilters["data provided"]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.status === key
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 case "returned":
    //                     if (selectedFilters["returned"]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.status === key
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 case "accepted":
    //                     if (selectedFilters[key]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.flag_valid === "1"
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 case "declined":
    //                     if (selectedFilters[key]) {
    //                         data = [
    //                             ...data,
    //                             ...tasks_?.filter(
    //                                 (task: any) => task.flag_valid === "2"
    //                             ),
    //                         ];
    //                     }
    //                     break;
    //                 default:
    //                     break;
    //             }
    //         }
    //         set_filter_tasks(data);
    //     }
    // };

    const handleCheckboxChange = (event: any) => {
        const { dataset, checked } = event.target;
        const { fieldtype } = dataset;
        const newFilters = { ...selectedFilters, [fieldtype]: checked };
        setSelectedFilters(newFilters);
        localStorage.setItem("selectedFilters", JSON.stringify(newFilters));

        if (checked) {
            fieldtype == "after deadline"
                ? sortData("reset")
                : fieldtype == "accepted"
                ? set_filter_tasks([
                      ...filter_tasks,
                      ...tasks_?.filter((task: any) => task.flag_valid === "1"),
                  ])
                : fieldtype == "declined"
                ? set_filter_tasks([
                      ...filter_tasks,
                      ...tasks_?.filter((task: any) => task.flag_valid === "2"),
                  ])
                : set_filter_tasks([
                      ...filter_tasks,
                      ...tasks_?.filter(
                          (task: any) => task.status === fieldtype
                      ),
                  ]);
        } else {
            fieldtype == "after deadline"
                ? sortData("status")
                : fieldtype == "accepted"
                ? set_filter_tasks(
                      filter_tasks?.filter(
                          (task: any) => task.flag_valid !== "1"
                      )
                  )
                : fieldtype == "declined"
                ? filter_tasks?.filter((task: any) => task.flag_valid !== "2")
                : set_filter_tasks(
                      filter_tasks?.filter(
                          (task: any) => task.status !== fieldtype
                      )
                  );
        }
    };

    const sortData = (key: any) => {
        let direction = "asc";
        if (key != "reset") {
            if (
                (sortConfig.key === key && sortConfig.direction === "asc") ||
                sortConfig.key == null
            ) {
                direction = "desc";
            }

            const sortedByName = [...filter_tasks].sort((a: any, b: any) => {
                if (direction == "asc") {
                    switch (key) {
                        case "status":
                            if (a.status < b.status) return -1;
                            if (a.status > b.status) return 1;
                            break;
                        case "photos taken":
                            if (a.number_of_photos < b.number_of_photos)
                                return -1;
                            if (a.number_of_photos > b.number_of_photos)
                                return 1;
                            break;
                        case "name":
                            if (a.name < b.name) return -1;
                            if (a.name > b.name) return 1;
                            break;
                        case "description":
                            if (a.text < b.text) return -1;
                            if (a.text > b.text) return 1;
                            break;
                        case "date created":
                            if (a.date_created < b.date_created) return -1;
                            if (a.date_created > b.date_created) return 1;
                            break;
                        case "due date":
                            if (a.task_due_date < b.task_due_date) return -1;
                            if (a.task_due_date > b.task_due_date) return 1;
                            break;
                        case "acception":
                            if (a.flag_valid < b.flag_valid) return -1;
                            if (a.flag_valid > b.flag_valid) return 1;
                            break;
                        case "reset":
                            if (a.status < b.status) return -1;
                            if (a.status > b.status) return 1;
                            break;
                        default:
                            return 1;
                    }
                }
                return -1;
            });
            set_filter_tasks(sortedByName);
            setSortConfig({ key, direction });
        } else {
            const sortedByName = [...filter_tasks].sort((a, b) => {
                if (a.status! < b.status!) {
                    return -1;
                }
                return 0;
            });
            key = "status";
            set_filter_tasks(sortedByName);
            setSortConfig({ key, direction });
        }
    };

    const handle_toggle_task_details = (taskId: number) => {
        router.get(route("task",taskId));
      };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Tasks
                </h2>
            }
        >
            <Head title="Task list" />
            <div className="flex flex-wrap ">
                <div className="w-full md:w-1/2  py-12">
                    <div className="max-w mx-auto sm:px-4 ">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg ">
                            {/* <button
                                onClick={() => {
                                    sortData("reset");
                                }}
                                className="flex gap-3 py-5 pl-5 items-center text-white  dark:border-gray-700"
                            >
                                <span>
                                    <FaTimesCircle size={18} />
                                </span>
                                CANCEL SORTING
                            </button>
                            <div className="flex items-center justify-center mb-6 w-full border-gray-200 dark:border-gray-700 p-4 border-t text-gray-700 dark:text-gray-300 border-b text-lg font-medium">
                                {`Showing ${filter_tasks.length} out of ${tasks_.length}`}
                            </div> */}
                            <div className="overflow-y-auto  h-3/4-screen mt-4">
                                <Table
                                    sortColumn={sortColumn}
                                    sortOrder={sortOrder}
                                    onSort={handleSort}
                                    columns={[
                                        {
                                            label: "Status",
                                            name: "status",
                                            sorting : true
                                        },
                                        {
                                            label: "Photos taken",
                                            name: "photo_taken",
                                            sorting : true
                                        },
                                        {
                                            label: "Name",
                                            name: "name",
                                            sorting : true
                                        },
                                        {
                                            label: "Description",
                                            name: "text",
                                            sorting : true
                                        },
                                        {
                                            label: "Date Created",
                                            name: "date_created",
                                            sorting : true
                                        },
                                        {
                                            label: "Due date",
                                            name: "task_due_date",
                                            sorting : true
                                        },
                                        {
                                            label: "Acception",
                                            name: "acception",
                                            sorting : true,
                                            renderCell: (row: Task) => (
                                                <>
                                                    <button
                                                        className={`w-24 ${
                                                            row.status ==
                                                            "data provided"
                                                                ? "bg-blue-500"
                                                                : "bg-green-500"
                                                        }  font-semibold text-white   py-1.5 rounded-lg`}
                                                    >{`${
                                                        row.status ==
                                                        "data provided"
                                                            ? "Waiting"
                                                            : "Accepted"
                                                    }`}</button>
                                                </>
                                            ),
                                        },
                                    ]}
                                    isSearchable={true}
                                    onHeaderClick={(label) =>
                                        sortData(label.toLowerCase())
                                    }
                                    rows={filter_tasks}
                                    onRowClick={(row) => {
                                        router.get(route("task", row.id));
                                    }}
                                />
                                <div className="flex items-center justify-center mt-4 mb-4 dark:text-white">
                                    <span>Showing {data.length} out of {total}</span>
                                </div>
                                <div className="flex items-center justify-center mt-4 mb-4">
                                    {links.map((link, index) => (
                                        <button
                                        key={index}
                                        disabled={!link.url}
                                        onClick={() => handlePageChange(link.url)}
                                        className={`mx-1 px-3 py-1 border rounded ${
                                            link.active
                                            ? 'dark:text-white bg-indigo-600 border-indigo-600'
                                            : 'dark:text-white border-gray-300'
                                        } ${!link.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/2 py-12">
                    <div className="max-w mx-auto sm:px-4">
                        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                            <div>
                                <ButtonMap
                                    data={filter_tasks_photos}
                                    onClick={handle_toggle_task_details}
                                />
                                <form
                                    onSubmit={submit}
                                    className="flex gap-8 py-5 pl-5 items-center"
                                >
                                    <span>
                                        <TextInput
                                            name="name"
                                            style={{
                                                background: "transparent",
                                                color: "white",
                                            }}
                                        />
                                    </span>
                                    <button type="submit">
                                        <FaSearch size={18} color="white" />
                                    </button>
                                </form>

                                <h5 className="pl-5 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                                    Status filter:
                                </h5>
                                <div className="lg:flex  sm:flex-grow items-center  pl-5 mt-2 p-4">
                                    <Checkbox
                                        data-fieldtype="new"
                                        onChange={handleCheckboxChange}
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["new"]
                                        }
                                        className="sm:mb-1 lg:mb-0"
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        New
                                    </span>
                                    <Checkbox
                                        className="ml-5 sm:mb-1 lg:mb-0"
                                        data-field="status"
                                        data-fieldtype="open"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["open"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        Open
                                    </span>
                                    <Checkbox
                                        className="ml-5 sm:mb-1 lg:mb-0"
                                        data-field="status"
                                        data-fieldtype="data provided"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["data provided"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        Data provided
                                    </span>
                                    <Checkbox
                                        className="ml-5 sm:mb-1 lg:mb-0"
                                        data-field="status"
                                        data-fieldtype="returned"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["returned"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        Returned
                                    </span>
                                    <Checkbox
                                        className="ml-5 sm:mb-1 lg:mb-0"
                                        data-field="flag"
                                        data-fieldtype="accepted"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["accepted"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        Accepted
                                    </span>
                                    <Checkbox
                                        className="ml-5 sm:mb-1 lg:mb-0"
                                        data-field="flag"
                                        data-fieldtype="declined"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["declined"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        Declined
                                    </span>
                                </div>
                                <h5 className="pl-5 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                                    Sort:
                                </h5>
                                <div className=" p-4">
                                    <Checkbox
                                        className=" sm:mb-1 "
                                        name="remember"
                                        data-field="after deadline"
                                        data-fieldtype="after deadline"
                                        checked={
                                            selectedFilters &&
                                            !!selectedFilters["after deadline"]
                                        }
                                        onChange={handleCheckboxChange}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                        }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                        After deadline last
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(Index);
