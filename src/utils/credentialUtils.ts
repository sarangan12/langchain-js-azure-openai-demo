import {
  AzureCliCredential,
  getBearerTokenProvider,
} from "@azure/identity";

import * as dotenv from "dotenv";
dotenv.config();

export class CredentialUtils {
  static getAzureCredentials(): AzureCliCredential {
    const tenantId: string = process.env.AZURE_TENANT_ID ?? "";
    const credentials = new AzureCliCredential({
      tenantId
    });
    return credentials;
  }

  static getBearerTokenProvider() {
    const tenantId: string = process.env.AZURE_TENANT_ID ?? "";
    const credentials = new AzureCliCredential({
      tenantId
    });
    return getBearerTokenProvider(
      credentials,
      "https://cognitiveservices.azure.com/.default"
    );
  }

  static getBearerTokenProviderForDBConnection() {
    const tenantId: string = process.env.AZURE_TENANT_ID ?? "";
    const credentials = new AzureCliCredential({
      tenantId
    });
    return getBearerTokenProvider(
      credentials,
      "https://database.windows.net/.default"
    );
  }
}
