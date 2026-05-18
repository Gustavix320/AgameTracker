"use client";

import { useState } from "react";
import Tesseract from "tesseract.js";

export default function OCRDebugPage() {
  const [imagemOriginal, setImagemOriginal] = useState("");
  const [imagemRecortada, setImagemRecortada] = useState("");
  const [textoOCR, setTextoOCR] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function testarOCR(file: File | null) {
    if (!file) return;

    setCarregando(true);
    setTextoOCR("");
    setImagemRecortada("");

    const originalUrl = URL.createObjectURL(file);
    setImagemOriginal(originalUrl);

    const imagem = await createImageBitmap(file);

    const cropX = imagem.width * 0.25;
    const cropY = imagem.height * 0.55;
    const cropW = imagem.width * 0.55;
    const cropH = imagem.height * 0.35;

    const canvas = document.createElement("canvas");
    const escala = 4;

    canvas.width = cropW * escala;
    canvas.height = cropH * escala;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      imagem,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const recorteUrl = canvas.toDataURL("image/png");
    setImagemRecortada(recorteUrl);

    const imageData = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
    );

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brilho = (r + g + b) / 3;

    if (brilho > 140) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
    } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
    }
    }

    ctx.putImageData(imageData, 0, 0);

    const resultado = await Tesseract.recognize(
    canvas,
    "eng",
    {
        logger: (m: unknown) => console.log(m),
        tessedit_char_whitelist: "0123456789.,",
    } as any
    );

    setTextoOCR(resultado.data.text);
    setCarregando(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">OCR Debug</h1>

      <label className="block bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500">
        <p className="text-xl font-bold">Clique ou arraste um print aqui</p>
        <p className="text-zinc-500 mt-2">PNG, JPG ou WEBP</p>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => testarOCR(e.target.files?.[0] || null)}
        />
      </label>

      {carregando && (
        <p className="mt-6 text-blue-400 font-bold">Lendo OCR...</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        {imagemOriginal && (
          <div className="bg-zinc-900 p-4 rounded-2xl">
            <h2 className="text-xl font-bold mb-3">Imagem original</h2>
            <img src={imagemOriginal} className="max-w-full rounded-xl" />
          </div>
        )}

        {imagemRecortada && (
          <div className="bg-zinc-900 p-4 rounded-2xl">
            <h2 className="text-xl font-bold mb-3">Recorte usado no OCR</h2>
            <img src={imagemRecortada} className="max-w-full rounded-xl" />
          </div>
        )}
      </div>

      <div className="bg-zinc-900 p-4 rounded-2xl mt-8">
        <h2 className="text-xl font-bold mb-3">Texto lido pelo OCR</h2>

        <pre className="whitespace-pre-wrap text-zinc-300 bg-zinc-950 p-4 rounded-xl min-h-40">
          {textoOCR || "Nenhum texto lido ainda."}
        </pre>
      </div>
    </div>
  );
}