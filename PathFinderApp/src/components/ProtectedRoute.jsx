import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../context/useUser';

const ProtectedRoute = () => {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
