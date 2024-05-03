import {
  BlobClient,
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";
import { streamToBuffer } from "../utils/streamToBuffer";
import { CredentialUtils } from "../utils/credentialUtils";
import * as dotenv from "dotenv";
dotenv.config();

export class StorageBlobProxy {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private fileName: string;

  constructor() {
    const credential = CredentialUtils.getAzureCredentials();
    const blobServiceUrl: string = process.env.AZURE_BLOB_SERVICE_URL ?? "";
    this.containerName = process.env.AZURE_BLOB_CONTAINER_NAME ?? "";
    this.fileName = process.env.AZURE_BLOB_FILE_NAME ?? "";

    this.blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
  }

  async getBlob(): Promise<Buffer> {
    const containerClient: ContainerClient =
      this.blobServiceClient.getContainerClient(this.containerName);
    const blobClient: BlobClient = containerClient.getBlobClient(this.fileName);
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded: Buffer = await streamToBuffer(
      downloadBlockBlobResponse.readableStreamBody!
    );
    return downloaded;
  }
}
