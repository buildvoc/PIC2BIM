import { PageProps } from "@/types";
import { memo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";


export function PhotoDetail({auth}: PageProps) {
   

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Photo detail
                </h2>
            }
        >             <Head title="Identify building data from a photo" />
        </AuthenticatedLayout>

    );
}
export default memo(PhotoDetail);
