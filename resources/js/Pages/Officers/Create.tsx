import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LoadingButton from '@/Components/Button/LoadingButton';
import TextInput from '@/Components/Form/TextInput';
import FieldGroup from '@/Components/Form/FieldGroup';
import { PageProps } from '@/types';

export function Create({ auth }: PageProps) {
  const { agency_id } = usePage<{
    agency_id: number;
  }>().props;

  const { data, setData, post, processing, errors } = useForm({
    login: '',
    password : '',
    name : '',
    surname : '',
    email : '',
    identification_number : '',
    vat : '',
    agencyId : agency_id
  });
  const user = auth.user;
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    post(route('dashboard.agencies.officers.store'));
  }

  return (
    <AuthenticatedLayout
      user={user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Create Officer</h2>}
    >
      <Head title="Create Officer" />
      
      <div className="py-12">
        <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium"
            >
              <h1 className="text-3xl font-bold">Create New Officer</h1>
            </div>
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 overflow-hidden rounded shadow">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Login" name="login" error={errors.login}>
                    <TextInput
                      name="login"
                      error={errors.login}
                      value={data.login}
                      onChange={(e) => setData('login', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Password" name="password" error={errors.password}>
                    <TextInput
                      name="password"
                      error={errors.password}
                      type='password'
                      value={data.password}
                      onChange={(e) => setData('password', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>

                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Name" name="name" error={errors.name}>
                    <TextInput
                      name="name"
                      error={errors.name}
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>

                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Surname" name="surname" error={errors.name}>
                    <TextInput
                      name="surname"
                      error={errors.surname}
                      value={data.surname}
                      onChange={(e) => setData('surname', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Email" name="email" error={errors.email}>
                    <TextInput
                      name="email"
                      error={errors.email}
                      value={data.email}
                      onChange={(e) => setData('email', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Identification Number" name="identification_number" error={errors.email}>
                    <TextInput
                      name="identification_number"
                      error={errors.identification_number}
                      value={data.identification_number}
                      onChange={(e) => setData('identification_number', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Vat" name="vat" error={errors.vat}>
                    <TextInput
                      name="vat"
                      error={errors.vat}
                      value={data.vat}
                      onChange={(e) => setData('vat', e.target.value)}
                      style={{ background: 'transparent', color: 'white' }}
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
                      Create Officer
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

export default Create;