import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from "@headlessui/react";
import PrimaryButton from '@/Components/PrimaryButton';

export default function Guest({ children }: PropsWithChildren) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="min-h-screen flex px-4 sm:justify-center items-center pt-6 sm:pt-0 bg-[url('/egnss4all_app_back.png')] bg-gray-100 dark:bg-gray-900">
            {/* Info Icon */}
            <div
                className="fixed top-2 right-4 z-50 text-blue-500 text-2xl cursor-pointer"
                onClick={() => setIsOpen(true)}
            >
                <FontAwesomeIcon icon={faCircleInfo} className="text-black" />
            </div>

            {/* Modal Dialog */}
            <Dialog
                open={isOpen}
                onClose={() => setIsOpen(false)}
                className="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
                    <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                        <Dialog.Title className="text-lg font-bold text-center sm:text-left">
                            Identify building height from a photo
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm">
                            <p className="text-justify sm:text-left">
                                PIC2BIM connects building information to authenticated and accurate geotagged photos using Galileo satellites.
                            </p>
                        </Dialog.Description>

                        <div className="flex justify-end my-4">
                            <PrimaryButton onClick={() => setIsOpen(false)}>
                                Close
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* Main Content */}
            <div className="flex flex-col w-full sm:max-w-md mt-6 px-6 py-10 bg-white dark:bg-gray-800 shadow-md overflow-hidden rounded-lg">
                {/* Logo Section */}
                <div className="flex flex-col justify-center">
                    <Link href="/">
                        <div
                            className="w-full bg-center bg-[url('/logo_egnss4all.svg')] h-20 fill-current text-gray-500 dark:text-gray-400 bg-no-repeat"
                        />
                    </Link>
                </div>

                {/* Form Section */}
                <div className="self-center pb-6"></div>
                {children}
            </div>
        </div>
    );
}
