import React, { useState } from "react";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { compressForUpload, getUploadSignature, uploadToCloudinary } from "../lib/cloudinaryUpload";

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
      // Compress and fetch the upload signature in parallel (independent work);
      // wait for both to finish BEFORE any state changes (crucial for iOS Safari)
      const [base64String, signature] = await Promise.all([
        compressForUpload(file),
        getUploadSignature(folder, file.name),
      ]);

      setUploading(true);
      const url = await uploadToCloudinary(base64String, folder, signature);
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
