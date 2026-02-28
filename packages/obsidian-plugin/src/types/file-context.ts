export interface ResolvedRef {
  id: string;
  title: string | null;
  type: string | null;
  filePath: string | null; // null = dangling reference
}

export interface OutgoingGroup {
  fieldName: string;
  targets: ResolvedRef[];
}

export interface IncomingRef {
  sourceFilePath: string;
  sourceTitle: string | null;
  sourceType: string | null;
  field: string;
}

export interface FrontmatterField {
  key: string;
  value: unknown;
}

export interface FileContext {
  type: string;
  id: string | null;
  title: string | null;
  outgoing: OutgoingGroup[];
  incoming: IncomingRef[];
  fields: FrontmatterField[];
  graphReady: boolean; // false before background scan completes
}
