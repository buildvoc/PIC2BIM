"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./user_paths.module.css";
import { FaChevronLeft } from "react-icons/fa";
import { get_paths } from "@/api/api_client";
import Map from "../map/map";
import { FaTrash } from "react-icons/fa";
import { data } from "jquery";

const User_paths = () => {
  //Params
  const searchParams = useSearchParams();
  const id: any = searchParams.get("id");
  //States
  //local sotrage
  const [paths, setPaths] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [filterPaths, setFilterPaths] = useState<any>({
    data: [],
    filterIds: [],
  });


  useEffect(() => {
    (async () => {
      let data = await get_paths(id);
      setPaths(data);
      filterPaths.filterIds.length == 0 &&
        setFilterPaths((item: any) => ({ ...item, data: data }));
      // console.log("data---", data, id);
    })();


    // Define the media query for mobile view
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    // Function to update state based on media query result
    const handleMediaChange = (e: any) => {
      setIsMobile(e.matches); // `e.matches` is true if screen width <= 768px
    };

    // Initial check
    handleMediaChange(mediaQuery);

    // Listen for changes in the screen resolution
    mediaQuery.addListener(handleMediaChange);
    return () => {
      mediaQuery.removeListener(handleMediaChange);
    };

  }, []);

  const toDeviceString = (
    manufacture: string | null,
    model: string | null,
    platform: string | null,
    device_version: string | null
  ) =>
    `${ifNullThenString(manufacture)} ${
      manufacture != null && model != null ? "-" : ""
    }  ${ifNullThenString(model)} ${
      model != null && platform != null ? "-" : ""
    } ${ifNullThenString(platform)} ${
      platform != null && device_version != null ? "-" : ""
    }${ifNullThenString(device_version)}`;
  const ifNullThenString = (data: string | null) => (data ? data : "");

  const handleCheckboxChange = (pathId: any) => {
    if (filterPaths.filterIds.includes(pathId)) {
      let filterIds = filterPaths.filterIds.filter(
        (value: any) => value != pathId
      );
      let data =
        filterIds == 0
          ? paths
          : filterPaths.data.filter((path: any) => path.id != pathId);
      setFilterPaths({ data: data, filterIds: filterIds });
    } else {
      const parmData =
        filterPaths.filterIds.length == 0 ? [] : filterPaths.data;
      const arrayData = filterPaths.filterIds;
      arrayData.push(pathId);
      const data = paths.filter((path: any) => path.id == pathId);

      parmData.push(data[0]);
      setFilterPaths((value: any) => ({
        ...value,
        data: parmData,
        filterIds: arrayData,
      }));
    }
  };

  const RightPane = () => {
    return (
      <>
        <a
          href="/home"
          className={`${styles.btn} primary  text-capitalize pl-0 mr-2`}
        >
          <FaChevronLeft className={`${styles.chevron_style}  mr-2`} />
          BACK
        </a>
        <Map
          map_tasks_array={[]}
          style={{ height: "80vh" }}
          className={styles.map_div}
          paths={filterPaths.data}
        />
      </>
    );
  };

  const LeftPane = () => {
    return (
      <>
        <div className="table_cont mt-3">
          <table className="w-100 table table_responsive ">
            <thead>
              <tr>
                <th>Name</th>
                <th>Area</th>
                <th>Path start time</th>
                <th>Path end time</th>
                <th>Device</th>
                <th>Show on map</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paths?.map(function (path: any, index: number) {
                return (
                  <tr key={index}>
                    <td data-label="Name" className="td_name">
                      {" "}
                      {path?.name}
                    </td>
                    <td data-label="Area">{path?.area} m&sup2;</td>
                    <td data-label="Path stat time">{path?.start}</td>
                    <td data-label="Path end time">{path?.end}</td>
                    <td data-label="Device">
                      {toDeviceString(
                        path.device_manufacture,
                        path.device_model,
                        path.device_platform,
                        path.device_version
                      )}
                    </td>
                    <td data-label="Show on map">
                      <input
                        className="form-check-input js_path_show_on_map"
                        type="checkbox"
                        onChange={() => handleCheckboxChange(path.id)}
                      />
                    </td>
                    <td data-label="Actions">
                      <div className="js_path_delete btn btn-danger">
                        <FaTrash className="fas fa-trash mr-2" />
                        Delete path
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className={isMobile ? styles.container:styles.split_view_container}>
      {isMobile ? (
        <div style={{width:"100%"}}>
          <RightPane />
          <LeftPane />
        </div>
      ) : (
        <>
          <div className={styles.split_view_master}>
            <LeftPane />
          </div>
          <div className={styles.split_view_detail}>
            <RightPane />
          </div>
        </>
      )}
    </div>
  );
};

export default User_paths;
