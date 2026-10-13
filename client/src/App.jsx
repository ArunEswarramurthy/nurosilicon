import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';

// Landing
import LandingPage from './pages/landing/LandingPage';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import SuperAdminLabPage from './pages/admin/SuperAdminLabPage';
import DailyChallengePage from './pages/admin/DailyChallengePage';
import ContestPage from './pages/admin/ContestPage';
import ContestDetailPage from './pages/admin/ContestDetailPage';
import ContestNewProblemPage from './pages/admin/ContestNewProblemPage';
import EngLabFoldersPage, { EngLabFolderDetailPage as EngLabFolderDetailPageAdmin } from './pages/shared/EngLabFoldersPage';
import EngineeringLabAddQuestionPage from './pages/shared/EngineeringLabAddQuestionPage';
import LabEditorPage from './pages/shared/LabEditorPage';
import AdminVerilogPage from './pages/admin/AdminVerilogPage';
import VerilogEditorPage from './pages/admin/VerilogEditorPage';

// Student
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import ProfilePage from './pages/student/ProfilePage';
import LabListPage from './pages/student/LabListPage';
import LabGroupPage from './pages/student/LabGroupPage';
import LabIDEPage from './pages/student/LabIDEPage';
import VerilogIDEPage from './pages/student/VerilogIDEPage';
import LabFreeIDEPage from './pages/student/LabFreeIDEPage';
import EngLabTestPage from './pages/student/EngLabTestPage';
import { EngLabFolderListPage, EngLabFolderDetailPage } from './pages/student/EngLabFolderStudentPage';
import EngineeringLabBankDetailPage from './pages/shared/EngineeringLabBankDetailPage';
import ContestListPage from './pages/student/ContestListPage';
import ContestArenaPage from './pages/student/ContestArenaPage';

// Learn — Admin
import AdminLearnDashboard from './pages/admin/learn/AdminLearnDashboard';
import AdminCoursesPage from './pages/admin/learn/AdminCoursesPage';
import CourseEditorPage from './pages/admin/learn/CourseEditorPage';
import AdminTemplatesPage from './pages/admin/learn/AdminTemplatesPage';
import TemplateEditorPage from './pages/admin/learn/TemplateEditorPage';
import CourseAnalyticsPage from './pages/admin/learn/CourseAnalyticsPage';
import LessonEditorPage from './pages/admin/learn/LessonEditorPage';
import { AdminCoursePreviewPage, AdminLessonPreviewPage } from './pages/admin/learn/AdminPreviewPages';

// Learn — Student
import StudentLearnPage from './pages/student/learn/StudentLearnPage';
import CourseOverviewPage from './pages/student/learn/CourseOverviewPage';
import LessonViewerPage from './pages/student/learn/LessonViewerPage';
import MyLearningPage from './pages/student/learn/MyLearningPage';
import QuizPage from './pages/student/learn/QuizPage';

// Misc
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
        <SocketProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* -- Super Admin -- */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['super_admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="lab" element={<SuperAdminLabPage />} />
              <Route path="lab/new" element={<LabEditorPage />} />
              <Route path="lab/:id/edit" element={<LabEditorPage />} />
              <Route path="verilog" element={<AdminVerilogPage />} />
              <Route path="verilog/new" element={<VerilogEditorPage />} />
              <Route path="verilog/:id/edit" element={<VerilogEditorPage />} />
              <Route path="daily-challenge" element={<DailyChallengePage />} />
              <Route path="contests" element={<ContestPage />} />
              <Route path="contests/:id" element={<ContestDetailPage />} />
              <Route path="contests/:id/new-problem" element={<ContestNewProblemPage />} />
              <Route path="eng-lab-folders" element={<EngLabFoldersPage />} />
              <Route path="eng-lab-folders/:id" element={<EngLabFolderDetailPageAdmin />} />
              <Route path="eng-lab-banks/:id/add-question" element={<EngineeringLabAddQuestionPage />} />
              <Route path="eng-lab-banks/:id/questions/:qId/edit" element={<EngineeringLabAddQuestionPage />} />
              {/* Learn */}
              <Route path="learn" element={<AdminLearnDashboard />} />
              <Route path="learn/courses" element={<AdminCoursesPage />} />
              <Route path="learn/courses/new" element={<CourseEditorPage />} />
              <Route path="learn/courses/:id/edit" element={<CourseEditorPage />} />
              <Route path="learn/courses/:courseId/lessons/:lessonId/edit" element={<LessonEditorPage />} />
              <Route path="learn/courses/:id/analytics" element={<CourseAnalyticsPage />} />
              <Route path="learn/templates" element={<AdminTemplatesPage />} />
              <Route path="learn/templates/:id/edit" element={<TemplateEditorPage />} />
              {/* Admin preview — renders student UI for admin eyes */}
              <Route path="learn/preview/:slug" element={<AdminCoursePreviewPage />} />
              <Route path="learn/preview/:slug/lesson/:lessonId" element={<AdminLessonPreviewPage />} />
            </Route>

            {/* -- Verilog IDE - full-screen -- */}
            <Route path="/student/verilog/:id" element={
              <ProtectedRoute roles={['student']}>
                <VerilogIDEPage />
              </ProtectedRoute>
            } />

            {/* -- Student Lab IDE - full-screen -- */}
            <Route path="/student/lab/ide" element={
              <ProtectedRoute roles={['student']}>
                <LabFreeIDEPage />
              </ProtectedRoute>
            } />
            <Route path="/student/lab/:id" element={
              <ProtectedRoute roles={['student']}>
                <LabIDEPage />
              </ProtectedRoute>
            } />

            {/* -- Contest Arena - full screen -- */}
            <Route path="/student/contests/:id" element={
              <ProtectedRoute roles={['student']}>
                <ContestArenaPage />
              </ProtectedRoute>
            } />

            {/* -- Student (with navbar) -- */}
            <Route path="/student" element={
              <ProtectedRoute roles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentDashboard />} />
              <Route path="lab" element={<LabListPage />} />
              <Route path="lab/group/:groupId" element={<LabGroupPage />} />
              <Route path="eng-lab-banks/:id" element={<EngineeringLabBankDetailPage />} />
              <Route path="eng-lab-banks/:id/test" element={<EngLabTestPage />} />
              <Route path="eng-lab-folders" element={<EngLabFolderListPage />} />
              <Route path="eng-lab-folders/:id" element={<EngLabFolderDetailPage />} />
              <Route path="contests" element={<ContestListPage />} />
              <Route path="profile" element={<ProfilePage />} />
              {/* Learn */}
              <Route path="learn" element={<StudentLearnPage />} />
              <Route path="learn/my-learning" element={<MyLearningPage />} />
              <Route path="learn/:slug" element={<CourseOverviewPage />} />
              <Route path="learn/:slug/lesson/:lessonId" element={<LessonViewerPage />} />
              <Route path="learn/:slug/quiz/:quizId" element={<QuizPage />} />
            </Route>

            <Route path="/" element={<LandingPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
        </SocketProvider>
    </AuthProvider>
  );
}
