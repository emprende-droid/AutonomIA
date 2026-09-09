import { handleChat } from "../lib/server/chat";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  await handleChat(req, res);
}
