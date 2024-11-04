import { PageProps } from "@/types";
import { memo, useEffect, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { FaRegMap } from "react-icons/fa6";
import TextInput from "@/Components/Form/TextInput";
import { FaSearch } from "react-icons/fa";
import Map from "@/Components/Map/Map";
import Checkbox from "@/Components/Checkbox";
import { FaTimesCircle } from "react-icons/fa";
import Table_ from "@/Components/Table/Table_";
import { table } from "console";
export function Index({ auth,tasks }: PageProps) {
  var tasks_array: any = [];
  var tasks_photos_array: any = [];
  for(let task of tasks)
  {
    let tasks_data = {
      status: task?.status,
      photos_taken:task?.number_of_photos,
      name: task?.name,
      description: task?.text,
      date_created: task.date_created,
      date_due: task.task_due_date,
      flag_valid:task.flag_valid
    }
    let tasks_photos_data = {
      ...tasks_data,
      farmer_name:`${auth.user.name} ${auth.user.surname}`,
      photo:task.photos[0],
      location: [task.photos[0]?.lng, task.photos[0]?.lat],
    }
    tasks_array.push(tasks_data);
    tasks_photos_array.push(tasks_photos_data);
  }
    const [isMapVisible, setIsMapVisible] = useState(true);
    const [tasks_, setTasks_] = useState<any>(tasks_array);
    const [tasksPhotos, setTasksPhotos] = useState<any>(tasks_photos_array);
    const handleToggleMapVisibility = () => {
        setIsMapVisible((prevVisibility) => !prevVisibility);
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
            <Head title="Tasks" />

            <div className="py-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium">
                            <Link
                                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                href={route("dashboard.agencies.create")}
                            >
                                <span>Photo Gallery</span>
                            </Link>
                            <Link
                                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                                href={route("dashboard.agencies.create")}
                            >
                                <span>Show Paths</span>
                            </Link>
                        </div>
                        <div>
                            <div
                                className={`overflow-hidden transition-all duration-500 ease ${
                                    isMapVisible
                                        ? "h-[50vh] opacity-100 visible"
                                        : "h-0 opacity-0 invisible"
                                }`}
                            >
                                <Map data={tasksPhotos}/>
                            </div>
                            <button
                                className={`w-full rounded-b-md items-center border border-transparent bg-gray-800 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-gray-700 focus:bg-gray-700 focus:outline-none  focus:ring-indigo-500 focus:ring-offset-2 active:bg-gray-900 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-white dark:focus:bg-white dark:focus:ring-offset-gray-800 dark:active:bg-gray-300 `}
                                onClick={handleToggleMapVisibility}
                            >
                                <div className="flex items-center justify-center">
                                    <span>
                                        <FaRegMap
                                            className={`icon mr-2`}
                                            size={18}
                                        />
                                    </span>
                                    {isMapVisible ? "HIDE MAP" : "SHOW MAP"}
                                </div>
                            </button>
                            <div className="flex gap-8 py-5 pl-5 items-center">
                                <span>
                                    <TextInput
                                        name="name"
                                        style={{
                                            background: "transparent",
                                            color: "white",
                                        }}
                                    />
                                </span>
                                <FaSearch size={18} color="white" />
                            </div>
                            <h5 className="pl-5 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                                Status filter:
                            </h5>
                            <div className="lg:flex  sm:flex-grow items-center  pl-5 mt-2 p-4">
                                <Checkbox
                                    name="new"
                                    className="sm:mb-1 lg:mb-0"
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    New
                                </span>
                                <Checkbox
                                    className="ml-5 sm:mb-1 lg:mb-0"
                                    name="remember"
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    Open
                                </span>
                                <Checkbox
                                    className="ml-5 sm:mb-1 lg:mb-0"
                                    name="remember"
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    Data provided
                                </span>
                                <Checkbox
                                    className="ml-5 sm:mb-1 lg:mb-0"
                                    name="remember"
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    Returned
                                </span>
                                <Checkbox
                                    className="ml-5 sm:mb-1 lg:mb-0"
                                    name="remember"
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    Accepted
                                </span>
                                <Checkbox
                                    className="ml-5 sm:mb-1 lg:mb-0"
                                    name="remember"
                                    style={{ width: "18px", height: "18px" }}
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
                                    style={{ width: "18px", height: "18px" }}
                                />
                                <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">
                                    After deadline last
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pb-12">
                <div className="max-w mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="flex gap-3 py-5 pl-5 items-center text-white border-b dark:border-gray-700">
                            <span>
                                <FaTimesCircle size={18} />
                            </span>
                            CANCEL SORTING
                        </div>
                        <div className="flex items-center justify-center mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium">
                            Showing 10 out of 10
                        </div>
                          <Table_ 
                          columns={[
                            {
                              label:'Status',
                              name:'status'
                            },
                            {
                              label:'Photos taken',
                              name:'photos_taken'
                            },
                            {
                              label:'Name',
                              name:'name'
                            },
                            {
                              label:'Decription',
                              name:'description'
                            },
                            {
                              label:'Date Created',
                              name:'date_created'
                            },
                            {
                              label:'Due date',
                              name:'date_due'
                            },
                            {
                              label:'Acception',
                              name:'acception',
                            renderCell:(row:any)=>(
                              <>
                              <button className={`w-24 ${row.status=="data provided"?"bg-blue-500":"bg-green-500"
                                }  font-semibold text-white   py-2 rounded-lg`}>{`${row.status=="data provided"?"Waiting":"Accepted"
                                }`}</button>
                              </>
                            )
                            }
                          ]}
                          rows={tasks_}
                          />              
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
export default memo(Index);
