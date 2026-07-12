import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  folder: string;
  accept?: string;
  capture?: "user" | "environment";
}

export default function ImageUpload({ value, onChange, label, folder, accept = "image/*", capture }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Process files and obtain clean compressed base64 FIRST before any state changes (crucial for iOS Safari)
      const base64String = await new Promise<string>((resolve, reject) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxWidth = 1200;
              const maxHeight = 1200;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxWidth) {
                  height = Math.round((height * maxWidth) / width);
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = Math.round((width * maxHeight) / height);
                  height = maxHeight;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(event.target?.result as string);
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.7));
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        } else {
          // For non-images, read normally
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        }
      });

      // 2. Set the uploading state now that file has been safely converted
      setUploading(true);
      
      console.log("Starting server-side upload for:", file.name);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: base64String,
          folder: folder,
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la subida al servidor");
      }

      const { url } = await response.json();
      console.log("Upload completed successfully:", url);
      
      onChange(url);
      toast.success("Imagen subida correctamente");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Error al subir la imagen: ${error.message || "Intenta de nuevo."}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {value ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          <img src={value} alt="Preview" className="w-full h-full object-contain" />
          <button 
            onClick={() => onChange("")}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-xs text-slate-500">Subiendo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {capture ? <Camera className="w-8 h-8 text-slate-400" /> : <Upload className="w-8 h-8 text-slate-400" />}
              <span className="text-xs text-slate-500">Hacer click para subir</span>
            </div>
          )}
          <input 
            type="file" 
            className="hidden" 
            accept={accept} 
            capture={capture}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
