import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from './index'
import { useAuth } from '../../context/AuthContext'

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="dash-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - mobile: absolute, desktop: static */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-brand-dark-surface border-b border-orange-100 dark:border-brand-dark-border shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-300 text-2xl"
          >
            ☰
          </button>
          <span className="font-display font-bold text-gradient text-xl">CloudBite</span>
          <ThemeToggle />
        </div>

        {/* Page content */}
        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
