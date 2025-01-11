import { PageProps } from "@/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import App from "./App/App";

import { memo } from "react";
export function Index({ auth,photos }: PageProps) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <App photos={photos}/>
        </AuthenticatedLayout>
    );
}
export default memo(Index);
