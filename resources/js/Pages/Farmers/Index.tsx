import { PageProps } from "@/types";
import { memo, useEffect, useState, useRef, useLayoutEffect,useCallback,PropsWithChildren } from "react";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import TextInput from "@/Components/Form/TextInput";
import { FaSearch } from "react-icons/fa";
import Checkbox from "@/Components/Checkbox";
import { FaTimesCircle } from "react-icons/fa";
import Table from "@/Components/Table/Table";
import { FormEventHandler } from "react";
import { FILTERS_DATA } from "@/Constants/Constants";
import { TaskPhotos, Task, SplitViewState, PaginatedData, Tasks } from "@/types";
import ButtonMap from "@/Components/Map/ButtonMap";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export function Index({ auth }: PageProps) {

    
    const { tasks,sortColumn ,sortOrder,search,user,selectedStatuses,errors,filtersVal,splitMode  } = usePage<{
        tasks: PaginatedData<Tasks>;
        sortColumn : string;
        sortOrder : 'asc' | 'desc';
        search : string;
        selectedStatuses : string[],
        errors : string[],
        filtersVal : string[],
        splitMode : boolean
      }>().props;
      const {
        data,
        total,
        links
      } = tasks;
    
    const [showingCount, setShowingCount] = useState<number>(data.length);

    function handleSort(column : string, order : 'asc' | 'desc'){
        applyFilters({search : search, sortColumn : column , sortOrder : order, filters : selectedStatus});
    }

    const tasks_array: Array<Task> = [];
    const tasks_photos_array: Array<TaskPhotos> = [];
    const [splitView, setSplitView] = useState<SplitViewState>({
        split: splitMode ? true : false,
        single: !splitMode ? true : false,
    });
    const previousTasksRef = useRef<any>([]);
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
            flag_id : task.flag_id
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
    
    const [filter_tasks, set_filter_tasks] = useState<Array<Task>>(tasks_);
    const [filter_tasks_photos, set_filter_tasks_photos] = useState<Array<TaskPhotos>>(tasksPhotos);

    const [selectedStatus, setSelectedStatus] = useState<string[]>(filtersVal);

    const handleSelectedStatus = (status: string) => {
      setSelectedStatus(prevSelectedStatus => {
        if (prevSelectedStatus.includes(status)) {
          const return1 =  prevSelectedStatus.filter(selectedStatus => selectedStatus !== status);
          applyFilters({search : search, sortColumn : sortColumn , sortOrder : sortOrder, filters : return1});
          return return1;
        } 
        else {
          const return2 =  [...prevSelectedStatus, status];
          applyFilters({search : search, sortColumn : sortColumn , sortOrder : sortOrder, filters : return2});
          return return2;
        }
      });
    };
    
    useEffect (() => {
        
    } , [selectedStatus]);

    const handleZoomFilter = (leaves: String[] | undefined) => {
        const filteredPhotos = tasks_photos_array.filter((photo) =>
            leaves?.includes(photo.photo.digest)
        );

        const taskIds = filteredPhotos.map((photo) => photo.id);
        const filteredTasks = tasks_array.filter((task) =>
            taskIds?.includes(task.id)
        );

        set_filter_tasks(filteredTasks);
        setShowingCount(filteredTasks.length)
        // set_filter_tasks_photos(filteredPhotos);
    };
    

    function handlePageChange(url: string) {
        router.get(url+'&sortOrder='+sortOrder+'&sortColumn='+sortColumn+'&search='+search);
    }
    function handleSearch(q : string){
        applyFilters({search : q, sortColumn : sortColumn , sortOrder : sortOrder, filters : selectedStatus});
    }
    function reset(){
        router.get(route('user_task.index'));
      }

    async function applyFilters(params : {search : string;sortColumn : string;sortOrder : string;filters : string[]}){
        const queryString = new URLSearchParams({
            search: params.search || '',
            sortColumn: params.sortColumn || '',
            sortOrder: params.sortOrder || '',
            status : params.filters.join(",")
        }).toString();
        router.get(route('user_task.index')+'?'+queryString);
    }
      

    const handle_toggle_task_details = (taskId: number) => {
        router.get(route("task", taskId));
    };

    const LeftPane = () => {
        return (
            <div
                className={`w-full py-2  ${
                    splitView.split ? "md:w-1/2  " : ""
                } `}
            >
                {" "}
                <div className="max-w mx-auto sm:px-4 ">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg ">
                        <div
                            className={`mt-4 ${
                                splitView.split ? "h-3/4-screen overflow-y-auto" : ""
                            } `}
                        >
                            <Table
                                sortColumn={sortColumn}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                                search={search}
                                isSearchable={true}
                                onSearch={handleSearch}
                                onReset={reset}
                                columns={[
                                    {
                                        label: "Status",
                                        name: "status",
                                        sorting : true,
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
                                        renderCell: row => (
                                          <>
                                              {row.flag_id === 1 ? (
                                                <div className="bg-green-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Accepted</div>
                                              ) : row.flag_id === 2 ? (
                                                <div className="bg-red-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Declined</div>
                                              ) : row.status === 'data provided' ? (
                                                <div className="bg-blue-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Waiting</div>
                                              ) : null}
                                          </>
                                        )
                                    },
                                ]}
                                rows={filter_tasks}
                                onRowClick={(row) => {
                                    router.get(route("task", row.id));
                                }}
                            />
                            <div className="flex items-center justify-center mt-4 mb-4 dark:text-white">
                                <span>Showing {showingCount} out of {total}</span>
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
        );
    };

    // Sidebar state (untuk non-split view)
    const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
    const theme = useTheme ? useTheme() : undefined;
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

    const RightPane = useCallback(
        ({
            handleZoomFilter,
            handle_toggle_task_details,
        }: PropsWithChildren<{
            handleZoomFilter: (leaves: String[] | undefined) => void;
            handle_toggle_task_details: (askId: number) => void;
        }>) => {
        return (
            <div
                className={`w-full py-2  ${
                    splitView.split ? "md:w-1/2  " : ""
                } `}
            >
                <div className="max-w mx-auto sm:px-4">
                    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                        <div>
                            <ButtonMap
                                data={filter_tasks_photos}
                                onClick={handle_toggle_task_details}
                                zoomFilter={handleZoomFilter}
                                isUnassigned={true}
                            />
                            {/* Filter hanya di split view */}
                            {splitView.split && (
                              <div className="mt-4">
                                <TaskFilterSidebar
                                  open={true}
                                  onClose={() => {}}
                                  selectedStatus={selectedStatus}
                                  handleSelectedStatus={handleSelectedStatus}
                                  sortColumn={sortColumn}
                                  handleSort={handleSort}
                                />
                              </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    },
    [splitView.split, filter_tasks_photos, selectedStatus, sortColumn]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Tasks
                </h2>
            }
            setSplitView={setSplitView}
            splitView={splitView}
        >
            <Head title="Task list" />
            <div className="flex flex-wrap relative">
                {/* Sidebar filter untuk non-split view */}
                {!splitView.split && (
                  <>
                    <TaskFilterSidebar
                      open={filterSidebarOpen}
                      onClose={() => setFilterSidebarOpen(false)}
                      selectedStatus={selectedStatus}
                      handleSelectedStatus={handleSelectedStatus}
                      sortColumn={sortColumn}
                      handleSort={handleSort}
                    />
                    <button
                      className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white rounded-full p-3 shadow-lg md:top-1/2 md:bottom-auto md:right-6 md:-translate-y-1/2 md:transform"
                      onClick={() => setFilterSidebarOpen(open => !open)}
                      aria-label="Show filter"
                    >
                      <FaSearch size={22} />
                    </button>
                  </>
                )}
                {splitView.split ? (
                    <>
                        <LeftPane />
                        <div className="w-full md:w-1/2 py-2">
                          <div className="max-w mx-auto sm:px-4">
                            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                              <div>
                                <ButtonMap
                                  data={filter_tasks_photos}
                                  onClick={handle_toggle_task_details}
                                  zoomFilter={handleZoomFilter}
                                  isUnassigned={true}
                                />
                                {/* Filter split view: tampilkan langsung, bukan sidebar */}
                                <h5 className="gap-8 pt-5 pl-5 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                                  Status filter:
                                </h5>
                                <div className="flex custom-flex gap-5 flex-wrap items-center  pl-5 p-4">
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      data-fieldtype="new"
                                      checked={selectedStatus.includes('new')}
                                      onChange={() => handleSelectedStatus('new')}
                                      className="sm:mb-1 lg:mb-0"
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">New</span>
                                  </div>
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      className="sm:mb-1 lg:mb-0"
                                      data-field="status"
                                      data-fieldtype="open"
                                      checked={selectedStatus.includes('open')}
                                      onChange={() => handleSelectedStatus('open')}
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">Open</span>
                                  </div>
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      className="sm:mb-1 lg:mb-0"
                                      data-field="status"
                                      data-fieldtype="data provided"
                                      checked={selectedStatus.includes('data provided')}
                                      onChange={() => handleSelectedStatus('data provided')}
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">Data provided</span>
                                  </div>
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      className="sm:mb-1 lg:mb-0"
                                      data-field="status"
                                      data-fieldtype="returned"
                                      checked={selectedStatus.includes('returned')}
                                      onChange={() => handleSelectedStatus('returned')}
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">Returned</span>
                                  </div>
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      className="sm:mb-1 lg:mb-0"
                                      data-field="flag"
                                      data-fieldtype="accepted"
                                      checked={selectedStatus.includes('accepted')}
                                      onChange={() => handleSelectedStatus('accepted')}
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">Accepted</span>
                                  </div>
                                  <div className="flex-basis-50">
                                    <Checkbox
                                      className="sm:mb-1 lg:mb-0"
                                      data-field="flag"
                                      data-fieldtype="declined"
                                      checked={selectedStatus.includes('declined')}
                                      onChange={() => handleSelectedStatus('declined')}
                                      style={{ width: "18px", height: "18px" }}
                                    />
                                    <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">Declined</span>
                                  </div>
                                </div>
                                <h5 className="pl-5 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Sort:</h5>
                                <div className="p-4">
                                  <Checkbox
                                    className="sm:mb-1"
                                    name="remember"
                                    data-field="after deadline"
                                    data-fieldtype="after deadline"
                                    checked={sortColumn == 'task_due_date'}
                                    onChange={(e) => e.target.checked ? handleSort('task_due_date','desc') : handleSort('status_sortorder.sortorder','asc')}
                                    style={{ width: "18px", height: "18px" }}
                                  />
                                  <span className="ms-2 text-lg text-gray-600 dark:text-gray-400">After deadline last</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    </>
                ) : (
                    <>
                       <RightPane
                             handle_toggle_task_details={
                                 handle_toggle_task_details
                             }
                             handleZoomFilter={handleZoomFilter}
                         />
                       <LeftPane />
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

function TaskFilterSidebar({
  open,
  onClose,
  selectedStatus,
  handleSelectedStatus,
  sortColumn,
  handleSort,
}: {
  open: boolean;
  onClose: () => void;
  selectedStatus: string[];
  handleSelectedStatus: (status: string) => void;
  sortColumn: string;
  handleSort: (col: string, order: 'asc' | 'desc') => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 transition-opacity md:hidden opacity-100 pointer-events-auto"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-200 translate-x-0 md:top-6 md:bottom-6 md:h-auto md:rounded-lg md:w-80 md:shadow-2xl md:right-6 md:pointer-events-auto"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex justify-between items-center p-4 md:hidden">
          <span className="font-semibold text-lg">Filter</span>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-300 text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <h5 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Status filter:</h5>
          <div className="flex flex-col gap-3 mt-2">
            {['new', 'open', 'data provided', 'returned', 'accepted', 'declined'].map((status) => (
              <label key={status} className="flex items-center gap-2">
                <Checkbox
                  data-fieldtype={status}
                  checked={selectedStatus.includes(status)}
                  onChange={() => handleSelectedStatus(status)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span className="text-lg text-gray-600 dark:text-gray-400 capitalize">{status.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
          <h5 className="mt-6 font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Sort:</h5>
          <div className="mt-2">
            <label className="flex items-center gap-2">
              <Checkbox
                className="sm:mb-1"
                name="remember"
                data-field="after deadline"
                data-fieldtype="after deadline"
                checked={sortColumn == 'task_due_date'}
                onChange={(e) => e.target.checked ? handleSort('task_due_date','desc') : handleSort('status_sortorder.sortorder','asc')}
                style={{ width: '18px', height: '18px' }}
              />
              <span className="text-lg text-gray-600 dark:text-gray-400">After deadline last</span>
            </label>
          </div>
        </div>
      </aside>
    </>
  );
}

export default memo(Index);
