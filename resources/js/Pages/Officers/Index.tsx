import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {Head, Link, usePage, router} from '@inertiajs/react';
import {Agency, Officer, PageProps, PaginatedData} from '@/types';
import Table from "@/Components/Table/Table";
import {PlusCircleIcon, Trash2, Edit} from "lucide-react";
import FilterBar from "@/Components/FilterBar/FilterBar";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faEye, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

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
    if (confirm('Are you sure with deactivating?')) {
      router.delete(route('dashboard.agencies.officers.destroy', id)+`?agencyId=${agency.id}`);
    }
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">{agency.name} - Officers management</h2>}
    >
      <Head title="Officers management" />

      <div className="py-12">
        <div className="max-w mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium"
            >
              <span className="hidden md:inline">
                <Link
                  className="text-indigo-600 dark:text-indigo-400 mr-8"
                  href={route('dashboard.agencies.index')}  title='Back'
                >
                  <FontAwesomeIcon icon={faChevronLeft} className='mr-2' />
                  Back
                </Link>
                {agency.name} - Officers management
              </span>
              
              <div className='flex'>
                <Link
                  className="focus:outline-none flex mr-2 items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                  href={route('dashboard.agencies.officers.invite', { id: agency.id })}
                >
                  <span>Invite New Officer</span>
                  <PlusCircleIcon size={16} className="ml-2" />
                </Link>
                <Link
                  className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                  href={route('dashboard.agencies.officers.create', { id: agency.id })}
                >
                  <span>New Officer</span>
                  <PlusCircleIcon size={16} className="ml-2" />
                </Link>
              </div>
              
            </div>


            <Table
              columns={[
                {
                  label: 'Login',
                  name: 'login',
                  renderCell: row => (
                    <>
                      {row.login}
                    </>
                  )
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
                  label: 'Surname',
                  name: 'surname',
                  renderCell: row => (
                    <>
                      {row.surname}
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
                        href={route('dashboard.agencies.officers.edit',row.id)+`?agencyId=${agency.id}`}  title='Edit'
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
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
