import React, {useState} from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from '@inertiajs/react';
interface FilterProps {
    isMapVisible: boolean;
    setIsMapVisible: () => void;
    exportToPdf: () => void;
    selectAll: () => void;
    onDeleteHandler: () => void;
    selectAllPdfHandler: () => void;
    chooseTask: () => void;
}

const Filter: React.FC<FilterProps> = ({ isMapVisible, setIsMapVisible, exportToPdf, selectAll, onDeleteHandler, selectAllPdfHandler, chooseTask }) => {
    //const [isPhotoMap, setPhotoMap] = useState(true);
    return (
        <div className={`photo-gallery-filter dark:bg-gray-800`}>
            <div className={`photo-gallery-filter-container`}>
                <div className={`photo-gallery-filter-heading`}>
                    <h1 className='dark:text-white'>Photo Gallery</h1>
                </div>
                <div className={`photo-gallery-filter-actions`}>
                    <Menu as="div" className={`relative inline-block text-left photo-gallery-filter-update-dropdown`}>
                        <MenuButton className={`photo-gallery-filter-update-dropdown-toggle`}>
                            <span>
                                <svg width="24" height="17" viewBox="0 0 24 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.96484 10.4297L11.3359 8.77734L11.6523 9.16406V11.0273V14.7891C11.6523 15.5273 11.0547 16.125 10.3164 16.125C10.0352 16.125 9.75391 16.0547 9.50781 15.8789L6.625 13.6641C6.27344 13.3828 6.02734 12.9961 6.02734 12.5391V11.0273L1.35156 5.26172C0.964844 4.80469 0.859375 4.13672 1.14062 3.57422C1.38672 3.01172 1.98438 2.625 2.61719 2.625H6.69531C6.80078 3.04688 6.97656 3.39844 7.22266 3.71484L7.71484 4.3125H2.75781L7.71484 10.4297V12.1523L9.96484 14.1211V10.4297ZM23.3242 1.32422C23.6055 1.88672 23.5 2.55469 23.1133 3.01172L18.4023 8.77734V13.6641C18.4023 14.4023 17.8047 15 17.0664 15C16.7852 15 16.5039 14.9297 16.2578 14.7539L13.375 12.5391C13.0234 12.2578 12.7773 11.8711 12.7773 11.4141V8.77734L8.10156 3.01172C7.71484 2.55469 7.60938 1.88672 7.89062 1.32422C8.13672 0.761719 8.73438 0.375 9.36719 0.375H21.8477C22.4805 0.375 23.0781 0.761719 23.3242 1.32422ZM16.7148 8.17969L21.707 2.0625H9.50781L14.4648 8.17969V11.2383L16.7148 12.9961V8.17969Z" fill="white"/>
                                </svg>
                            </span>
                            <span>Update Filter</span>
                        </MenuButton>
                        <MenuItems transition className={`photo-gallery-filter-update-dropdown-menu absolute right-0 z-10 origin-top-right transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in`}>
                            <MenuItem>
                                <button  onClick={exportToPdf} type={`button`}>Export To PDF</button>
                            </MenuItem>
                            <MenuItem>
                                <button type={`button`} onClick={selectAllPdfHandler}>Export Selected To PDF</button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                    <Menu as="div" className={`relative inline-block text-left photo-gallery-filter-dropdown`}>
                        <MenuButton className={`photo-gallery-filter-dropdown-toggle`}>
                            <span>
                                <svg width="24" height="17" viewBox="0 0 24 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.96484 10.4297L11.3359 8.77734L11.6523 9.16406V11.0273V14.7891C11.6523 15.5273 11.0547 16.125 10.3164 16.125C10.0352 16.125 9.75391 16.0547 9.50781 15.8789L6.625 13.6641C6.27344 13.3828 6.02734 12.9961 6.02734 12.5391V11.0273L1.35156 5.26172C0.964844 4.80469 0.859375 4.13672 1.14062 3.57422C1.38672 3.01172 1.98438 2.625 2.61719 2.625H6.69531C6.80078 3.04688 6.97656 3.39844 7.22266 3.71484L7.71484 4.3125H2.75781L7.71484 10.4297V12.1523L9.96484 14.1211V10.4297ZM23.3242 1.32422C23.6055 1.88672 23.5 2.55469 23.1133 3.01172L18.4023 8.77734V13.6641C18.4023 14.4023 17.8047 15 17.0664 15C16.7852 15 16.5039 14.9297 16.2578 14.7539L13.375 12.5391C13.0234 12.2578 12.7773 11.8711 12.7773 11.4141V8.77734L8.10156 3.01172C7.71484 2.55469 7.60938 1.88672 7.89062 1.32422C8.13672 0.761719 8.73438 0.375 9.36719 0.375H21.8477C22.4805 0.375 23.0781 0.761719 23.3242 1.32422ZM16.7148 8.17969L21.707 2.0625H9.50781L14.4648 8.17969V11.2383L16.7148 12.9961V8.17969Z" fill="#4F46E5"/>
                                </svg>
                            </span>
                            <span>Filter</span>
                        </MenuButton>
                        <MenuItems transition className={`photo-gallery-filter-dropdown-menu absolute right-0 z-10 origin-top-right transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in`}>
                            <MenuItem>
                                <button type={`button`} onClick={selectAll}>Select All</button>
                            </MenuItem>
                            <MenuItem>
                                <button type={`button`}  onClick={selectAll}>Cancel Selection</button>
                            </MenuItem>
                            <MenuItem>
                                <button className={`delete-item`} type={`button`} onClick={onDeleteHandler}>Delete Selected</button>
                            </MenuItem>
                            <MenuItem>
                                <button type={`button`} onClick={chooseTask}>Choose Task</button>
                            </MenuItem>
                            <MenuItem>
                                <button onClick={exportToPdf} type={`button`}>Export To PDF</button>
                            </MenuItem>
                            <MenuItem>
                                <button type={`button`}  onClick={selectAllPdfHandler}>Export Selected To PDF</button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                    <button onClick={setIsMapVisible} className={`photo-gallery-filter-map-switch`} type={`button`}>
                        <span>
                            <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.1484 0.679688C15.4492 0.542969 15.75 0.789062 15.75 1.0625V10.5508C15.75 10.9062 15.5312 11.2344 15.1758 11.3438L11.0469 12.793C10.6914 12.9297 10.3086 12.9023 9.95312 12.793L5.25 11.125L0.601562 12.8477C0.273438 12.9844 0 12.7383 0 12.4375V2.97656C0 2.62109 0.21875 2.29297 0.546875 2.15625L4.70312 0.734375C4.86719 0.652344 5.05859 0.625 5.22266 0.625C5.41406 0.625 5.60547 0.679688 5.79688 0.734375L10.5 2.375L15.1484 0.679688ZM6.125 2.23828V10.0586L9.625 11.2891V3.46875L6.125 2.23828ZM1.3125 11.1797L4.78516 9.89453H4.8125V2.07422L1.3125 3.30469V11.1797ZM14.4375 10.2227V2.32031L10.9375 3.60547V3.63281V11.4531L14.4375 10.2227Z" fill="white"/>
                            </svg>
                        </span>
                        <span>{isMapVisible ? 'Hide MAP' : 'Show MAP'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
};

export default Filter;