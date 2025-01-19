import { PageProps } from "@/types";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import App from "./App/App";
import { useState } from "react";
import { memo } from "react";
export function Index({ auth, photos }: PageProps) {
    const [isUploadTriggered, setUploadTriggered] = useState(false);
    const [isMetadataResultsTriggered, setMetadataResultsTriggered] = useState(false);

    return (
            <AuthenticatedLayout
                user={auth.user}
                uploadPhotoHandler={() => {
                    setUploadTriggered((prev) => !prev);
                }}
                metadataResultsHandler={()=>{
                    setMetadataResultsTriggered((prev) => !prev)
                }}
            >
                <App photos={photos} isUploadTriggered={isUploadTriggered} isMetadataResultsTriggered={isMetadataResultsTriggered}/>
            </AuthenticatedLayout>
    );
}
export default memo(Index);
