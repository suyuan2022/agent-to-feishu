import { Command } from "commander";
import { requireConfig, saveConfig, loadConfig, ensureConfigDir } from "./utils/config.js";
import { FeishuClient } from "./client/feishu-client.js";
import { printJson, printSuccess, printError } from "./utils/output.js";
import { formatError } from "./utils/errors.js";
import * as im from "./tools/im.js";
import * as docs from "./tools/docs.js";
import * as bitable from "./tools/bitable.js";
import * as wiki from "./tools/wiki.js";
import * as calendar from "./tools/calendar.js";
import * as approval from "./tools/approval.js";

const program = new Command();

program
  .name("agent-to-feishu")
  .description(
    "CLI for AI agents to operate Feishu/Lark: messaging, docs, bitable, wiki, calendar"
  )
  .version("0.1.0");

// ── setup ──

program
  .command("setup")
  .description("Interactive setup wizard")
  .action(async () => {
    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = (q: string): Promise<string> =>
      new Promise((resolve) => rl.question(q, resolve));

    console.log("\n🔧 agent-to-feishu setup\n");

    const existing = loadConfig();
    const appId = await ask(
      `App ID${existing?.appId ? ` [${existing.appId}]` : ""}: `
    );
    const appSecret = await ask("App Secret: ");
    const domain = await ask("Domain [https://open.feishu.cn]: ");

    const config = {
      appId: appId || existing?.appId || "",
      appSecret: appSecret || existing?.appSecret || "",
      domain: domain || existing?.domain || "https://open.feishu.cn",
    };

    if (!config.appId || !config.appSecret) {
      printError("App ID and App Secret are required.");
      rl.close();
      process.exit(1);
    }

    saveConfig(config);
    printSuccess(`Config saved to ~/.agent-to-feishu/config.json`);

    console.log("\nVerifying credentials...");
    try {
      const client = new FeishuClient(config);
      await client.getToken();
      printSuccess("Authentication successful!");
    } catch (err) {
      printError(`Authentication failed: ${formatError(err)}`);
      console.log("Check your App ID and App Secret.");
    }

    rl.close();
  });

// ── mcp ──

program
  .command("mcp")
  .description("Start MCP server (stdio transport)")
  .action(async () => {
    const { startMcpServer } = await import("./mcp.js");
    await startMcpServer();
  });

// ── im ──

const imCmd = program.command("im").description("Messaging operations");

imCmd
  .command("send")
  .description("Send a text message")
  .requiredOption("--chat <id>", "Chat ID or Open ID")
  .requiredOption("--text <text>", "Message text")
  .option("--type <type>", "Receive ID type", "chat_id")
  .option("--mention <json>", 'Mentions JSON: [{"userId":"ou_xxx","name":"张三"}]')
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const mentions = opts.mention ? JSON.parse(opts.mention) : undefined;
      const res = await im.sendMessage(client, {
        receiveId: opts.chat,
        receiveIdType: opts.type,
        text: opts.text,
        mentions,
      });
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

imCmd
  .command("send-card")
  .description("Send a card message")
  .requiredOption("--chat <id>", "Chat ID")
  .requiredOption("--card <json>", "Card JSON content")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await im.sendCard(client, {
        receiveId: opts.chat,
        card: opts.card,
      });
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

imCmd
  .command("list-chats")
  .description("List joined chats")
  .option("--limit <n>", "Page size", "20")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await im.listChats(client, parseInt(opts.limit));
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

imCmd
  .command("create-chat")
  .description("Create a group chat")
  .requiredOption("--name <name>", "Chat name")
  .option("--users <ids>", "Comma-separated user IDs")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const userIds = opts.users ? opts.users.split(",") : undefined;
      const res = await im.createChat(client, opts.name, userIds);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

imCmd
  .command("upload-image")
  .description("Upload an image for messaging")
  .requiredOption("--file <path>", "Image file path")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await im.uploadImage(client, opts.file);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

imCmd
  .command("upload-file")
  .description("Upload a file for messaging")
  .requiredOption("--file <path>", "File path")
  .option("--type <type>", "File type (opus/mp4/pdf/doc/xls/ppt/stream)", "stream")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await im.uploadFile(client, opts.file, opts.type);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

// ── docs ──

const docsCmd = program.command("docs").description("Document operations");

docsCmd
  .command("read")
  .description("Read document content")
  .requiredOption("--doc <urlOrId>", "Document URL or token")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const docId = docs.extractDocToken(opts.doc);
      const res = await docs.readDoc(client, docId);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

docsCmd
  .command("create")
  .description("Create a new document")
  .requiredOption("--title <title>", "Document title")
  .option("--folder <token>", "Parent folder token")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await docs.createDoc(client, opts.title, opts.folder);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

docsCmd
  .command("search")
  .description("Search documents")
  .requiredOption("--query <text>", "Search query")
  .option("--limit <n>", "Result count", "20")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await docs.searchDocs(client, opts.query, parseInt(opts.limit));
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

docsCmd
  .command("list-folder")
  .description("List folder contents")
  .option("--folder <token>", "Folder token (default: root)")
  .option("--limit <n>", "Page size", "50")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await docs.listFolder(client, opts.folder, parseInt(opts.limit));
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

// ── bitable ──

const bitableCmd = program.command("bitable").description("Bitable operations");

bitableCmd
  .command("query")
  .description("Query bitable records")
  .requiredOption("--app <token>", "App token or URL")
  .requiredOption("--table <id>", "Table ID")
  .option("--filter <expr>", "Filter expression")
  .option("--limit <n>", "Page size", "20")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const { appToken } = bitable.extractBitableTokens(opts.app);
      const res = await bitable.queryRecords(
        client, appToken, opts.table, opts.filter, undefined, parseInt(opts.limit)
      );
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

bitableCmd
  .command("create")
  .description("Create bitable records")
  .requiredOption("--app <token>", "App token")
  .requiredOption("--table <id>", "Table ID")
  .requiredOption("--records <json>", 'Records JSON: [{"fields":{"Name":"test"}}]')
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const records = JSON.parse(opts.records);
      const res = await bitable.createRecords(client, opts.app, opts.table, records);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

bitableCmd
  .command("update")
  .description("Update bitable records")
  .requiredOption("--app <token>", "App token")
  .requiredOption("--table <id>", "Table ID")
  .requiredOption("--records <json>", 'Records JSON: [{"record_id":"xxx","fields":{}}]')
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const records = JSON.parse(opts.records);
      const res = await bitable.updateRecords(client, opts.app, opts.table, records);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

bitableCmd
  .command("delete")
  .description("Delete bitable records")
  .requiredOption("--app <token>", "App token")
  .requiredOption("--table <id>", "Table ID")
  .requiredOption("--ids <list>", "Comma-separated record IDs")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const ids = opts.ids.split(",");
      const res = await bitable.deleteRecords(client, opts.app, opts.table, ids);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

// ── wiki ──

const wikiCmd = program.command("wiki").description("Wiki operations");

wikiCmd
  .command("list-spaces")
  .description("List wiki spaces")
  .option("--limit <n>", "Page size", "20")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await wiki.listSpaces(client, parseInt(opts.limit));
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

wikiCmd
  .command("read-node")
  .description("Read a wiki node")
  .requiredOption("--space <id>", "Space ID")
  .requiredOption("--node <token>", "Node token")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await wiki.readNode(client, opts.space, opts.node);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

wikiCmd
  .command("create-node")
  .description("Create a wiki node")
  .requiredOption("--space <id>", "Space ID")
  .requiredOption("--parent <token>", "Parent node token")
  .requiredOption("--title <title>", "Node title")
  .option("--type <type>", "Object type (docx/sheet/bitable)", "docx")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await wiki.createNode(client, opts.space, opts.parent, opts.title, opts.type);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

// ── calendar ──

const calCmd = program.command("calendar").description("Calendar operations");

calCmd
  .command("list-events")
  .description("List calendar events")
  .option("--calendar <id>", "Calendar ID", "primary")
  .option("--start <iso>", "Start time (ISO 8601)")
  .option("--end <iso>", "End time (ISO 8601)")
  .option("--limit <n>", "Page size", "50")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await calendar.listEvents(
        client, opts.calendar, opts.start, opts.end, parseInt(opts.limit)
      );
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

calCmd
  .command("create-event")
  .description("Create a calendar event")
  .requiredOption("--summary <text>", "Event summary")
  .requiredOption("--start <iso>", "Start time (ISO 8601)")
  .requiredOption("--end <iso>", "End time (ISO 8601)")
  .option("--calendar <id>", "Calendar ID", "primary")
  .option("--desc <text>", "Description")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await calendar.createEvent(
        client, opts.calendar, opts.summary, opts.start, opts.end, opts.desc
      );
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

calCmd
  .command("delete-event")
  .description("Delete a calendar event")
  .requiredOption("--event <id>", "Event ID")
  .option("--calendar <id>", "Calendar ID", "primary")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await calendar.deleteEvent(client, opts.calendar, opts.event);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

// ── approval ──

const approvalCmd = program.command("approval").description("Approval operations");

approvalCmd
  .command("submit")
  .description("Submit an approval instance")
  .requiredOption("--code <code>", "Approval definition code")
  .requiredOption("--user <id>", "Submitter user ID (open_id)")
  .requiredOption("--form <json>", "Form data JSON string")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await approval.submitInstance(client, opts.code, opts.user, opts.form);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

approvalCmd
  .command("query")
  .description("Query an approval instance")
  .requiredOption("--id <instanceId>", "Approval instance ID")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await approval.queryInstance(client, opts.id);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

approvalCmd
  .command("cancel")
  .description("Cancel an approval instance")
  .requiredOption("--code <code>", "Approval definition code")
  .requiredOption("--id <instanceId>", "Approval instance ID")
  .requiredOption("--user <id>", "User ID")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await approval.cancelInstance(client, opts.code, opts.id, opts.user);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

approvalCmd
  .command("comment")
  .description("Add a comment to an approval instance")
  .requiredOption("--id <instanceId>", "Approval instance ID")
  .requiredOption("--user <id>", "User ID")
  .requiredOption("--content <text>", "Comment content")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await approval.addComment(client, opts.id, opts.user, opts.content);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

approvalCmd
  .command("upload-file")
  .description("Upload a file for approval attachment")
  .requiredOption("--file <path>", "File path")
  .option("--name <name>", "File name (default: basename)")
  .action(async (opts) => {
    try {
      const config = requireConfig();
      const client = new FeishuClient(config);
      const res = await approval.uploadFile(client, opts.file, opts.name);
      printJson(res);
    } catch (err) {
      printError(formatError(err));
      process.exit(1);
    }
  });

program.parse();
