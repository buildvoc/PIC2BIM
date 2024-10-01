import { jsxs, jsx } from "react/jsx-runtime";
import get from "lodash/get.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCircleXmark, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { T as TextInput } from "./TextInput-DlpAPKCb.js";
import { useState } from "react";
function Table({
  columns = [],
  rows = [],
  sortColumn,
  sortOrder,
  onSort,
  onSearch,
  isSearchable,
  search,
  onReset,
  onBulkAccept,
  onRowClick
}) {
  const [searchValue, setSearchValue] = useState(search || "");
  const handleSort = (columnName, order) => {
    if (onSort) {
      onSort(columnName, order);
    }
  };
  const handleSearch = (q) => {
    if (onSearch) {
      onSearch(q);
    }
  };
  function handleReset() {
    if (onReset) {
      onReset();
    }
  }
  function hanldeBulkAccept() {
    if (onBulkAccept) {
      onBulkAccept();
    }
  }
  function handleRowClick(row) {
    if (onRowClick) {
      onRowClick(row);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "overflow-x-auto rounded shadow", children: [
    isSearchable && /* @__PURE__ */ jsxs("div", { className: "flex ml-2 mb-1 items-center", children: [
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(
        TextInput,
        {
          name: "search",
          value: searchValue,
          onChange: (e) => setSearchValue(e.target.value),
          style: { background: "transparent", color: "white" }
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "", children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => handleSearch(searchValue), children: /* @__PURE__ */ jsx(FontAwesomeIcon, { className: "ml-4 text-indigo-600 dark:text-indigo-400", icon: faSearch }) }) }),
      /* @__PURE__ */ jsx("div", { className: "ml-8 text-indigo-600 dark:text-indigo-400", children: /* @__PURE__ */ jsxs("button", { type: "button", onClick: handleReset, children: [
        /* @__PURE__ */ jsx(FontAwesomeIcon, { className: "", icon: faCircleXmark }),
        /* @__PURE__ */ jsx("span", { className: "ml-1", children: "Cancel Sorting" })
      ] }) }),
      onBulkAccept && /* @__PURE__ */ jsx("div", { className: "ml-auto", children: /* @__PURE__ */ jsx("button", { type: "button", onClick: hanldeBulkAccept, className: "mr-4 focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md", children: "Bulk Accept" }) })
    ] }),
    /* @__PURE__ */ jsxs("table", { className: "w-full whitespace-nowrap", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { className: "font-bold text-left text-gray-700 dark:text-gray-300", children: columns == null ? void 0 : columns.map((column) => /* @__PURE__ */ jsx(
        "th",
        {
          colSpan: column.colSpan ?? 1,
          className: "px-6 pt-5 pb-4",
          children: /* @__PURE__ */ jsxs("span", { className: "flex flex-row", children: [
            /* @__PURE__ */ jsx("span", { children: column.label }),
            column.sorting && /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("button", { onClick: () => handleSort(column.name, "asc"), type: "button", children: /* @__PURE__ */ jsx(FontAwesomeIcon, { className: sortColumn == column.name && sortOrder == "asc" ? "ml-2 text-indigo-600 dark:text-indigo-400" : "ml-2", icon: faArrowUp }) }),
              /* @__PURE__ */ jsx("button", { onClick: () => handleSort(column.name, "desc"), type: "button", children: /* @__PURE__ */ jsx(FontAwesomeIcon, { className: sortColumn == column.name && sortOrder == "desc" ? "ml-[1px] text-indigo-600 dark:text-indigo-400" : "ml-[1px]", icon: faArrowDown }) })
            ] })
          ] })
        },
        column.label
      )) }) }),
      /* @__PURE__ */ jsxs("tbody", { children: [
        (rows == null ? void 0 : rows.length) === 0 && /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
          "td",
          {
            className: "px-6 py-24 border-t text-center",
            colSpan: columns.length,
            children: "No data found."
          }
        ) }),
        rows == null ? void 0 : rows.map((row, rowIndex) => {
          return /* @__PURE__ */ jsx(
            "tr",
            {
              className: `focus-within:bg-gray-100 dark:focus-within:bg-gray-600 ${onRowClick ? "cursor-pointer" : ""}`,
              children: columns.map((column, colIndex) => {
                var _a;
                const isLastColumn = colIndex === columns.length - 1;
                return /* @__PURE__ */ jsx(
                  "td",
                  {
                    className: "border-t",
                    onClick: () => {
                      if (!isLastColumn) {
                        handleRowClick(row);
                      }
                    },
                    children: /* @__PURE__ */ jsx(
                      "span",
                      {
                        tabIndex: -1,
                        className: "flex items-center px-6 py-4 text-gray-700 dark:text-gray-300 focus:outline-none",
                        children: ((_a = column.renderCell) == null ? void 0 : _a.call(column, row)) ?? get(row, column.name) ?? "N/A"
                      }
                    )
                  },
                  column.name
                );
              })
            },
            rowIndex
          );
        })
      ] })
    ] })
  ] });
}
export {
  Table as T
};
