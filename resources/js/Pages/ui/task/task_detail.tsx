"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./tasks_detail.module.css";
import useLocalStorage from "@/hooks/useLocalStorage";
import { get_tasks_photos, update_status } from "@/api/api_client";
import { FaChevronLeft } from "react-icons/fa";
import TaskGallery from "../task_gallery/task_gallery";
import { FaSignOutAlt } from "react-icons/fa";
import { loadJQuery } from "@/utils/helpers";

const Task_detail = () => {
  //Params
  const searchParams = useSearchParams();
  const taskId: any = searchParams.get("task_id");
  //States
  const [user, setUser] = useState<any>();
  //local sotrage
  const [task, setTaskData] = useLocalStorage("tasks", []);
  const [selectedTaskPhotos, setSelectedTasksPhoto] = useLocalStorage(
    "tasksPhotos",
    []
  );

  useEffect(() => {
    const initJQuery = async () => {
      const $ = await loadJQuery();
      var timer: any;
      $(document).on("click", ".js_move_from_open", async function () {
        let text_note = prompt('Change status to "Data provided"?', "");

        if (text_note != null) {
          //Hit api here
          let status = await update_status(
            task[0]?.id,
            "DATA PROVIDED",
            text_note
          );
        }
      });
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
  }, []);

  return (
    <div className={styles.container}>
      {user?.name && <h2>{task?.farmer_name} task detail</h2>}
      <a
href="/home"        className={`${styles.btn} primary  text-capitalize pl-0 mr-2`}
      >
        <FaChevronLeft className={`${styles.chevron_style}  mr-2`} />
        BACK
      </a>
      <div className="table_cont mt-3">
        <table className="w-100 table table_responsive">
          <thead>
            <tr>
              <th>Status</th>
              <th>Purpose</th>
              <th>Name</th>
              <th>Note</th>
              <th>Description</th>
              <th>Reopen reason</th>
              <th>Date creted</th>
              <th>Due date</th>
              <th style={{ minWidth: "200px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {task?.map(function (task: any, index: number) {
              return (
                <tr key={index}>
                  <td data-label="Status">{task.status}</td>
                  <td data-label="Purpose"></td>
                  <td data-label="Name">{task.name}</td>
                  <td data-label="Note">{task.note}</td>
                  <td data-label="Description">{task.text}</td>
                  <td data-label="Reopen reason"></td>
                  <td data-label="Date created">
                    {task.date_created.split(" ")[0]}
                  </td>
                  <td data-label="Due date">
                    {task.task_due_date.split(" ")[0]}
                  </td>
                  {(task.status === "new" || task.status === "open") && (
                    <td data-label="Acception" className="tooltip-container">
                      {
                        <a className="btn btn-success btn_status js_move_from_open tt">
                          <FaSignOutAlt className="fas " />
                          <span className="tt_body">Move to Data provided</span>
                        </a>
                      }
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TaskGallery taskPhotos={selectedTaskPhotos} />
    </div>
  );
};

export default Task_detail;
