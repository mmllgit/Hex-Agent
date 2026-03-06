"use client";

import { useState, useEffect, useCallback } from "react";
import ChampionSelect from "@/components/ChampionSelect";
import ModeSelect from "@/components/ModeSelect";
import ChatPanel from "@/components/ChatPanel";
import ResultCard from "@/components/ResultCard";
import { fetchChampions, Champion } from "@/lib/api";

export default function Home() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [selectedChampion, setSelectedChampion] = useState("");
  const [selectedMode, setSelectedMode] = useState("海克斯大乱斗");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchChampions()
      .then(setChampions)
      .catch(() => setError("无法连接后端服务，请确保后端已启动。"));
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleSelectChampion = useCallback(
    (name: string) => {
      setSelectedChampion(name);
      setSidebarOpen(false);
    },
    [],
  );

  const sidebarContent = (
    <>
      <div className="p-4 md:p-6 border-b border-lol-light flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gold-300 flex items-center gap-2">
            <span className="text-xl md:text-2xl">⚔️</span>
            海克斯大乱斗助手
          </h1>
          <p className="text-xs text-lol-muted mt-1">国服 AI 攻略系统</p>
        </div>
        <button
          onClick={closeSidebar}
          className="md:hidden p-2 -mr-2 text-lol-muted hover:text-white transition-colors"
          aria-label="关闭菜单"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <ChampionSelect
          champions={champions}
          selected={selectedChampion}
          onSelect={handleSelectChampion}
        />

        <ModeSelect selected={selectedMode} onSelect={setSelectedMode} />

        <div className="space-y-3">
          <h3 className="text-gold-400 text-sm font-semibold">功能说明</h3>
          <ResultCard
            title="英雄玩法分析"
            icon="🎮"
            description="技能连招、符文出装推荐"
            color="blue"
          />
          <ResultCard
            title="海克斯搭配推荐"
            icon="💎"
            description="最佳海克斯组合及胜率数据"
            color="gold"
          />
          <ResultCard
            title="技巧与打法"
            icon="📋"
            description="操作连招、注意事项等"
            color="green"
          />
        </div>
      </div>

      <div className="p-4 border-t border-lol-light text-xs text-lol-muted text-center">
        Powered by MMLL
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-80 bg-lol-darker border-r border-lol-light flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-80 bg-lol-darker flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col bg-lol-dark min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden bg-lol-darker border-b border-lol-light px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 -ml-1 text-lol-muted hover:text-white transition-colors"
            aria-label="打开菜单"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-gold-300 truncate">
            ⚔️ 海克斯大乱斗助手
          </h1>
          {selectedChampion && (
            <span className="ml-auto text-xs text-lol-accent truncate">
              {selectedChampion}
            </span>
          )}
        </div>

        {/* Desktop champion bar */}
        {selectedChampion && (
          <div className="hidden md:flex bg-lol-darker border-b border-lol-light px-6 py-3 items-center gap-3">
            <span className="text-lol-accent font-semibold">
              {selectedChampion}
            </span>
            <span className="text-lol-muted">|</span>
            <span className="text-lol-muted text-sm">{selectedMode}</span>
          </div>
        )}

        <ChatPanel champion={selectedChampion} mode={selectedMode} />
      </main>
    </div>
  );
}
