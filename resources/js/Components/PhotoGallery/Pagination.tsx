import React from 'react';

const Pagination: React.FC = () => {
    return (
        <div className={`pb-pagination`}>
            <div className={`pb-pagination-container`}>
                <button type={`button`} className={`pb-pagination-item prev`}>
                    <svg width="7" height="11" viewBox="0 0 7 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.03906 10.3711L1.10156 6.21484C0.992188 6.07812 0.9375 5.91406 0.9375 5.77734C0.9375 5.61328 0.992188 5.44922 1.10156 5.3125L5.03906 1.15625C5.28516 0.882812 5.69531 0.882812 5.96875 1.12891C6.24219 1.375 6.24219 1.78516 5.99609 2.05859L2.49609 5.77734L5.99609 9.46875C6.24219 9.74219 6.24219 10.1523 5.96875 10.3984C5.69531 10.6445 5.28516 10.6445 5.03906 10.3711Z" fill="black"/>
                    </svg>
                </button>
                <button type={`button`} className={`pb-pagination-item active`}>1</button>
                <button type={`button`} className={`pb-pagination-item`}>2</button>
                <button type={`button`} className={`pb-pagination-item`}>3</button>
                <button type={`button`} className={`pb-pagination-item`}>4</button>
                <div className={`pb-pagination-item more-items`}>
                    <svg width="12" height="3" viewBox="0 0 12 3" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.375 1.5C9.375 0.890625 9.86719 0.375 10.5 0.375C11.1094 0.375 11.625 0.890625 11.625 1.5C11.625 2.13281 11.1094 2.625 10.5 2.625C9.86719 2.625 9.375 2.13281 9.375 1.5ZM2.625 1.5C2.625 2.13281 2.10938 2.625 1.5 2.625C0.867188 2.625 0.375 2.13281 0.375 1.5C0.375 0.890625 0.867188 0.375 1.5 0.375C2.10938 0.375 2.625 0.890625 2.625 1.5ZM7.125 1.5C7.125 2.13281 6.60938 2.625 6 2.625C5.36719 2.625 4.875 2.13281 4.875 1.5C4.875 0.890625 5.36719 0.375 6 0.375C6.60938 0.375 7.125 0.890625 7.125 1.5Z" fill="#4F46E5"/>
                    </svg>
                </div>
                <button type={`button`} className={`pb-pagination-item`}>10</button>
                <button type={`button`} className={`pb-pagination-item`}>11</button>
                <button type={`button`} className={`pb-pagination-item`}>12</button>
                <button type={`button`} className={`pb-pagination-item`}>13</button>
                <button type={`button`} className={`pb-pagination-item next`}>
                    <svg width="5" height="9" viewBox="0 0 5 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1.08594 0.5625L4.46094 4.125C4.55469 4.24219 4.625 4.38281 4.625 4.5C4.625 4.64062 4.55469 4.78125 4.46094 4.89844L1.08594 8.46094C0.875 8.69531 0.523438 8.69531 0.289062 8.48438C0.0546875 8.27344 0.0546875 7.92188 0.265625 7.6875L3.26562 4.5L0.265625 1.33594C0.0546875 1.10156 0.0546875 0.75 0.289062 0.539062C0.523438 0.328125 0.875 0.328125 1.08594 0.5625Z" fill="black"/>
                    </svg>
                </button>
            </div>
        </div>
    )
}
export default Pagination;