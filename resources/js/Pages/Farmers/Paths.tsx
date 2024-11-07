import { PageProps } from "@/types";
import { memo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";


export function Paths({auth}: PageProps) {
   

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Paths
                </h2>
            }
        >
                <Head title="Paths" />

        </AuthenticatedLayout>
    );
}
export default memo(Paths);
