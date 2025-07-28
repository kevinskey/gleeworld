import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { ProductManager } from '@/components/admin/ProductManager';
import { Loader2, Package, Shield } from 'lucide-react';

const AdminProducts = () => {
  const { user, loading: authLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (authLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="space-y-4 md:space-y-6 px-4 md:px-0">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-brand-500" />
            <Package className="h-6 w-6 md:h-8 md:w-8 text-brand-500" />
            <h1 className="text-2xl md:text-3xl font-bebas text-brand-800 tracking-wide">Admin Products</h1>
          </div>
        </div>

        {/* Product Manager Component */}
        <ProductManager />
      </div>
    </UniversalLayout>
  );
};

export default AdminProducts;