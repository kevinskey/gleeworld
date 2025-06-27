
import { useState } from "react";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";
import { ContractsList } from "@/components/ContractsList";
import { DocumentUpload } from "@/components/DocumentUpload";
import { W9FormsListCollapsible } from "@/components/W9FormsListCollapsible";
import { AdminPanelCollapsible } from "@/components/AdminPanelCollapsible";
import { AccountingCardCollapsible } from "@/components/AccountingCardCollapsible";
import { ContractTemplates } from "@/components/ContractTemplates";
import { ReceiptsManagement } from "@/components/admin/ReceiptsManagement";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "templates":
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-3xl font-bold text-gradient mb-2">Contract Templates</h2>
              <p className="text-lg text-white/70">Create and manage reusable contract templates.</p>
            </div>
            <ContractTemplates />
          </div>
        );
      case "receipts":
        return <ReceiptsManagement />;
      case "dashboard":
      default:
        return (
          <div className="space-y-6">
            <StatsCards />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <DocumentUpload />
                <W9FormsListCollapsible />
              </div>
              <div className="space-y-6">
                <ContractsList />
                <AdminPanelCollapsible />
                <AccountingCardCollapsible />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-spelman-900 via-spelman-800 to-spelman-700">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-4 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
