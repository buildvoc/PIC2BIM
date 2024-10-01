import { jsxs, jsx } from "react/jsx-runtime";
import { usePage, useForm, Head } from "@inertiajs/react";
import { A as Authenticated } from "./AuthenticatedLayout-EGscpkuR.js";
import { F as FieldGroup, L as LoadingButton } from "./FieldGroup-BuZV114l.js";
import { T as TextInput } from "./TextInput-DlpAPKCb.js";
import "react";
import "./ApplicationLogo-xMpxFOcX.js";
import "@headlessui/react";
import "classnames";
function Edit({ auth }) {
  const { agency_id } = usePage().props;
  const { agency } = usePage().props;
  const { officer } = usePage().props;
  console.log(officer, "OFFICER");
  const { data, setData, errors, patch, processing } = useForm({
    login: officer.login || "",
    password: officer.password || "",
    name: officer.name || "",
    surname: officer.surname || "",
    email: officer.email || "",
    identification_number: officer.identification_number || "",
    vat: officer.vat || "",
    agencyId: agency_id
  });
  function handleSubmit(e) {
    e.preventDefault();
    patch(route("dashboard.agencies.officers.update", officer.id));
  }
  return /* @__PURE__ */ jsxs(
    Authenticated,
    {
      user: auth.user,
      header: /* @__PURE__ */ jsxs("h2", { className: "font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight", children: [
        agency.name,
        " - Officers management"
      ] }),
      children: [
        /* @__PURE__ */ jsx(Head, { title: "Officers management" }),
        /* @__PURE__ */ jsx("div", { className: "py-12", children: /* @__PURE__ */ jsx("div", { className: "max-w-2xl mx-auto sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg", children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "flex items-center justify-between mb-6 w-full border-gray-200 dark:border-gray-700 p-4 text-gray-700 dark:text-gray-300 border-b text-lg font-medium",
              children: /* @__PURE__ */ jsxs("h1", { className: "text-3xl font-bold", children: [
                agency.name,
                " - Officers management"
              ] })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "max-w-3xl mx-auto bg-white dark:bg-gray-800 overflow-hidden rounded shadow", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, children: [
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { required: true, label: "Login", name: "login", error: errors.login, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "login",
                error: errors.login,
                value: data.login,
                onChange: (e) => setData("login", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { required: true, label: "Password", name: "password", error: errors.password, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "password",
                error: errors.password,
                type: "password",
                value: data.password,
                onChange: (e) => setData("password", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Name", name: "name", error: errors.name, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "name",
                error: errors.name,
                value: data.name,
                onChange: (e) => setData("name", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Surname", name: "surname", error: errors.name, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "surname",
                error: errors.surname,
                value: data.surname,
                onChange: (e) => setData("surname", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Email", name: "email", error: errors.email, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "email",
                error: errors.email,
                value: data.email,
                onChange: (e) => setData("email", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Identification Number", name: "identification_number", error: errors.email, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "identification_number",
                error: errors.identification_number,
                value: data.identification_number,
                onChange: (e) => setData("identification_number", e.target.value),
                style: { background: "transparent", color: "white" }
              }
            ) }) }),
            /* @__PURE__ */ jsx("div", { className: "grid gap-8 px-8 py-2", children: /* @__PURE__ */ jsx(FieldGroup, { label: "Vat", name: "vat", error: errors.vat, children: /* @__PURE__ */ jsx(
              TextInput,
              {
                name: "vat",
                error: errors.vat,
                value: data.vat,
                onChange: (e) => setData("vat", e.target.value),
                style: { background: "transparent", color: "white" }
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
  Edit,
  Edit as default
};
