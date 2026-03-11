import React, { useState } from 'react';
import {
  Layers,
  FileText,
  Settings,
  LogOut,
  Briefcase,
  Sparkles,
  History,
  MessageSquare,
  PenTool,
  Menu,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { name: 'Optimizations', path: '/dashboard', icon: Sparkles },
  { name: 'Base Resumes', path: '/resumes', icon: FileText },
  { name: 'Target Jobs', path: '/jobs', icon: Briefcase },
  { name: 'Versions History', path: '/versions', icon: History },
  { name: 'Interview Prep', path: '/interview', icon: MessageSquare },
  { name: 'Writing Analysis', path: '/writing', icon: PenTool },
  { name: 'User Profile', path: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2 group"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="w-7 h-7 bg-[#0A0A0A] rounded-md flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Layers size={14} strokeWidth={2.5} />
          </div>
          <span className="font-semibold tracking-tight text-gray-900">atsai</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all',
                isActive
                  ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent',
              )}
            >
              <item.icon
                size={18}
                className={isActive ? 'text-orange-500' : 'text-gray-400'}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {user?.name ?? 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {user?.email ?? ''}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent rounded-lg font-medium text-sm w-full transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-40 flex flex-col lg:hidden transition-transform duration-300 ease-in-out shadow-2xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-10 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0A0A0A] rounded-md flex items-center justify-center text-white">
              <Layers size={14} strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight text-gray-900">atsai</span>
          </Link>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 md:p-8 lg:p-12 max-w-screen-xl">
          {children}
        </div>
      </main>
    </div>
  );
}

