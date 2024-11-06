import { PageProps } from "@/types";
import { memo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";


export function PhotoGallery({auth}: PageProps) {
   

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Photo Gallery
                </h2>
            }
        >
               <Head title="Photo gallery" />

        </AuthenticatedLayout>
    );
}
export default memo(PhotoGallery);
