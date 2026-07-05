"use client";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  User,
  MessageCircle,
  LogOut,
  Menu,
  X,
  Flame,
  Phone,
} from "lucide-react";

import {
  useState,
  useEffect,
} from "react";

import { cn } from "@/lib/utils";

import Link from "next/link";

import { supabaseClient as supabase } from "@/lib/supabase-client";

import {
  getStatusText,
  getAuraGlow,
} from "@/lib/relationships";

import { AudioService } from "@/lib/audio";

type Girl = {
  name: string;
  image: string;
};

type SidebarProps = {
  girls: Girl[];

  selectedGirl: string;

  onSelect: (
    name: string
  ) => void;

  relationships: Record<
    string,
    {
      level: number;
      affection: number;
    }
  >;

  streak: number;

  isTyping: boolean;
};

export function Sidebar({
  girls,
  selectedGirl,
  onSelect,
  relationships,
  streak,
  isTyping,
}: SidebarProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    statusTrigger,
    setStatusTrigger,
  ] = useState(0);

  const [
    isCheckoutLoading,
    setIsCheckoutLoading,
  ] = useState(false);

  const toggleSidebar = () =>
    setIsOpen(!isOpen);

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      window.location.href =
        "/login";
    };

  useEffect(() => {
    const interval =
      setInterval(() => {
        setStatusTrigger(
          (prev) => prev + 1
        );
      }, 60000);

    return () =>
      clearInterval(interval);
  }, []);

  // FIXED VOICE BUTTON
  const handlePremiumCall =
    async () => {
      try {
        AudioService.playUIEffect(
          "success"
        );

        window.location.href =
          "/voice";

      } catch (e) {
        console.log(e);
      }
    };

  const renderSidebarContent =
    () => (
      <div className="flex flex-col h-full bg-[#030014]/95 backdrop-blur-xl border-r border-white/5 w-64 md:w-72 shadow-[4px_0_24px_rgba(0,0,0,0.8)] z-40 relative pt-16 md:pt-6">

        {/* HEADER */}
        <div className="px-6 pb-6 border-b border-white/10 flex items-center justify-between">

          <Link
            href="/"
            className="flex items-center gap-2"
          >

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.5)]">

              <HeartIcon className="w-4 h-4 text-white" />
            </div>

            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
              Luna AI
            </h2>
          </Link>

          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-md border border-orange-500/20">

              <Flame className="w-3.5 h-3.5 text-orange-400" />

              <span className="text-xs font-bold text-orange-400">
                {streak}
              </span>
            </div>
          )}
        </div>

        {/* GIRLS */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
            Companions
          </h3>

          {girls.map(
            (girl) => {
              const isSelected =
                selectedGirl ===
                girl.name;

              const rel =
                relationships[
                  girl.name
                ] || {
                  level: 1,
                  affection: 0,
                };

              const status =
                getStatusText(
                  rel.level,
                  isSelected &&
                    isTyping
                );

              const auraClass =
                getAuraGlow(
                  rel.level
                );

              return (
                <button
                  key={
                    girl.name
                  }
                  onClick={() => {
                    onSelect(
                      girl.name
                    );

                    if (
                      window.innerWidth <
                      768
                    ) {
                      setIsOpen(
                        false
                      );
                    }
                  }}
                  className={cn(
                    "w-full flex flex-col px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group",

                    isSelected
                      ? "bg-white/10 border border-white/10"
                      : "hover:bg-white/5 border border-transparent"
                  )}
                >

                  {isSelected && (
                    <motion.div
                      layoutId="active-character"
                      className="absolute left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-500 rounded-r-full"
                    />
                  )}

                  <div className="flex items-center gap-3 w-full">

                    <div className="relative">

                      <img
                        src={
                          girl.image
                        }
                        alt={
                          girl.name
                        }
                        className={cn(
                          "w-10 h-10 rounded-full object-cover",

                          auraClass ||
                            "border-2 border-white/10"
                        )}
                      />

                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#030014]" />
                    </div>

                    <div className="flex flex-col items-start text-left flex-1 min-w-0">

                      <span className="font-medium truncate w-full text-white">
                        {
                          girl.name
                        }
                      </span>

                      <span className="text-[10px] text-pink-400/80 font-medium truncate w-full">
                        {status}
                      </span>
                    </div>

                    {isSelected && (
                      <MessageCircle className="w-4 h-4 text-pink-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* VOICE BUTTON */}
        <div className="px-4 py-2">

          <button
            onClick={
              handlePremiumCall
            }
            className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 p-3 flex items-center justify-between group hover:border-pink-500/50 transition-all"
          >

            <div className="flex flex-col items-start relative z-10">

              <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">

                Voice Call
              </span>

              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                AI Voice Enabled
              </span>
            </div>

            <Phone className="w-4 h-4 text-purple-400 group-hover:text-pink-400 transition-colors relative z-10" />
          </button>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-white/10 space-y-2">

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Flame className="w-5 h-5 text-pink-400" />
            <span className="font-medium text-sm">
              Beta Dashboard
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="font-medium text-sm">
              Profile Dashboard
            </span>
          </Link>

          <button
            onClick={
              handleLogout
            }
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >

            <LogOut className="w-5 h-5" />

            <span className="font-medium text-sm">
              Sign Out
            </span>
          </button>
        </div>
      </div>
    );

  return (
    <>
      {/* MOBILE BUTTON */}
      <button
        onClick={
          toggleSidebar
        }
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white"
      >

        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Menu className="w-5 h-5" />
        )}
      </button>

      {/* OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={
              toggleSidebar
            }
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <div
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen z-40 transition-transform duration-300 ease-in-out md:translate-x-0",

          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        )}
      >

        {renderSidebarContent()}
      </div>
    </>
  );
}

function HeartIcon(
  props: React.SVGProps<SVGSVGElement>
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >

      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}