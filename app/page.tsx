"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "model";
  content: string;
};

export default function Home() {
  const [phase, setPhase] = useState<"setup" | "exam" | "result">("setup");
  const [material, setMaterial] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [rubric, setRubric] = useState("Sangat ketat. Jika jawaban terlalu singkat, terkesan malas, atau ngawur, berikan nilai di bawah 50 atau bahkan 0. Jawaban harus menunjukkan pemahaman konsep yang baik.");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startExam = async () => {
    if (!material.trim()) {
      setError("Materi ujian tidak boleh kosong.");
      return;
    }
    setError("");
    setPhase("exam");
    setIsLoading(true);

    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, history: [], questionCount, rubric }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memulai ujian");

      setMessages([{ role: "model", content: data.message }]);
    } catch (err: any) {
      setError(err.message);
      setPhase("setup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Hanya mendukung file PDF.");
      return;
    }

    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengunggah PDF");

      // Tambahkan teks PDF ke textarea materi
      setMaterial((prev) => (prev ? prev + "\n\n" + data.text : data.text));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      // Reset input file
      e.target.value = "";
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    const newHistory: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newHistory);
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, history: newHistory, questionCount, rubric }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengirim pesan");

      const botMessage = data.message;
      setMessages([...newHistory, { role: "model", content: botMessage }]);

      if (botMessage.includes("[SELESAI]")) {
        setPhase("result");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // --- RENDER SETUP PHASE ---
  if (phase === "setup") {
    return (
      <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <h1 style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "2rem", color: "white" }}>AI Exam Chatbot</h1>
          <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "2.5rem" }}>Penguji Virtual Berbasis AI</p>

          {error && (
            <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--error)", borderRadius: "8px", color: "var(--error)", marginBottom: "1.5rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontWeight: "600", color: "#ececf1" }}>Materi Perkuliahan</label>
                <div>
                  <label htmlFor="pdf-upload" style={{ cursor: "pointer", color: "var(--accent-color)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    {isUploading ? "Mengekstrak..." : "📄 Unggah PDF"}
                  </label>
                  <input 
                    id="pdf-upload" 
                    type="file" 
                    accept="application/pdf" 
                    style={{ display: "none" }} 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>
              <textarea
                className="textarea"
                placeholder="Tempel (paste) materi perkuliahan Anda di sini, atau unggah file PDF..."
                rows={6}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#ececf1", fontSize: "0.9rem" }}>Jumlah Soal</label>
                <input 
                  type="number" 
                  min={1} 
                  max={20} 
                  className="input" 
                  value={questionCount} 
                  onChange={(e) => setQuestionCount(Number(e.target.value))} 
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#ececf1", fontSize: "0.9rem" }}>Mode Penilaian & Target Kelas</label>
                <select 
                  className="input" 
                  style={{ marginBottom: "0.5rem", padding: "0.75rem", cursor: "pointer" }}
                  onChange={(e) => {
                    const mode = e.target.value;
                    if (mode === "unggul") setRubric("SANGAT KETAT (Kelas Unggulan): Kurangi nilai secara drastis jika jawaban terlalu singkat, tidak komprehensif, atau malas-malasan. Jawaban harus menunjukkan penguasaan teori yang sangat dalam.");
                    else if (mode === "standar") setRubric("STANDAR (S1 Reguler): Berikan nilai objektif. Mahasiswa diharapkan dapat menjelaskan konsep utama dengan benar. Kurangi nilai jika ada kesalahan fatal atau jawaban terlalu pendek.");
                    else if (mode === "vokasi") setRubric("LONGGAR (D3/Vokasional): Bersikaplah lebih pemaaf dan toleran terhadap kelemahan teori abstrak. Fokuslah pada pemahaman praktis/terapan. Jangan berikan nilai buruk hanya karena jawaban kurang panjang, asalkan intinya benar.");
                    else setRubric("");
                  }}
                >
                  <option value="unggul">Ketat (Kelas Unggulan / Teori Mendalam)</option>
                  <option value="standar">Standar (S1 Reguler)</option>
                  <option value="vokasi">Longgar / Dinamis (D3 Vokasional / Praktik)</option>
                  <option value="kustom">Kustom (Tulis Sendiri di Bawah)</option>
                </select>
                
                <textarea 
                  className="textarea" 
                  rows={3} 
                  value={rubric} 
                  onChange={(e) => setRubric(e.target.value)} 
                  style={{ resize: "none" }} 
                  placeholder="Atau ketik sendiri instruksi khusus untuk AI di sini..."
                />
              </div>
            </div>

            <button className="btn" onClick={startExam} disabled={isLoading || !material.trim()} style={{ marginTop: "1rem", padding: "1rem", fontSize: "1.1rem" }}>
              {isLoading ? "Menyiapkan AI..." : "Mulai Ujian Sekarang"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER CHAT PHASE ---
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <header style={{ padding: "1rem", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-primary)", zIndex: 10 }}>
        <div style={{ fontWeight: "600", color: "#fff" }}>AI Exam Session</div>
        <button className="btn" onClick={() => { setPhase("setup"); setMessages([]); setMaterial(""); }} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "transparent", border: "1px solid var(--border-color)" }}>
          Akhiri & Mulai Baru
        </button>
      </header>

      {/* MESSAGES AREA */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "2rem" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ padding: "1.5rem 1rem", borderBottom: msg.role === "model" ? "1px solid var(--border-color)" : "none", backgroundColor: msg.role === "model" ? "var(--bg-secondary)" : "var(--bg-primary)" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "1.5rem" }}>
              {/* AVATAR */}
              <div className={`avatar ${msg.role === "model" ? "avatar-ai" : "avatar-user"}`}>
                {msg.role === "model" ? "AI" : "You"}
              </div>
              
              {/* MESSAGE CONTENT */}
              <div style={{ flex: 1, paddingTop: "0.1rem", overflowX: "auto" }}>
                <div className="markdown-body">
                  <ReactMarkdown>
                    {msg.content.replace(/\[SELESAI\]/g, "")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* LOADING INDICATOR */}
        {isLoading && (
          <div style={{ padding: "1.5rem 1rem", backgroundColor: "var(--bg-secondary)" }}>
             <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", gap: "1.5rem" }}>
               <div className="avatar avatar-ai">AI</div>
               <div style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)" }}>
                 <span style={{ animation: "pulse 1.5s infinite" }}>Sedang mengetik...</span>
               </div>
             </div>
          </div>
        )}
        
        <div ref={messagesEndRef} style={{ height: "1px" }} />
      </div>

      {/* RESULT / INPUT AREA */}
      <div style={{ padding: "1rem", background: "var(--bg-primary)", borderTop: "1px solid var(--border-color)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {error && <div style={{ color: "var(--error)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>{error}</div>}
          
          {phase === "result" ? (
             <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid var(--success)", color: "var(--success)" }}>
               <h3 style={{ marginBottom: "0.5rem" }}>Ujian Telah Selesai</h3>
               <p>Silakan baca ringkasan dan penilaian AI di atas.</p>
             </div>
          ) : (
            <form onSubmit={sendMessage} style={{ position: "relative" }}>
              <textarea
                className="textarea"
                placeholder="Ketik jawaban Anda di sini... (Shift + Enter untuk baris baru)"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                style={{ resize: "none", paddingRight: "4rem", overflow: "hidden", minHeight: "56px" }}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                style={{ 
                  position: "absolute", 
                  right: "0.5rem", 
                  bottom: "0.5rem", 
                  background: input.trim() ? "var(--accent-color)" : "rgba(255,255,255,0.1)",
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  padding: "0.4rem 0.8rem", 
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  transition: "var(--transition-fast)"
                }}
              >
                Kirim
              </button>
            </form>
          )}
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            AI dapat membuat kesalahan. Periksa informasi penting secara mandiri.
          </div>
        </div>
      </div>
    </div>
  );
}
