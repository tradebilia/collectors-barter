import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MessageCircle, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";

export function TradeFlowMockup() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);

  const trades = [
    {
      id: "TR-000001",
      status: "negotiating",
      initiator: "CollectorPro",
      initiatorAvatar: "👤",
      initiatorItems: [
        { name: "1979 Wayne Gretzky Rookie", value: "$8,100", image: "🏒" }
      ],
      recipientItems: [
        { name: "1996 Kobe Bryant Rookie", value: "$1,650", image: "🏀" },
        { name: "Edge of Spider-Verse #2", value: "$1,000", image: "📚" }
      ],
      lastMessage: "Sounds good! Let me check the condition...",
      timestamp: "2 hours ago",
      unread: 2
    },
    {
      id: "TR-000002",
      status: "accepted",
      initiator: "VintageHunter",
      initiatorAvatar: "👤",
      initiatorItems: [
        { name: "Pokemon Charizard Holo", value: "$850", image: "🐉" }
      ],
      recipientItems: [
        { name: "Super Mario Bros 3 Graded", value: "$500", image: "🎮" }
      ],
      lastMessage: "Great! Shipping out tomorrow.",
      timestamp: "1 day ago",
      unread: 0
    },
    {
      id: "TR-000003",
      status: "completed",
      initiator: "ComicFanatic",
      initiatorAvatar: "👤",
      initiatorItems: [
        { name: "DareDevil 1st Electra", value: "$3,500", image: "📕" }
      ],
      recipientItems: [
        { name: "Ken Griffey Jr Rookie PSA 10", value: "$5,000", image: "⚾" }
      ],
      lastMessage: "Received! Thanks for the great trade!",
      timestamp: "3 days ago",
      unread: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Trades</h1>
          <p className="text-slate-400">Manage your active trades and view trade history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Trade Inbox */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800 border-slate-700 h-full">
              <CardHeader>
                <CardTitle className="text-white">Trade Inbox</CardTitle>
                <CardDescription>3 active trades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    onClick={() => setSelectedTrade(trade.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedTrade === trade.id
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-700 border-slate-600 hover:bg-slate-650"
                    } border`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{trade.initiatorAvatar}</span>
                        <div>
                          <p className={`font-semibold ${selectedTrade === trade.id ? "text-white" : "text-slate-200"}`}>
                            {trade.initiator}
                          </p>
                          <p className={`text-xs ${selectedTrade === trade.id ? "text-blue-100" : "text-slate-400"}`}>
                            {trade.id}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          trade.status === "negotiating"
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                            : trade.status === "accepted"
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-slate-600/20 text-slate-300 border-slate-500/30"
                        }`}
                      >
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </Badge>
                    </div>
                    <p className={`text-sm mb-2 line-clamp-2 ${selectedTrade === trade.id ? "text-blue-50" : "text-slate-300"}`}>
                      "{trade.lastMessage}"
                    </p>
                    <p className={`text-xs ${selectedTrade === trade.id ? "text-blue-100" : "text-slate-400"}`}>
                      {trade.timestamp}
                    </p>
                    {trade.unread > 0 && (
                      <div className="mt-2 inline-block bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {trade.unread} new
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Trade Details */}
          <div className="lg:col-span-2">
            {selectedTrade ? (
              <>
                {/* Trade Header */}
                <Card className="bg-slate-800 border-slate-700 mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Trade {selectedTrade}</CardTitle>
                        <CardDescription>
                          {trades.find((t) => t.id === selectedTrade)?.status === "negotiating"
                            ? "In negotiation"
                            : trades.find((t) => t.id === selectedTrade)?.status === "accepted"
                            ? "Accepted - Shipping in progress"
                            : "Completed"}
                        </CardDescription>
                      </div>
                      <Badge className="bg-blue-600">Active</Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Items Comparison */}
                <Card className="bg-slate-800 border-slate-700 mb-6">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Trade Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Your Items */}
                      <div>
                        <h3 className="text-slate-300 font-semibold mb-4">You're offering:</h3>
                        <div className="space-y-3">
                          {trades
                            .find((t) => t.id === selectedTrade)
                            ?.recipientItems.map((item, idx) => (
                              <div key={idx} className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-3xl mb-2">{item.image}</div>
                                <p className="text-white font-semibold text-sm">{item.name}</p>
                                <p className="text-slate-400 text-sm">{item.value}</p>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Their Items */}
                      <div>
                        <h3 className="text-slate-300 font-semibold mb-4">They're offering:</h3>
                        <div className="space-y-3">
                          {trades
                            .find((t) => t.id === selectedTrade)
                            ?.initiatorItems.map((item, idx) => (
                              <div key={idx} className="bg-slate-700 p-3 rounded-lg">
                                <div className="text-3xl mb-2">{item.image}</div>
                                <p className="text-white font-semibold text-sm">{item.name}</p>
                                <p className="text-slate-400 text-sm">{item.value}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Timeline */}
                <Card className="bg-slate-800 border-slate-700 mb-6">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Trade Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-white font-semibold">Proposed</p>
                          <p className="text-slate-400 text-sm">Trade initiated by CollectorPro</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Clock className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                        <div>
                          <p className="text-white font-semibold">Negotiating</p>
                          <p className="text-slate-400 text-sm">Both parties discussing terms</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <AlertCircle className="w-6 h-6 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="text-slate-400 font-semibold">Accepted (pending)</p>
                          <p className="text-slate-500 text-sm">Waiting for both parties to confirm</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message Thread */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Negotiation Chat
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                      <div className="flex gap-3">
                        <span className="text-2xl">👤</span>
                        <div className="bg-slate-700 p-3 rounded-lg flex-1">
                          <p className="text-slate-300 text-sm font-semibold">CollectorPro</p>
                          <p className="text-slate-200 text-sm">Hey! I'm interested in your Kobe and Spider-Gwen for my Gretzky.</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="bg-blue-600 p-3 rounded-lg flex-1">
                          <p className="text-blue-100 text-sm font-semibold">You</p>
                          <p className="text-blue-50 text-sm">That sounds fair! Can you send photos of the Gretzky card?</p>
                        </div>
                        <span className="text-2xl">👤</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-2xl">👤</span>
                        <div className="bg-slate-700 p-3 rounded-lg flex-1">
                          <p className="text-slate-300 text-sm font-semibold">CollectorPro</p>
                          <p className="text-slate-200 text-sm">Sounds good! Let me check the condition...</p>
                        </div>
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">Accept Trade</Button>
                  <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                    Counter Propose
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-600/30 text-red-400 hover:bg-red-600/10">
                    Cancel Trade
                  </Button>
                </div>
              </>
            ) : (
              <Card className="bg-slate-800 border-slate-700 h-96 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-400 text-lg">Select a trade to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
