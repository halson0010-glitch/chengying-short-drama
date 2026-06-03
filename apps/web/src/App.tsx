import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import AccountPage from './pages/AccountPage';
import CategoryPage from './pages/CategoryPage';
import DetailPage from './pages/DetailPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import WatchPage from './pages/WatchPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="category" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="detail/:id" element={<DetailPage />} />
        <Route path="watch/:id/:episode" element={<WatchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
