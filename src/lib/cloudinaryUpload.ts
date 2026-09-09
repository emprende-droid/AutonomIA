// Exported so callers can compress the file (and get a stable base64 string)
// BEFORE triggering any React state updates — on iOS Safari, a re-render
// while the file input's file is still being read can invalidate the read.
export function compressForUpload(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
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
      // For non-images (like PDFs), read normally
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
}

interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  publicId: string;
}

// Also exported so callers can fetch it in parallel with compressForUpload —
// it has no dependency on the file's (compressed) content, only on the
// folder/fileNameBase, so there's no reason to wait for compression first.
export async function getUploadSignature(folder: string, fileNameBase: string): Promise<CloudinarySignature> {
  const publicId = `${Date.now()}_${fileNameBase.split(".")[0]}`;

  const sigResponse = await fetch("/api/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, publicId }),
  });

  if (!sigResponse.ok) {
    const errorData = await sigResponse.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al preparar la subida");
  }

  const { signature, timestamp, apiKey, cloudName } = await sigResponse.json();
  return { signature, timestamp, apiKey, cloudName, publicId };
}

/**
 * Uploads an already-compressed base64 data URL straight from the browser to
 * Cloudinary using a signature obtained via getUploadSignature. The file
 * bytes never pass through our own backend/serverless function, which avoids
 * Vercel's ~4.5MB serverless request body limit.
 */
export async function uploadToCloudinary(base64String: string, folder: string, signature: CloudinarySignature): Promise<string> {
  const formData = new FormData();
  formData.append("file", base64String);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", folder);
  formData.append("public_id", signature.publicId);

  const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Error al subir el archivo a Cloudinary");
  }

  const { secure_url } = await uploadResponse.json();
  return secure_url;
}
