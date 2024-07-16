import {
  AzureAISearchVectorStore,
  AzureAISearchQueryType,
} from "@langchain/community/vectorstores/azure_aisearch";
import { AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SearchClient } from "@azure/search-documents";
import { CredentialUtils } from "./utils/credentialUtils";
import { combineDocuments } from "./utils/combineDocuments";
import { formatHistory } from "./utils/formatHistory";
import * as readlineSync from "readline-sync";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const bearerTokenProvider = CredentialUtils.getBearerTokenProvider();
  const credentials = CredentialUtils.getAzureCredentials();
  const azureOpenAIApiVersion: string =
    process.env.AZURE_OPENAI_API_VERSION ?? "";
  const azureAISearchEndpoint: string =
    process.env.AZURE_AI_SEARCH_ENDPOINT ?? "";
  const azureOpenAIEmbeddingsDeploymentName: string =
    process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME ?? "";
  const azureOpenAIApiDeploymentName: string =
    process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME ?? "";
  const azureChatModel: string = process.env.AZURE_CHAT_MODEL ?? "";
  const azureAIIndexName: string = process.env.AZURE_INDEX_NAME ?? "";

  const conversationHistory: string[] = [];
  const llm = new AzureChatOpenAI({
    azureOpenAIApiDeploymentName,
    azureOpenAIApiVersion,
    azureADTokenProvider: bearerTokenProvider,
    modelName: azureChatModel,
  });
  const searchClient: SearchClient<any> = new SearchClient(
    azureAISearchEndpoint,
    azureAIIndexName,
    credentials
  );
  const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiDeploymentName: azureOpenAIEmbeddingsDeploymentName,
    azureOpenAIApiVersion,
    azureADTokenProvider: bearerTokenProvider,
  });

  // Step 1: Create a Stand Alone Question Prompt
  const standAloneQuestionTemplate = `Given a question, convert it into a stand alone question. Question: {question}.
Here is our conversation history in the same order happened: {conv_history}
Stand Alone Question:`;
  const standAloneQuestionPrompt = PromptTemplate.fromTemplate(
    standAloneQuestionTemplate
  );

  const standAloneQuestionChain = RunnableSequence.from([
    standAloneQuestionPrompt,
    llm,
    new StringOutputParser(),
  ]);

  // Step 2: Retrieve the matching vectors from the vector store
  const vectorstore = new AzureAISearchVectorStore(embeddings, {
    client: searchClient,
    indexName: azureAIIndexName,
    search: {
      type: AzureAISearchQueryType.SimilarityHybrid,
    },
  });

  const retriever = vectorstore.asRetriever();
  const retrieverChain = RunnableSequence.from([
    (prevResult) => {
      console.log(`Stand Alone Question: ${prevResult.standalone_question}`);
      return prevResult.standalone_question;
    },
    retriever,
    combineDocuments,
  ]);

  // Step 3: Query the OpenAI with the matching vectors and original question
  const answerTemplate = `You are a helpful, respectful and friendly support bot who can answer a given question about Azure based on the context provided. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@azure.com. Don't try to make up an answer. Always speak as if you were chatting to a friend. You can use our conversation history.
conversation history  in the same order happened: {conv_history}
context: {context}
question: {question}
answer:
`;
  const answerPrompt = PromptTemplate.fromTemplate(answerTemplate);
  const answerChain = RunnableSequence.from([
    answerPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const chain = RunnableSequence.from([
    {
      standalone_question: standAloneQuestionChain,
      original_input: new RunnablePassthrough(),
    },
    {
      context: retrieverChain,
      question: ({ original_input }) => original_input.question,
      conv_history: ({ original_input }) => original_input.conv_history,
    },
    answerChain,
  ]);

  do {
    let question = readlineSync.question("Ask a question: ");
    let response = await chain.invoke({
      question,
      conv_history: formatHistory(conversationHistory),
    });
    conversationHistory.push(question);
    conversationHistory.push(response);
    console.log(`Here is the answer: ${response}`);
    question = readlineSync.question(
      "Do you want to ask another question? (y/n): "
    );
    if (question == "n") {
      process.exit(0);
    }
  } while (true);
}

main().catch((err) => {
  console.error("Error running sample:", err);
});
