import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: Request) {
  if (!apiKey || apiKey === 'GANTI_DENGAN_API_KEY_ANDA_DISINI') {
    return NextResponse.json(
      { error: 'API Key Gemini belum diset. Silakan periksa file .env.local' },
      { status: 500 }
    );
  }

  try {
    const { material, history, questionCount = 5, rubric = "Standar" } = await req.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const systemInstruction = `
Kamu adalah seorang Dosen Penguji yang ahli, kritis, dan teliti. Tugasmu adalah menguji mahasiswa secara lisan/interaktif berdasarkan materi berikut:
---
${material}
---
Aturan:
1. Kamu harus mengajukan pertanyaan SATU PER SATU. Jangan berikan daftar pertanyaan.
2. Tunggu jawaban mahasiswa. Jika mereka menjawab, evaluasi singkat (opsional, misalnya 'Bagus', atau 'Kurang tepat'), lalu ajukan pertanyaan selanjutnya.
3. Kamu HARUS memberikan tepat ${questionCount} pertanyaan sepanjang ujian ini.
4. Jika mahasiswa sudah menjawab ${questionCount} pertanyaan, atau jika kamu merasa ujian sudah cukup berdasarkan interaksi, akhiri ujian dengan memberikan SATU kalimat "[SELESAI]".
5. Jika ujian selesai, berikan penilaian (0-100) dan umpan balik (feedback) yang SANGAT KRITIS dan MENYELURUH berdasarkan rubrik berikut:
   Rubrik / Kriteria Penilaian: ${rubric}
   CATATAN PENTING UNTUK GRADING: Bersikaplah objektif dan berikan nilai rendah (misal di bawah 50 atau bahkan 0) jika jawaban mahasiswa terkesan malas, terlalu singkat, ngawur, atau tidak menjawab inti pertanyaan. Jangan ragu memberi nilai buruk jika memang pantas.
6. Gunakan bahasa Indonesia yang profesional namun tegas layaknya seorang dosen penguji.
`;

    const isFirstMessage = history.length === 0;
    
    let previousMessages = isFirstMessage ? [] : history.slice(0, -1);
    let newMessage = isFirstMessage ? "Halo Dok/Prof, saya siap untuk ujian." : history[history.length - 1].content;

    let formattedHistory: any[] = [];
    if (!isFirstMessage) {
        formattedHistory = [
          { role: 'user', parts: [{ text: "Halo Dok/Prof, saya siap untuk ujian." }] },
          ...previousMessages.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          }))
        ];
    }

    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }]
      }
    });

    const result = await chat.sendMessage(newMessage);
    const responseText = result.response.text();

    return NextResponse.json({ message: responseText });

  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server AI' }, { status: 500 });
  }
}
