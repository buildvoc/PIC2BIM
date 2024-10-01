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
  const { agencies } = usePage().props;
  const {
    data,
    links
  } = agencies;
  function destroy(id) {
    if (confirm("Are you sure with deactivating?")) {
      router.delete(route("dashboard.agencies.destroy", id));
    }
  }
  function handleRowClick(row) {
    router.get(route("dashboard.agencies.show", row.id));
  }
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: "Agency management" }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Agency Management" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: [
                /* @__PURE__ */ jsx("span", { className: "hidden md:inline", children: "Agency management" }),
                /* @__PURE__ */ jsxs(
                  Link,
                  {
                    className: "focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                    href: route("dashboard.agencies.create"),
                    children: [
                      /* @__PURE__ */ jsx("span", { children: "Add New Agency" }),
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
              onRowClick: handleRowClick,
              columns: [
                {
                  label: "Agency name",
                  name: "name",
                  renderCell: (row) => /* @__PURE__ */ jsx(Fragment, { children: row.name })
                },
                {
                  label: "Actions",
                  name: "action",
                  renderCell: (row) => /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(
                      Link,
                      {
                        className: "hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none flex items-center text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                        href: route("dashboard.agencies.edit", row.id),
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
          )
        ] }) }) })
      ]
    }
  );
}
export {
  Dashboard as default
};
