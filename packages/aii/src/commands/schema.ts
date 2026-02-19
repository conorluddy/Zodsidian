import { loadSchemas, introspectAllTypes, introspectSchema } from "@zodsidian/core";
import { EXIT_RUNTIME_ERROR } from "../utils/exit-codes.js";

export async function schemaCommand(typeName: string | undefined): Promise<void> {
  loadSchemas();

  if (!typeName) {
    console.log(JSON.stringify(introspectAllTypes()));
    return;
  }

  const descriptor = introspectSchema(typeName);
  if (!descriptor) {
    console.error(JSON.stringify({ error: `Unknown type: "${typeName}"` }));
    process.exit(EXIT_RUNTIME_ERROR);
    return;
  }

  console.log(JSON.stringify(descriptor));
}
