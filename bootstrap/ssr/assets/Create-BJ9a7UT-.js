import { jsx, jsxs } from "react/jsx-runtime";
import { usePage, useForm, Head } from "@inertiajs/react";
import { A as Authenticated } from "./AuthenticatedLayout-EGscpkuR.js";
import { F as FieldGroup, L as LoadingButton } from "./FieldGroup-BuZV114l.js";
import { T as TextInput } from "./TextInput-DlpAPKCb.js";
import "react";
import "./ApplicationLogo-xMpxFOcX.js";
import "@headlessui/react";
import "classnames";
function Create({ auth }) {
  const { user, task_types } = usePage().props;
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    text: "",
    purpose: "",
    date_due: "",
    user_id: user.id
  });
  function handleSubmit(e) {
    e.preventDefault();
    post(route("tasks.store"));
  }
  const allPurpose = task_types.map((purpose, i) => {
    return /* @__PURE__ */ jsx("option", { value: purpose.id, style: { background: "#1a1a1a", color: "white" }, children: purpose.name }, i);
  });
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsx("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: "New task" }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "New task" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w-2xl mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: "New task" })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "max-w-3xl mx-auto bg-white dark:bg-gray-800 overflow-hidden rounded shadow", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { required: true, label: "Name", name: "name", error: errors.name, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "login",
                error: errors.name,
                value: data.name,
                onChange: (e) => setData("name", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Description", name: "text", error: errors.text, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "text",
                error: errors.text,
                type: "text",
                value: data.text,
                onChange: (e) => setData("text", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Purpose", name: "text", error: errors.purpose, children: /* @__PURE__ */ jsx(
              "select",
              {
                name: "purpose",
                onChange: (e) => setData("purpose", e.target.value),
                className: "form-input w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 border-gray-300 rounded",
                style: { background: "transparent", color: "white" },
                children: allPurpose
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { required: true, label: "Due date", name: "date_due", error: errors.date_due, children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "date",
                name: "date_due",
                onChange: (e) => setData("date_due", e.target.value),
                className: "form-input w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 border-gray-300 rounded",
                style: { background: "transparent", color: "white" },
                min: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center px-8 py-4 space-y-4", children: /* @__PURE__ */ jsx("div", { className: "flex space-x-4", children: /* @__PURE__ */ jsx(
              LoadingButton,
              {
                loading: processing,
                type: "submit",
                className: "focus:outline-none flex items-center border border-indigo-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-md",
                children: "Save"
              }
            ) }) })
          ] }) })
        ] }) }) })
      ]
    }
  );
}
export {
  Create,
  Create as default
};
