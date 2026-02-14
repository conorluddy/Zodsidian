export interface ZodsidianSettings {
  enabled: boolean;
  schemaPath: string;
  validateOnSave: boolean;
}

export const DEFAULT_SETTINGS: ZodsidianSettings = {
  enabled: true,
  schemaPath: "schemas/",
  validateOnSave: true,
};
