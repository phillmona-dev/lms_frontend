import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetails from './pages/CourseDetails';
import LessonDetails from './pages/LessonDetails';
import LiveClassroom from './pages/LiveClassroom';
import QuizPage from './pages/QuizPage';
import CourseManagement from './pages/CourseManagement';
import AssignmentSubmit from './pages/AssignmentSubmit';
import SubmissionsList from './pages/SubmissionsList';
import RbacManagement from './pages/RbacManagement';
import StudentMonitoring from './pages/StudentMonitoring';
import AiInsights from './pages/AiInsights';
import UserManagement from './pages/UserManagement';
import SchoolDirectory from './pages/SchoolDirectory';
import SchoolAdminCenter from './pages/SchoolAdminCenter';
import BehaviorReports from './pages/BehaviorReports';
import BureauAnalytics from './pages/BureauAnalytics';
import ProgressCenter from './pages/ProgressCenter';
import DigitalLibrary from './pages/DigitalLibrary';
import EducationSearch from './pages/EducationSearch';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const resolveRole = (user) => user?.legacyRole || user?.role || user?.roles?.[0]?.name || '';
const normalizeRoleKey = (role) => String(role || '').trim().toUpperCase().replace(/\s+/g, '_');
const hasCourseAccess = (user) => {
  const role = normalizeRoleKey(resolveRole(user));
  return role !== 'SYSTEM_ADMINISTRATOR' && role !== 'BUREAU_OF_EDUCATION';
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center full-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const CourseRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center full-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCourseAccess(user)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Layout with top Navbar for inner pages (courses, lessons, etc.)
const MainLayout = () => {
  return (
    <>
      <Navbar />
      <div className="container" style={{ marginTop: '2rem' }}>
        <Outlet />
      </div>
    </>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard gets full screen - has its own sidebar */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Course pages use the top Navbar layout */}
      <Route element={<MainLayout />}>
        <Route path="/courses" element={
          <CourseRoute>
            <CourseList />
          </CourseRoute>
        } />
        
        <Route path="/management" element={
          <CourseRoute>
            <CourseManagement />
          </CourseRoute>
        } />
        
        <Route path="/rbac-management" element={
          <ProtectedRoute>
            <RbacManagement />
          </ProtectedRoute>
        } />
        
        <Route path="/student-monitoring" element={
          <ProtectedRoute>
            <StudentMonitoring />
          </ProtectedRoute>
        } />
        
        <Route path="/ai-insights" element={
          <ProtectedRoute>
            <AiInsights />
          </ProtectedRoute>
        } />

        <Route path="/users-management" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />

        <Route path="/school-directory" element={
          <ProtectedRoute>
            <SchoolDirectory />
          </ProtectedRoute>
        } />

        <Route path="/school-admin-center" element={
          <ProtectedRoute>
            <SchoolAdminCenter />
          </ProtectedRoute>
        } />

        <Route path="/behavior-reports" element={
          <ProtectedRoute>
            <BehaviorReports />
          </ProtectedRoute>
        } />

        <Route path="/bureau/:tab" element={
          <ProtectedRoute>
            <BureauAnalytics />
          </ProtectedRoute>
        } />

        <Route path="/bureau" element={
          <ProtectedRoute>
            <Navigate to="/bureau/overview" replace />
          </ProtectedRoute>
        } />

        <Route path="/progress-center" element={
          <ProtectedRoute>
            <ProgressCenter />
          </ProtectedRoute>
        } />

        <Route path="/digital-library" element={
          <ProtectedRoute>
            <DigitalLibrary />
          </ProtectedRoute>
        } />

        <Route path="/education-search" element={
          <ProtectedRoute>
            <EducationSearch />
          </ProtectedRoute>
        } />
        
        <Route path="/courses/:courseId" element={
          <CourseRoute>
            <CourseDetails />
          </CourseRoute>
        } />
        
        <Route path="/courses/:courseId/lessons/:lessonId" element={
          <CourseRoute>
            <LessonDetails />
          </CourseRoute>
        } />
        <Route path="/courses/:courseId/live" element={
          <CourseRoute>
            <LiveClassroom />
          </CourseRoute>
        } />
        <Route path="/courses/:courseId/quiz/:quizName" element={
          <CourseRoute>
            <QuizPage />
          </CourseRoute>
        } />
        <Route path="/courses/:courseId/assignment/:assignmentId" element={
          <CourseRoute>
            <AssignmentSubmit />
          </CourseRoute>
        } />
        <Route path="/courses/:courseId/assignment/:assignmentId/submissions" element={
          <CourseRoute>
            <SubmissionsList />
          </CourseRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
