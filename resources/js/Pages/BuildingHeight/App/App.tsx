import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./App.css";

import { MainView } from "../views/main-view";
import { PropsWithChildren } from "react";
import { Photo } from "@/types";

function App({photos}:PropsWithChildren<{photos:Array<Photo>}>) {
  return (
    <div className="App" data-testid="App">
      <MainView photos={photos} />
    </div>
  );
}

export default App;