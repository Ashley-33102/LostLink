import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import { Router } from "wouter";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);