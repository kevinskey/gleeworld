import { Navigate, useParams } from 'react-router-dom';

export const ModuleRouteRedirect = () => {
  const { moduleId } = useParams();
  const target = moduleId ? `/dashboard?module=${encodeURIComponent(moduleId)}` : '/dashboard';
  return <Navigate to={target} replace />;
};
