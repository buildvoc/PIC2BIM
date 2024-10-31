import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, Officer, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faEye, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';

export default function Dashboard({ auth }: PageProps) {  
  const { users,sortColumn ,sortOrder,search  } = usePage<{
    users: PaginatedData<Officer>;
    sortColumn : string;
    sortOrder : 'asc' | 'desc';
    search : string;
  }>().props;

  const {
    data,
    links
  } = users;

  function destroy(id : number | string) : void {
    if (confirm('Are you sure with deactivating?')) {
      router.delete(route('users.destroy', id));
    }
  }
  function handlePageChange(url: string) {
    router.get(url+'&sortOrder='+sortOrder+'&sortColumn='+sortColumn+'&seach='+search);
  }
  function reset(){
    router.get(route('users.index'));
  }
  function handleSort(column : string, order : 'asc' | 'desc'){
    applyFilters({search : search, sortColumn : column , sortOrder : order});
  }
  function handleSearch(q : string){
    applyFilters({search : q, sortColumn : sortColumn , sortOrder : sortOrder});
  }

  function applyFilters(params : {search : string;sortColumn : string;sortOrder : string}){
    router.get(route('users.index'),params);
  }

  function handleRowClick(row:Officer){
    router.get(route('users.show',row.id));
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">User management</h2>}
    >
      <Head title="Users" />

      <div className="py-12">
        <div className="max-w mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                User management
              </span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('users.create')}
              >
                <span>Add New User</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>


            <Table
              sortColumn={sortColumn}
              sortOrder={sortOrder}
              onSort={handleSort}
              search={search}
              isSearchable={true}
              onSearch={handleSearch}
              onReset={reset}
              onRowClick={handleRowClick}
              columns={[
                {
                  label: 'ID',
                  name: 'id',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.id}
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
                  label: 'Surname',
                  name: 'surname',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.surname}
                    </>
                  )
                },
                {
                  label: 'Idenitification number',
                  name: 'identification_number',
                  sorting : true,
                  renderCell: row => (
                    <>
                      {row.identification_number}
                    </>
                  )
                },
                {
                  label: 'Tasks count',
                  name: 'tasks_count',
                  renderCell: row => (
                    <>
                      {row.tasks_count}
                    </>
                  )
                },
                {
                  label: 'Photos count',
                  name: 'photos_count',
                  renderCell: row => (
                    <>
                      {row.photo_count}
                    </>
                  )
                },
                {
                  label: 'Unassigned photos',
                  name: 'unassigned_photos',
                  renderCell: row => (
                    <>
                      {row.unassigned_photos_count}
                    </>
                  )
                },
                {
                  label: 'tasks in Data provided',
                  name: 'tasks_provided_count',
                  renderCell: row => (
                    <>
                      {row.tasks_provided_count}
                    </>
                  )
                },
                {
                  label: 'Actions',
                  name: 'action',
                  renderCell: row => (
                    <>
                      <Link
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        href={route('users.edit',row.id)}  title='Edit'
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Link>
                      <button
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        onClick={() => destroy(row.id)} title='Deactivate' 
                      >
                        <FontAwesomeIcon icon={faBan} />
                      </button>
                    </>
                  )
                },
              ]}
              rows={data}
            />
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
