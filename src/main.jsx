import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SHEETS_API_URL } from './config'
import ATDevelopmentTracker from './ATDevelopmentTracker'
import ClinicFeedback from './ClinicFeedback'

// Set API URL BEFORE components import/render
window.__AT_API_URL__ = SHEETS_API_URL;

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
