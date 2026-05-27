import { NextResponse } from 'next/server';
const PDFParser = require("pdf2json");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Hanya file PDF yang didukung' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ekstrak teks dari PDF menggunakan pdf2json
    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(errData.parserError);
      });
      
      pdfParser.on("pdfParser_dataReady", () => {
        resolve(pdfParser.getRawTextContent());
      });
      
      pdfParser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: 'Gagal mengekstrak teks dari PDF. File mungkin rusak atau terenkripsi.' },
      { status: 500 }
    );
  }
}
