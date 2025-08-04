import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, File, Download, Plus } from "lucide-react";

const DocumentsForms = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents & Forms</h1>
          <p className="text-muted-foreground">Contracts, W9s, and official paperwork</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contracts
            </CardTitle>
            <CardDescription>Performance and service contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active</span>
                <span className="font-bold">8</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <span className="font-bold">3</span>
              </div>
              <div className="flex justify-between">
                <span>Completed</span>
                <span className="font-bold">25</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Contracts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              W9 Forms
            </CardTitle>
            <CardDescription>Tax forms and documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Submitted</span>
                <span className="font-bold">45</span>
              </div>
              <div className="flex justify-between">
                <span>Pending</span>
                <span className="font-bold">12</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              Send W9 Forms
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Document Templates
            </CardTitle>
            <CardDescription>Reusable form templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                Contract Templates
              </Button>
              <Button variant="outline" className="w-full">
                Agreement Forms
              </Button>
              <Button variant="outline" className="w-full">
                Permission Slips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentsForms;