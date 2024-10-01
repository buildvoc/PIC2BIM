import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { A as Authenticated } from "./AuthenticatedLayout-EGscpkuR.js";
import { usePage, Head, Link, router } from "@inertiajs/react";
import { T as Table } from "./Table-Cuhs9VeG.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faCheck, faTimes, faReply, faTrash, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import "react";
import "./ApplicationLogo-xMpxFOcX.js";
import "@headlessui/react";
import "lodash/get.js";
import "./TextInput-DlpAPKCb.js";
function Dashboard({ auth }) {
  const { task, user, errors } = usePage().props;
  if (typeof errors[0] != "undefined") {
    alert(errors[0]);
  }
  const deleteTask = (id) => {
    if (confirm("Delete task?")) {
      router.delete(route("tasks.destroy", id));
    }
  };
  const moveFromOpenTask = (task2) => {
    const textNote = prompt('Change status to "Data provided"?', task2.note);
    if (textNote && textNote.length > 0) {
      router.post(route("task.moveOpen", task2.id), { note: textNote });
    }
  };
  const acceptTask = (task2) => {
    if (confirm("Accept task?")) {
      router.post(route("tasks.bulkAccept", task2.id), { tasks: [task2.id] }, {
        onSuccess: (res) => {
        },
        onError: (err) => {
          console.log(err);
        }
      });
    }
  };
  const declineTask = (task2) => {
    const textNote = prompt("Decline task? Enter reason of decline, please.", "");
    if (textNote && textNote.length > 0) {
      router.post(route("tasks.decline"), { id: task2.id, reason: textNote });
    }
  };
  const returnTask = (task2) => {
    const textNote = prompt("Return task to farmer? Enter reason of reopening, please..", "");
    if (textNote && textNote.length > 0) {
      router.post(route("tasks.return"), { id: task2.id, reason: textNote }, {
        onSuccess: (res) => {
          console.log(res);
        },
        onError: (err) => {
          console.log(err);
        }
      });
    }
  };
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsxs("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: [
        user.surname + " " + user.name + " task detail",
        " "
      ] }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Task detail" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: /* @__PURE__ */ jsxs("span", { className: "hidden md:inline", children: [
                /* @__PURE__ */ jsxs(
                  Link,
                  {
                    className: "text-indigo-600 dark:text-indigo-400 mr-8",
                    href: route("users.show", user.id),
                    title: "Back",
                    children: [
                      /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faChevronLeft, className: "mr-2" }),
                      "Back"
                    ]
                  }
                ),
                user.surname + " " + user.name + " task detail"
              ] })
            }
          ),
          /* @__PURE__ */ jsx(
            Table,
            {
              columns: [
                {
                  label: "Status",
                  name: "status_sortorder.sortorder",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.status })
                },
                {
                  label: "Verified",
                  name: "surname",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, {})
                },
                {
                  label: "Purpose",
                  name: "purpose",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.purpose })
                },
                {
                  label: "Name",
                  name: "name",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.name })
                },
                {
                  label: "Note",
                  name: "text",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.note })
                },
                {
                  label: "Description",
                  name: "description",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.text })
                },
                {
                  label: "Repoen reason",
                  name: "text_returned",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.text_returned })
                },
                {
                  label: "Date created",
                  name: "date_created",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.date_created })
                },
                {
                  label: "due date",
                  name: "task_due_date",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: task.task_due_date })
                },
                {
                  label: "Actions",
                  name: "flag_id",
                  renderCell: (row) => /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs(Fragment, { children: [
                      task.flag_id === 1 && /* @__PURE__ */ jsx("div", { className: "mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600", children: "Accepted" }),
                      task.flag_id === 2 && /* @__PURE__ */ jsx("div", { className: "mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600", children: "Declined" }),
                      task.status === "data provided" && /* @__PURE__ */ jsxs(Fragment, { children: [
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: "mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_ack tt",
                            title: "Accept",
                            type: "button",
                            onClick: () => acceptTask(task),
                            children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faCheck })
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: "mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_decline tt",
                            title: "Decline",
                            type: "button",
                            onClick: () => declineTask(task),
                            children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faTimes })
                          }
                        ),
                        /* @__PURE__ */ jsx(
                          "button",
                          {
                            className: "mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_return tt",
                            title: "Return",
                            type: "button",
                            onClick: () => returnTask(task),
                            children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faReply })
                          }
                        )
                      ] }),
                      task.status === "new" && task.created_id == auth.user.id && /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "mr-2 btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 js_delete tt",
                          title: "Delete",
                          type: "button",
                          onClick: () => deleteTask(task.id),
                          children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faTrash })
                        }
                      )
                    ] }),
                    task.status === "new" && /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt",
                        title: "Move to Data provided",
                        type: "button",
                        onClick: () => moveFromOpenTask(task),
                        children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faSignOutAlt })
                      }
                    ),
                    task.status === "open" && /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt",
                        title: "Move to Data provided",
                        type: "button",
                        onClick: () => moveFromOpenTask(task),
                        children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faSignOutAlt })
                      }
                    ),
                    task.status === "returned" && /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "mr-2 btn bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 js_move_from_open tt",
                        title: "Move to Data provided",
                        type: "button",
                        onClick: () => moveFromOpenTask(task),
                        children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faSignOutAlt })
                      }
                    )
                  ] })
                }
              ],
              rows: [task]
            }
          )
        ] }) }) })
      ]
    }
  );
}
export {
  Dashboard as default
};
