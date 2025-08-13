import { PublicLayout } from "@/components/layout/PublicLayout";

const ShopPage = () => {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Glee Club Shop</h1>
            <p className="text-muted-foreground">
              Browse our collection of merchandise
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">T-Shirts</h3>
              <p className="text-muted-foreground">Official Glee Club apparel</p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Accessories</h3>
              <p className="text-muted-foreground">Show your Glee Club pride</p>
            </div>
            
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Music</h3>
              <p className="text-muted-foreground">Recordings and sheet music</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ShopPage;