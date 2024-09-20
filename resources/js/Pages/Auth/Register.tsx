import { FormEventHandler } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        login : '',
        password: '',
        name: '',
        surname : '',
        email: '',
        identification_number : '',
        vat : ''
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="login" value="Login" />

                    <TextInput
                        id="login"
                        name="login"
                        value={data.login}
                        className="mt-1 block w-full"
                        autoComplete="login"
                        isFocused={true}
                        onChange={(e) => setData('login', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="surname" value="Surname" />

                    <TextInput
                        id="surname"
                        name="surname"
                        value={data.surname}
                        className="mt-1 block w-full"
                        autoComplete="surname"
                        isFocused={true}
                        onChange={(e) => setData('surname', e.target.value)}
                    />

                    <InputError message={errors.surname} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="email"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="identification_number" value="Identification Number" />

                    <TextInput
                        id="identification_number"
                        name="identification_number"
                        value={data.identification_number}
                        className="mt-1 block w-full"
                        autoComplete="identification_number"
                        isFocused={true}
                        onChange={(e) => setData('identification_number', e.target.value)}
                        required
                    />

                    <InputError message={errors.identification_number} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="vat" value="Vat" />

                    <TextInput
                        id="vat"
                        name="vat"
                        value={data.vat}
                        className="mt-1 block w-full"
                        autoComplete="vat"
                        isFocused={true}
                        onChange={(e) => setData('vat', e.target.value)}
                        required
                    />

                    <InputError message={errors.vat} className="mt-2" />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <Link
                        href={route('login')}
                        className="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                    >
                        Already registered?
                    </Link>

                    <PrimaryButton className="ms-4" disabled={processing}>
                        Register
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
