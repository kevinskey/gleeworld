import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface FileItem {
  name: string;
  publicUrl: string;
  createdAt?: string;
}

export const AuditionDocuments: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin, isExecutiveBoard } = useUserRole();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canManage = isAdmin() || isExecutiveBoard();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("audition-docs")
        .list("", { limit: 100, offset: 0 });

      if (error) throw error;

      const mapped: FileItem[] = (data || [])
        .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
        .map((f) => ({
          name: f.name,
          publicUrl: supabase.storage.from("audition-docs").getPublicUrl(f.name).data.publicUrl,
          createdAt: f.created_at,
        }));

      setFiles(mapped);
    } catch (e: any) {
      console.error("Failed to load audition docs", e);
      toast({ title: "Error", description: e.message || "Failed to load documents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("audition-docs")
        .upload(fileName, file, { upsert: false });
      if (error) throw error;
      toast({ title: "Uploaded", description: "PDF uploaded successfully" });
      fetchFiles();
    } catch (e: any) {
      console.error("Upload failed", e);
      toast({ title: "Upload failed", description: e.message || "Could not upload PDF", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audition Documents</CardTitle>
        <CardDescription>Upload and share audition-related PDFs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => onUpload(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            <Button disabled>{uploading ? "Uploading..." : "Upload PDF"}</Button>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading documents…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audition PDFs yet.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {files.map((f) => (
                <li key={f.name}>
                  <a
                    href={f.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    aria-label={`Open ${f.name} PDF`}
                  >
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
