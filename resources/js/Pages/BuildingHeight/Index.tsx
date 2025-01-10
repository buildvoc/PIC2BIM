import { PageProps } from "@/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { memo } from "react";
export function Index({ auth }: PageProps) {
    return (
        <AuthenticatedLayout
            user={auth.user}

        ></AuthenticatedLayout>
    );
}
export default memo(Index);
