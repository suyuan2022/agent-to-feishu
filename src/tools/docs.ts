import type { FeishuClient } from "../client/feishu-client.js";

export function extractDocToken(urlOrToken: string): string {
  const match = urlOrToken.match(/\/docx\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  const match2 = urlOrToken.match(/\/wiki\/([A-Za-z0-9]+)/);
  if (match2) return match2[1];
  return urlOrToken;
}

export async function readDoc(client: FeishuClient, documentId: string) {
  const res = await client.docx.v1.document.rawContent({
    path: { document_id: documentId },
    params: { lang: 0 },
  });
  return res;
}

export async function createDoc(
  client: FeishuClient,
  title: string,
  folderToken?: string
) {
  const res = await client.docx.v1.document.create({
    data: {
      title,
      folder_token: folderToken,
    },
  });
  return res;
}

export async function searchDocs(
  client: FeishuClient,
  query: string,
  count = 20
) {
  return client.request("POST", "/open-apis/suite/docs-api/search/object", {
    search_key: query,
    count,
    docs_types: ["docx", "sheet", "bitable", "wiki"],
  });
}

export async function editDoc(
  client: FeishuClient,
  documentId: string,
  blockId: string,
  children: Array<{
    block_type: number;
    text?: { elements: Array<{ text_run?: { content: string } }> };
  }>
) {
  const res = await client.docx.v1.documentBlockChildren.create({
    path: { document_id: documentId, block_id: blockId },
    data: { children: children as any, index: -1 },
  });
  return res;
}

export async function getDocBlocks(
  client: FeishuClient,
  documentId: string,
  pageSize = 500
) {
  const res = await client.docx.v1.documentBlock.list({
    path: { document_id: documentId },
    params: { page_size: pageSize },
  });
  return res;
}

export async function listFolder(
  client: FeishuClient,
  folderToken?: string,
  pageSize = 50
) {
  const res = await client.drive.v1.file.list({
    params: {
      folder_token: folderToken,
      page_size: pageSize,
    },
  });
  return res;
}
