import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { createNotePost, uploadNoteImage } from "@/lib/notes";

export function NoteComposer() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const post = useMutation({
    mutationFn: () =>
      createNotePost({
        title: title.trim(),
        content: content.trim(),
        tags: tagsText
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        cover_url: cover,
      }),
    onSuccess: () => {
      toast.success("已发布");
      setTitle("");
      setContent("");
      setTagsText("");
      setCover(null);
      qc.invalidateQueries({ queryKey: ["note-posts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "发布失败"),
  });

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          想发帖、评论或回复？
          <Link to="/auth" className="ml-1 font-medium text-primary hover:underline">
            登录 / 注册
          </Link>
        </p>
      </div>
    );
  }

  const onPickFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadNoteImage(file);
      setCover(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = content.trim().length > 0 && !post.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) post.mutate();
      }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题（可选）"
        maxLength={120}
        className="w-full border-0 bg-transparent px-1 py-1 text-base font-medium outline-none placeholder:text-muted-foreground/60"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="说点什么…支持 Markdown"
        rows={4}
        maxLength={5000}
        className="mt-1 w-full resize-y border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/60"
      />

      {cover && (
        <div className="relative mt-2 inline-block">
          <img
            src={cover}
            alt="封面"
            className="max-h-48 rounded-lg border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => setCover(null)}
            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 shadow hover:bg-background"
            aria-label="移除图片"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <input
        type="text"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        placeholder="标签（用空格或逗号分隔，如：随想 灵感）"
        className="mt-2 w-full border-0 border-t border-border/60 bg-transparent px-1 pt-2 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50"
      />

      <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? "上传中" : "图片"}
          </button>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/90"
        >
          {post.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          发布
        </button>
      </div>
    </form>
  );
}
