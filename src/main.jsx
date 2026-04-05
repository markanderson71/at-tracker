import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ATDevelopmentTracker from './ATDevelopmentTracker'
import ClinicFeedback from './ClinicFeedback'

// Bridge Vite environment variable to window global for ATDevelopmentTracker
window.__AT_API_URL__ = import.meta.env.VITE_SHEETS_API_URL || "";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ATDevelopmentTracker />} />
        <Route path="/feedback" element={<ClinicFeedback />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
