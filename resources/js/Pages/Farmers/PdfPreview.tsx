import { PageProps } from "@/types";
import { memo, useEffect } from "react";


export function PdfPreview({task,photos}: PageProps) {
    useEffect(()=>{
        console.log("Photos---",photos)
        console.log("Task",task)

    },[])
    
    return (
    <div></div>
    );
}
export default memo(PdfPreview);
