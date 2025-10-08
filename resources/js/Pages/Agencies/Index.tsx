import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faEye } from '@fortawesome/free-solid-svg-icons';

export default function Dashboard({ auth }: PageProps) {

  const { agencies } = usePage<{
    agencies: PaginatedData<Agency>;
  }>().props;
  const {
    data,
    links,
    total
  } = agencies;

  function destroy(id : number | string) : void {
    if (confirm('Are you sure with deactivating?')) {
      router.delete(route('dashboard.agencies.destroy', id));
    }
  }

  function handleRowClick(row:Agency){
    router.get(route('dashboard.agencies.show',row.id));
  }
  function handlePageChange(url: string) {
    router.get(url);
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Agency management</h2>}
    >
      <Head title="Agency Management" />

      <div className="py-12">
        <div className="max-w mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">Agency management</span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('dashboard.agencies.create')}
              >
                <span>Add New Agency</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>


            <Table
              onRowClick={handleRowClick}
              columns={[
                {
                  label: 'Agency name',
                  name: 'name',
                  renderCell: row => (
                    <>
                      {row.name}
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
                        href={route('dashboard.agencies.edit',row.id)} title='Edit'
                      >
                        <FontAwesomeIcon icon={faEdit}/>
                      </Link>
                      <button
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        onClick={() => destroy(row.id)} title='Deactivate'
                      >
                        <FontAwesomeIcon icon={faBan}/>
                      </button>
                    </>
                  )
                },
              ]}
              rows={data}
            />
            <div className="flex items-center justify-center mt-4 mb-4 dark:text-white">
              <span>Showing {data.length} out of {total}</span>
            </div>
            {agencies.total > 10 && <div className="flex items-center justify-center mt-4 mb-4">
              {links.map((link, index) => (
                  <button
                  key={index}
                  disabled={!link.url}
                  onClick={() => handlePageChange(link.url)}
                  className={`mx-1 px-3 py-1 border rounded ${
                      link.active
                      ? 'text-white bg-indigo-600 border-indigo-600'
                      : 'dark:text-white border-gray-300'
                  } ${!link.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                  />
              ))}
            </div>}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
