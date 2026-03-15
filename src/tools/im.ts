import type { FeishuClient } from "../client/feishu-client.js";

export interface SendMessageOptions {
  receiveId: string;
  receiveIdType?: "chat_id" | "open_id" | "user_id" | "union_id" | "email";
  text: string;
  mentions?: Array<{ userId: string; name: string }>;
}

export interface SendCardOptions {
  receiveId: string;
  receiveIdType?: "chat_id" | "open_id";
  card: string;
}

function buildTextContent(
  text: string,
  mentions?: Array<{ userId: string; name: string }>
): string {
  if (!mentions || mentions.length === 0) {
    return JSON.stringify({ text });
  }
  let content = text;
  for (const m of mentions) {
    const atTag = `<at user_id="${m.userId}">${m.name}</at>`;
    if (!content.includes(atTag)) {
      content += ` ${atTag}`;
    }
  }
  return JSON.stringify({ text: content });
}

export async function sendMessage(
  client: FeishuClient,
  opts: SendMessageOptions
) {
  const res = await client.im.v1.message.create({
    params: { receive_id_type: opts.receiveIdType || "chat_id" },
    data: {
      receive_id: opts.receiveId,
      msg_type: "text",
      content: buildTextContent(opts.text, opts.mentions),
    },
  });
  return res;
}

export async function sendCard(client: FeishuClient, opts: SendCardOptions) {
  const res = await client.im.v1.message.create({
    params: { receive_id_type: opts.receiveIdType || "chat_id" },
    data: {
      receive_id: opts.receiveId,
      msg_type: "interactive",
      content: opts.card,
    },
  });
  return res;
}

export async function listChats(client: FeishuClient, pageSize = 20) {
  const res = await client.im.v1.chat.list({
    params: { page_size: pageSize },
  });
  return res;
}

export async function createChat(
  client: FeishuClient,
  name: string,
  userIds?: string[]
) {
  const res = await client.im.v1.chat.create({
    data: {
      name,
      user_id_list: userIds,
    },
  });
  return res;
}

export async function uploadImage(client: FeishuClient, filePath: string) {
  const { createReadStream } = await import("node:fs");
  const res = await client.im.v1.image.create({
    data: {
      image_type: "message",
      image: createReadStream(filePath),
    },
  });
  return res;
}

export async function uploadFile(
  client: FeishuClient,
  filePath: string,
  fileType: string = "stream"
) {
  const { createReadStream, statSync } = await import("node:fs");
  const { basename } = await import("node:path");
  const stat = statSync(filePath);
  const res = await client.im.v1.file.create({
    data: {
      file_type: fileType as "opus" | "mp4" | "pdf" | "doc" | "xls" | "ppt" | "stream",
      file_name: basename(filePath),
      file: createReadStream(filePath),
    },
  });
  return res;
}
