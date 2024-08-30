import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, Officer, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faEye, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';

interface Tasks {
  id : number;
  status : string;
  photo_taken : number;
  verified : string;
  name : string;
  text : string;
  date_created : string;
  task_due_date : string;
  flag_id : number;

}

export default function Dashboard({ auth }: PageProps) {

  const filters = ["New","Open","Data provided","Returned","Accepted","Declined"];

  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const handleCheckboxChange = (taskId: number) => {
    setSelectedTasks((prevSelected) =>
      prevSelected.includes(taskId)
        ? prevSelected.filter((id) => id !== taskId)
        : [...prevSelected, taskId]
    );
  };

  const { tasks,sortColumn ,sortOrder,search,user,selectedStatuses  } = usePage<{
    tasks: PaginatedData<Tasks>;
    sortColumn : string;
    sortOrder : 'asc' | 'desc';
    search : string;
    user : Officer,
    selectedStatuses : string[]
  }>().props;


  const {
    data,
    total,
    links
  } = tasks;

  function destroy(id : number | string) : void {
    if (confirm('Are you sure with deactivating?')) {
      router.delete(route('users.destroy', id));
    }
  }
  function handlePageChange(url: string) {
    router.get(url+'&sortOrder='+sortOrder+'&sortColumn='+sortColumn+'&seach='+search);
  }
  function reset(){
    router.get(route('users.show',user.id));
  }
  function handleSort(column : string, order : 'asc' | 'desc'){
    applyFilters({search : search, sortColumn : column , sortOrder : order});
  }
  function handleSearch(q : string){
    applyFilters({search : q, sortColumn : sortColumn , sortOrder : sortOrder});
  }

  async function applyFilters(params : {search : string;sortColumn : string;sortOrder : string}){
    const queryString = new URLSearchParams({
      search: params.search || '',
      sortColumn: params.sortColumn || '',
      sortOrder: params.sortOrder || '',
      status : selectedStatus.join(",")
    }).toString();
    router.get(route('users.show',user.id)+'?'+queryString);
  }

  function bulkAccept(){

    if (confirm('Bulk accept selected tasks?') && selectedTasks.length > 1) {
      router.post(route('tasks.bulkAccept'), { tasks : selectedTasks }, {
        onSuccess: () => {
          alert('Selected tasks have been accepted.');
          router.reload();
        },
        onError: (errors) => {
          console.error(errors);
          alert('An error occurred while accepting tasks.');
        }
      });
    }
  }

  const [selectedStatus, setSelectedStatus] = useState<string[]>(["none"]);

  const handleSelectedStatus = (status: string) => {
    setSelectedStatus(prevSelectedStatus => {
      if (prevSelectedStatus.includes(status)) {
        return prevSelectedStatus.filter(selectedStatus => selectedStatus !== status);
      } 
      else {
        return [...prevSelectedStatus, status];
      }
    });
  };

  useEffect (() => {
    console.log(selectedStatus)
    if(selectedStatus.length > 1) applyFilters({search : search, sortColumn : sortColumn , sortOrder : sortOrder})
  } , [selectedStatus]);

  function handleRowClick(row:Tasks){
    router.get(route('tasks.show',row.id));
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">{user.surname + ' ' + user.name + ' tasks'}</h2>}
    >
      <Head title="Task list" />

      <div className="py-12">
        <div className="max-w mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                {user.surname + ' ' + user.name + ' tasks'}
              </span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('users.create')}
              >
                <span>Add New Task</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>

            <div className='flex flex-col justify-between mb-4 w-full p-4 text-gray-700 dark:text-gray-300 text-md font-medium'>
              <div>
                <h6>Status filter:</h6>
                <div className='flex items-center w-[60%] justify-between mt-4'>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatuses.includes('new')}
                      onChange={() => handleSelectedStatus('new')}
                    />
                    <span>New</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatuses.includes('open')}
                      onChange={() => handleSelectedStatus('open')}
                    />
                    <span>Open</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatuses.includes('data provided')}
                      onChange={() => handleSelectedStatus('data provided')}
                    />
                    <span>Data provided</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatuses.includes('returned')}
                      onChange={() => handleSelectedStatus('returned')}
                    />
                    <span>Returned</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                    />
                    <span>Accepted</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                    />
                    <span>Declined</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col justify-between mb-4 w-full p-4 text-gray-700 dark:text-gray-300 text-md font-medium'>
              <div>
                <h6>Sort:</h6>
                <div className='flex items-center w-[60%] justify-between mt-4'>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                    />
                    <span>After deadline last</span>
                  </div>
                </div>
              </div>
            </div>

            <Table
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={handleSort}
              search={search}
              isSearchable={true}
              onSearch={handleSearch}
              onReset={reset}
              onBulkAccept={bulkAccept}
              onRowClick={handleRowClick}
              columns={[
                {
                  label: 'Status',
                  name: 'status_sortorder.sortorder',
                  sorting : true,
                  renderCell: row => (
                    <>
                      <button
                        className={`w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none
                          ${row.status === 'new' ? 'bg-yellow-500 text-white' :
                            row.status === 'open' ? 'bg-blue-500 text-white' :
                            row.status === 'data checked' ? 'bg-green-500 text-white' :
                            row.status === 'returned' ? 'bg-purple-500 text-white' :
                            'bg-gray-200 text-gray-800'}`} 
                        type='button'
                      >
                        {row.status}
                      </button>
                    </>
                  )
                },
                {
                  label: 'Photos Taken',
                  name: 'photo_taken',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.photo_taken}
                    </>
                  )
                },
                {
                  label: 'Verified',
                  name: 'surname',
                  renderCell: row => (
                    <>
                      
                    </>
                  )
                },
                {
                  label: 'Name',
                  name: 'name',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.name}
                    </>
                  )
                },
                {
                  label: 'Description',
                  name: 'text',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.text}
                    </>
                  )
                },
                {
                  label: 'Date created',
                  name: 'date_created',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.date_created}
                    </>
                  )
                },
                {
                  label: 'due date',
                  name: 'task_due_date',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.task_due_date}
                    </>
                  )
                },
                {
                  label: 'Acceptation',
                  name: 'flag_id',
                  sorting : true,
                  renderCell: row => (
                    <>
                        {row.flag_id === 1 ? (
                          <div className="bg-green-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Accepted</div>
                        ) : row.flag_id === 2 ? (
                          <div className="bg-red-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Declined</div>
                        ) : row.status === 'data provided' ? (
                          <div className="bg-blue-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Waiting</div>
                        ) : null}
                    </>
                  )
                },
                {
                  label: 'Bulk actions',
                  name: 'action',
                  renderCell: row => (
                    <>
                      { row.status == 'data provided' && !row.flag_id &&
                        <input 
                          className='border-3 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                          type="checkbox"
                          checked={selectedTasks.includes(row.id)}
                          onChange={() => handleCheckboxChange(row.id)}
                        />
                      }
                    </>
                  )
                },
              ]}
              rows={data}
            />
            <div className="flex items-center justify-center mt-4 mb-4 text-white">
              <span>Showing {data.length} out of {total}</span>
            </div>
            <div className="flex items-center justify-center mt-4 mb-4">
              {links.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handlePageChange(link.url)}
                  className={`mx-1 px-3 py-1 border rounded ${
                    link.active
                      ? 'text-white bg-indigo-600 border-indigo-600'
                      : 'text-white border-gray-300 border-indigo-600'
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
