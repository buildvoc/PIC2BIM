import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { A as Authenticated } from "./AuthenticatedLayout-EGscpkuR.js";
import { usePage, Head, Link, router } from "@inertiajs/react";
import { T as Table } from "./Table-Cuhs9VeG.js";
import { PlusCircleIcon } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { useState, useEffect } from "react";
import "./ApplicationLogo-xMpxFOcX.js";
import "@headlessui/react";
import "lodash/get.js";
import "./TextInput-DlpAPKCb.js";
function Dashboard({ auth }) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  const handleCheckboxChange = (taskId) => {
    setSelectedTasks(
      (prevSelected) => prevSelected.includes(taskId) ? prevSelected.filter((id) => id !== taskId) : [...prevSelected, taskId]
    );
  };
  const { tasks, sortColumn, sortOrder, search, user, selectedStatuses, errors, filtersVal } = usePage().props;
  if (typeof errors[0] != "undefined") {
    alert(errors[0]);
  }
  const {
    data,
    total,
    links
  } = tasks;
  function handlePageChange(url) {
    router.get(url + "&sortOrder=" + sortOrder + "&sortColumn=" + sortColumn + "&seach=" + search);
  }
  function reset() {
    router.get(route("users.show", user.id));
  }
  function handleSort(column, order) {
    applyFilters({ search, sortColumn: column, sortOrder: order, filters: selectedStatus });
  }
  function handleSearch(q) {
    applyFilters({ search: q, sortColumn, sortOrder, filters: selectedStatus });
  }
  async function applyFilters(params) {
    const queryString = new URLSearchParams({
      search: params.search || "",
      sortColumn: params.sortColumn || "",
      sortOrder: params.sortOrder || "",
      status: params.filters.join(",")
    }).toString();
    router.get(route("users.show", user.id) + "?" + queryString);
  }
  function bulkAccept() {
    if (confirm("Bulk accept selected tasks?") && selectedTasks.length > 0) {
      router.post(route("tasks.bulkAccept"), { tasks: selectedTasks }, {
        onSuccess: () => {
          alert("Selected tasks have been accepted.");
          router.reload();
        },
        onError: (errors2) => {
        }
      });
    }
  }
  const [selectedStatus, setSelectedStatus] = useState(filtersVal);
  const handleSelectedStatus = (status) => {
    setSelectedStatus((prevSelectedStatus) => {
      if (prevSelectedStatus.includes(status)) {
        const return1 = prevSelectedStatus.filter((selectedStatus2) => selectedStatus2 !== status);
        console.log(return1, "1");
        applyFilters({ search, sortColumn, sortOrder, filters: return1 });
        return return1;
      } else {
        const return2 = [...prevSelectedStatus, status];
        applyFilters({ search, sortColumn, sortOrder, filters: return2 });
        return return2;
      }
    });
  };
  useEffect(() => {
  }, [selectedStatus]);
  function handleRowClick(row) {
    router.get(route("tasks.show", row.id));
  }
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: user.surname + " " + user.name + " tasks" }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Task list" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: [
                /* @__PURE__ */ jsxs("span", { className: "hidden md:inline", children: [
                  /* @__PURE__ */ jsxs(
                    Link,
                    {
                      className: "text-indigo-600 dark:text-indigo-400 mr-8",
                      href: route("users.index"),
                      title: "Back",
                      children: [
                        /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faChevronLeft, className: "mr-2" }),
                        "Back"
                      ]
                    }
                  ),
                  user.surname + " " + user.name + " tasks"
                ] }),
                /* @__PURE__ */ jsxs(
                  Link,
                  {
                    className: "focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                    href: route("tasks.create", { id: user.id }),
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "Add New Task" }),
                      /* @__PURE__ */ jsx(PlusCircleIcon, { size: 16, className: "ml-2" })
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex flex-col justify-between mb-4 w-full p-4 text-gray-700 dark:text-gray-300 text-md font-medium", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h6", { children: "Status filter:" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center w-[60%] justify-between mt-4", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("new"),
                    onChange: () => handleSelectedStatus("new")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "New" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("open"),
                    onChange: () => handleSelectedStatus("open")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Open" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("data provided"),
                    onChange: () => handleSelectedStatus("data provided")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Data provided" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("returned"),
                    onChange: () => handleSelectedStatus("returned")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Returned" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("accepted"),
                    onChange: () => handleSelectedStatus("accepted")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Accepted" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                    type: "checkbox",
                    checked: selectedStatus.includes("declined"),
                    onChange: () => handleSelectedStatus("declined")
                  }
                ),
                /* @__PURE__ */ jsx("span", { children: "Declined" })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-col justify-between mb-4 w-full p-4 text-gray-700 dark:text-gray-300 text-md font-medium", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h6", { children: "Sort:" }),
            /* @__PURE__ */ jsx("div", { className: "flex items-center w-[60%] justify-between mt-4", children: /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "border-3 mr-2 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                  type: "checkbox",
                  checked: sortColumn == "task_due_date",
                  onChange: (e) => e.target.checked ? handleSort("task_due_date", "desc") : handleSort("status_sortorder.sortorder", "asc")
                }
              ),
              /* @__PURE__ */ jsx("span", { children: "After deadline last" })
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsx(
            Table,
            {
              sortColumn,
              sortOrder,
              onSort: handleSort,
              search,
              isSearchable: true,
              onSearch: handleSearch,
              onReset: reset,
              onBulkAccept: bulkAccept,
              onRowClick: handleRowClick,
              columns: [
                {
                  label: "Status",
                  name: "status_sortorder.sortorder",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(
                    "button",
                    {
                      className: `w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none
                          ${row.status === "new" ? "bg-yellow-500 text-white" : row.status === "open" ? "bg-blue-500 text-white" : row.status === "data checked" ? "bg-green-500 text-white" : row.status === "returned" ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-800"}`,
                      type: "button",
                      children: row.status
                    }
                  ) })
                },
                {
                  label: "Photos Taken",
                  name: "photo_taken",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.photo_taken })
                },
                {
                  label: "Verified",
                  name: "surname",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, {})
                },
                {
                  label: "Name",
                  name: "name",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.name })
                },
                {
                  label: "Description",
                  name: "text",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.text })
                },
                {
                  label: "Date created",
                  name: "date_created",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.date_created })
                },
                {
                  label: "due date",
                  name: "task_due_date",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.task_due_date })
                },
                {
                  label: "Acceptation",
                  name: "flag_id",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.flag_id === 1 ? /* @__PURE__ */ jsx("div", { className: "bg-green-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none", children: "Accepted" }) : row.flag_id === 2 ? /* @__PURE__ */ jsx("div", { className: "bg-red-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none", children: "Declined" }) : row.status === "data provided" ? /* @__PURE__ */ jsx("div", { className: "bg-blue-500 text-white w-full m-auto flex items-center justify-center rounded-md px-4 py-2 focus:outline-none", children: "Waiting" }) : null })
                },
                {
                  label: "Bulk actions",
                  name: "action",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.status == "data provided" && !row.flag_id && /* @__PURE__ */ jsx(
                    "input",
                    {
                      className: "border-3 border-indigo-300 dark:border-indigo-700 dark:bg-white-900 dark:text-white-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow",
                      type: "checkbox",
                      checked: selectedTasks.includes(row.id),
                      onChange: () => handleCheckboxChange(row.id)
                    }
                  ) })
                }
              ],
              rows: data
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center mt-4 mb-4 text-white", children: /* @__PURE__ */ jsxs("span", { children: [
            "Showing ",
            data.length,
            " out of ",
            total
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center mt-4 mb-4", children: links.map((link, index) => /* @__PURE__ */ jsx(
            "button",
            {
              disabled: !link.url,
              onClick: () => handlePageChange(link.url),
              className: `mx-1 px-3 py-1 border rounded ${link.active ? "text-white bg-indigo-600 border-indigo-600" : "text-white border-gray-300"} ${!link.url ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`,
              dangerouslySetInnerHTML: { __html: link.label }
            },
            index
          )) })
        ] }) }) })
      ]
    }
  );
}
export {
  Dashboard as default
};
