import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

hydrateRoot(document.getElementById("root") as HTMLElement, <App path={window.location.pathname} />);
