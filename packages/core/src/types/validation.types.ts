export type IssueSeverity = "error" | "warning";

export enum IssueCode {
  FM_MISSING = "FM_MISSING",
  FM_PARSE_ERROR = "FM_PARSE_ERROR",
  FM_MISSING_TYPE = "FM_MISSING_TYPE",
  FM_UNKNOWN_TYPE = "FM_UNKNOWN_TYPE",
  FM_MAPPED_TYPE = "FM_MAPPED_TYPE",
  FM_SCHEMA_INVALID = "FM_SCHEMA_INVALID",
  FM_UNKNOWN_KEY = "FM_UNKNOWN_KEY",
  FM_TAGS_NOT_ARRAY = "FM_TAGS_NOT_ARRAY",
  VAULT_DUPLICATE_ID = "VAULT_DUPLICATE_ID",
  VAULT_MISSING_REFERENCE = "VAULT_MISSING_REFERENCE",
}

export interface ValidationIssue {
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
  path?: string[];
  suggestion?: string;
}
