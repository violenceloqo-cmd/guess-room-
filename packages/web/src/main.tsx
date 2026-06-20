import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Overlay from "./Overlay";
import HostPanel from "./HostPanel";
import "./styles.css";

// Tiny path-based router — avoids pulling in react-router for three routes.
function Root() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path === "/overlay") return <Overlay />;
  if (path === "/host") return <HostPanel />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
