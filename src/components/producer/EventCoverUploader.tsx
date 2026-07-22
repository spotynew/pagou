import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadedCover = { url: string; path: string };

export function EventCoverUploader({
  sellerId,
  value,
  onChange,
  onDeletePrevious,
}: {
  sellerId: string | undefined;
  value: UploadedCover | null;
  onChange: (next: UploadedCover | null) => void;
  onDeletePrevious?: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!sellerId) {
      toast.error("Conta de produtor não encontrada.");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${sellerId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("event-covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
      const previous = value?.path;
      onChange({ url: data.publicUrl, path });
      if (previous && onDeletePrevious) onDeletePrevious(previous);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao enviar a imagem.";
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    const path = value.path;
    onChange(null);
    if (onDeletePrevious) onDeletePrevious(path);
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted">
        {value?.url ? (
          <img src={value.url} alt="Prévia da capa" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <p className="text-xs">Sem capa · proporção 16:9</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || !sellerId}
          onClick={() => inputRef.current?.click()}
        >
          {value ? "Trocar imagem" : "Enviar capa"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={handleRemove}
          >
            <Trash2 className="mr-1 h-4 w-4" /> Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB.</p>
    </div>
  );
}

export function extractEventCoverPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/event-covers/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}