import { handleUploadSignature } from "../lib/server/cloudinary";

export default function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  handleUploadSignature(req, res);
}
