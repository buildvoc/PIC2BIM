"use client";
import "mapbox-gl/dist/mapbox-gl.css";
import { FaSearch } from "react-icons/fa";
import dashStyles from "../dashboard.module.css";
import styles from "./farmers_tasks.module.css";
// import { get_auth_session } from "@/utils/auth_operations";
// import { authenticated_user } from "@/types/user_types";
import { useState, useEffect, useRef } from "react";
import { get_tasks, get_tasks_photos } from "../../api/api_client";
import { FaTimesCircle } from "react-icons/fa";
import { FaCircleArrowDown } from "react-icons/fa6";
import { filters_data } from "../..//data/constants";
// import { useRouter } from "next/navigation";
import useLocalStorage from "../../hooks/useLocalStorage";
// import { useTasks } from "@/hooks/TaskContext";
import DropdownMap from "../../map/dropdown_map";
import { PageProps, PaginatedData } from "@/types";

const FarmersTasks = ({ auth }: PageProps) => {
  //Variables
  // const router = useRouter();
  //Tasks state
  const [filter_tasks, set_filter_tasks] = useState<any>([]);
  const [filter_tasks_photos, set_filter_tasks_photos] = useState<any>([]);
  const [local_tasks_photos, set_local_tasks_photos] = useState<any>([]);
  const [taskData, setTaskData] = useLocalStorage("tasks", []);
  const [isMobile, setIsMobile] = useState(false);

  // const [tasks, setTasks] = useState([]);
  const [selectedTasksPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );
  const [selectedFilters, setSelectedFilters] = useState(() => {
    try {
      const savedFilters = localStorage?.getItem("selectedFilters");
      return savedFilters ? JSON.parse(savedFilters) : {};
    } catch (e) {
      return null;
    }
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  //Refs
  const previousTasksRef = useRef<any>([]);
  //useContext
  // const { tasksPhotos, setTasksPhotos, setUser, user } = useTasks();
  //Custom hook
  const [tasks, setTasks] = useState([]);
  const [tasksPhotos, setTasksPhotos] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      var map_tasks_array: any = [];
      var map_tasks_array_local: any = [];

      // const session: any = await get_auth_session();
      // let user: authenticated_user = await JSON.parse(session?.value);
      // setUser(user);
      let result_task = await get_tasks(auth.user.id);

      for (let task of result_task) {
        const result = await get_tasks_photos(task?.id, auth.user?.id);
        if (result[0]) {
          let task_photo_data = {
            id: task?.id,
            status: task?.status,
            farmer_name: `${auth.user.name} ${auth.user.surname}`,
            task_name: task?.name,
            note: task?.note,
            text: task?.text,
            date_created: task.date_created,
            task_due_date: task.task_due_date,
            photo: result,
            location: [result[0]?.lng, result[0]?.lat],
          };
          let task_photo_data_local = { ...task_photo_data };
          task_photo_data_local.photo = result[0];
          map_tasks_array_local.push(task_photo_data_local);
          map_tasks_array.push(task_photo_data);
        }
      }

      setTasksPhotos(map_tasks_array);
      set_filter_tasks_photos(map_tasks_array_local);
      set_local_tasks_photos(map_tasks_array_local);
      setTasks(result_task);
    };

    // Define the media query for mobile view
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    // Function to update state based on media query result
    const handleMediaChange = (e:any) => {
      setIsMobile(e.matches); // `e.matches` is true if screen width <= 768px
    };

    // Initial check
    handleMediaChange(mediaQuery);

    // Listen for changes in the screen resolution
    mediaQuery.addListener(handleMediaChange);

    // Clean up the listener on component unmount

    fetchData();
    return () => {
      previousTasksRef.current = null;
      mediaQuery.removeListener(handleMediaChange);
    };
  }, []);

  useEffect(() => {
    //Set all filters
    if (!Object.keys(selectedFilters).length) {
      let filters_json = {};
      for (let item of filters_data) {
        filters_json = { ...filters_json, [item]: true };
      }
      setSelectedFilters(filters_json);
    }
    applyFilters(false);
  }, [tasks]);

  useEffect(() => {
    previousTasksRef.current = filter_tasks_photos;
    update_map_source(filter_tasks);
  }, [filter_tasks]);

  //Functions

  const areTasksEqual = (prevTasks: string[], nextTasks: string[]): boolean => {
    if (prevTasks.length !== nextTasks.length) {
      return false;
    }
    return prevTasks.every((task, index) => task === nextTasks[index]);
  };

  const handle_toggle_task_details = (taskId: any) => {
    const selectedTask = tasks.filter((res: any) => res?.id == taskId);
    const selectedTaskPhotos = tasksPhotos.filter(
      (res: any) => res?.id == taskId
    );

    if (selectedTaskPhotos.length == 0) {
      setTaskData(selectedTask);
      setSelectedTasksPhoto([]);
      // router.push(`/task`);
      return;
    }
    let map_tasks_array = [];
    for (let item of selectedTaskPhotos[0]?.photo) {
      let task_photo_data = {
        id: taskId,
        status: selectedTaskPhotos[0]?.status,
        farmer_name: `${auth.user.name} ${auth.user.surname}`,
        task_name: selectedTaskPhotos[0]?.task_name,
        note: selectedTaskPhotos[0]?.note,
        text: selectedTaskPhotos[0]?.text,
        date_created: selectedTaskPhotos[0]?.date_created,
        task_due_date: selectedTaskPhotos[0]?.task_due_date,
        photo: item,
        location: [item?.lng, item?.lat],
      };
      map_tasks_array.push(task_photo_data);
    }
    setTaskData(selectedTask);
    setSelectedTasksPhoto(map_tasks_array);
    // router.push(`/task`);
  };

  const update_map_source = async (filter_data: []) => {
    const task_1 = new Set(filter_data.map((task: any) => task.id));
    const task_2 = new Set(local_tasks_photos.map((task: any) => task.id));
    const common_id = [...task_1].filter((id) => task_2.has(id));
    const filter_tasks_photos = local_tasks_photos.filter((task: any) =>
      common_id.includes(task.id)
    );
    if (!areTasksEqual(previousTasksRef.current, filter_tasks_photos)) {
      set_filter_tasks_photos(filter_tasks_photos);
    }
  };

  const handle_search_submission = async (event: any) => {
    const { search } = Object.fromEntries(event);
    //Take filered array and search on the bases of name
    if (search.length > 0) {
      const filtered = filter_tasks.filter((task: any) =>
        task.name.toLowerCase().includes(search.toLowerCase())
      );
      set_filter_tasks(filtered);
    } else {
      applyFilters(true);
    }
  };

  const sortData = (key: any) => {
    let direction = "asc";
    if (key != "reset") {
      if (
        (sortConfig.key === key && sortConfig.direction === "asc") ||
        sortConfig.key == null
      ) {
        direction = "desc";
      }

      const sortedByName = [...filter_tasks].sort((a: any, b: any) => {
        if (direction == "asc") {
          switch (key) {
            case "status":
              if (a.status < b.status) return -1;
              if (a.status > b.status) return 1;
              break;
            case "photo taken":
              if (a.number_of_photos < b.number_of_photos) return -1;
              if (a.number_of_photos > b.number_of_photos) return 1;
              break;
            case "name":
              if (a.name < b.name) return -1;
              if (a.name > b.name) return 1;
              break;
            case "description":
              if (a.text < b.text) return -1;
              if (a.text > b.text) return 1;
              break;
            case "date created":
              if (a.date_created < b.date_created) return -1;
              if (a.date_created > b.date_created) return 1;
              break;
            case "due date":
              if (a.task_due_date < b.task_due_date) return -1;
              if (a.task_due_date > b.task_due_date) return 1;
              break;
            case "acception":
              if (a.flag_valid < b.flag_valid) return -1;
              if (a.flag_valid > b.flag_valid) return 1;
              break;
            case "reset":
              if (a.status < b.status) return -1;
              if (a.status > b.status) return 1;
              break;
            default:
              return 1;
          }
        }
        return -1;
      });
      set_filter_tasks(sortedByName);
      setSortConfig({ key, direction });
    } else {
      const sortedByName = [...filter_tasks].sort((a, b) => {
        if (a.status < b.status) {
          return -1;
        }
        return 0;
      });
      key = "status";
      set_filter_tasks(sortedByName);
      setSortConfig({ key, direction });
    }
  };

  const applyFilters = (force_filter: any) => {
    if (filter_tasks.length == 0 || force_filter) {
      var data: any = [];

      for (const key in selectedFilters) {
        switch (key) {
          case "new":
            if (selectedFilters["new"]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.status === key),
              ];
            }
            break;
          case "open":
            if (selectedFilters["open"]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.status === key),
              ];
            }
            break;
          case "data provided":
            if (selectedFilters["data provided"]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.status === key),
              ];
            }
            break;
          case "returned":
            if (selectedFilters["returned"]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.status === key),
              ];
            }
            break;
          case "accepted":
            if (selectedFilters[key]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.flag_valid === "1"),
              ];
            }
            break;
          case "declined":
            if (selectedFilters[key]) {
              data = [
                ...data,
                ...tasks?.filter((task: any) => task.flag_valid === "2"),
              ];
            }
            break;
          default:
            break;
        }
      }
      set_filter_tasks(data);
    }
  };

  const handleCheckboxChange = (event: any) => {
    const { dataset, checked } = event.target;
    const { fieldtype } = dataset;
    const newFilters = { ...selectedFilters, [fieldtype]: checked };
    setSelectedFilters(newFilters);
    localStorage.setItem("selectedFilters", JSON.stringify(newFilters));

    if (checked) {
      fieldtype == "after deadline"
        ? sortData("reset")
        : fieldtype == "accepted"
        ? set_filter_tasks([
            ...filter_tasks,
            ...tasks?.filter((task: any) => task.flag_valid === "1"),
          ])
        : fieldtype == "declined"
        ? set_filter_tasks([
            ...filter_tasks,
            ...tasks?.filter((task: any) => task.flag_valid === "2"),
          ])
        : set_filter_tasks([
            ...filter_tasks,
            ...tasks?.filter((task: any) => task.status === fieldtype),
          ]);
    } else {
      fieldtype == "after deadline"
        ? sortData("status")
        : fieldtype == "accepted"
        ? set_filter_tasks(
            filter_tasks?.filter((task: any) => task.flag_valid !== "1")
          )
        : fieldtype == "declined"
        ? filter_tasks?.filter((task: any) => task.flag_valid !== "2")
        : set_filter_tasks(
            filter_tasks?.filter((task: any) => task.status !== fieldtype)
          );
    }
  };

  const LeftPane = () => {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            sortData("reset");
          }}
          className={`clickResetSort btn ${styles.cancle_sorting}  primary pl-0 mt-3`}
        >
          <FaTimesCircle
            className={`fas fa-times-circle mr-2 icon`}
            size={18}
          />
          CANCEL SORTING
        </button>
        <div className="showing-count">{`Showing ${filter_tasks.length} out of ${tasks.length}`}</div>
        {tasks.length > 0 && (
          <div className="table_cont" >
            <table className="w-100 table float-md-left js_table  table_responsive">
              <thead>
                <tr>
                  <th
                    className={`clicksort ${
                      (sortConfig.key == "status" || sortConfig.key == null) &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("status")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Status
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "photo taken" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("photo taken")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Photos taken
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "name" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("name")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Name
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "description" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("description")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Description
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "date created" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("date created")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Date created
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "due date" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("due date")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Due date
                  </th>
                  <th
                    className={`clicksort ${
                      sortConfig.key == "acception" &&
                      (sortConfig.direction == "asc" ? "ASC" : "DESC")
                    }`}
                    onClick={() => sortData("acception")}
                  >
                    <span className="sortflag">
                      <FaCircleArrowDown className="fas" />{" "}
                    </span>
                    Acception
                  </th>
                </tr>
              </thead>
              <tbody>
                {filter_tasks?.map(function (task: any, index: number) {
                  return (
                    <tr
                      key={index}
                      className="clickable"
                      onClick={() => handle_toggle_task_details(task.id)}
                    >
                      <td data-label="Status">
                        <span
                          className={`task_status  ${
                            task.status === "data checked"
                              ? `datachecked_${task.flag_valid}`
                              : task.status.replace(" ", "").toLowerCase()
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td data-label="Photos taken">
                        {task.photos_ids.length}
                      </td>
                      <td data-label="Name">{task.name}</td>
                      <td data-label="Description">{task.text}</td>
                      <td data-label="Date created">
                        {task.date_created.split(" ")[0]}
                      </td>
                      <td data-label="Due date">
                        {task.task_due_date.split(" ")[0]}
                      </td>
                      <td data-label="Acception">
                        {task.status == "data provided" ? (
                          <div className="btn btn-light btn_status w-100p">
                            waiting
                          </div>
                        ) : (
                          task.flag_valid === "1" && (
                            <div className="btn btn-success btn_status w-100p">
                              Accepted
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };
  const RightPane = () => {
    return (
      <div>
        <h2>Tasks</h2>
        <div className="pt-2 pb-2 mb-3">
          <a
            href={`/photo_gallery`}
            className="btn btn-primary mb-2 d-block d-md-inline"
          >
            PHOTO GALLERY
          </a>
          <a
            href={`/user_paths?id=${auth.user.id}`}
            className="btn btn-primary mb-2 ml-md-2 d-block d-md-inline"
          >
            SHOW PATHS
          </a>
        </div>
        <DropdownMap
          map_tasks_array={filter_tasks_photos}
          onClick={handle_toggle_task_details}
        />
        <nav className="navbar navbar-light bg-transparent">
          <form action={handle_search_submission} className="form-inline">
            <input
              className="form-control mr-sm-2 js_search_input mb-0 input-light"
              type="search"
              name="search"
              aria-label="Search"
            />
            <button type="submit" className="btn js_search px-2 pt-2">
              {" "}
              <FaSearch className="primary" size={18} />
            </button>
          </form>
        </nav>

        <div className="filter_section">
          <h5>Status filter:</h5>
          <div className="status_filters">
            <div className="form-check">
              <input
                id="filter_status_new"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="status"
                data-fieldtype="new"
                checked={selectedFilters && !!selectedFilters["new"]}
                onChange={handleCheckboxChange}
                value="1"
              ></input>
              <label className="form-check-label">New</label>
            </div>
            <div className="form-check">
              <input
                id="filter_status_open"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="status"
                data-fieldtype="open"
                checked={selectedFilters && !!selectedFilters["open"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label">Open</label>
            </div>
            <div className="form-check">
              <input
                id="filter_status_provided"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="status"
                data-fieldtype="data provided"
                checked={selectedFilters && !!selectedFilters["data provided"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label">Data provided</label>
            </div>
            <div className="form-check">
              <input
                id="filter_status_returned"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="status"
                data-fieldtype="returned"
                checked={selectedFilters && !!selectedFilters["returned"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label">Returned</label>
            </div>
            <div className="form-check">
              <input
                id="filter_status_checked"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="flag"
                data-fieldtype="accepted"
                checked={selectedFilters && !!selectedFilters["accepted"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label">Accepted</label>
            </div>
            <div className="form-check">
              <input
                id="filter_status_closed"
                type="checkbox"
                className="form-check-input changeFilter"
                data-field="flag"
                data-fieldtype="declined"
                checked={selectedFilters && !!selectedFilters["declined"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label">Declined</label>
            </div>
          </div>

          <h5 className="mt-3">Sort:</h5>
          <div className="advanced_sorting">
            <div className="form-check">
              <input
                id="after_deadline_to_end"
                type="checkbox"
                className="form-check-input clicksort"
                data-field="after deadline"
                data-fieldtype="after deadline"
                checked={selectedFilters && !!selectedFilters["after deadline"]}
                onChange={handleCheckboxChange}
                value="1"
              />
              <label className="form-check-label ">After deadline last</label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={dashStyles.container}>
      <div className={dashStyles.content}>
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
      </div>
    </div>
  );
};

export default FarmersTasks;
