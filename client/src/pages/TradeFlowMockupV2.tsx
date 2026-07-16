import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MessageCircle, Clock, CheckCircle2, AlertCircle, Send, TrendingUp } from "lucide-react";

export function TradeFlowMockupV2() {
  const [selectedVariant, setSelectedVariant] = useState("v1");
  const [selectedTrade, setSelectedTrade] = useState("TR-000001");

  // ============ VARIANT 1: Power Trader Dashboard ============
  const V1_PowerTrader = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Power Trader Dashboard</h1>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm">Active Trades</p>
              <p className="text-3xl font-bold text-white">3</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm">Total Value</p>
              <p className="text-3xl font-bold text-green-400">$12,750</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm">Awaiting Action</p>
              <p className="text-3xl font-bold text-yellow-400">2</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-sm">Completion Rate</p>
              <p className="text-3xl font-bold text-blue-400">87%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["TR-000001", "TR-000002", "TR-000003"].map((tradeId) => (
                    <div
                      key={tradeId}
                      onClick={() => setSelectedTrade(tradeId)}
                      className={`p-4 rounded-lg cursor-pointer border transition-all ${
                        selectedTrade === tradeId
                          ? "bg-blue-600 border-blue-500"
                          : "bg-slate-700 border-slate-600 hover:bg-slate-650"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{tradeId}</p>
                          <p className="text-sm text-slate-300">CollectorPro • 2 hours ago</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-yellow-600">Negotiating</Badge>
                          <p className="text-sm text-slate-300 mt-1">$8,100 ↔ $2,650</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-green-600 hover:bg-green-700">Accept Trade</Button>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  Counter Propose
                </Button>
                <Button variant="outline" className="w-full border-red-600/30 text-red-400 hover:bg-red-600/10">
                  Cancel Trade
                </Button>
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 2: Visual Collector Grid ============
  const V2_VisualCollector = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">My Trades - Visual View</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { id: "TR-000001", status: "negotiating", your: "🏀 Kobe", their: "🏒 Gretzky", color: "yellow" },
            { id: "TR-000002", status: "accepted", your: "🐉 Charizard", their: "🎮 Mario", color: "green" },
            { id: "TR-000003", status: "completed", your: "📕 DareDevil", their: "⚾ Griffey", color: "slate" }
          ].map((trade) => (
            <Card key={trade.id} className={`bg-slate-800 border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg transition-all`}>
              <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-6xl">
                {trade.your}
              </div>
              <CardContent className="pt-4">
                <Badge className={`${trade.color === "yellow" ? "bg-yellow-600" : trade.color === "green" ? "bg-green-600" : "bg-slate-600"}`}>
                  {trade.status}
                </Badge>
                <p className="text-white font-semibold mt-3">{trade.id}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">You offer:</span>
                    <span className="text-white font-semibold">{trade.your}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">They offer:</span>
                    <span className="text-white font-semibold">{trade.their}</span>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-sm">View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 3: Step-by-Step Timeline ============
  const V3_Timeline = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Trade Progress - Timeline View</h1>
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Trade TR-000001</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                { step: 1, title: "Proposed", desc: "CollectorPro sent you a trade offer", status: "completed", time: "2 days ago" },
                { step: 2, title: "Negotiating", desc: "You and CollectorPro are discussing terms", status: "active", time: "In progress" },
                { step: 3, title: "Accepted", desc: "Both parties confirm the trade", status: "pending", time: "Waiting..." },
                { step: 4, title: "Shipping", desc: "Items are being shipped", status: "pending", time: "Not started" },
                { step: 5, title: "Completed", desc: "Both parties received items", status: "pending", time: "Not started" }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        item.status === "completed"
                          ? "bg-green-600"
                          : item.status === "active"
                          ? "bg-blue-600"
                          : "bg-slate-600"
                      }`}
                    >
                      {item.status === "completed" ? "✓" : item.step}
                    </div>
                    {idx < 4 && <div className="w-1 h-12 bg-slate-600 mt-2"></div>}
                  </div>
                  <div className="pb-8">
                    <h3 className="text-white font-semibold text-lg">{item.title}</h3>
                    <p className="text-slate-400 text-sm">{item.desc}</p>
                    <p className="text-slate-500 text-xs mt-2">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Button className="bg-green-600 hover:bg-green-700">Accept & Move Forward</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Message Trader
          </Button>
          <Button variant="outline" className="border-red-600/30 text-red-400 hover:bg-red-600/10">
            Cancel Trade
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 4: Mobile-First Minimalist ============
  const V4_Minimalist = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">My Trades</h1>

        <div className="space-y-3 mb-6">
          {[
            { id: "TR-000001", trader: "CollectorPro", status: "negotiating", msg: "Let me check condition..." },
            { id: "TR-000002", trader: "VintageHunter", status: "accepted", msg: "Shipping tomorrow" },
            { id: "TR-000003", trader: "ComicFanatic", status: "completed", msg: "Great trade!" }
          ].map((trade) => (
            <Card key={trade.id} className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-semibold">{trade.id}</p>
                    <p className="text-slate-400 text-sm">{trade.trader}</p>
                  </div>
                  <Badge className={`${trade.status === "negotiating" ? "bg-yellow-600" : trade.status === "accepted" ? "bg-green-600" : "bg-slate-600"}`}>
                    {trade.status}
                  </Badge>
                </div>
                <p className="text-slate-300 text-sm mb-3">"{trade.msg}"</p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs">
                    View
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                    Reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Trade TR-000001 Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">YOU OFFER</p>
              <p className="text-white font-semibold">🏀 Kobe Bryant Rookie</p>
              <p className="text-slate-400 text-sm">$1,650</p>
            </div>
            <div className="text-center text-slate-400">↔</div>
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">THEY OFFER</p>
              <p className="text-white font-semibold">🏒 Wayne Gretzky Rookie</p>
              <p className="text-slate-400 text-sm">$8,100</p>
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700">Accept Trade</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ============ VARIANT 5: Value-Focused Comparison ============
  const V5_ValueFocused = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Trade Valuation - Smart Comparison</h1>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* YOUR SIDE */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Your Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs mb-1">ITEM 1</p>
                  <p className="text-white font-semibold">🏀 Kobe Bryant Rookie</p>
                  <p className="text-green-400 font-bold text-lg">$1,650</p>
                </div>
                <div className="bg-slate-700 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs mb-1">ITEM 2</p>
                  <p className="text-white font-semibold">📚 Edge of Spider-Verse #2</p>
                  <p className="text-green-400 font-bold text-lg">$1,000</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-white font-bold text-2xl">$2,650</p>
              </div>
            </CardContent>
          </Card>

          {/* THEIR SIDE */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Their Offer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <p className="text-slate-400 text-xs mb-1">ITEM 1</p>
                  <p className="text-white font-semibold">🏒 Wayne Gretzky Rookie</p>
                  <p className="text-blue-400 font-bold text-lg">$8,100</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-white font-bold text-2xl">$8,100</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VALUE GAP ANALYSIS */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Value Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Your Total</span>
                <span className="text-white font-bold">$2,650</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Their Total</span>
                <span className="text-white font-bold">$8,100</span>
              </div>
              <div className="border-t border-slate-600 pt-4 flex justify-between items-center">
                <span className="text-slate-300 font-semibold">Value Gap</span>
                <span className="text-red-400 font-bold text-lg">-$5,450 (206% in their favor)</span>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                💡 This trade heavily favors the other party. Consider counter-proposing with additional items or requesting a cash adjustment.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Button className="bg-yellow-600 hover:bg-yellow-700">Counter with More Items</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Request Cash Adjustment</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Decline Trade
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Trade Flow - 5 Design Variations</h1>
          <p className="text-slate-400">Select a variation to preview the design approach</p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto mb-8">
          <Tabs value={selectedVariant} onValueChange={setSelectedVariant} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
              <TabsTrigger value="v1" className="text-xs sm:text-sm">V1: Power Trader</TabsTrigger>
              <TabsTrigger value="v2" className="text-xs sm:text-sm">V2: Visual Grid</TabsTrigger>
              <TabsTrigger value="v3" className="text-xs sm:text-sm">V3: Timeline</TabsTrigger>
              <TabsTrigger value="v4" className="text-xs sm:text-sm">V4: Minimalist</TabsTrigger>
              <TabsTrigger value="v5" className="text-xs sm:text-sm">V5: Value-Focused</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selectedVariant === "v1" && <V1_PowerTrader />}
        {selectedVariant === "v2" && <V2_VisualCollector />}
        {selectedVariant === "v3" && <V3_Timeline />}
        {selectedVariant === "v4" && <V4_Minimalist />}
        {selectedVariant === "v5" && <V5_ValueFocused />}
      </div>
    </div>
  );
}
