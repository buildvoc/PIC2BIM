import React from 'react';
import { router } from '@inertiajs/react';

interface PaginationProps {
    pagination: {
        to: number;
        from: number;
        total: number;
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
    };
}

const Pagination: React.FC<PaginationProps> = ({ pagination }) => {
    const handleClick = (url: string | null) => {
        if (url) router.visit(url);
    };

    return (
        <>
        <div className="flex items-center justify-center mt-4 mb-4 dark:text-white">
            <span>Showing {pagination.from}-{pagination.to} out of {pagination.total}</span>
        </div>
        {pagination.links.length > 3 && <div className="flex items-center justify-center mt-4 mb-4">
            {pagination.links.map((link, index) => (
                <button
                key={index}
                disabled={!link.url}
                onClick={() => handleClick(link.url)}
                className={`mx-1 px-3 py-1 border rounded ${
                    link.active
                    ? 'text-white bg-indigo-600 border-indigo-600'
                    : 'dark:text-white border-gray-300'
                } ${!link.url ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>}
        </>
    );
};

export default Pagination;
