import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  message: string;
  results?: {
    created: number;
    updated: number;
    enrolled: number;
    errors: string[];
  };
}

export function useSyncStudentsFromGleeWorld() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncStudents = async (courseCode?: string): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      console.log("[useSyncStudentsFromGleeWorld] Starting sync...", { courseCode });

      const { data, error } = await supabase.functions.invoke("fetch-students-from-gleeworld", {
        body: courseCode ? { courseCode } : {},
      });

      if (error) {
        console.error("[useSyncStudentsFromGleeWorld] Error:", error);
        const result: SyncResult = {
          success: false,
          message: error.message || "Failed to sync students",
        };
        setLastSyncResult(result);
        toast.error("Failed to sync students from GleeWorld");
        return result;
      }

      console.log("[useSyncStudentsFromGleeWorld] Sync result:", data);
      
      const result: SyncResult = {
        success: true,
        message: data.message || "Sync completed",
        results: data.results,
      };
      
      setLastSyncResult(result);

      if (data.results) {
        const { created, updated, enrolled, errors } = data.results;
        if (created > 0 || updated > 0 || enrolled > 0) {
          toast.success(
            `Synced students: ${created} created, ${updated} updated, ${enrolled} enrolled`
          );
        } else if (errors?.length > 0) {
          toast.warning(`Sync completed with ${errors.length} errors`);
        } else {
          toast.info("No new students to sync");
        }
      } else {
        toast.success("Student sync completed");
      }

      return result;
    } catch (err) {
      console.error("[useSyncStudentsFromGleeWorld] Exception:", err);
      const result: SyncResult = {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      };
      setLastSyncResult(result);
      toast.error("Failed to sync students");
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncStudents,
    isSyncing,
    lastSyncResult,
  };
}
