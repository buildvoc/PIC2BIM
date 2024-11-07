import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LoadingButton from '@/Components/Button/LoadingButton';
import TextInput from '@/Components/Form/TextInput';
import FieldGroup from '@/Components/Form/FieldGroup';
import { Agency, PageProps } from '@/types';

export function Invite({ auth }: PageProps) {
  const { agency_id } = usePage<{
    agency_id: number;
  }>().props;
  const { agency } = usePage<{
    agency: Agency;
  }>().props;

  const { data, setData, post, processing, errors } = useForm({
    email : '',
    agencyId : agency_id
  });
  const user = auth.user;
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    post(route('dashboard.agencies.officer.invite'));
  }

  return (
    <AuthenticatedLayout
      user={user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">{agency.name} - Officers management</h2>}
    >
      <Head title="Officers management" />
      
      <div className="py-12">
        <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <h1 className="text-3xl font-bold">{agency.name} - Officers management</h1>
            </div>
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 overflow-hidden rounded shadow">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Email" name="email" error={errors.email}>
                    <TextInput
                      type='email'
                      name="email"
                      error={errors.email}
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      style={{ background: 'transparent' }}
                    />
                  </FieldGroup>
                </div>

                <div className="flex flex-col items-center px-8 py-4 space-y-4">
                  <div className="flex space-x-4">
                    <LoadingButton
                      loading={processing}
                      type="submit"
                      className="focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                    >
                      Send Email
                    </LoadingButton>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default Invite;