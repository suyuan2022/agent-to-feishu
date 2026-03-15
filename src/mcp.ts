import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { requireConfig } from "./utils/config.js";
import { FeishuClient } from "./client/feishu-client.js";
import * as im from "./tools/im.js";
import * as docs from "./tools/docs.js";
import * as bitable from "./tools/bitable.js";
import * as wiki from "./tools/wiki.js";
import * as calendar from "./tools/calendar.js";
import { formatError } from "./utils/errors.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

export async function startMcpServer() {
  const config = requireConfig();
  const client = new FeishuClient(config);

  const server = new McpServer({
    name: "agent-to-feishu",
    version: "0.1.0",
  });

  // ── IM Tools ──

  server.tool(
    "im_send",
    "Send a text message to a Feishu chat or user. Supports @mentions.",
    {
      receive_id: z.string().describe("Chat ID (oc_xxx) or user Open ID (ou_xxx)"),
      receive_id_type: z.enum(["chat_id", "open_id"]).default("chat_id").describe("ID type"),
      text: z.string().describe("Message text. Use <at user_id=\"ou_xxx\">Name</at> to @mention"),
    },
    async ({ receive_id, receive_id_type, text }) => {
      try {
        const res = await im.sendMessage(client, { receiveId: receive_id, receiveIdType: receive_id_type, text });
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "im_send_card",
    "Send an interactive card message to a Feishu chat",
    {
      receive_id: z.string().describe("Chat ID"),
      card: z.string().describe("Card JSON (Feishu card schema v2)"),
    },
    async ({ receive_id, card }) => {
      try {
        const res = await im.sendCard(client, { receiveId: receive_id, card });
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "im_list_chats",
    "List Feishu group chats the bot has joined",
    { page_size: z.number().default(20).describe("Number of results") },
    async ({ page_size }) => {
      try {
        const res = await im.listChats(client, page_size);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "im_create_chat",
    "Create a new Feishu group chat",
    {
      name: z.string().describe("Chat name"),
      user_ids: z.array(z.string()).optional().describe("User Open IDs to add"),
    },
    async ({ name, user_ids }) => {
      try {
        const res = await im.createChat(client, name, user_ids);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "im_upload_image",
    "Upload an image to Feishu and get image_key for messaging",
    { file_path: z.string().describe("Local file path to the image") },
    async ({ file_path }) => {
      try {
        const res = await im.uploadImage(client, file_path);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "im_upload_file",
    "Upload a file to Feishu and get file_key for messaging",
    {
      file_path: z.string().describe("Local file path"),
      file_type: z.enum(["opus", "mp4", "pdf", "doc", "xls", "ppt", "stream"]).default("stream"),
    },
    async ({ file_path, file_type }) => {
      try {
        const res = await im.uploadFile(client, file_path, file_type);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  // ── Docs Tools ──

  server.tool(
    "docs_read",
    "Read a Feishu document and return its content",
    { document: z.string().describe("Document URL or token") },
    async ({ document }) => {
      try {
        const docId = docs.extractDocToken(document);
        const res = await docs.readDoc(client, docId);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "docs_create",
    "Create a new Feishu document",
    {
      title: z.string().describe("Document title"),
      folder_token: z.string().optional().describe("Parent folder token"),
    },
    async ({ title, folder_token }) => {
      try {
        const res = await docs.createDoc(client, title, folder_token);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "docs_search",
    "Search Feishu documents by keyword",
    {
      query: z.string().describe("Search keyword"),
      count: z.number().default(20).describe("Number of results"),
    },
    async ({ query, count }) => {
      try {
        const res = await docs.searchDocs(client, query, count);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "docs_list_folder",
    "List files in a Feishu Drive folder",
    {
      folder_token: z.string().optional().describe("Folder token (omit for root)"),
      page_size: z.number().default(50),
    },
    async ({ folder_token, page_size }) => {
      try {
        const res = await docs.listFolder(client, folder_token, page_size);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  // ── Bitable Tools ──

  server.tool(
    "bitable_query",
    "Query records from a Feishu Bitable (multidimensional spreadsheet)",
    {
      app_token: z.string().describe("Bitable app token or URL"),
      table_id: z.string().describe("Table ID"),
      filter: z.string().optional().describe("Filter expression"),
      page_size: z.number().default(20),
    },
    async ({ app_token, table_id, filter, page_size }) => {
      try {
        const { appToken } = bitable.extractBitableTokens(app_token);
        const res = await bitable.queryRecords(client, appToken, table_id, filter, undefined, page_size);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "bitable_create",
    "Create new records in a Feishu Bitable table",
    {
      app_token: z.string(),
      table_id: z.string(),
      records: z.string().describe('JSON array: [{"fields":{"Name":"value"}}]'),
    },
    async ({ app_token, table_id, records }) => {
      try {
        const parsed = JSON.parse(records);
        const res = await bitable.createRecords(client, app_token, table_id, parsed);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "bitable_update",
    "Update records in a Feishu Bitable table",
    {
      app_token: z.string(),
      table_id: z.string(),
      records: z.string().describe('JSON: [{"record_id":"xxx","fields":{}}]'),
    },
    async ({ app_token, table_id, records }) => {
      try {
        const parsed = JSON.parse(records);
        const res = await bitable.updateRecords(client, app_token, table_id, parsed);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "bitable_delete",
    "Delete records from a Feishu Bitable table",
    {
      app_token: z.string(),
      table_id: z.string(),
      record_ids: z.string().describe("Comma-separated record IDs"),
    },
    async ({ app_token, table_id, record_ids }) => {
      try {
        const ids = record_ids.split(",").map((s) => s.trim());
        const res = await bitable.deleteRecords(client, app_token, table_id, ids);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  // ── Wiki Tools ──

  server.tool(
    "wiki_list_spaces",
    "List Feishu Wiki spaces",
    { page_size: z.number().default(20) },
    async ({ page_size }) => {
      try {
        const res = await wiki.listSpaces(client, page_size);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "wiki_read_node",
    "Read a Feishu Wiki node (returns document content if docx type)",
    {
      space_id: z.string().describe("Wiki space ID"),
      node_token: z.string().describe("Node token"),
    },
    async ({ space_id, node_token }) => {
      try {
        const res = await wiki.readNode(client, space_id, node_token);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "wiki_create_node",
    "Create a new node in a Feishu Wiki space",
    {
      space_id: z.string(),
      parent_node_token: z.string(),
      title: z.string(),
      obj_type: z.enum(["docx", "sheet", "bitable"]).default("docx"),
    },
    async ({ space_id, parent_node_token, title, obj_type }) => {
      try {
        const res = await wiki.createNode(client, space_id, parent_node_token, title, obj_type);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  // ── Calendar Tools ──

  server.tool(
    "calendar_list_events",
    "List events from a Feishu calendar",
    {
      calendar_id: z.string().default("primary"),
      start_time: z.string().optional().describe("ISO 8601 start time"),
      end_time: z.string().optional().describe("ISO 8601 end time"),
    },
    async ({ calendar_id, start_time, end_time }) => {
      try {
        const res = await calendar.listEvents(client, calendar_id, start_time, end_time);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "calendar_create_event",
    "Create a new event on a Feishu calendar",
    {
      summary: z.string().describe("Event title"),
      start_time: z.string().describe("ISO 8601 start time"),
      end_time: z.string().describe("ISO 8601 end time"),
      calendar_id: z.string().default("primary"),
      description: z.string().optional(),
    },
    async ({ summary, start_time, end_time, calendar_id, description }) => {
      try {
        const res = await calendar.createEvent(client, calendar_id, summary, start_time, end_time, description);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  server.tool(
    "calendar_delete_event",
    "Delete an event from a Feishu calendar",
    {
      event_id: z.string(),
      calendar_id: z.string().default("primary"),
    },
    async ({ event_id, calendar_id }) => {
      try {
        const res = await calendar.deleteEvent(client, calendar_id, event_id);
        return ok(res);
      } catch (e) { return err(formatError(e)); }
    }
  );

  // ── Start ──

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
