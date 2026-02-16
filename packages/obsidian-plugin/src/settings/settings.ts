export interface ZodsidianSettings {
  enabled: boolean;
  schemaPath: string;
  validateOnSave: boolean;
  typeMappings: Record<string, string>;
  warnOnMappedTypes: boolean;
  hasSeenUnknownTypesNotice: boolean;
}

export const DEFAULT_SETTINGS: ZodsidianSettings = {
  enabled: true,
  schemaPath: "schemas/",
  validateOnSave: true,
  typeMappings: {},
  warnOnMappedTypes: false,
  hasSeenUnknownTypesNotice: false,
};
