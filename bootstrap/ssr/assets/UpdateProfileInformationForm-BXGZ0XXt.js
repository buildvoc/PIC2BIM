import { jsxs, jsx } from "react/jsx-runtime";
import { T as TextInput, I as InputError } from "./TextInput-CfTqIySL.js";
import { I as InputLabel } from "./InputLabel-DDs2XNYP.js";
import { P as PrimaryButton } from "./PrimaryButton-DDF1xnxF.js";
import { usePage, useForm, Link } from "@inertiajs/react";
import { Transition } from "@headlessui/react";
import "react";
function UpdateProfileInformation({ mustVerifyEmail, status, className = "" }) {
  const user = usePage().props.auth.user;
  const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
    login: user.login,
    name: user.name,
    email: user.email,
    surname: user.surname,
    identification_number: user.identification_number,
    vat: user.vat
  });
  const submit = (e) => {
    e.preventDefault();
    patch(route("profile.update"));
  };
  return /* @__PURE__ */ jsxs("section", { className, children: [
    /* @__PURE__ */ jsxs("header", { children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Profile Information" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-600 dark:text-gray-400", children: "Update your account's profile information and email address." })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mt-6 space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "name", value: "Name" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "name",
            className: "mt-1 block w-full",
            value: data.name,
            onChange: (e) => setData("name", e.target.value),
            required: true,
            isFocused: true,
            autoComplete: "name"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "login", value: "Login (username)" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "login",
            className: "mt-1 block w-full",
            value: data.login,
            onChange: (e) => setData("login", e.target.value),
            required: true,
            isFocused: true,
            autoComplete: "login"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.login })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "surname", value: "Surname" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "surname",
            className: "mt-1 block w-full",
            value: data.surname,
            onChange: (e) => setData("surname", e.target.value),
            autoComplete: "surname"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.surname })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "identification_number", value: "Identification Number" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "identification_number",
            className: "mt-1 block w-full",
            value: data.identification_number,
            onChange: (e) => setData("identification_number", e.target.value),
            autoComplete: "identification_number"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.identification_number })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "vat", value: "Vat" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "vat",
            className: "mt-1 block w-full",
            value: data.vat,
            onChange: (e) => setData("vat", e.target.value),
            autoComplete: "vat"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.vat })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(InputLabel, { htmlFor: "email", value: "Email" }),
        /* @__PURE__ */ jsx(
          TextInput,
          {
            id: "email",
            type: "email",
            className: "mt-1 block w-full",
            value: data.email,
            onChange: (e) => setData("email", e.target.value),
            required: true,
            autoComplete: "username"
          }
        ),
        /* @__PURE__ */ jsx(InputError, { className: "mt-2", message: errors.email })
      ] }),
      mustVerifyEmail && user.email_verified_at === null && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm mt-2 text-gray-800 dark:text-gray-200", children: [
          "Your email address is unverified.",
          /* @__PURE__ */ jsx(
            Link,
            {
              href: route("verification.send"),
              method: "post",
              as: "button",
              className: "underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800",
              children: "Click here to re-send the verification email."
            }
          )
        ] }),
        status === "verification-link-sent" && /* @__PURE__ */ jsx("div", { className: "mt-2 font-medium text-sm text-green-600 dark:text-green-400", children: "A new verification link has been sent to your email address." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(PrimaryButton, { disabled: processing, children: "Save" }),
        /* @__PURE__ */ jsx(
          Transition,
          {
            show: recentlySuccessful,
            enter: "transition ease-in-out",
            enterFrom: "opacity-0",
            leave: "transition ease-in-out",
            leaveTo: "opacity-0",
            children: /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Saved." })
          }
        )
      ] })
    ] })
  ] });
}
export {
  UpdateProfileInformation as default
};
