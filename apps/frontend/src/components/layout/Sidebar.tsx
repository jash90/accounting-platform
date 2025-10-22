import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Shield,
  Building2,
  Package
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useIsSuperAdmin } from '../../hooks/useRBAC';
import { IfSuperAdmin } from '../rbac/PermissionComponents';
import { CompanySelector } from '../company/CompanySelector';
import { RoleBadge } from '../rbac/PermissionComponents';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  children?: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile?: boolean;
}

// SuperAdmin navigation items
const adminNavigationItems: NavItem[] = [
  { name: 'Admin Dashboard', path: '/admin/dashboard', icon: Shield },
  { name: 'User Management', path: '/admin/users', icon: Users },
  { name: 'Company Management', path: '/admin/companies', icon: Building2 }
];

// General navigation items
const navigationItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Expenses', path: '/expenses', icon: Receipt },
  { name: 'Clients', path: '/clients', icon: Users },
  { name: 'Reports', path: '/reports', icon: BarChart3 }
];

const bottomNavigationItems: NavItem[] = [
  { name: 'Settings', path: '/settings', icon: Settings }
];

export function Sidebar({ isOpen, onToggle, isMobile = false }: SidebarProps) {
  const location = useLocation();
  const { companyId } = useParams<{ companyId: string }>();
  const { user, logout } = useAuthStore();
  const isSuperAdmin = useIsSuperAdmin();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-expand parent items if child is active
  useEffect(() => {
    const path = location.pathname;
    const newExpanded = new Set<string>();

    navigationItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child =>
          child.path === path || path.startsWith(child.path + '/')
        );
        if (hasActiveChild) {
          newExpanded.add(item.name);
        }
      }
    });

    setExpandedItems(newExpanded);
  }, [location.pathname]);

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (path: string, exact: boolean = false): boolean => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
  };

  const NavItem = ({ item, level = 0 }: { item: NavItem; level?: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.name);
    const Icon = item.icon;
    const isItemActive = isActive(item.path, !hasChildren);

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`
              w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${level > 0 ? 'ml-4' : ''}
              ${isItemActive
                ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500 -ml-[2px]'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
            aria-expanded={isExpanded}
            aria-controls={`submenu-${item.name}`}
          >
            <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{item.name}</span>
            {isExpanded ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4" />
            )}
          </button>
          {isExpanded && item.children && (
            <div id={`submenu-${item.name}`} className="mt-1 space-y-1">
              {item.children.map((child) => (
                <NavItem key={child.path} item={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive: routeActive }) => `
          group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
          ${level > 0 ? 'ml-8' : ''}
          ${routeActive
            ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500 -ml-[2px]'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
        onClick={() => isMobile && onToggle()}
      >
        <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
        {item.name}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo/Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">
          Accounting Platform
        </h1>
        {isMobile && (
          <button
            onClick={onToggle}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            {user && (
              <div className="mt-1">
                <RoleBadge isSuperAdmin={user.isSuperAdmin} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Selector (show when on company route) */}
      {companyId && (
        <div className="px-4 py-3 border-b border-gray-200">
          <CompanySelector />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* SuperAdmin Section */}
        <IfSuperAdmin>
          <div className="mb-4">
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                SuperAdmin
              </h3>
            </div>
            {adminNavigationItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
          <div className="border-t border-gray-200 my-3"></div>
        </IfSuperAdmin>

        {/* Regular Navigation */}
        <div className="px-3 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            General
          </h3>
        </div>
        {navigationItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 px-2 py-4 space-y-1">
        {bottomNavigationItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
        <button
          onClick={handleLogout}
          className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile sidebar backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
            onClick={onToggle}
            aria-hidden="true"
          />
        )}

        {/* Mobile sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="h-full flex flex-col">
            {sidebarContent}
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={`
        hidden md:flex md:flex-col md:w-64 bg-white shadow-md h-[calc(100vh-4rem)] sticky top-16
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {sidebarContent}
    </aside>
  );
}