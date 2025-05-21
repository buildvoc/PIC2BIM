import React from 'react';
import { router } from '@inertiajs/react';

interface PaginationProps {
    pagination: {
        current_page: number;
        last_page: number;
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
        <div className="pb-pagination">
            <div className="pb-pagination-container">
                {/* Previous Button */}
                <button
                    type="button"
                    className="pb-pagination-item prev"
                    disabled={!pagination.links[0]?.url}
                    onClick={() => handleClick(pagination.links[0]?.url)}
                >
                    <svg width="7" height="11" viewBox="0 0 7 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.03906 10.3711L1.10156 6.21484C0.992188 6.07812 0.9375 5.91406 0.9375 5.77734C0.9375 5.61328 0.992188 5.44922 1.10156 5.3125L5.03906 1.15625C5.28516 0.882812 5.69531 0.882812 5.96875 1.12891C6.24219 1.375 6.24219 1.78516 5.99609 2.05859L2.49609 5.77734L5.99609 9.46875C6.24219 9.74219 6.24219 10.1523 5.96875 10.3984C5.69531 10.6445 5.28516 10.6445 5.03906 10.3711Z" fill="black"/>
                    </svg>
                </button>

                {/* Dynamic Page Buttons */}
                {pagination.links.slice(1, -1).map((link, index) => (
                    <button
                        key={index}
                        type="button"
                        className={`pb-pagination-item ${link.active ? 'active' : ''}`}
                        disabled={!link.url}
                        onClick={() => handleClick(link.url)}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}

                {/* Next Button */}
                <button
                    type="button"
                    className="pb-pagination-item next"
                    disabled={!pagination.links[pagination.links.length - 1]?.url}
                    onClick={() => handleClick(pagination.links[pagination.links.length - 1]?.url)}
                >
                    <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                        <svg width="5" height="9" viewBox="0 0 5 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1.08594 0.5625L4.46094 4.125C4.55469 4.24219 4.625 4.38281 4.625 4.5C4.625 4.64062 4.55469 4.78125 4.46094 4.89844L1.08594 8.46094C0.875 8.69531 0.523438 8.69531 0.289062 8.48438C0.0546875 8.27344 0.0546875 7.92188 0.265625 7.6875L3.26562 4.5L0.265625 1.33594C0.0546875 1.10156 0.0546875 0.75 0.289062 0.539062C0.523438 0.328125 0.875 0.328125 1.08594 0.5625Z" fill="black"/>
                        </svg>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
