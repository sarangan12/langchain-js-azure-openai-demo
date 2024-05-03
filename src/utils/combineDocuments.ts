export function combineDocuments(docs: any) {
  return docs.map((doc: any) => doc.pageContent).join("\n\n");
}
