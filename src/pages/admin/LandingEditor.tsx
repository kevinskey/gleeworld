// /admin/landing-editor — kept as a permanent redirect to the unified Site Setup
// page so any cards, bookmarks, or old in-app links don't break. All landing
// editing lives in /admin/site-setup now.
import { Navigate } from 'react-router-dom';

export default function LandingEditor() {
  return <Navigate to="/admin/site-setup" replace />;
}
