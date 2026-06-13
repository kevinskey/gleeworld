// /admin/landing-editor — permanent redirect to the public page builder. All
// landing editing (branding, theme, blocks) now lives at /admin/public-page.
import { Navigate } from 'react-router-dom';

export default function LandingEditor() {
  return <Navigate to="/admin/public-page" replace />;
}
