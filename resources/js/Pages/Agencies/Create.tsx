import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LoadingButton from '@/Components/Button/LoadingButton';
import TextInput from '@/Components/Form/TextInput';
import FieldGroup from '@/Components/Form/FieldGroup';

export function Create(props) {
  const { auth } = props;
  const { data, setData, post, processing, errors } = useForm({
    name: '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    post(route('dashboard.agencies.store'));
  }

  return (
    <AuthenticatedLayout
      user={auth ? auth : {}}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Create Agency</h2>}
    >
      <Head title="Create Agency" />
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
            <LoadingButton
              loading={processing}
              type="submit"
              className="ml-auto btn-indigo"
            >
              Create Agency
            </LoadingButton>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}

export default Create;