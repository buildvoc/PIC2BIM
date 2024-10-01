import { jsx } from "react/jsx-runtime";
import axios from "axios";
import { hydrateRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
window.axios = axios;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
async function resolvePageComponent(path, pages) {
  for (const p of Array.isArray(path) ? path : [path]) {
    const page = pages[p];
    if (typeof page === "undefined") {
      continue;
    }
    return typeof page === "function" ? page() : page;
  }
  throw new Error(`Page not found: ${path}`);
}
createInertiaApp({
  title: (title) => `${title}`,
  resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, /* @__PURE__ */ Object.assign({ "./Pages/Agencies/Create.tsx": () => import("./assets/Create-DLaDtZdG.js"), "./Pages/Agencies/Edit.tsx": () => import("./assets/Edit-BJigjBbi.js"), "./Pages/Agencies/Index.tsx": () => import("./assets/Index-BzPT2E8u.js"), "./Pages/Auth/ConfirmPassword.tsx": () => import("./assets/ConfirmPassword-DNwBWXfF.js"), "./Pages/Auth/ForgotPassword.tsx": () => import("./assets/ForgotPassword-D5TKUeds.js"), "./Pages/Auth/Login.tsx": () => import("./assets/Login-CGfbS_NT.js"), "./Pages/Auth/Register.tsx": () => import("./assets/Register-1KvtclMO.js"), "./Pages/Auth/ResetPassword.tsx": () => import("./assets/ResetPassword-0Uh1bHKh.js"), "./Pages/Auth/VerifyEmail.tsx": () => import("./assets/VerifyEmail-CHFGsP85.js"), "./Pages/Dashboard.tsx": () => import("./assets/Dashboard-VfXPKH1t.js"), "./Pages/Officers/Create.tsx": () => import("./assets/Create-XMZUQSnm.js"), "./Pages/Officers/Edit.tsx": () => import("./assets/Edit-DjmLqA8-.js"), "./Pages/Officers/Index.tsx": () => import("./assets/Index-DNrW8H-m.js"), "./Pages/Officers/Invite.tsx": () => import("./assets/Invite-Cnxy46hi.js"), "./Pages/Profile/Edit.tsx": () => import("./assets/Edit-Dy0WGuhj.js"), "./Pages/Profile/Partials/DeleteUserForm.tsx": () => import("./assets/DeleteUserForm-CRyoRFsl.js"), "./Pages/Profile/Partials/UpdatePasswordForm.tsx": () => import("./assets/UpdatePasswordForm-5tiidph4.js"), "./Pages/Profile/Partials/UpdateProfileInformationForm.tsx": () => import("./assets/UpdateProfileInformationForm-BXGZ0XXt.js"), "./Pages/TaskType/Create.tsx": () => import("./assets/Create-DN-OEBu9.js"), "./Pages/TaskType/Edit.tsx": () => import("./assets/Edit-B4FnHG_Y.js"), "./Pages/TaskType/Index.tsx": () => import("./assets/Index-CaAbYky1.js"), "./Pages/Tasks/Create.tsx": () => import("./assets/Create-BJ9a7UT-.js"), "./Pages/Tasks/Detail.tsx": () => import("./assets/Detail-EjMEJJo3.js"), "./Pages/Tasks/Edit.tsx": () => import("./assets/Edit-CiRlF2BJ.js"), "./Pages/Tasks/Index.tsx": () => import("./assets/Index-D48O61xH.js"), "./Pages/Users/Create.tsx": () => import("./assets/Create-lSfE1-zy.js"), "./Pages/Users/Edit.tsx": () => import("./assets/Edit-D1hjT_XJ.js"), "./Pages/Users/Index.tsx": () => import("./assets/Index-DY0GUD9g.js"), "./Pages/Welcome.tsx": () => import("./assets/Welcome-ClXidHEs.js") })),
  setup({ el, App, props }) {
    hydrateRoot(el, /* @__PURE__ */ jsx(App, { ...props }));
  },
  progress: {
    color: "#4B5563"
  }
});
