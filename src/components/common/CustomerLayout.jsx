import { Outlet } from 'react-router-dom'
import GlobalNavbar from './GlobalNavbar'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#fdf8f0] dark:bg-[#0f0a05] transition-colors duration-300">
      <GlobalNavbar />
      <Outlet />
    </div>
  )
}
