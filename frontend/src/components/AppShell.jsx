import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const AppShell = () => {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
