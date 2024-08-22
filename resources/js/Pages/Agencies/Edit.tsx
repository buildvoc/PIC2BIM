import React from 'react';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DeleteButton from '@/Components/Button/DeleteButton';
import LoadingButton from '@/Components/Button/LoadingButton';
import TextInput from '@/Components/Form/TextInput';
import FieldGroup from '@/Components/Form/FieldGroup';
import TrashedMessage from '@/Components/Messages/TrashedMessage';
import { Agency, PageProps } from '@/types';

export function Edit({ auth }: PageProps) {
  const { agency } = usePage<{ agency: Agency }>().props;
  const { data, setData, errors, patch, processing } = useForm({
    name: agency.name || '',
  });
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    patch(route('dashboard.agencies.update', agency.id));
  }

  function destroy() {
    if (confirm('Are you sure you want to delete this agency?')) {
      router.delete(route('dashboard.agencies.destroy', agency.id));
    }
  }

  function restore() {
    if (confirm('Are you sure you want to restore this agency?')) {
      router.put(route('dashboard.agencies.restore', agency.id));
    }
  }

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Agency name</h2>}
    >
      <Head title={data.name} />
      <h1 className="mb-8 text-3xl font-bold">
        <Link href={route('dashboard')} className="text-indigo-600 hover:text-indigo-700">
          Organizations
        </Link>
        <span className="mx-2 font-medium text-indigo-600">/</span>
        {data.name}
      </h1>

      {agency.deleted_at && (
        <TrashedMessage message="This agency has been deleted." onRestore={restore} />
      )}

      <div className="max-w-3xl overflow-hidden bg-white rounded shadow">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 p-8 lg:grid-cols-2">
            <FieldGroup label="Name" name="name" error={errors.name}>
              <TextInput
                name="name"
                error={errors.name}
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
              />
            </FieldGroup>
          </div>

          <div className="flex items-center px-8 py-4 bg-gray-100 border-t border-gray-200">
            {!agency.deleted_at && (
              <DeleteButton onDelete={destroy}>
                Delete Agency
              </DeleteButton>
            )}
            <LoadingButton
              loading={processing}
              type="submit"
              className="ml-auto btn-indigo"
            >
              Update Agency
            </LoadingButton>
          </div>
        </form>
      </div>
      {/* Uncomment and modify the following lines if the contacts table is needed */}
      {/* <h2 className="mt-12 mb-6 text-2xl font-bold">Contacts</h2>
      <Table
        columns={[
          { label: 'Name', name: 'name' },
        ]}
        rows={agency.contacts}
        getRowDetailsUrl={(row) => route('contacts.edit', row.id)}
      /> */}
    </AuthenticatedLayout>
  );
}

export default Edit;