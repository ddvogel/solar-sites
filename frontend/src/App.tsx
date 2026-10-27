import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Dashboard from './Dashboard'
import AddSite from './AddSite'
import Assessment from './Assessment'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sites/new" element={<AddSite />} />
        <Route path="/sites/edit/:id" element={<AddSite />} />
        <Route path="/sites/:id" element={<Assessment />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}