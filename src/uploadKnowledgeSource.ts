import {
  AzureAISearchVectorStore,
  AzureAISearchQueryType,
} from "@langchain/community/vectorstores/azure_aisearch";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { AzureOpenAIEmbeddings } from "@langchain/azure-openai";
import { CredentialUtils } from "./utils/credentialUtils";
import { StorageBlobProxy } from "./proxies/StorageBlobProxy";
import { PDFParse } from "./utils/PDFParser";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const credentials = CredentialUtils.getAzureCredentials();
  const azureOpenAIEndpoint: string =
    process.env.AZURE_OPENAI_API_ENDPOINT ?? "";
  const azureOpenAIApiDeploymentName: string =
    process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME ?? "";
  const azureOpenAIApiVersion: string =
    process.env.AZURE_OPENAI_API_VERSION ?? "";
  const azureAISearchEndpoint: string =
    process.env.AZURE_AI_SEARCH_ENDPOINT ?? "";

  // Step 1: Retrieve the PDF File from Azure Blob Storage
  console.log("Retrieving PDF file from Azure Blob Storage.......");
  const storageBlobProxy: StorageBlobProxy = new StorageBlobProxy();
  const storageData: Buffer = await storageBlobProxy.getBlob();
  console.log("Retrieval complete.");

  // Step 2: Parse the PDF file to text
  console.log("Parsing PDF file to text.......");
  const pdfParser: PDFParse = new PDFParse();
  const pdfText: string = await pdfParser.getText(storageData);
  console.log("Parsing complete.");

  // Step 3: Split the text into smaller chunks
  console.log("Splitting text into smaller chunks.......");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    separators: ["\n\n", "\n", " ", ""],
    chunkOverlap: 50,
  });
  const documents = await splitter.createDocuments([pdfText]);
  console.log("Splitting complete.");

  // Step 4: Create a vector store from the documents
  console.log("Creating vector store from documents.......");
  const store = await AzureAISearchVectorStore.fromDocuments(
    documents,
    new AzureOpenAIEmbeddings({
      azureOpenAIEndpoint,
      azureOpenAIApiDeploymentName,
      azureOpenAIApiVersion,
      credentials,
    }),
    {
      endpoint: azureAISearchEndpoint,
      credentials,
      search: {
        type: AzureAISearchQueryType.SimilarityHybrid,
      },
    }
  );
  console.log("Vector store creation complete.");

  // Step 5: Performs a similarity search
  console.log("Performing similarity search.......");
  const resultDocuments = await store.similaritySearch(
    "When will you be shocked?"
  );
  console.log("Similarity search results:");
  console.log(resultDocuments[0]);
}

main().catch((err) => {
  console.error("Error running sample:", err);
});
