import { PublicLayout } from "@/components/layout/PublicLayout";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ShopSuccessPage = () => {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order Successful!</h1>
            <p className="text-muted-foreground mt-2">
              Thank you for your purchase. You will receive a confirmation email shortly.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button onClick={() => navigate("/shop")} className="w-full">
              Continue Shopping
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ShopSuccessPage;