import { useState, PropsWithChildren, ReactNode } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import Dropdown from "@/Components/Dropdown";
import NavLink from "@/Components/NavLink";
import ResponsiveNavLink from "@/Components/ResponsiveNavLink";
import { Link, usePage } from "@inertiajs/react";
import { User, SplitViewState } from "@/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun } from "@fortawesome/free-solid-svg-icons";
import { BsSquare } from "react-icons/bs";
import { BsLayoutSplit } from "react-icons/bs";
import axios from 'axios';
import Footer from "@/Components/Footer";

export default function Authenticated({
    user,
    header,
    children,
    splitView,
    setSplitView,
    uploadPhotoHandler,
    metadataResultsHandler
    
}: PropsWithChildren<{
    user: User;
    header?: ReactNode;
    splitView?: SplitViewState;
    setSplitView?: any;
    uploadPhotoHandler?: any;
    metadataResultsHandler?: any;
}>) {
    const { darkMode } = usePage<{
        darkMode: boolean;
    }>().props;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    const userRoles =
        user && user.roles ? user.roles.map((obj) => obj.role_id) : [];

    const [isDark, setIsDark] = useState(darkMode);

    const isAlreadyDark = document.documentElement.classList.contains("dark");

    if(isDark && !isAlreadyDark) document.documentElement.classList.add('dark');
    else if (!isDark && isAlreadyDark) document.documentElement.classList.remove("dark");

    const toggleTheme = () => {
        document.documentElement.classList.toggle("dark");
        setIsDark(document.documentElement.classList.contains("dark"));
        axios.post(route('set-dark-mode-in-session'));
    };
    

    const toggleSplitMode = (data:SplitViewState) => {
        setSplitView((prevState: any) => (data));
        axios.post(route('set-split-mode-in-session'));
    };
    
    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="w-100 mx-auto px-8 sm:px-8 lg:px-[8rem]">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="shrink-0 flex items-center">
                                {/* <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-gray-200" />
                                </Link> */}
                                <Link className={`brand-image`} href="/">
                                    {/*<ApplicationLogo className="block h-9 w-auto fill-current text-gray-800 dark:text-gray-200" />*/}
                                    {isDark ? (
                                        <img alt={`PIC2BIM`} className={`w-auto h-auto block`} src={`/images/pic2bim_logo_white.png`} />
                                    ) : (
                                        <img alt={`PIC2BIM`} className={`w-auto h-auto block`} src={`/images/pic2bim_logo.png`} />
                                    )}

                                </Link>
                            </div>
                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route("dashboard")}
                                    active={route().current("dashboard") || route().current("user_task.index")}
                                >
                                    Home
                                </NavLink>
                            </div>
                            {userRoles.includes(2) && userRoles.length > 0 && (
                                <>
                                    <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                        <NavLink
                                            href={route("users.unassigned")}
                                            active={route().current(
                                                "users.unassigned"
                                            )}
                                        >
                                            Unassigned Farmers
                                        </NavLink>
                                    </div>
                                </>
                            )}

                            {userRoles.includes(3) && userRoles.length > 0 && (
                                <>
                                    <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                        <NavLink
                                            href={route("types.index")}
                                            active={route().current(
                                                "types.index"
                                            )}
                                        >
                                            Task Purpose
                                        </NavLink>
                                    </div>
                                </>
                            )}
                            {userRoles.includes(1) && userRoles.length > 0 && (
                                <>
                                    <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                        <NavLink
                                            href={route("photo_gallery")}
                                            active={route().current(
                                                "photo_gallery"
                                            )}
                                        >
                                            Photo Gallery
                                        </NavLink>
                                        <NavLink
                                            href={route("user_paths")}
                                            active={route().current(
                                                "user_paths"
                                            )}
                                        >
                                            Show Paths
                                        </NavLink>
                                        {header ? (
                                            <NavLink
                                                href={route("building_height")}
                                                active={route().current(
                                                    "user_paths"
                                                )}
                                            >
                                                Building height
                                            </NavLink>
                                        ) : (
                                            <>
                                                <button className="inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none  border-transparent text-gray-500 hover:border-gray-300 hover:dark:text-white dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300">
                                                    Take photo again
                                                </button>
                                                <button
                                                    className="inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none  border-transparent text-gray-500 hover:border-gray-300 hover:dark:text-white dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300"
                                                    onClick={() =>
                                                        uploadPhotoHandler()
                                                    }
                                                >
                                                    Upload photo again
                                                </button>
                                                <button
                                                    className="inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none  border-transparent text-gray-500 hover:border-gray-300 hover:dark:text-white dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300"
                                                    onClick={() =>
                                                        metadataResultsHandler()
                                                    }
                                                >
                                                    Metadata results 
                                                </button>
                                            </>
                                        )}
                                        <NavLink
                                            href={route("building_attributes")}
                                            active={route().current(
                                                "building_attributes"
                                            )}
                                        >
                                            Building attributes
                                        </NavLink>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="hidden sm:flex sm:items-center sm:ms-6">
                            {splitView && (
                                <>
                                    <div
                                        className={`${
                                            splitView?.split
                                                ? "bg-gray-200 dark:bg-gray-600"
                                                : ""
                                        }  focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md`}
                                        onClick={() => toggleSplitMode({
                                            single: false,
                                            split: true,
                                        })}
                                    >
                                        <BsLayoutSplit size={18} />
                                    </div>
                                    <div
                                        onClick={() => toggleSplitMode({
                                            single: true,
                                            split: false,
                                        })}
                                        className={`${
                                            splitView?.single
                                                ? "bg-gray-200 dark:bg-gray-600"
                                                : ""
                                        }  focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md`}
                                    >
                                        <BsSquare />
                                    </div>
                                </>
                            )}

                            <div className="ms-3 relative">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:dark:text-white dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150"
                                            >
                                                {user.name}

                                                <svg
                                                    className="ms-2 -me-0.5 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route("profile.edit")}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route("logout")}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                            <div className="ms-3 relative">
                                <button
                                    type="button"
                                    onClick={() => toggleTheme()}
                                >
                                    {isDark ? (
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={
                                                "border-transparent text-gray-500 hover:border-gray-300 hover:dark:text-white focus:border-gray-300 focus:dark:text-white dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300 dark:focus:border-gray-700 dark:focus:text-gray-300"
                                            }
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            stroke-width="2"
                                            stroke="currentColor"
                                            fill="none"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        >
                                            <path
                                                stroke="none"
                                                d="M0 0h24v24H0z"
                                                fill="none"
                                            ></path>
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="4"
                                            ></circle>
                                            <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"></path>
                                        </svg>
                                    ) : (
                                        <svg
                                            className={
                                                "w-[24px] h-[24px] border-transparent text-gray-500 hover:border-gray-300 hover:dark:text-white focus:border-gray-300 focus:dark:text-white dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-300 dark:focus:border-gray-700 dark:focus:text-gray-300"
                                            }
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20V4Z"
                                            ></path>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState
                                    )
                                }
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-900 focus:text-gray-500 dark:focus:text-gray-400 transition duration-150 ease-in-out"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? "inline-flex"
                                                : "hidden"
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? "block" : "hidden") +
                        " sm:hidden"
                    }
                >
                    <div className="pt-2 pb-3 space-y-1">
                        <ResponsiveNavLink
                            href={route("dashboard")}
                            active={route().current("dashboard")}
                        >
                            Dashboard
                        </ResponsiveNavLink>
                    </div>

                    <div className="pt-4 pb-1 border-t border-gray-200 dark:border-gray-600">
                        <div className="px-4">
                            <div className="font-medium text-base text-gray-800 dark:text-gray-200">
                                {user.name}
                            </div>
                            <div className="font-medium text-sm text-gray-500">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            {splitView && (
                                <div className="flex items-center space-x-2 px-4 py-2">
                                    <button
                                        className={`flex items-center justify-center p-2 rounded-md ${
                                            splitView?.split
                                                ? "bg-gray-200 dark:bg-gray-600"
                                                : ""
                                        } text-indigo-600 dark:text-indigo-400`}
                                        onClick={() => toggleSplitMode({
                                            single: false,
                                            split: true,
                                        })}
                                    >
                                        <BsLayoutSplit size={18} />
                                        <span className="ml-2">Split View</span>
                                    </button>
                                    <button
                                        className={`flex items-center justify-center p-2 rounded-md ${
                                            splitView?.single
                                                ? "bg-gray-200 dark:bg-gray-600"
                                                : ""
                                        } text-indigo-600 dark:text-indigo-400`}
                                        onClick={() => toggleSplitMode({
                                            single: true,
                                            split: false,
                                        })}
                                    >
                                        <BsSquare size={18} />
                                        <span className="ml-2">Single View</span>
                                    </button>
                                </div>
                            )}
                            <ResponsiveNavLink href={route("profile.edit")}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route("logout")}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white dark:bg-gray-800 shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="pb-[20px] overflow-hidden">{children}</main>
            {/* <Footer isDark={isDark} /> */}
        </div>
    );
}
