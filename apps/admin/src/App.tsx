import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { getToken } from './lib/api';
import AnalyticsPage from './pages/AnalyticsPage';
import DashboardPage from './pages/DashboardPage';
import DemoAssetsPage from './pages/DemoAssetsPage';
import DramaFormPage from './pages/DramaFormPage';
import DramasPage from './pages/DramasPage';
import EpisodesPage from './pages/EpisodesPage';
import LoginPage from './pages/LoginPage';
import UploadsPage from './pages/UploadsPage';
import VisualGeneratorPage from './pages/VisualGeneratorPage';

function ProtectedRoute() {
  return getToken() ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dramas" element={<DramasPage />} />
        <Route path="/dramas/new" element={<DramaFormPage />} />
        <Route path="/dramas/:id/edit" element={<DramaFormPage />} />
        <Route path="/dramas/:id/episodes" element={<EpisodesPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/demo-assets" element={<DemoAssetsPage />} />
        <Route path="/visual-generator" element={<VisualGeneratorPage />} />
        <Route path="/analytics" element={<AnalyticsPage mode="overview" />} />
        <Route path="/analytics/search-keywords" element={<AnalyticsPage mode="search" />} />
        <Route path="/analytics/drama-clicks" element={<AnalyticsPage mode="clicks" />} />
        <Route path="/analytics/play-funnel" element={<AnalyticsPage mode="funnel" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
