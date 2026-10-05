import { Route, Routes } from 'react-router'
import { lazy } from 'react'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
const Schedule = lazy(() => import('./pages/Schedule'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Exams = lazy(() => import('./pages/Exams'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Settings = lazy(() => import('./pages/Settings'))
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="exams" element={<Exams />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
