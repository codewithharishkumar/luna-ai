"use client";

import { useState } from "react";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hey... I missed you today 💜",
    },
  ]);

  const sendMessage = async () => {
    if (!message) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);

    setMessage("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.reply,
      },
    ]);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">

      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800"
          alt="AI Girl"
          className="w-12 h-12 rounded-full object-cover border border-pink-500"
        />

        <div>
          <h1 className="font-bold text-lg">Luna AI</h1>
          <p className="text-green-400 text-sm">Online</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-3 rounded-2xl max-w-xs ${
                msg.role === "user"
                  ? "bg-pink-600"
                  : "bg-purple-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

      </div>

      <div className="p-4 border-t border-gray-800 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 rounded-xl px-4 py-3 outline-none border border-gray-700"
        />

        <button
          onClick={sendMessage}
          className="bg-pink-600 px-6 rounded-xl hover:bg-pink-500 transition"
        >
          Send
        </button>
      </div>

    </main>
  );
}