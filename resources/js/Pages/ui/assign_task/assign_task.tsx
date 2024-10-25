"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./assign_task.module.css";
import { FaChevronLeft } from "react-icons/fa";
import { loadJQuery } from "@/utils/helpers";
import { get_unassigned_photos, get_photo } from "@/api/api_client";
import { get_auth_session } from "@/utils/auth_operations";
import { authenticated_user } from "@/types/user_types";
import useLocalStorage from "@/hooks/useLocalStorage";
import Modal_ from "../modal/modal";
import DropdownMap from "../map/dropdown_map";
const AssignTask = ({isUnassigned}:any) => {
  //Params
  const searchParams = useSearchParams();
  const ids: any = searchParams.get("ids");
  const [photos, setPhotos] = useState<any>([]);
  const [showModal, setShowModal] = useState({ isShow: false, index: -1 });
  const [selectedTaskPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );

  const handleClose = () => setShowModal({ isShow: false, index: -1 });

  const handlePhotoCheckBox = (id: number) => {
    const withCheckUpdate = photos.map((photo: any) => {
      if (photo?.photo?.digest === id) {
        const check = !photo.hasOwnProperty("check") ? true : !photo?.check;
        return { ...photo, check: check };
      }
      return photo;
    });

    setPhotos(withCheckUpdate);
    !isUnassigned && setSelectedTasksPhoto(withCheckUpdate);
  };

  useEffect(() => {
    const selectedIdsArray = ids ? ids.split(',') : [];
    const initJQuery = async () => {
      const $ = await loadJQuery();
      var timer: any;
      $(".tt").hover(
        function () {
          clearTimeout(timer);
          var elem = this;
          timer = setTimeout(function () {
            $(elem).find(".tt_body").fadeIn(250);
          }, 750);
        },
        function () {
          $(this).find(".tt_body").hide();
          clearTimeout(timer);
        }
      );

      return () => {
        $(".tt").off("hover");
        $("click").off("click");
      };
    };
    if (typeof window !== "undefined") {
      initJQuery();
    }

    const fetchData = async () => {
      var task_photo_data;
      var map_unassigned_array = [];
      const session: any = await get_auth_session();
      let user: authenticated_user = await JSON.parse(session?.value);

 

      for (let id of selectedIdsArray) {
        const result = await get_photo(id);
        // photos_array.push(result)
        task_photo_data = {
          id: id,
          farmer_name: `${user.name} ${user.surname}`,
          photo: result,
          location: [result?.lng, result?.lat]
        };

        // setUnAssignedPhotos(map_unassigned_array);
        map_unassigned_array.push(task_photo_data);
      }
      setPhotos(map_unassigned_array)
    };

    fetchData();
  }, []);

  return (
    <div className={styles.container}>
      {<h2 style={{}}>Photo Gallery</h2>}
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <a
          href="/photo_gallery"
          className={`${styles.btn} primary  text-capitalize pl-0 mr-2`}
        >
          <FaChevronLeft className={`${styles.chevron_style}  mr-2 `} />
          BACK
        </a>
      </div>
      <DropdownMap map_tasks_array={photos}  isSelected={true} />
      <div style={{ display: "flex", flexDirection: "column" }} id="task">

      <div id="task_photos">
        {photos?.map(function (task: any, index: number) {
          const imageSrc = `data:image/jpeg;base64,${task?.photo?.photo}`;
          return (
            <div className="thumb" key={task?.photo?.digest}>
              <input
                className="assign_photo_input"
                data-field="status"
                data-fieldtype="new"
                type="checkbox"
                onChange={()=>{}}
                checked={true}
              />
              <label
                className="thumbnail"
                style={{ transform: `rotate(${task?.angle}deg)` }}
                onClick={() => {
                  setShowModal({
                    isShow: true,
                    index: index,
                  });

                  handlePhotoCheckBox(task?.photo?.digest);
                }}
              >
                <img src={imageSrc} />
              </label>
              <div className="js_photo_metadata_popup">
                <table className={`${styles.table}`}>
                  <tbody>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_lat_title }}">
                          Latitude
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_lat }}">{task?.photo?.lat}</label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_lng_title }}">
                          Longitude
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_lng }}">{task?.photo?.lng}</label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_alt_title }}">
                          Altitude
                        </label>
                      </td>
                      <td>{/* <label title="{{ pht_alt }}"> m</label> */}</td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_azimuth_title }}">
                          Azimut
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_azimuth }}">
                          {task?.photo?.photo_heading}
                        </label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_angle_title }}">
                          Vertical angle
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_angle }}"></label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_note_title }}">
                          Note
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_note }}">
                          {task?.photo?.note}
                        </label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="dark" title="{{ pht_device_title }}">
                          Device
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_device }}"></label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label
                          className="dark"
                          title="{{ pht_accuracy_title }}"
                        >
                          Accuracy
                        </label>
                      </td>
                      <td>
                        {/* <label title="{{ pht_accuracy }}"> m</label> */}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label
                          className="dark"
                          title="{{ pht_distance_title }}"
                        >
                          Distance
                        </label>
                      </td>
                      <td>
                        {/* <label title="{{ pht_distance }}">m</label> */}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label
                          className="dark"
                          title="{{ pht_distance_nmea_title }}"
                        >
                          Distance (GNSS)
                        </label>
                      </td>
                      <td>
                        {/* <label title="{{ pht_distance_nmea }}"> m</label> */}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label
                          className="dark"
                          title="{{ pht_timestamp_title }}"
                        >
                          Timestamp
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_timestamp }}"></label>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label
                          className="dark"
                          title="{{ pht_created_date_title }}"
                        >
                          Created (UTC)
                        </label>
                      </td>
                      <td>
                        <label title="{{ pht_created_date }}">
                          {task?.photo?.created}
                        </label>
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>
                        <label className="js_open_ekf" data-id="123">
                          Show EKF metadata
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    {
      photos.length>0&&(
        <div className="js_assign_photos_task_select">
        <div>
          <select className="form-select" name="task_id" id="js_assign_photo_task_id_select">
              <option value="{{ task.id }}">value</option>
              <option value="{{ task.id }}">value</option>
              <option value="{{ task.id }}">value</option>
              <option value="{{ task.id }}">value</option>
          </select>
          <button type="button" className="mt-2 mb-2 btn btn-primary js_button_confirm_task_select">ASSIGN</button>
        </div>
      </div>
      )
    }
      <Modal_
        modal={showModal}
        handleClose={handleClose}
        photos={photos}
        setModal={setShowModal}
      />
    </div>

  );
};

export default AssignTask;
