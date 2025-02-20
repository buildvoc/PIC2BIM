import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, PageProps, PaginatedData, TaskType} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

export default function Dashboard({ auth }: PageProps) {

  const { task_types } = usePage<{
    task_types: PaginatedData<TaskType>;
  }>().props;

  const {
    data,
    links
  } = task_types;

  function destroy(id : number | string) : void {
    if (confirm('Are you sure with deactivating?')) {
      router.delete(route('types.destroy', id));
    }
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Task Type - management</h2>}
    >
      <Head title="Officers management" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                <Link
                  className="text-indigo-600 dark:text-indigo-400 mr-8"
                  href={route('dashboard.agencies.index')}  title='Back'
                >
                  <FontAwesomeIcon icon={faChevronLeft} className='mr-2' />
                  Back
                </Link>
                Task Type - management
              </span>
              <Link
                className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                href={route('types.create')}
              >
                <span>New Purpose</span>
                <PlusCircleIcon size={16} className="ml-2" />
              </Link>
            </div>


            <Table
              columns={[
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
                  label: 'Actions',
                  name: 'action',
                  renderCell: row => (
                    <>
                      <Link
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        href={route('types.edit',row.id)}
                      >
                        <FontAwesomeIcon icon={faEdit}/>
                      </Link>
                      <button
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                        onClick={() => destroy(row.id)}
                      >
                        <FontAwesomeIcon icon={faBan}/>
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
