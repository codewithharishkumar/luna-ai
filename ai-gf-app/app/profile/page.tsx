
"use client";

import { useEffect, useState } from "react";

import { supabaseClient as supabase } from "@/lib/supabase-client";

import { Sidebar } from "@/components/Sidebar";

import { motion } from "framer-motion";

import {
  Heart,
  User,
  LogOut,
  Flame,
  MessageSquare,
  Star,
  Sparkles,
} from "lucide-react";

import { getRelationshipTitle } from "@/lib/relationships";

type Girl = {
  name: string;
  image: string;
};

type Relationship = {
  level: number;
  affection: number;
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

export default function ProfilePage() {
  const [
    relationships,
    setRelationships,
  ] = useState<
    Record<string, Relationship>
  >({});

  const [userEmail, setUserEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [stats, setStats] =
    useState({
      streak: 0,
      totalMessages: 0,
      favorite: "None",
      highestAffection: 0,
    });

  // LOAD PROFILE
  useEffect(() => {
    const loadProfile =
      async () => {
        try {
          const {
            data: { user },
          } =
            await supabase.auth.getUser();

          if (!user) {
            window.location.href =
              "/login";

            return;
          }

          setUserEmail(
            user.email ||
              "Unknown"
          );

          // RELATIONSHIPS
          const {
            data: relData,
          } = await supabase
            .from(
              "relationships"
            )
            .select("*")
            .eq(
              "user_id",
              user.id
            );

          let highestAffection =
            0;

          let fav = "None";

          const relsRecord:
            Record<
              string,
              Relationship
            > = {};

          if (relData) {
            relData.forEach(
              (r: any) => {
                relsRecord[
                  r.character
                ] = {
                  level:
                    r.relationship_level,

                  affection:
                    r.affection,
                };

                if (
                  r.affection >
                  highestAffection
                ) {
                  highestAffection =
                    r.affection;

                  fav =
                    r.character;
                }
              }
            );

            setRelationships(
              relsRecord
            );
          }

          // LOAD STREAK
          const res =
            await fetch(
              "/api/load",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify(
                  {
                    userId:
                      user.id,

                    character:
                      null,
                  }
                ),
              }
            );

          const loadData =
            await res.json();

          // TOTAL MESSAGES
          const { count } =
            await supabase
              .from("chats")
              .select("*", {
                count:
                  "exact",

                head: true,
              })
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "role",
                "user"
              );

          setStats({
            streak:
              loadData.streak ||
              0,

            totalMessages:
              count || 0,

            favorite: fav,

            highestAffection:
              highestAffection,
          });
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      };

    loadProfile();
  }, []);

  // LOGOUT
  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      window.location.href =
        "/login";
    };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.08),transparent_50%)] z-0 pointer-events-none" />

      {/* SIDEBAR */}
      <Sidebar
        girls={girls}
        selectedGirl=""
        onSelect={() => {
          window.location.href =
            "/chat";
        }}
        relationships={
          relationships
        }
        streak={stats.streak}
        isTyping={false}
      />

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto relative z-10 w-full p-4 md:p-10 custom-scrollbar">

        {loading ? (
          <div className="flex items-center justify-center h-full">

            <Sparkles className="w-10 h-10 text-purple-500 animate-pulse" />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">

            {/* HEADER */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="glass-panel p-8 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
            >

              <div className="flex items-center gap-6">

                <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center border border-white/20">

                  <User className="w-8 h-8 text-white/80" />
                </div>

                <div>

                  <h1 className="text-3xl font-bold text-white">
                    Dashboard
                  </h1>

                  <p className="text-purple-300">
                    {userEmail}
                  </p>
                </div>
              </div>

              <button
                onClick={
                  handleLogout
                }
                className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition flex items-center gap-2 text-red-400 font-medium"
              >

                <LogOut className="w-4 h-4" />

                Sign Out
              </button>
            </motion.div>

            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <StatCard
                icon={
                  <Flame className="w-5 h-5 text-orange-400" />
                }
                title="Daily Streak"
                value={`${stats.streak} Days`}
              />

              <StatCard
                icon={
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                }
                title="Total Messages"
                value={stats.totalMessages}
              />

              <StatCard
                icon={
                  <Star className="w-5 h-5 text-yellow-400" />
                }
                title="Favorite"
                value={stats.favorite}
              />

              <StatCard
                icon={
                  <Heart className="w-5 h-5 text-pink-400" />
                }
                title="Highest Affection"
                value={
                  stats.highestAffection
                }
              />
            </div>

            {/* RELATIONSHIPS */}
            <div className="space-y-6 pt-4">

              <h2 className="text-2xl font-bold text-white">
                Your Connections
              </h2>

              {Object.keys(
                relationships
              ).length === 0 ? (
                <div className="text-center p-10 glass-panel rounded-3xl border border-white/5">

                  <Heart className="w-10 h-10 text-gray-600 mx-auto mb-4" />

                  <p className="text-gray-400 text-lg">
                    No relationships
                    yet
                  </p>

                  <button
                    onClick={() => {
                      window.location.href =
                        "/chat";
                    }}
                    className="mt-4 px-6 py-2 bg-pink-600/20 text-pink-400 rounded-full"
                  >
                    Start Chatting
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {girls.map(
                    (girl) => {
                      const rel =
                        relationships[
                          girl.name
                        ];

                      if (!rel)
                        return null;

                      const progress =
                        Math.min(
                          (rel.affection %
                            50) *
                            2,
                          100
                        );

                      const title =
                        getRelationshipTitle(
                          rel.level
                        );

                      return (
                        <motion.div
                          key={
                            girl.name
                          }
                          whileHover={{
                            y: -5,
                          }}
                          className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden"
                        >

                          <div className="flex items-center gap-4 mb-6">

                            <img
                              src={
                                girl.image
                              }
                              alt={
                                girl.name
                              }
                              className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                            />

                            <div>

                              <h3 className="text-xl font-bold text-white">
                                {
                                  girl.name
                                }
                              </h3>

                              <div className="flex items-center gap-2">

                                <span className="text-pink-400 text-xs font-bold uppercase">
                                  {
                                    title
                                  }
                                </span>

                                <span className="text-white/50 text-xs">
                                  Level{" "}
                                  {
                                    rel.level
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* PROGRESS */}
                          <div className="space-y-3">

                            <div className="flex justify-between text-sm">

                              <span className="text-gray-400">
                                Affection
                              </span>

                              <span className="text-pink-300">
                                {
                                  rel.affection
                                }{" "}
                                pts
                              </span>
                            </div>

                            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden">

                              <motion.div
                                className="h-full bg-gradient-to-r from-pink-600 to-purple-600"
                                initial={{
                                  width: 0,
                                }}
                                animate={{
                                  width:
                                    `${progress}%`,
                                }}
                                transition={{
                                  duration: 1,
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// STAT CARD
function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;

  title: string;

  value:
    | string
    | number;
}) {
  return (
    <div className="glass-panel p-5 rounded-3xl border border-white/5 flex flex-col gap-3">

      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">

        {icon}
      </div>

      <div>

        <h4 className="text-gray-500 text-xs uppercase mb-1">
          {title}
        </h4>

        <p className="text-2xl font-bold text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

