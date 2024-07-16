import { AzureChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SqlDatabase } from "langchain/sql_db";
import { CredentialUtils } from "./utils";
import { DataSource } from "typeorm";
import * as readlineSync from "readline-sync";
import * as dotenv from "dotenv";
dotenv.config();

const bearerTokenProvider =
  CredentialUtils.getBearerTokenProviderForDBConnection();
const azureOpenAIApiDeploymentName: string =
  process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME ?? "";
const azureOpenAIApiVersion: string =
  process.env.AZURE_OPENAI_API_VERSION ?? "";
const azureChatModel: string = process.env.AZURE_CHAT_MODEL ?? "";
const dbUserName = process.env.DB_USERNAME ?? "";
const dbHost = process.env.DB_HOST ?? "";
const dbPassword = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME ?? "";

async function getMySQLdb(): Promise<SqlDatabase> {
  const datasource = new DataSource({
    type: "mysql",
    username: dbUserName,
    host: dbHost,
    password: dbPassword,
    database: dbName,
    port: 3306,
    ssl: {
      rejectUnauthorized: true,
    },
  });

  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: datasource,
  });

  return db;
}

async function main() {
  const llm = new AzureChatOpenAI({
    azureOpenAIApiDeploymentName,
    azureOpenAIApiVersion,
    azureADTokenProvider: bearerTokenProvider,
    modelName: azureChatModel,
  });
  const db = await getMySQLdb();
  const schema = await db.getTableInfo();

  const sqlTemplate = `Based on the table schema below generate a SQL Query to answer the question below:
  {schema}

  Question: {question}
  SQL Query:`;

  const sqlPrompt = ChatPromptTemplate.fromTemplate(sqlTemplate);

  const queryChain = RunnableSequence.from([
    sqlPrompt,
    llm,
    new StringOutputParser(),
  ]);

  const answerTemplate = `Based on the table schema below, SQL Query, and SQL Response, write a natural language response:
  {schema}

  Question: {question}
  SQL Query: {query}
  SQL Response: {response}
  
  Natural Language Response:`;

  const answerPrompt = ChatPromptTemplate.fromTemplate(answerTemplate);

  const responseChain = RunnableSequence.from([
    answerPrompt,
    llm,
    new StringOutputParser(),
  ]);

  do {
    let question = readlineSync.question("Ask a question: ");

    const query = await queryChain.invoke({
      schema,
      question
    });

    const response = await db.run(query);

    const fullResponse = await responseChain.invoke({
      schema,
      question,
      query: query,
      response,
    });

    console.log(`Here is the answer: ${fullResponse}`);
    question = readlineSync.question(
      "Do you want to ask another question? (y/n): "
    );
    if (question == "n") {
      process.exit(0);
    }
  } while (true);
  await db.appDataSource.close();
}

main().catch((err) => {
  console.error("Error running sample:", err);
});

