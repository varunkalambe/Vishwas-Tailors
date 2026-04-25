import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-surface overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 px-4 pb-4 pt-14 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}