import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { A as Authenticated } from "./AuthenticatedLayout-EGscpkuR.js";
import { usePage, Head, Link, router } from "@inertiajs/react";
import { T as Table } from "./Table-Cuhs9VeG.js";
import { PlusCircleIcon } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faBan } from "@fortawesome/free-solid-svg-icons";
import "react";
import "./ApplicationLogo-xMpxFOcX.js";
import "@headlessui/react";
import "lodash/get.js";
import "./TextInput-DlpAPKCb.js";
function Dashboard({ auth }) {
  const { users, sortColumn, sortOrder, search } = usePage().props;
  const {
    data,
    links
  } = users;
  function destroy(id) {
    if (confirm("Are you sure with deactivating?")) {
      router.delete(route("users.destroy", id));
    }
  }
  function handlePageChange(url) {
    router.get(url + "&sortOrder=" + sortOrder + "&sortColumn=" + sortColumn + "&seach=" + search);
  }
  function reset() {
    router.get(route("users.index"));
  }
  function handleSort(column, order) {
    applyFilters({ search, sortColumn: column, sortOrder: order });
  }
  function handleSearch(q) {
    applyFilters({ search: q, sortColumn, sortOrder });
  }
  function applyFilters(params) {
    router.get(route("users.index"), params);
  }
  function handleRowClick(row) {
    router.get(route("users.show", row.id));
  }
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: "User management" }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Users" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: [
                /* @__PURE__ */ jsx("span", { className: "hidden md:inline", children: "User management" }),
                /* @__PURE__ */ jsxs(
                  Link,
                  {
                    className: "focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                    href: route("users.create"),
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "Add New User" }),
                      /* @__PURE__ */ jsx(PlusCircleIcon, { size: 16, className: "ml-2" })
                    ]
                  }
                )
              ]
            }
          ),
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
              onRowClick: handleRowClick,
              columns: [
                {
                  label: "ID",
                  name: "id",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.id })
                },
                {
                  label: "Name",
                  name: "name",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.name })
                },
                {
                  label: "Surname",
                  name: "surname",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.surname })
                },
                {
                  label: "Idenitification number",
                  name: "identification_number",
                  sorting: true,
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.identification_number })
                },
                {
                  label: "Tasks count",
                  name: "tasks_count",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.tasks_count })
                },
                {
                  label: "Photos count",
                  name: "photos_count",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.photo_count })
                },
                {
                  label: "Unassigned photos",
                  name: "unassigned_photos",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.unassigned_photos_count })
                },
                {
                  label: "tasks in Data provided",
                  name: "tasks_provided_count",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.tasks_provided_count })
                },
                {
                  label: "Actions",
                  name: "action",
                  renderCell: (row) => /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(
                      Link,
                      {
                        className: "hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                        href: route("users.edit", row.id),
                        title: "Edit",
                        children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faEdit })
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                        onClick: () => destroy(row.id),
                        title: "Deactivate",
                        children: /* @__PURE__ */ jsx(FontAwesomeIcon, { icon: faBan })
                      }
                    )
                  ] })
                }
              ],
              rows: data
            }
          ),
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
