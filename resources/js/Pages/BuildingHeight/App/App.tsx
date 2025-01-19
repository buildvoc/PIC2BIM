import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./App.css";

import { MainView } from "../views/main-view";
import { PropsWithChildren } from "react";
import { Photo } from "@/types";

function App({photos,isUploadTriggered,isMetadataResultsTriggered}:PropsWithChildren<{photos:Array<Photo>,isUploadTriggered:boolean,isMetadataResultsTriggered:boolean}>) {
  return (
    <div className="App" data-testid="App">
      <MainView photos={photos} isUploadTriggered={isUploadTriggered} isMetadataResultsTriggered={isMetadataResultsTriggered} />
    </div>
  );
}

export default App;