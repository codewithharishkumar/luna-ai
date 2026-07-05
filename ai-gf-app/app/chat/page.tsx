"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient as supabase } from "@/lib/supabase-client";

import { Sidebar } from "@/components/Sidebar";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { RelationshipBadge } from "@/components/RelationshipBadge";
import { SoulmateParticles } from "@/components/SoulmateParticles";

import { Send, Mic } from "lucide-react";

import { motion } from "framer-motion";

type Message = {
  role: "user" | "assistant";
  content: string;
  time: string;
};

type Girl = {
  name: string;
  image: string;
};

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

export default function ChatPage() {
  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [selectedGirl, setSelectedGirl] =
  useState("Luna");
  useEffect(() => {
  const savedGirl =
    localStorage.getItem(
      "selectedGirl"
    );

  if (savedGirl) {
    setSelectedGirl(
      savedGirl
    );
  }
}, []);

  const [affection, setAffection] =
    useState(0);

  const [level, setLevel] =
    useState(1);

  const [relationships, setRelationships] =
    useState<any>({});

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const currentGirl =
    girls.find(
      (girl) =>
        girl.name === selectedGirl
    ) || girls[0];

  // AUTO SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // LOAD CHAT HISTORY
  useEffect(() => {
    const loadChats = async () => {
      try {
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

       const user =
  sessionData?.session?.user;

console.log(
  "LOAD SESSION:",
  sessionData
);

console.log(
  "LOAD USER:",
  user
);

if (!user) return;
        localStorage.setItem(
  "userId",
  user.id
);

console.log(
  "Saved userId:",
  user.id
);

        // CLEAR OLD CHAT
        setMessages([]);

        const res =
          await fetch("/api/load", {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: user.id,
              character: selectedGirl,
            }),
          });

        const data =
          await res.json();

        if (
          data.messages &&
          data.messages.length > 0
        ) {
          const formatted =
            data.messages.map(
              (msg: any) => ({
                role: msg.role,

                content:
                  msg.content,

                time:
                  new Date(
                    msg.created_at
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute:
                        "2-digit",
                    }
                  ),
              })
            );

          setMessages(formatted);
        }

        setRelationships(
          data.relationships || {}
        );

        const rel =
          data.relationships?.[
            selectedGirl
          ];

        if (rel) {
          setAffection(
            rel.affection
          );

          setLevel(rel.level);
        } else {
          setAffection(0);
          setLevel(1);
        }
      } catch (error) {
        console.log(error);
      }
    };

    loadChats();
  }, [selectedGirl]);

  // SEND MESSAGE
  const sendMessage =
    async () => {
      if (
        !message.trim() ||
        loading
      )
        return;

      const userMessage: Message =
        {
          role: "user",

          content: message,

          time:
            new Date().toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute:
                  "2-digit",
              }
            ),
        };

      setMessages((prev) => [
        ...prev,
        userMessage,
      ]);

      const currentMessage =
        message;

      setMessage("");

      setLoading(true);

      try {
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

      const user =
  sessionData?.session?.user;

console.log(
  "LOAD SESSION:",
  sessionData
);

console.log(
  "LOAD USER:",
  user
);

if (!user) return;

localStorage.setItem(
  "userId",
  user.id
);


        const res =
          await fetch("/api/chat", {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: user.id,
              message:
                currentMessage,
              character:
                selectedGirl,
              messages:
                messages,
            }),
          });

        const data =
          await res.json();

        const aiMessage: Message =
          {
            role: "assistant",

            content:
              data.reply ||
              "No response",

            time:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute:
                    "2-digit",
                }
              ),
          };

        setMessages((prev) => [
          ...prev,
          aiMessage,
        ]);

        if (
          data.newAffection !==
          undefined
        ) {
          setAffection(
            data.newAffection
          );

          setLevel(
            data.newLevel
          );
        }
      } catch (error) {
        console.log(error);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",

            content:
              "Something went wrong 💔",

            time:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute:
                    "2-digit",
                }
              ),
          },
        ]);
      }

      setLoading(false);
    };

  return (
    <div className="flex h-screen overflow-hidden bg-black relative">

      <SoulmateParticles level={level} />

      <Sidebar
        girls={girls}
        selectedGirl={selectedGirl}
        onSelect={(girl) => {
          setSelectedGirl(girl);

          localStorage.setItem(
            "selectedGirl",
            girl
          );
        }}
        relationships={relationships}
        streak={0}
        isTyping={loading}
      />

      <main className="flex-1 flex flex-col relative z-10">

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">

          <div className="flex items-center gap-3">

            <motion.img
              key={selectedGirl}
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              src={currentGirl.image}
              alt={currentGirl.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-pink-500"
            />

            <div>
              <h1 className="text-white font-bold text-xl">
                {selectedGirl}
              </h1>

              <p className="text-green-400 text-xs">
                {loading
                  ? "Typing..."
                  : "Online"}
              </p>
            </div>
          </div>

          <RelationshipBadge
            affection={affection}
            level={level}
          />
        </header>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto px-4 py-6">

          <div className="max-w-4xl mx-auto flex flex-col gap-4">

            {messages.map(
              (msg, index) => (
                <MessageBubble
                  key={index}
                  role={msg.role}
                  content={msg.content}
                  time={msg.time}
                />
              )
            )}

            {loading && (
              <TypingIndicator />
            )}

            <div
              ref={messagesEndRef}
            />

          </div>
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl">

          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-3xl p-2">

            <button className="p-3 text-pink-400">
              <Mic className="w-5 h-5" />
            </button>

            <textarea
              value={message}
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              placeholder={`Message ${selectedGirl}...`}
              rows={1}
              className="flex-1 bg-transparent text-white outline-none resize-none px-2 py-3"
              onKeyDown={(e) => {
                if (
                  e.key ===
                    "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();

                  sendMessage();
                }
              }}
            />

            <button
              onClick={sendMessage}
              disabled={
                loading ||
                !message.trim()
              }
              className="p-3 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white"
            >
              <Send className="w-5 h-5" />
            </button>

          </div>
        </div>

      </main>
    </div>
  );
}