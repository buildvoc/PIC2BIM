"use client";
import { useState } from "react";
import { FaRegMap } from "react-icons/fa6";
import styles from "./map.module.css";
import Map from "./map";

const DropdownMap = ({ map_tasks_array, onClick,isUnassigned,isSelected,zoomFilter }: any) => {
  //States
  const [isMapVisible, setIsMapVisible] = useState(true);

  const handleToggleMapVisibility = () => {
    setIsMapVisible((prevVisibility) => !prevVisibility);
  };

  return (
    <div className="row">
      <div className={`col`}>
        <div
          className={`${styles.map_container} ${
            isMapVisible ? styles.show : ""
          }`}
        >
          <Map
            style={{ height: "50vh" }}
            map_tasks_array={map_tasks_array}
            onClick={onClick}
            isUnassigned={isUnassigned}
            className={styles.map_div}
            isSelected={isSelected}
            zoomFilter={zoomFilter}
          />
        </div>
        <div className="map_dropdown_btn" onClick={handleToggleMapVisibility}>
          {isMapVisible ? (
            <span>
              <FaRegMap className={`icon mr-2`} size={18} />
              <i className="far fa-map mr-2 "></i>HIDE MAP
            </span>
          ) : (
            <span>
              <FaRegMap className={`icon mr-2`} size={18} />
              <i className="far fa-map mr-2"></i>SHOW MAP
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DropdownMap;
