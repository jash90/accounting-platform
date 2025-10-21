# Unified Navigation System Documentation

## Overview

The application now features a unified sidebar navigation system that provides consistent navigation across all protected pages. The system is built with React, TypeScript, and Tailwind CSS, featuring responsive design, accessibility features, and smooth animations.

## Architecture

### Core Components

1. **AppLayout** (`/src/components/layout/AppLayout.tsx`)
   - Main layout wrapper for all protected routes
   - Manages sidebar state and mobile responsiveness
   - Contains top navigation bar with user info

2. **Sidebar** (`/src/components/layout/Sidebar.tsx`)
   - Reusable sidebar component with navigation items
   - Supports nested navigation with expand/collapse
   - Includes user profile section and logout functionality

3. **EmailRulesLayout** (`/src/components/email-rules/EmailRulesLayout.tsx`)
   - Sub-navigation for email automation section
   - Provides tab-based navigation for email rule features

## Navigation Structure

```
├── Dashboard (/)
├── Email Automation
│   ├── Rules (/email-rules)
│   ├── Processing Logs (/email-rules/logs)
│   └── Email Accounts (/email-rules/accounts)
├── Invoices (/invoices) - Coming soon
├── Expenses (/expenses) - Coming soon
├── Clients (/clients) - Coming soon
├── Reports (/reports) - Coming soon
└── Settings (/settings) - Coming soon
```

## Features

### Responsive Design
- **Desktop**: Persistent sidebar with toggle functionality
- **Mobile**: Full-screen overlay with backdrop
- **Breakpoint**: 768px (md in Tailwind)

### Accessibility
- ARIA labels and roles for screen readers
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators with outline and box-shadow
- Semantic HTML structure

### User Experience
- Active state highlighting for current page
- Nested navigation with auto-expand
- Smooth transitions and animations
- Persistent sidebar state (localStorage)
- User profile display with initials

## Adding New Pages

To add a new page to the navigation:

### 1. Update Navigation Items

Edit `/src/components/layout/Sidebar.tsx`:

```typescript
const navigationItems: NavItem[] = [
  // ... existing items
  {
    name: 'Your New Page',
    path: '/your-new-page',
    icon: YourIcon // Import from lucide-react
  },
];
```

### 2. Add Route

Edit `/src/app/app.tsx`:

```typescript
<Route
  element={
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  }
>
  {/* ... existing routes */}
  <Route path="/your-new-page" element={<YourNewPage />} />
</Route>
```

### 3. Create Page Component

Create `/src/pages/YourNewPage.tsx`:

```typescript
export function YourNewPage() {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Page Title</h2>
        {/* Your content here */}
      </div>
    </div>
  );
}
```

## Adding Nested Navigation

To add a page with nested navigation (like Email Automation):

### 1. Update Navigation Items with Children

```typescript
const navigationItems: NavItem[] = [
  // ... existing items
  {
    name: 'Parent Page',
    path: '/parent',
    icon: ParentIcon,
    children: [
      { name: 'Child 1', path: '/parent/child1', icon: Child1Icon },
      { name: 'Child 2', path: '/parent/child2', icon: Child2Icon },
    ]
  },
];
```

### 2. Create Layout Component (Optional)

For sub-navigation tabs, create a layout component similar to `EmailRulesLayout`.

## Styling Guidelines

### Color Scheme
- Primary colors: Blue scale (defined in CSS variables)
- Active state: `bg-primary-50 text-primary-700 border-primary-500`
- Hover state: `bg-gray-50 text-gray-900`

### Icons
- Using Lucide React icon library
- Size: `h-5 w-5` for navigation items
- Consistent spacing: `mr-3` from text

### Animations
- Sidebar slide: 300ms ease-in-out
- Hover transitions: 200ms ease
- Mobile backdrop: fade with blur

## Mobile Considerations

### Touch Targets
- Minimum 44x44px for all interactive elements
- Adequate spacing between navigation items

### Mobile Menu
- Full-screen overlay on mobile devices
- Backdrop click to close
- Hamburger menu in top navigation

## Accessibility Checklist

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ ARIA labels for screen readers
- ✅ Focus indicators visible
- ✅ Semantic HTML structure
- ✅ Color contrast ratios meet WCAG AA
- ✅ Screen reader announcements for state changes

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Considerations

- Sidebar state persisted in localStorage
- Minimal re-renders using React hooks
- CSS transitions for smooth animations
- Lazy loading for future route components

## Troubleshooting

### Common Issues

1. **Sidebar not appearing**: Check if user is authenticated
2. **Active state not working**: Verify route paths match exactly
3. **Mobile menu stuck**: Clear localStorage and refresh
4. **Icons not showing**: Ensure lucide-react is imported correctly

### Debug Mode

To debug navigation state, check browser console:
- LocalStorage: `sidebarOpen` key
- React DevTools: Check `AppLayout` and `Sidebar` components
- Network tab: Verify protected route authentication

## Future Enhancements

- [ ] User preference for default sidebar state
- [ ] Breadcrumb navigation
- [ ] Search functionality in sidebar
- [ ] Recent pages quick access
- [ ] Customizable navigation order
- [ ] Dark mode support
- [ ] Notification badges on navigation items