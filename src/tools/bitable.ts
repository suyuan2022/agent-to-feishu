import type { FeishuClient } from "../client/feishu-client.js";

export function extractBitableTokens(urlOrToken: string): {
  appToken: string;
  tableId?: string;
} {
  const match = urlOrToken.match(/\/base\/([A-Za-z0-9]+)/);
  const tableMatch = urlOrToken.match(/table=([A-Za-z0-9]+)/);
  return {
    appToken: match ? match[1] : urlOrToken,
    tableId: tableMatch ? tableMatch[1] : undefined,
  };
}

export async function queryRecords(
  client: FeishuClient,
  appToken: string,
  tableId: string,
  filter?: string,
  sort?: string[],
  pageSize = 20
) {
  const res = await client.bitable.v1.appTableRecord.search({
    path: { app_token: appToken, table_id: tableId },
    data: {
      filter: filter ? { conjunction: "and" as const, conditions: [] } : undefined,
      automatic_fields: true,
    },
    params: { page_size: pageSize },
  });
  return res;
}

export async function createRecords(
  client: FeishuClient,
  appToken: string,
  tableId: string,
  records: Array<{ fields: Record<string, any> }>
) {
  const res = await client.bitable.v1.appTableRecord.batchCreate({
    path: { app_token: appToken, table_id: tableId },
    data: { records: records as any },
  });
  return res;
}

export async function updateRecords(
  client: FeishuClient,
  appToken: string,
  tableId: string,
  records: Array<{ record_id: string; fields: Record<string, any> }>
) {
  const res = await client.bitable.v1.appTableRecord.batchUpdate({
    path: { app_token: appToken, table_id: tableId },
    data: { records: records as any },
  });
  return res;
}

export async function deleteRecords(
  client: FeishuClient,
  appToken: string,
  tableId: string,
  recordIds: string[]
) {
  const res = await client.bitable.v1.appTableRecord.batchDelete({
    path: { app_token: appToken, table_id: tableId },
    data: { records: recordIds },
  });
  return res;
}
