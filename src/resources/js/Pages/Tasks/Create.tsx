import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import LoadingButton from '@/Components/Button/LoadingButton';
import TextInput from '@/Components/Form/TextInput';
import FieldGroup from '@/Components/Form/FieldGroup';
import { Agency, Officer, PageProps } from '@/types';

export function Create({ auth }: PageProps) {

  const { user,task_types  } = usePage<{
    user : Officer
    task_types : [{
      id : number;
      name : string;
    }]
  }>().props;

  const { data, setData, post, processing, errors } = useForm({
    name: '',
    text : '',
    purpose : '',
    date_due : '',
    user_id : user.id
  });
  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    post(route('tasks.store'));
  }

  const allPurpose = task_types.map((purpose,i) => {
    return (
      <option key={i} value={purpose.id} style={{background:'#1a1a1a',color:'white'}}>
        {purpose.name}
      </option>
    );
  })

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">New task</h2>}
    >
      <Head title="New task" />
      
      <div className="py-12">
        <div className="max-w-2xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div
              className="flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 dark:text-white dark:text-gray-300 border-b text-lg font-medium"
            >
              <h1 className="text-3xl font-bold">New task</h1>
            </div>
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 overflow-hidden rounded shadow">
              <form onSubmit={handleSubmit}>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup required={true} label="Name" name="name" error={errors.name}>
                    <TextInput
                      name="login"
                      error={errors.name}
                      value={data.name}
                      onChange={(e) => setData('name', e.target.value)}
                      style={{ background: 'transparent' }}
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Description" name="text" error={errors.text}>
                    <TextInput
                      name="text"
                      error={errors.text}
                      type='text'
                      value={data.text}
                      onChange={(e) => setData('text', e.target.value)}
                      style={{ background: 'transparent' }}
                    />
                  </FieldGroup>
                </div>

                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup label="Purpose" name="text" error={errors.purpose}>
                    <select name="purpose" onChange={(e) => setData('purpose', e.target.value)} className='form-input w-full text-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 border-gray-300 rounded'
                      style={{ background: 'transparent'}}
                    >
                      {allPurpose}
                    </select>
                  </FieldGroup>
                </div>

                <div className="grid gap-8 px-8 py-2">
                  <FieldGroup required={true} label="Due date" name="date_due" error={errors.date_due}>
                    <input type='date' name="date_due" onChange={(e) => setData('date_due', e.target.value)} className='form-input w-full text-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 border-gray-300 rounded'
                      style={{ background: 'transparent' }}
                      min={new Date().toISOString().split('T')[0]}
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
                      Save
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