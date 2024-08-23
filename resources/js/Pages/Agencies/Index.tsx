import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, Officer, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';

export default function Dashboard({ auth }: PageProps) {

  const { agency } = usePage<{
    agency: Agency;
  }>().props;
  
  
  
  const { officers } = usePage<{
    officers: PaginatedData<Officer>;
  }>().props;

  const {
    data,
    links
  } = officers;

  function destroy(id : number | string) : void {
    if (confirm('Are you sure you want to delete this officer?')) {
      router.delete(route('dashboard.agencies.officers.destroy', id)+`?agencyId=${agency.id}`);
    }
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Main</h2>}
    >
      <Head title="Dashboard" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">Officers Management</span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('dashboard.agencies.officers.create', { id: agency.id })}
              >
                <span>Create</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>


            <Table
              columns={[
                {
                  label: '#',
                  name: 'id',
                },
                {
                  label: 'Name',
                  name: 'name',
                  renderCell: row => (
                    <>
                      {row.name}
                    </>
                  )
                },
                {
                  label: 'Action',
                  name: 'action',
                  renderCell: row => (
                    <>
                      <Link
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        href={route('dashboard.agencies.officers.edit',row.id)+`?agencyId=${agency.id}`}
                      >
                        <FontAwesomeIcon icon={faEdit}/>
                      </Link>
                      <button
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        onClick={() => destroy(row.id)}
                      >
                        <FontAwesomeIcon icon={faTrash}/>
                      </button>
                    </>
                  )
                },
              ]}
              rows={data}
            />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
