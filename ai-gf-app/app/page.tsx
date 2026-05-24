export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white flex flex-col items-center justify-center px-6">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_40%)]"></div>

      <div className="relative z-10 flex flex-col items-center">

        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.6)] mb-8">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800"
            alt="AI Girl"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-center bg-gradient-to-r from-pink-500 via-purple-400 to-blue-500 bg-clip-text text-transparent">
          Meet Luna AI
        </h1>

        <p className="text-gray-300 text-center mt-6 max-w-xl text-lg leading-relaxed">
          Your emotionally intelligent AI companion that remembers your conversations,
          supports you, and stays with you anytime.
        </p>

        <a href="/chat">
          <button className="mt-10 px-8 py-4 rounded-2xl bg-pink-600 hover:bg-pink-500 transition text-lg font-semibold shadow-[0_0_30px_rgba(236,72,153,0.5)]">
            Start Chatting
          </button>
        </a>

      </div>

    </main>
  );
}