import React from 'react';
import { Inertia } from '@inertiajs/inertia';
import { FaArrowLeft } from 'react-icons/fa6';
import { Link } from '@inertiajs/react';

interface BackButtonProps {
    label?: string;
    className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ label = 'Back', className = '' }) => {
    const handleGoBack = () => {
        Inertia.visit(document.referrer || '/');
    };

    return (
        <div className='text-indigo-500 hover:text-white flex items-center ms-4 mt-2'>
            <FaArrowLeft className='' />
            <Link
                href='/'
                className={`px-2 uppercase py-2 inline-flex rounded transition ${className}`}
            >
                {label}
            </Link>
        </div>
    );
};

export default BackButton;