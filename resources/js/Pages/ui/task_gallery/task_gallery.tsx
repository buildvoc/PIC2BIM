"use client";
import styles from "./task_gallery.module.css";
import Map from "../map/map";
import { FaSync } from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { useCallback, useEffect, useState } from "react";
import Modal_ from "../modal/modal";
import { loadJQuery } from "@/utils/helpers";
import { FaTimesCircle } from "react-icons/fa";
import DropdownMap from "../map/dropdown_map";
import useLocalStorage from "@/hooks/useLocalStorage";
import Link from "next/link";
import { FaChevronLeft } from "react-icons/fa";

import { FaTrash } from "react-icons/fa";

const TaskGallery = ({ taskPhotos, isUnassigned, onClick }: any) => {
  const [photos, setPhotos] = useState(taskPhotos);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedPhotosId, setSelectedPhotosId] = useState("");
  const [showModal, setShowModal] = useState({ isShow: false, index: -1 });
  const [selectedTaskPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );
  const [unassingedSelect, setUnassingedSelect] = useState();
  console.log("Re render---");
  useEffect(() => {
    const initJQuery = async () => {
      const $ = await loadJQuery();
      $(document)
        .on("click", ".js_open_ekf", async function () {
          $(".js_hidden_ekf").fadeIn(200);
        })
        .on("click", ".close_popup", function () {
          $(this).parent().fadeOut(200);
        });
      return () => {
        $("click").off("click");
      };
    };
    if (typeof window !== "undefined") {
      initJQuery();
    }
    const photosValue = taskPhotos;
    setPhotos(photosValue);
  }, [taskPhotos]);

  useEffect(()=>{

    // Define the media query for mobile view
    const mediaQuery = window.matchMedia("(max-width: 750px)");

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
  },[])

  const handleRotate = (id: number, direction: string) => {
    const withAngleUpdate = photos.map((photo: any) => {
      if (photo?.photo?.digest === id) {
        const newAngle = photo?.angle
          ? direction === "left"
            ? photo?.angle - 90
            : photo?.angle + 90
          : direction === "left"
          ? -90
          : 90;
        return { ...photo, angle: newAngle };
      }
      return photo;
    });
    !isUnassigned && setSelectedTasksPhoto(withAngleUpdate);
    setPhotos(withAngleUpdate);
  };

  const handleClose = () => setShowModal({ isShow: false, index: -1 });

  const removeAllCheck = () => {
    const withCheckUpdate = photos.map((photo: any) => {
      return { ...photo, check: false };
    });

    setPhotos(withCheckUpdate);
  };

  const selectAllCheck = () => {
    const withCheckUpdate = photos.map((photo: any) => {
      return { ...photo, check: true };
    });

    setPhotos(withCheckUpdate);
  };

  const checkIfPhotoSelect = () => {
    let selectedPhotos = photos.some((item: any) => item.check == true);
    if (selectedPhotos) {
      return true;
    } else {
      // alert("No photo selected!");
      return false;
    }
  };
  const checkIfPhotoSelectPdf = () => {
    let selectedPhotos = photos.some((item: any) => item.check == true);
    if (selectedPhotos) {
      return true;
    } else {
      alert("No photo selected!");
      return false;
    }
  };

  const selectedIdArray: any = () => {
    let selectedId = photos.map((photo: any) => {
      if (photo.check) {
        return photo.id;
      }
      return null;
    });
    selectedId = selectedId.filter((id: any) => id != null);

    return selectedId.join(",");
    // checkIfPhotoSelect()&&window.open(`/choose_task`);
  };

  const handlePhotoCheckBox = (id: string) => {
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

  //Method
  const handleZoomFilter = (leaves: any) => {
    // console.log("Filter ids", selectedPhotoIds,taskPhotos);
    const filteredPhotos = taskPhotos.filter((photo: any) =>
      leaves.includes(photo.id)
    );
    setPhotos(filteredPhotos);
  };

  useEffect(() => {
    if (selectedPhotosId.length > 0) {
      handlePhotoCheckBox(selectedPhotosId);
    }
  }, [selectedPhotosId]);

  const LeftPane = () => {
    return (
      <>
        <div id="task_photos">
          {photos?.map(function (task: any, index: number) {
            const imageSrc = `data:image/jpeg;base64,${task?.photo?.photo}`;

            return (
              <div className="thumb" key={task?.photo?.digest}>
                <div className="top_action_bar">
                  <div className="js_photo_rotate">
                    {isUnassigned && (
                      <div
                        className="icon_cont"
                        style={{ color: "rgb(50, 173, 230)" }}
                      >
                        <FaTrash className="fas fa-trash " />
                      </div>
                    )}

                    <div
                      className="icon_cont js_photo_rotate_left"
                      onClick={() => handleRotate(task?.photo?.digest, "left")}
                    >
                      <FaSync
                        className="fas"
                        style={{ transform: "scaleX(-1)" }}
                      />
                    </div>
                    <div
                      className="icon_cont js_photo_rotate_right"
                      onClick={() => handleRotate(task?.photo?.digest, "right")}
                    >
                      <FaSync className="fas" />
                    </div>
                  </div>
                </div>
                <input
                  className="assign_photo_input"
                  data-field="status"
                  data-fieldtype="new"
                  type="checkbox"
                  onChange={() => {}}
                  checked={task?.check ? task?.check : false}
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
                  <div
                    className="icon_cont js_photo_select"
                    onClick={() => handlePhotoCheckBox(task?.photo?.digest)}
                  >
                    <FaCheck className="fas" /> Select
                  </div>
                  <table className={`${styles.table}`}>
                    <tbody>
                      <tr>
                        <td>
                          <label className="dark" title="{{ pht_lat_title }}">
                            Latitude
                          </label>
                        </td>
                        <td>
                          <label title="{{ pht_lat }}">
                            {task?.photo?.lat}
                          </label>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <label className="dark" title="{{ pht_lng_title }}">
                            Longitude
                          </label>
                        </td>
                        <td>
                          <label title="{{ pht_lng }}">
                            {task?.photo?.lng}
                          </label>
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
                          <label
                            className="dark"
                            title="{{ pht_azimuth_title }}"
                          >
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
                          <label
                            className="dark"
                            title="{{ pht_device_title }}"
                          >
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
        <div className="js_hidden_ekf">
          <span className="close_popup">
            <FaTimesCircle
              className="fas fa-times-circle"
              style={{ background: "white" }}
            />
          </span>
          <table>
            <tbody>
              <tr>
                <td></td>
                <td className="bold">GPS L1</td>
                <td className="bold">GPS L5</td>
                <td className="bold">GPS Iono Free (L1/L5)</td>
                <td className="bold">Galileo E1</td>
                <td className="bold">Galileo E5a</td>
                <td className="bold">Galileo Iono Free (E1/E5a)</td>
              </tr>
              <tr>
                <td className="bold">Latitude</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="bold">Longitude</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="bold">Altitude</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="bold">Reference</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td className="bold">Time</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <Modal_
          modal={showModal}
          handleClose={handleClose}
          photos={photos}
          setModal={setShowModal}
          rotateLeft={(digest: any) => handleRotate(digest, "left")}
          rotateRight={(digest: any) => handleRotate(digest, "right")}
        />
      </>
    );
  };

  const RightPane = useCallback(() => {
    return (
      <>
        <DropdownMap
          map_tasks_array={taskPhotos}
          isUnassigned={isUnassigned}
          onClick={(id: any, digest: any) => setSelectedPhotosId(digest)}
          zoomFilter={handleZoomFilter}
        />
        <div className="float-left w-100 unassigned-actions-row">
          {isUnassigned && (
            <div>
              <button
                className="js_select_all_photos btn btn-outline-secondary text-capitalize mb-2 mr-lg-2 mr-2"
                onClick={() => {
                  selectAllCheck();
                }}
              >
                Select All
              </button>
              <button
                onClick={() => {
                  removeAllCheck();
                }}
                className="js_deselect_all_photos btn btn-outline-secondary text-capitalize mb-2 mr-lg-2 mr-2"
              >
                Cancel Selection
              </button>
              <button
                type="button"
                className="js_photo_multi_delete btn btn-danger text-capitalize mb-2 "
              >
                <FaTrash className="fas fa-trash mr-2" />
                Delete Selected
              </button>
            </div>
          )}

          <div>
            {isUnassigned && checkIfPhotoSelect() && (
              <Link
                href={{
                  pathname: "/photo_gallery_",
                  query: { ids: selectedIdArray() },

                  // Convert array to comma-separated string
                }}
                type="button"
                className="js_button_open_task_select btn btn-primary mb-2 ml-lg-auto mr-2"
              >
                Choose Task
              </Link>
            )}

            <a
              id="task_pdf_export"
              target="_blank"
              className="btn btn-primary text-capitalize mb-2 ml-lg-2 mr-2"
              onClick={() => {
                if (photos.length > 0) {
                  let values = photos.map((photo: any) => photo.id);
                  window.open(
                    `/pdf_preview?selected=${
                      isUnassigned ? true : false
                    }&photo_gallery=${
                      isUnassigned ? true : false
                    }&&ids=${values}&length=${photos.length}`
                  );
                }
              }}
            >
              Export To PDF
            </a>
            <a
              id="task_pdf_export_selected"
              target="_blank"
              className="btn btn-primary text-capitalize mb-2 ml-lg-2"
              // href={`/pdf_preview?selected=${true}`}
              onClick={() => {
                checkIfPhotoSelectPdf() &&
                  window.open(
                    `/pdf_preview?selected=${true}&photo_gallery=${
                      isUnassigned ? true : false
                    }&ids=${selectedIdArray()}&length=${photos.length}`
                  );
              }}
            >
              Export Selected To PDF
            </a>
          </div>
        </div>
      </>
    );
  }, [taskPhotos]);

  const ContentHeader = () => {
    return (
      <>
        {<h2 style={{}}>Photo Gallery</h2>}
        <div style={{ marginTop: 20, marginBottom: 20 }}>
          <a
            href="/home"
            className={`${styles.btn} primary  text-capitalize pl-0 mr-2`}
          >
            <FaChevronLeft className={`${styles.chevron_style}  mr-2 `} />
            BACK
          </a>
        </div>
      </>
    );
  };

  return (
    <div id="task" className={isUnassigned?isMobile?styles.container:styles.split_view_container:styles.container}>
      {isUnassigned ? (
        isMobile ? (
          <>
            <RightPane />
            <LeftPane />
          </>
        ) : (
          <>
            <div className={styles.split_view_master}>
              <LeftPane />
            </div>
            <div className={styles.split_view_detail}>
              <ContentHeader />
              <RightPane />
            </div>
          </>
        )
      ) : (
        <>
          <RightPane />
          <LeftPane />
        </>
      )}
    </div>
  );
};

export default TaskGallery;
