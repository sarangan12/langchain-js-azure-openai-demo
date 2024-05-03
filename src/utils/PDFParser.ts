const pdf = require("pdf-parse");

export class PDFParse {
  async getText(data: any): Promise<string> {
    const pdfData = await pdf(data);
    return pdfData.text;
  }
}
