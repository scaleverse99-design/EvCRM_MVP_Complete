"use client";
import { useState } from "react";
import Link from "next/link";

export default function OmniRadarView() {
  const [lastUpdate] = useState("Just now");
  
  const radarData = {
    webActivity: [
      { source: "Autocar India", newPages: 4, topKeyword: "Mahindra BE 6E Launch Date", threatLevel: "High", type: "News" },
      { source: "Tata Motors", newPages: 3, topKeyword: "Nexon Dark Edition 2026", threatLevel: "High", type: "OEM" },
      { source: "RushLane", newPages: 2, topKeyword: "Creta Facelift Spy Shots", threatLevel: "Medium", type: "Blog" },
      { source: "Team-BHP", newPages: 12, topKeyword: "WagonR AMT Real Mileage", threatLevel: "Low", type: "Forum" }
    ],
    youtubeTrends: [
      { keyword: "Curvv EV vs ZS EV Range Test", velocity: "+450% in 1hr", status: "JIT Published" },
      { keyword: "Thar Roxx Real Mileage", velocity: "+320% in 1hr", status: "JIT Published" },
      { keyword: "WagonR 2026 Facelift Spy", velocity: "+180% in 1hr", status: "Pending" }
    ],
    googleTrends: [
      { query: "Tata Curvv EV price on road", score: 98, match: "Youtube & Web" },
      { query: "Best EV under 20 lakhs", score: 85, match: "AI Bots" }
    ],
    jitPipeline: [
      { url: "/price/tata-nexon-dark-edition-2026", time: "2 mins ago", indexing: "Pushed to Google" },
      { url: "/compare/curvv-ev-vs-zs-ev-real-range", time: "14 mins ago", indexing: "Indexed" }
    ]
  };

  return (
    <div className="bg-[#0A0A0A] text-white p-8 font-sans rounded-3xl" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <header className="flex justify-between items-end border-b border-gray-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Omni-Source Validation Engine
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Master Triangulation Loop: Tracking ALL Auto Sites, YouTube, and Trends in Real-Time</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            Live Sync Active
          </div>
          <p className="text-xs text-gray-500 mt-2">Last loop: {lastUpdate}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Stream 1: Web Activity */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <span className="text-blue-400 mr-2">🌐</span> Auto Web Radar
            </h2>
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-1 rounded">30-MIN LOOP</span>
          </div>
          <div className="space-y-4">
            {radarData.webActivity.map((site, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-black/50 border border-gray-800/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm flex items-center gap-2">
                    {site.source}
                    <span className="text-[10px] uppercase bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{site.type}</span>
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                    site.newPages > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {site.newPages} New
                  </span>
                </div>
                <p className="text-xs text-gray-400">Extracted Intent: <span className="text-gray-200">{site.topKeyword}</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* Stream 2: YouTube Trends */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <span className="text-red-500 mr-2">▶️</span> YouTube Radar
            </h2>
            <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-1 rounded">LIVE API</span>
          </div>
          <div className="space-y-4">
            {radarData.youtubeTrends.map((yt, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-black/50 border border-gray-800/50">
                <p className="font-medium text-sm mb-2">{yt.keyword}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-green-400">{yt.velocity}</span>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                    yt.status === 'JIT Published' ? 'bg-purple-500/20 text-purple-300' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {yt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stream 3: Google Trends Match */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <span className="text-green-500 mr-2">📈</span> Breakout Validation
            </h2>
            <span className="text-[10px] font-mono bg-green-500/20 text-green-300 px-2 py-1 rounded">CROSS-CHECK</span>
          </div>
          <div className="space-y-4">
            {radarData.googleTrends.map((gt, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-black/50 border border-gray-800/50">
                <p className="font-medium text-sm mb-2">{gt.query}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">Score: {gt.score}/100</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Matches: {gt.match}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Master Output: JIT Publishing Pipeline */}
      <div className="bg-gradient-to-b from-[#111111] to-[#0a0a0a] border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          🚀 CTE Auto-Publish Pipeline (IndexNow)
          <span className="ml-4 text-xs font-normal text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            Generated based on Cross-Verified Intent
          </span>
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="pb-3 font-medium">Generated URL (Long-Tail)</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium text-right">Google Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {radarData.jitPipeline.map((jit, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <Link href={jit.url} className="text-blue-400 hover:text-blue-300 font-mono text-sm">
                      evcrm.in{jit.url}
                    </Link>
                  </td>
                  <td className="py-4 text-gray-400 text-xs">{jit.time}</td>
                  <td className="py-4 text-right">
                    <span className={`text-[10px] px-2 py-1 rounded-full ${
                      jit.indexing === 'Indexed' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {jit.indexing}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="text-[10px] bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors">
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
