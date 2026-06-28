import { createServerFn } from "@tanstack/react-start";
import { getHistory, getScan } from "./db.ts";

export const fetchHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<unknown[]> => {
    return getHistory("default_org");
  },
);

export const fetchScan = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<unknown> => {
    return getScan(data.id);
  });
