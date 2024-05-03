# Project Setup

**Clone the project**
```bash
$ git clone https://github.com/sarangan12/langchain-js-azure-openai-demo.git
$ cd langchain-js-azure-openai-demo
```

**Install the dependencies**
```bash
$ npm install
```

**Build the project**
```bash
$ npm run build
```

# How to execute the project
The demo has 2 stages:

**Stage 1** A private knowledge source is stored (in the form of a PDF file) at Azure Storage. This file needs to be retrieved, parsed, split to multiple chunks, stored in Azure AI Search with the corresponding embeddings.

```bash
$ node .\dist\uploadKnowledgeSource.js
```

**Stage 2** Once the user question is converted to a stand alone question, the relevant embeddings are retrieved from the Azure AI Search. Together with the conversation history, the stand alone question and the relevant embeddings are sent to the Azure OpenAI Service and the answer is obtained.

```bash
$ node .\dist\demo.js
```
