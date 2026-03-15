import type { FeishuClient } from "../client/feishu-client.js";

export async function listSpaces(client: FeishuClient, pageSize = 20) {
  const res = await client.wiki.v2.space.list({
    params: { page_size: pageSize },
  });
  return res;
}

export async function readNode(
  client: FeishuClient,
  spaceId: string,
  nodeToken: string
) {
  const nodeRes = await client.wiki.v2.space.getNode({
    params: { token: nodeToken },
  });

  const objToken = (nodeRes?.data?.node as any)?.obj_token;
  const objType = (nodeRes?.data?.node as any)?.obj_type;

  if (objType === "docx" && objToken) {
    const docRes = await client.docx.v1.document.rawContent({
      path: { document_id: objToken },
      params: { lang: 0 },
    });
    return { node: nodeRes?.data?.node, content: docRes?.data?.content };
  }

  return { node: nodeRes?.data?.node, content: null };
}

export async function createNode(
  client: FeishuClient,
  spaceId: string,
  parentNodeToken: string,
  title: string,
  objType: "docx" | "sheet" | "bitable" = "docx"
) {
  const token = await client.getToken();
  const domain = "https://open.feishu.cn";
  const res = await fetch(
    `${domain}/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        obj_type: objType,
        parent_node_token: parentNodeToken,
        node_type: "origin",
        title,
      }),
    }
  );
  return res.json();
}
