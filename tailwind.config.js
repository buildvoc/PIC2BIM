import defaultTheme from "tailwindcss/defaultTheme";
import forms from "@tailwindcss/forms";
// import "./resources/css/app.css"
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "selector",
    content: [
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.tsx",
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["Figtree", ...defaultTheme.fontFamily.sans],
            },
            height: {
                "3/4-screen": "71vh", // 3/4 of the viewport height
            },
       
        },
    },

    plugins: [forms],
};
