import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Download,
  Eraser,
  Save,
  Tag,
  Type,
  Undo,
  Redo
} from "lucide-react";

interface DraftData {
  title: string;
  contentHtml: string;
  tags: string[];
  updatedAt: string;
}

const STORAGE_KEY = "glee-writing-draft";

export const GleeWritingWidget: React.FC = () => {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [lastSaved, setLastSaved] = useState<string>("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: DraftData = JSON.parse(raw);
        setTitle(data.title || "");
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setLastSaved(data.updatedAt || "");
        if (editorRef.current) {
          editorRef.current.innerHTML = data.contentHtml || "";
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const getEditorHTML = () => editorRef.current?.innerHTML || "";

  const saveDraft = () => {
    const payload: DraftData = {
      title: title.trim(),
      contentHtml: getEditorHTML(),
      tags,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastSaved(payload.updatedAt);
  };

  // Autosave (debounced)
  useEffect(() => {
    const handler = () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveDraft();
      }, 1200);
    };

    const el = editorRef.current;
    el?.addEventListener("input", handler);
    return () => {
      el?.removeEventListener("input", handler);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [title, tags]);

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTitle("");
    setTags([]);
    setTagInput("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setLastSaved("");
  };

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const insertLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImage = (file: File) => {
    const url = URL.createObjectURL(file);
    exec("insertImage", url);
    // Revoke later to avoid memory leak
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const onPickImage = () => fileInputRef.current?.click();

  const exportHTML = () => {
    const blob = new Blob([
      `<!doctype html><html><head><meta charset="utf-8"><title>${
        title || "glee-writing"
      }</title></head><body><h1>${title || "Untitled"}</h1>${getEditorHTML()}</body></html>`
    ], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (title || "glee-writing").replace(/[^a-z0-9\-]+/gi, "-").toLowerCase();
    a.download = `${safeTitle}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    // Very naive HTML -> Markdown fallback
    const html = getEditorHTML()
      .replace(/<\/?strong>/g, "**")
      .replace(/<\/?b>/g, "**")
      .replace(/<\/?em>/g, "*")
      .replace(/<\/?i>/g, "*")
      .replace(/<h1>/g, "# ")
      .replace(/<\/h1>/g, "\n\n")
      .replace(/<h2>/g, "## ")
      .replace(/<\/h2>/g, "\n\n")
      .replace(/<ul>/g, "\n")
      .replace(/<li>/g, "- ")
      .replace(/<\/li>/g, "\n")
      .replace(/<\/ul>/g, "\n")
      .replace(/<ol>/g, "\n")
      .replace(/<\/?p>/g, "\n")
      .replace(/<br\s*\/>/g, "\n")
      .replace(/<[^>]+>/g, "");

    const lines = [
      `# ${title || "Untitled"}`,
      tags.length ? `\nTags: ${tags.join(", ")}` : "",
      "\n---\n",
      html.trim(),
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
            <p className="text-xs text-muted-foreground">Rich editor with headings, lists, links, and images. Autosaves locally.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveDraft} aria-label="Save now">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" size="sm" onClick={exportHTML} aria-label="Export HTML">
              <Download className="h-4 w-4 mr-2" /> Export .html
            </Button>
            <Button variant="outline" size="sm" onClick={exportMarkdown} aria-label="Export Markdown">
              <Download className="h-4 w-4 mr-2" /> Export .md
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

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border rounded-md p-2 bg-background/40 border-border">
            <Button variant="outline" size="icon" onClick={() => exec("undo") } aria-label="Undo"><Undo className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exec("redo") } aria-label="Redo"><Redo className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="icon" onClick={() => exec("bold") } aria-label="Bold"><Bold className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exec("italic") } aria-label="Italic"><Italic className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exec("underline") } aria-label="Underline"><Underline className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="icon" onClick={() => exec("formatBlock", "H1") } aria-label="Heading 1"><Heading1 className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exec("formatBlock", "H2") } aria-label="Heading 2"><Heading2 className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="icon" onClick={() => exec("insertUnorderedList") } aria-label="Bullet list"><List className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => exec("insertOrderedList") } aria-label="Numbered list"><ListOrdered className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-border" />
            <Button variant="outline" size="icon" onClick={insertLink} aria-label="Insert link"><LinkIcon className="h-4 w-4" /></Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) insertImage(file);
              // reset so same file can be selected again
              if (fileInputRef.current) fileInputRef.current.value = "";
            }} />
            <Button variant="outline" size="icon" onClick={onPickImage} aria-label="Insert image"><ImageIcon className="h-4 w-4" /></Button>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            className="min-h-[320px] rounded-md border border-border bg-background/60 p-4 focus:outline-none prose prose-sm max-w-none dark:prose-invert"
            contentEditable
            role="textbox"
            aria-multiline
            aria-label="Writing editor"
            suppressContentEditableWarning
            onBlur={saveDraft}
          />

          <p className="text-xs text-muted-foreground">{lastSavedText}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GleeWritingWidget;
