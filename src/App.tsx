
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// Public Pages
import Home from '@/pages/Home';
import About from '@/pages/About';
import Events from '@/pages/Events';
import Join from '@/pages/Join';
import Contact from '@/pages/Contact';
import Shop from '@/pages/Shop';
import OfficeHoursPage from '@/pages/OfficeHoursPage';

// Protected Pages
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Music from '@/pages/Music';
import Auditions from '@/pages/Auditions';
import Communications from '@/pages/Communications';
import Budgeting from '@/pages/Budgeting';
import Wellness from '@/pages/Wellness';
import FirstYearConsole from '@/pages/FirstYearConsole';
import HandbookExam from '@/pages/HandbookExam';
import HandbookSignature from '@/pages/HandbookSignature';

// Admin Pages
import AccessControl from '@/pages/admin/AccessControl';
import RoleManager from '@/pages/admin/RoleManager';
import ModulePermissions from '@/pages/admin/ModulePermissions';
import CalendarAdmin from '@/pages/admin/CalendarAdmin';
import EventAdmin from '@/pages/admin/EventAdmin';
import BudgetAdmin from '@/pages/admin/BudgetAdmin';
import UserAdmin from '@/pages/admin/UserAdmin';
import HandbookAdmin from '@/pages/admin/HandbookAdmin';

// Layouts
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/join" element={<Join />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/booking" element={<OfficeHoursPage />} />

            {/* App Routes - Requires Authentication */}
            <Route path="/app" element={<AppLayout />} >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="music" element={<Music />} />
              <Route path="auditions" element={<Auditions />} />
              <Route path="communications" element={<Communications />} />
              <Route path="budgeting" element={<Budgeting />} />
              <Route path="wellness" element={<Wellness />} />
              <Route path="first-year" element={<FirstYearConsole />} />
              <Route path="handbook-exam" element={<HandbookExam />} />
              <Route path="handbook-signature" element={<HandbookSignature />} />
            </Route>

            {/* Admin Routes - Requires Admin Role */}
            <Route path="/admin" element={<AdminLayout />} >
              <Route index element={<Admin />} />
              <Route path="dashboard" element={<Admin />} />
              <Route path="access" element={<AccessControl />} />
              <Route path="roles" element={<RoleManager />} />
              <Route path="modules" element={<ModulePermissions />} />
              <Route path="calendar" element={<CalendarAdmin />} />
              <Route path="events" element={<EventAdmin />} />
              <Route path="budgets" element={<BudgetAdmin />} />
              <Route path="users" element={<UserAdmin />} />
              <Route path="handbook" element={<HandbookAdmin />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
