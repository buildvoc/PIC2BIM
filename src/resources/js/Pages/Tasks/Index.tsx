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

  const { tasks,sortColumn ,sortOrder,search,user,selectedStatuses,errors,filtersVal  } = usePage<{
    tasks: PaginatedData<Tasks>;
    sortColumn : string;
    sortOrder : 'asc' | 'desc';
    search : string;
    user : Officer,
    selectedStatuses : string[],
    errors : string[],
    filtersVal : string[]
  }>().props;

  if(typeof errors[0] != 'undefined'){
    alert(errors[0]);
  }

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
    router.get(url+'&sortOrder='+sortOrder+'&sortColumn='+sortColumn+'&search='+search);
  }
  function reset(){
    router.get(route('users.show',user.id));
  }
  function handleSort(column : string, order : 'asc' | 'desc'){
    applyFilters({search : search, sortColumn : column , sortOrder : order, filters : selectedStatus});
  }
  function handleSearch(q : string){
    applyFilters({search : q, sortColumn : sortColumn , sortOrder : sortOrder, filters : selectedStatus});
  }

  async function applyFilters(params : {search : string;sortColumn : string;sortOrder : string;filters : string[]}){
    const queryString = new URLSearchParams({
      search: params.search || '',
      sortColumn: params.sortColumn || '',
      sortOrder: params.sortOrder || '',
      status : params.filters.join(",")
    }).toString();
    router.get(route('users.show',user.id)+'?'+queryString);
  }

  function bulkAccept(){

    if (confirm('Bulk accept selected tasks?') && selectedTasks.length > 0) {
      router.post(route('tasks.bulkAccept'), { tasks : selectedTasks }, {
        onSuccess: () => {
          alert('Selected tasks have been accepted.');
          router.reload();
        },
        onError: (errors) => {
        }
      });
    }
  }

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
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                <Link
                  className="text-indigo-600 dark:text-indigo-400 mr-8"
                  href={route('users.index')}  title='Back'
                >
                  <FontAwesomeIcon icon={faChevronLeft} className='mr-2' />
                  Back
                </Link>
                {user.surname + ' ' + user.name + ' tasks'}
              </span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('tasks.create',{id:user.id})}
              >
                <span>Add New Task</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>

            <div className='flex flex-col justify-between mb-4 w-full p-4 dark:text-white dark:text-gray-300 text-md font-medium'>
              <div>
                <h6>Status filter:</h6>
                <div className='flex items-center w-[60%] justify-between mt-4'>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('new')}
                      onChange={() => handleSelectedStatus('new')}
                    />
                    <span>New</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('open')}
                      onChange={() => handleSelectedStatus('open')}
                    />
                    <span>Open</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('data provided')}
                      onChange={() => handleSelectedStatus('data provided')}
                    />
                    <span>Data provided</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('returned')}
                      onChange={() => handleSelectedStatus('returned')}
                    />
                    <span>Returned</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('accepted')}
                      onChange={() => handleSelectedStatus('accepted')}
                    />
                    <span>Accepted</span>
                  </div>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={selectedStatus.includes('declined')}
                      onChange={() => handleSelectedStatus('declined')}
                    />
                    <span>Declined</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col justify-between mb-4 w-full p-4 dark:text-white dark:text-gray-300 text-md font-medium'>
              <div>
                <h6>Sort:</h6>
                <div className='flex items-center w-[60%] justify-between mt-4'>
                  <div>
                    <input 
                      className='border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
                      type="checkbox"
                      checked={sortColumn == 'task_due_date'}
                      onChange={(e) => e.target.checked ? handleSort('task_due_date','desc') : handleSort('status_sortorder.sortorder','asc')}
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
                          ${row.status === 'new' ? 'bg-yellow-500 dark:text-white' :
                            row.status === 'open' ? 'bg-blue-500 dark:text-white' :
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
                          <div className="bg-green-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Accepted</div>
                        ) : row.flag_id === 2 ? (
                          <div className="bg-red-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Declined</div>
                        ) : row.status === 'data provided' ? (
                          <div className="bg-blue-500 dark:text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none">Waiting</div>
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
                          className='border-3 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow'
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
    </AuthenticatedLayout>
  );
}
