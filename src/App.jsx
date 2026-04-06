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
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center full-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
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
          <ProtectedRoute>
            <CourseList />
          </ProtectedRoute>
        } />
        
        <Route path="/management" element={
          <ProtectedRoute>
            <CourseManagement />
          </ProtectedRoute>
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

        <Route path="/bureau-analytics" element={
          <ProtectedRoute>
            <BureauAnalytics />
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
        
        <Route path="/courses/:courseId" element={
          <ProtectedRoute>
            <CourseDetails />
          </ProtectedRoute>
        } />
        
        <Route path="/courses/:courseId/lessons/:lessonId" element={
          <ProtectedRoute>
            <LessonDetails />
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/live" element={
          <ProtectedRoute>
            <LiveClassroom />
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/quiz/:quizName" element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/assignment/:assignmentId" element={
          <ProtectedRoute>
            <AssignmentSubmit />
          </ProtectedRoute>
        } />
        <Route path="/courses/:courseId/assignment/:assignmentId/submissions" element={
          <ProtectedRoute>
            <SubmissionsList />
          </ProtectedRoute>
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
