import type { CatalogEntry } from "./catalog.functions";
export type { CatalogEntry } from "./catalog.functions";

export const getCatalogEntries = () =>
  import("./catalog.functions").then((m) => m.getCatalogEntries());

export const addCatalogEntry = (data: {
  serverName: string;
  serverUrl: string;
  scanReport: string;
  submittedBy?: string;
  tags?: string[];
}) =>
  import("./catalog.functions").then((m) =>
    m.addCatalogEntry({ data }),
  );

export const upvoteCatalogEntry = (id: string) =>
  import("./catalog.functions").then((m) =>
    m.upvoteCatalogEntry({ data: { id } }),
  );

export async function getAllEntries(): Promise<CatalogEntry[]> {
  return getCatalogEntries();
}
