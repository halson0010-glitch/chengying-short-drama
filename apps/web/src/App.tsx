import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CategoryPage from './pages/CategoryPage';
import DetailPage from './pages/DetailPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import SearchPage from './pages/SearchPage';
import WatchPage from './pages/WatchPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="category" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="detail/:id" element={<DetailPage />} />
        <Route path="watch/:id/:episode" element={<WatchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
