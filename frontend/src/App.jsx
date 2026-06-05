import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AddAchievement from './pages/AddAchievement';
import AchievementDetail from './pages/AchievementDetail';
import Profile from './pages/Profile';
import MyAchievements from './pages/MyAchievements';
import Moderation from './pages/Moderation';
import AdminUsers from './pages/AdminUsers';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import Leaderboard from './pages/Leaderboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <ModalProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/achievements/:id" element={<AchievementDetail />} />
              <Route path="/add" element={<ProtectedRoute><AddAchievement /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/my-achievements" element={<ProtectedRoute><MyAchievements /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route
                path="/moderation"
                element={<ProtectedRoute roles={['curator', 'admin']}><Moderation /></ProtectedRoute>}
              />
              <Route
                path="/admin/users"
                element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>}
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

export default App;
