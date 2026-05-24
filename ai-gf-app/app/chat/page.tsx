"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: string;
  content: string;
  time: string;
};

type Girl = {
  name: string;
  image: string;
};

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedGirl, setSelectedGirl] = useState("Luna");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const girls: Girl[] = [
    {
      name: "Luna",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800",
    },

    {
      name: "Aiko",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=800",
    },

    {
      name: "Nova",
      image:
        "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800",
    },

    {
      name: "Mia",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800",
    },
  ];

  const currentGirl =
    girls.find((girl) => girl.name === selectedGirl) || girls[0];

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey... I missed you today 💜",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const currentMessage = message;

    const userMessage: Message = {
      role: "user",
      content: currentMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);

    setMessage("");

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          character: selectedGirl,
        }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        role: "assistant",
        content: data.reply,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong 💔",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white flex flex-col">

      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-black/80 backdrop-blur-md sticky top-0 z-10">

        <img
          src={currentGirl.image}
          alt="AI Girl"
          className="w-12 h-12 rounded-full object-cover border border-pink-500"
        />

        <div>
          <h1 className="font-bold text-lg">
            {selectedGirl} AI
          </h1>

          <p className="text-green-400 text-sm">
            Online
          </p>
        </div>

      </div>

      {/* Character Selection */}
      <div className="flex gap-3 overflow-x-auto p-4 border-b border-gray-800 bg-black">

        {girls.map((girl) => (
          <button
            key={girl.name}
            onClick={() => setSelectedGirl(girl.name)}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
              selectedGirl === girl.name
                ? "bg-pink-600"
                : "bg-gray-800"
            }`}
          >
            {girl.name}
          </button>
        ))}

      </div>

      {/* Messages */}
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
              className={`px-4 py-3 rounded-2xl max-w-xs md:max-w-md shadow-lg ${
                msg.role === "user"
                  ? "bg-pink-600"
                  : "bg-purple-700"
              }`}
            >

              <p>{msg.content}</p>

              <p className="text-[10px] text-gray-300 mt-2 text-right">
                {msg.time}
              </p>

            </div>

          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-purple-700 px-4 py-3 rounded-2xl">
              {selectedGirl} is typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-black">

        <div className="flex gap-2">

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            type="text"
            placeholder={`Message ${selectedGirl}...`}
            className="flex-1 bg-gray-900 rounded-2xl px-4 py-3 outline-none border border-gray-700 focus:border-pink-500 transition"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-pink-600 px-6 rounded-2xl hover:bg-pink-500 transition disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>

        </div>

      </div>

    </main>
  );
}