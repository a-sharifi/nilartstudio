import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import AdminDashboard from "./AdminDashboard"
import ArtistDashboard from "./ArtistDashboard"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/^\/(fa|en)\/admin(?:\/|$)/.test(window.location.pathname) ? (
      <AdminDashboard />
    ) : /^\/(fa|en)\/artist(?:\/|$)/.test(window.location.pathname) ? (
      <ArtistDashboard />
    ) : (
      <App />
    )}
  </React.StrictMode>,
)
