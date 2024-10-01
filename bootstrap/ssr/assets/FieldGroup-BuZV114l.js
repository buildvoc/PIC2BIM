import { jsxs, jsx } from "react/jsx-runtime";
import cx from "classnames";
function LoadingButton({
  loading,
  className,
  children,
  ...props
}) {
  const classNames = cx(
    "flex items-center",
    "focus:outline-none",
    {
      "pointer-events-none bg-opacity-75 select-none": loading
    },
    className
  );
  return /* @__PURE__ */ jsxs("button", { disabled: loading, className: classNames, ...props, children: [
    loading && /* @__PURE__ */ jsx("div", { className: "mr-2 btn-spinner" }),
    children
  ] });
}
function FieldGroup({
  label,
  name,
  error,
  required,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    label && /* @__PURE__ */ jsxs("label", { className: "block text-white select-none", htmlFor: name, children: [
      label,
      " ",
      required && /* @__PURE__ */ jsx("span", { style: { color: "red" }, children: "*" })
    ] }),
    children,
    error && /* @__PURE__ */ jsx("div", { className: "text-red-500 mt-2 text-sm", children: error })
  ] });
}
export {
  FieldGroup as F,
  LoadingButton as L
};
