import Map from "@/Components/Map/Map";
import { useState } from "react";
import { MapProps } from "@/types";
import { FaRegMap } from "react-icons/fa6";
const ButtonMap  = ({
    data,
    onClick,
    isSelected,
    isUnassigned,
    zoomFilter,
}: MapProps) => {
    const [isMapVisible, setIsMapVisible] = useState(true);
    const handleToggleMapVisibility = () => {
        setIsMapVisible((prevVisibility) => !prevVisibility);
    };
    return (
        <>
            <div
                className={`overflow-hidden transition-all duration-500 ease ${
                    isMapVisible
                        ? "h-[50vh] opacity-100 visible"
                        : "h-0 opacity-0 invisible"
                }`}
            >
                <Map data={data} zoomFilter={zoomFilter} isUnassigned={isUnassigned} onClick={onClick}/>
            </div>
            <button
                className={`w-full rounded-b-md items-center border border-transparent bg-gray-800 px-4 py-4 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-gray-700 focus:bg-gray-700 focus:outline-none  focus:ring-indigo-500 focus:ring-offset-2 active:bg-gray-900 dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-white dark:focus:bg-white dark:focus:ring-offset-gray-800 dark:active:bg-gray-300 `}
                onClick={handleToggleMapVisibility}
            >
                <div className="flex items-center justify-center">
                    <span>
                        <FaRegMap className={`icon mr-2`} size={18} />
                    </span>
                    {isMapVisible ? "HIDE MAP" : "SHOW MAP"}
                </div>
            </button>
        </>
    );
};

export default ButtonMap;
