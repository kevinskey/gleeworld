import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface DressCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DressCodeModal: React.FC<DressCodeModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-2xl font-bold">Dress Code</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Wardrobe
          </Button>
        </DialogHeader>
        
        <div className="space-y-8 text-sm leading-relaxed">
          {/* Formal Attire */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">
              Formal Attire:
            </h3>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Formal black dress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Black sheer stockings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>ALL black closed-toe flats</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Black undergarments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl teardrop earrings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl necklace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Red "Ruby Woo" lipstick</span>
              </li>
            </ul>
          </div>

          {/* Informal Black Attire */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">
              Informal Black Attire:
            </h3>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Black blouse (no cleavage, no sheer/see-through, no spaghetti straps)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Black skirt (knee-length, no side splits, no high splits, loosely fitting) OR Black slacks (no jeans)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Flesh-tone sheer stockings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>ALL black closed-toe flats</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Black undergarments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl stud earrings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl necklace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Natural/nude makeup (no red lipstick)</span>
              </li>
            </ul>
          </div>

          {/* Informal Attire */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b border-border pb-2">
              Informal Attire:
            </h3>
            <ul className="space-y-2 pl-4">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Glee Club shirt (will be determined per occasion)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Blue jeans or Black slacks (will be determined per occasion)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Closed-toe shoes (will be determined per occasion)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Natural/nude makeup (no red lipstick)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl stud earrings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">●</span>
                <span>Pearl necklace</span>
              </li>
            </ul>
          </div>

          {/* Additional Notes */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground">
              <span className="text-red-500">*</span> All hair ornaments MUST be black, and no sparkling makeup, overpowering perfumes, or body glitter
            </p>
          </div>

          {/* Revision Date */}
          <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
            Revised March 2024
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};