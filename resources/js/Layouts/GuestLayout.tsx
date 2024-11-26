import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen flex flex-col  sm:justify-center items-center pt-6 sm:pt-0 bg-[url('/egnss4all_app_back.png')] bg-gray-100 dark:bg-gray-900">


            <div className="flex flex-col w-full  sm:max-w-md mt-6 px-6 py-10 bg-white dark:bg-gray-800 shadow-md overflow-hidden sm:rounded-lg ">
                <div className="flex flex-col justify-center bg-red">
            <Link  href="/">
                    <div
                        className="w-full bg-center bg-[url('/logo_egnss4all.svg')]  h-20 fill-current text-gray-500 dark:text-gray-400 bg-no-repeat"
                    />
                </Link>
                </div>
            <div className="self-center pb-6">

            </div>
                {children}
            </div>
        </div>
    );
}
