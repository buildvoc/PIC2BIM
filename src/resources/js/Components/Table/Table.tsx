import { Link, usePage } from "@inertiajs/react";
import get from "lodash/get";
import { ChevronRight } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FaCircleArrowDown } from "react-icons/fa6";
import {
    faArrowDown,
    faArrowUp,
    faSearch,
    faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
import TextInput from "@/Components/Form/TextInput";
import { useState } from "react";

interface TableProps<T> {
    columns: {
        name: string;
        label: string;
        colSpan?: number;
        sorting?: boolean;
        renderCell?: (row: T) => React.ReactNode;
    }[];
    rows: T[];
    sortColumn?: string;
    sortOrder?: "asc" | "desc";
    onSort?: (columnName: string, sortOrder: "asc" | "desc") => void;
    onSearch?: (search: string) => void;
    onRowClick?: (row: T) => void;
    onBulkAccept?: () => void;
    onReset?: () => void;
    isSearchable?: boolean;
    search?: string;
    sortConfig?:any
    onHeaderClick?: (lable:string) => void
}

export default function Table<T>({
    columns = [],
    rows = [],
    sortColumn,
    sortOrder,
    onSort,
    onSearch,
    isSearchable,
    search,
    onReset,
    onBulkAccept,
    onRowClick,
    onHeaderClick,
    sortConfig,
}: TableProps<T>) {
    const [searchValue, setSearchValue] = useState(search || "");
    const [columnActive, setColumnActive] = useState("Status");
    const handleSort = (columnName: string, order: "asc" | "desc") => {
        if (onSort) {
            onSort(columnName, order);
        }
    };
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSearch(searchValue);
        }
    };

    const handleSearch = (q: string) => {
        if (onSearch) {
            onSearch(q);
        }
    };
    function handleReset() {
        if (onReset) {
            onReset();
        }
    }
    function hanldeBulkAccept() {
        if (onBulkAccept) {
            onBulkAccept();
        }
    }

    function handleRowClick(row: T) {
        if (onRowClick) {
            onRowClick(row);
        }
    }

    return (
        <div className="overflow-x-auto rounded shadow">
            {isSearchable && (
                <div className="flex ml-2 mb-1 items-center">
                    <div>
                        <TextInput
                            name="search"
                            value={searchValue}
                            onKeyDown={handleKeyPress}
                            onChange={(e) => setSearchValue(e.target.value)}
                            style={{
                                background: "transparent",
                            }}
                        />
                    </div>
                    <div className="">
                        <button
                            type="button"
                            onClick={() => handleSearch(searchValue)}
                        >
                            <FontAwesomeIcon
                                className={
                                    "ml-4 text-indigo-600 dark:text-indigo-400"
                                }
                                icon={faSearch}
                            ></FontAwesomeIcon>
                        </button>
                    </div>
                    <div className="ml-8 text-indigo-600 dark:text-indigo-400">
                        <button type="button" onClick={handleReset}>
                            <FontAwesomeIcon
                                className={""}
                                icon={faCircleXmark}
                            ></FontAwesomeIcon>
                            <span className="ml-1">Cancel Sorting</span>
                        </button>
                    </div>
                    {onBulkAccept && (
                        <div className="ml-auto">
                            <button
                                type="button"
                                onClick={hanldeBulkAccept}
                                className="mr-4 focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md"
                            >
                                Bulk Accept
                            </button>
                        </div>
                    )}
                </div>
            )}
            <table className="w-full whitespace-nowrap">
                <thead>
                    <tr className="font-bold text-left text-gray-700 dark:text-gray-300">
                        {columns?.map((column) => (
                            <th
                                key={column.label}
                                colSpan={column.colSpan ?? 1}
                                className="px-6 pt-5 pb-4"
                                onClick={() => {
                                  setColumnActive(column.label)
                                  onHeaderClick!(column.label)
                              }}
                            >
                                <span className="flex flex-row justify-center">
                                    <span>{column.label}</span>
                                    {column.sorting && (
                                        <span>
                                            <button
                                                onClick={() =>
                                                    handleSort(
                                                        column.name,
                                                        "asc"
                                                    )
                                                }
                                                type="button"
                                            >
                                                <FontAwesomeIcon
                                                    className={
                                                        sortColumn ==
                                                            column.name &&
                                                        sortOrder == "asc"
                                                            ? "ml-2 text-indigo-600 dark:text-indigo-400"
                                                            : "ml-2"
                                                    }
                                                    icon={faArrowUp}
                                                ></FontAwesomeIcon>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleSort(
                                                        column.name,
                                                        "desc"
                                                    )
                                                }
                                                type="button"
                                            >
                                                <FontAwesomeIcon
                                                    className={
                                                        sortColumn ==
                                                            column.name &&
                                                        sortOrder == "desc"
                                                            ? "ml-[1px] text-indigo-600 dark:text-indigo-400"
                                                            : "ml-[1px]"
                                                    }
                                                    icon={faArrowDown}
                                                ></FontAwesomeIcon>
                                            </button>
                                        </span>
                                    )}
                                    {
                                      sortConfig && (
                                        <span
                                        className={` ml-2 ${
                                            column.label == columnActive
                                                ? ""
                                                : "hidden"
                                        } `}
                                    >
                                        <FaCircleArrowDown className={`fas dark:gray-100 
                                            ${sortConfig.direction == "asc" ? "block transform rotate-180":"block"}
                                            `} />{" "}
                                    </span>
                                      )
                                    }

                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {/* Empty state */}
                    {rows?.length === 0 && (
                        <tr>
                            <td
                                className="px-6 py-24 border-t text-center  break-words whitespace-normal"
                                colSpan={columns.length}
                            >
                                No data found.
                            </td>
                        </tr>
                    )}
                    {rows?.map((row, rowIndex) => {
                        return (
                            <tr
                                key={rowIndex}
                                className={`focus-within:bg-gray-100 dark:focus-within:bg-gray-600 ${
                                    onRowClick ? "cursor-pointer" : ""
                                }`}
                            >
                                {columns.map((column, colIndex) => {
                                    const isLastColumn =
                                        colIndex === columns.length - 1;
                                    return (
                                        <td
                                            key={column.name}
                                            className="border-t break-words whitespace-normal"
                                            onClick={() => {
                                                if (!isLastColumn) {
                                                    handleRowClick(row);
                                                }
                                            }}
                                        >
                                            <span
                                                tabIndex={-1}
                                                className="flex p-2 justify-center items-center text-gray-700 dark:text-gray-300 focus:outline-none"
                                            >
                                                {column.renderCell?.(row) ??
                                                    get(row, column.name) ??
                                                    "N/A"}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
