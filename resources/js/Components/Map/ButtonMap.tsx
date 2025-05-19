import Map from "@/Components/Map/Map";
import { useEffect, useState } from "react";
import { MapProps } from "@/types";
import { FaRegMap } from "react-icons/fa6";
const ButtonMap  = ({
    data,
    onClick,
    isSelected,
    isUnassigned,
    zoomFilter,
    isMapVisible,
    setIsMapVisible,
    splitView
}: MapProps) => {
    // const [isMapVisible, setIsMapVisible] = useState(true);
    // const handleToggleMapVisibility = () => {
    //     setIsMapVisible((prevVisibility) => !prevVisibility);
    // };
    return (
        <>
            <div
                className={`overflow-hidden transition-all duration-500 ease ${
                    isMapVisible
                        ?  splitView ? "grow opacity-100 visible" : "h-[50vh] opacity-100 visible"
                        : "h-0 opacity-0 invisible"
                }  `}
            >
                <Map data={data} zoomFilter={zoomFilter} isUnassigned={isUnassigned} onClick={onClick} className="w-full h-3/4-screen"/>
            </div>
            {/* <button
                className={`w-full rounded-b-md items-center border border-transparent bg-brand-primary px-4 py-4 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-brand-primaryHover  focus:outline-none  focus:bg-brand-primaryHover focus:ring-offset-2 active:bg-brand-primaryHover dark:bg-brand-primary dark:text-white dark:hover:bg-brand-primaryHover dark:focus:bg-brand-primaryHover dark:focus:ring-offset-brand-primaryHover dark:active:bg-brand-primaryHover `}
                onClick={handleToggleMapVisibility}
            >
                <div className="flex items-center justify-center">
                    <span>
                        <FaRegMap className={`icon mr-2`} size={18} />
                    </span>
                    {isMapVisible ? "HIDE MAP" : "SHOW MAP"}
                </div>
            </button> */}
        </>
    );
};

export default ButtonMap;
