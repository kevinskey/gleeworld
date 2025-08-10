import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Eraser, Save, Tag, Type } from "lucide-react";

interface DraftData {
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

const STORAGE_KEY = "glee-writing-draft";

export const GleeWritingWidget: React.FC = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const saveTimer = useRef<number | null>(null);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: DraftData = JSON.parse(raw);
        setTitle(data.title || "");
        setContent(data.content || "");
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setLastSaved(data.updatedAt || "");
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  const saveDraft = () => {
    const payload: DraftData = {
      title: title.trim(),
      content,
      tags,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSaved(payload.updatedAt);
  };

  // Autosave (debounced)
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveDraft();
    }, 1200);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [title, content, tags]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTitle("");
    setContent("");
    setTags([]);
    setTagInput("");
    setLastSaved("");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const exportMarkdown = () => {
    const lines = [
      `# ${title || "Untitled"}`,
      tags.length ? `\nTags: ${tags.join(", ")}` : "",
      "\n---\n",
      content,
      "\n",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (title || "glee-writing").replace(/[^a-z0-9\-]+/gi, "-").toLowerCase();
    a.download = `${safeTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return "Not saved yet";
    try {
      const d = new Date(lastSaved);
      return `Saved ${d.toLocaleString()}`;
    } catch {
      return "Saved";
    }
  }, [lastSaved]);

  return (
    <div className="space-y-4">
      <Card className="border-border bg-background/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">Glee Writing Widget</CardTitle>
            <p className="text-xs text-muted-foreground">To Amaze and Inspire — jot lyrics, notes, or minutes. Autosaves locally.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft} aria-label="Save now">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportMarkdown} aria-label="Export markdown">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button variant="destructive" size="sm" onClick={clearDraft} aria-label="Clear draft">
              <Eraser className="h-4 w-4 mr-2" /> Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Type className="h-4 w-4" /> Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of your entry"
              aria-label="Writing title"
            />
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tags
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                aria-label="Add tag"
              />
              <Button variant="outline" type="button" onClick={addTag}>
                Add
              </Button>
            </div>
            {!!tags.length && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing here..."
              className="min-h-[280px]"
              aria-label="Writing content"
            />
            <p className="text-xs text-muted-foreground">{lastSavedText}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GleeWritingWidget;
