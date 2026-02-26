import React from "react";
import { InvoiceMaker } from "@/components/admin/InvoiceMaker";
import { ModuleProps } from "@/types/unified-modules";

export const InvoiceMakerModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <div className="w-full min-h-[200px]">
      <InvoiceMaker />
    </div>
  );
};
