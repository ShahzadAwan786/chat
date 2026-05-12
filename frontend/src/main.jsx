import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "./globals.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="1078670163776-sr672mtahf8514u42gpih87eaqj7ncjg.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>,
);
