import type { FeishuClient } from "../client/feishu-client.js";

export async function submitInstance(
  client: FeishuClient,
  approvalCode: string,
  userId: string,
  form: string,
  nodeApproverOpenIdList?: Array<{ key: string; value: string[] }>
) {
  return client.request("POST", "/open-apis/approval/v4/instances", {
    approval_code: approvalCode,
    user_id: userId,
    form,
    node_approver_open_id_list: nodeApproverOpenIdList,
  });
}

export async function queryInstance(
  client: FeishuClient,
  instanceId: string
) {
  return client.request("GET", `/open-apis/approval/v4/instances/${instanceId}`);
}

export async function listInstances(
  client: FeishuClient,
  approvalCode: string,
  startTime: string,
  endTime: string,
  pageSize = 20
) {
  const params = new URLSearchParams({
    approval_code: approvalCode,
    start_time: startTime,
    end_time: endTime,
    page_size: String(pageSize),
  });
  return client.request("GET", `/open-apis/approval/v4/instances?${params}`);
}

export async function cancelInstance(
  client: FeishuClient,
  approvalCode: string,
  instanceId: string,
  userId: string
) {
  return client.request("POST", "/open-apis/approval/v4/instances/cancel", {
    approval_code: approvalCode,
    instance_id: instanceId,
    user_id: userId,
  });
}

export async function addComment(
  client: FeishuClient,
  instanceId: string,
  userId: string,
  content: string
) {
  return client.request(
    "POST",
    `/open-apis/approval/v4/instances/${instanceId}/comments`,
    { user_id: userId, content }
  );
}

export async function uploadFile(
  client: FeishuClient,
  filePath: string,
  fileName: string
) {
  const token = await client.getToken();
  const { createReadStream } = await import("node:fs");
  const { basename } = await import("node:path");
  const FormData = (await import("node:buffer")).File
    ? undefined
    : undefined;

  const stream = createReadStream(filePath);
  const name = fileName || basename(filePath);

  const formData = new globalThis.FormData();
  const { readFileSync } = await import("node:fs");
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer]);
  formData.append("content", blob, name);
  formData.append("name", name);
  formData.append("type", "attachment");

  const res = await fetch(
    "https://open.feishu.cn/open-apis/approval/openapi/v2/file/upload",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  return res.json();
}
