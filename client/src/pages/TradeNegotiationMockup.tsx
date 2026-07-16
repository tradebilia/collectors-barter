import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2, AlertCircle, X } from "lucide-react";

export function TradeNegotiationMockup() {
  const [selectedVariant, setSelectedVariant] = useState("v1");
  const [message, setMessage] = useState("");

  // ============ VARIANT 1: Split-Screen Pro ============
  const V1_SplitScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white">Trade TR-000001</h1>
          <p className="text-slate-400">Negotiating with CollectorPro</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* YOUR ITEMS */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Your Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-blue-500">
                <div className="text-4xl mb-2">🏀</div>
                <p className="text-white font-semibold">1996 Kobe Bryant Rookie</p>
                <p className="text-slate-400 text-sm">PSA 8 • $1,650</p>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-blue-500">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-white font-semibold">Edge of Spider-Verse #2</p>
                <p className="text-slate-400 text-sm">CGC 9.0 • $1,000</p>
              </div>
              <p className="text-slate-300 font-semibold">Total: $2,650</p>
            </CardContent>
          </Card>

          {/* THEIR ITEMS */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Their Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-green-500">
                <div className="text-4xl mb-2">🏒</div>
                <p className="text-white font-semibold">1979 Wayne Gretzky Rookie</p>
                <p className="text-slate-400 text-sm">O-Pee-Chee • $8,100</p>
              </div>
              <p className="text-slate-300 font-semibold">Total: $8,100</p>
              <p className="text-red-400 text-sm">⚠️ Value gap: -$5,450 in your favor</p>
            </CardContent>
          </Card>
        </div>

        {/* CHAT */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Negotiation Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto mb-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">CP</div>
                <div>
                  <p className="text-slate-400 text-xs">CollectorPro • 2 hours ago</p>
                  <p className="text-white">Hey! I'm interested in your Kobe and Spider-Gwen for my Gretzky.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div>
                  <p className="text-slate-400 text-xs text-right">You • 1 hour ago</p>
                  <p className="text-white text-right">That sounds fair! Can you send photos of the Gretzky card?</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">YOU</div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">CP</div>
                <div>
                  <p className="text-slate-400 text-xs">CollectorPro • 30 mins ago</p>
                  <p className="text-white">Sounds good! Let me check the condition...</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
              />
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Button className="bg-green-600 hover:bg-green-700 text-lg py-6">Accept Trade</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-lg py-6">
            Counter Propose
          </Button>
          <Button variant="outline" className="border-red-600/30 text-red-400 hover:bg-red-600/10 text-lg py-6">
            Cancel Trade
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 2: Social Chat-First ============
  const V2_ChatFirst = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-6 h-screen">
          {/* CHAT MAIN */}
          <div className="col-span-2">
            <div className="bg-slate-800 border border-slate-700 rounded-lg h-full flex flex-col">
              <div className="border-b border-slate-700 p-4">
                <h2 className="text-white font-bold">CollectorPro</h2>
                <p className="text-slate-400 text-sm">Trade TR-000001 • Negotiating</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CP</div>
                  <div>
                    <p className="text-slate-400 text-xs">CollectorPro • 2 hours ago</p>
                    <div className="bg-slate-700 rounded-lg p-3 mt-1 max-w-xs">
                      <p className="text-white">Hey! I'm interested in your Kobe and Spider-Gwen for my Gretzky.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">You • 1 hour ago</p>
                    <div className="bg-blue-600 rounded-lg p-3 mt-1 max-w-xs ml-auto">
                      <p className="text-white">That sounds fair! Can you send photos of the Gretzky card?</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">YOU</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CP</div>
                  <div>
                    <p className="text-slate-400 text-xs">CollectorPro • 30 mins ago</p>
                    <div className="bg-slate-700 rounded-lg p-3 mt-1 max-w-xs">
                      <p className="text-white">Sounds good! Let me check the condition...</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-700 p-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Message..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                />
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* TRADE SUMMARY SIDEBAR */}
          <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Trade Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-400 text-xs mb-2">YOU OFFER</p>
                  <div className="space-y-2">
                    <div className="bg-slate-700 p-2 rounded text-sm">
                      <p className="text-white font-semibold">🏀 Kobe Rookie</p>
                      <p className="text-slate-400 text-xs">$1,650</p>
                    </div>
                    <div className="bg-slate-700 p-2 rounded text-sm">
                      <p className="text-white font-semibold">📚 Spider-Gwen</p>
                      <p className="text-slate-400 text-xs">$1,000</p>
                    </div>
                  </div>
                  <p className="text-slate-300 font-bold mt-2">$2,650</p>
                </div>
                <div className="border-t border-slate-600 pt-4">
                  <p className="text-slate-400 text-xs mb-2">THEY OFFER</p>
                  <div className="bg-slate-700 p-2 rounded text-sm">
                    <p className="text-white font-semibold">🏒 Gretzky Rookie</p>
                    <p className="text-slate-400 text-xs">$8,100</p>
                  </div>
                  <p className="text-slate-300 font-bold mt-2">$8,100</p>
                </div>
              </CardContent>
            </Card>
            <Button className="w-full bg-green-600 hover:bg-green-700">Accept Trade</Button>
            <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
              Counter Propose
            </Button>
            <Button variant="outline" className="w-full border-red-600/30 text-red-400 hover:bg-red-600/10">
              Cancel Trade
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 3: Visual Gallery ============
  const V3_VisualGallery = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Trade TR-000001</h1>
        <p className="text-slate-400 mb-6">CollectorPro • Negotiating</p>

        {/* ITEMS GALLERY */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* YOUR SIDE */}
          <div>
            <h2 className="text-white font-bold mb-4">Your Items</h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-center">
                <div className="text-8xl mb-4">🏀</div>
                <p className="text-white font-bold text-xl">Kobe Bryant Rookie</p>
                <p className="text-blue-200 text-sm">PSA 8 • 1996</p>
                <p className="text-blue-100 font-bold text-2xl mt-2">$1,650</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-center">
                <div className="text-8xl mb-4">📚</div>
                <p className="text-white font-bold text-xl">Edge of Spider-Verse #2</p>
                <p className="text-blue-200 text-sm">CGC 9.0</p>
                <p className="text-blue-100 font-bold text-2xl mt-2">$1,000</p>
              </div>
              <div className="bg-blue-900/50 border-2 border-blue-500 rounded-xl p-4 text-center">
                <p className="text-slate-300 text-sm">Total Value</p>
                <p className="text-white font-bold text-3xl">$2,650</p>
              </div>
            </div>
          </div>

          {/* THEIR SIDE */}
          <div>
            <h2 className="text-white font-bold mb-4">Their Items</h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-8 text-center">
                <div className="text-8xl mb-4">🏒</div>
                <p className="text-white font-bold text-xl">Wayne Gretzky Rookie</p>
                <p className="text-green-200 text-sm">O-Pee-Chee • 1979</p>
                <p className="text-green-100 font-bold text-2xl mt-2">$8,100</p>
              </div>
              <div className="bg-green-900/50 border-2 border-green-500 rounded-xl p-4 text-center">
                <p className="text-slate-300 text-sm">Total Value</p>
                <p className="text-white font-bold text-3xl">$8,100</p>
              </div>
            </div>
          </div>
        </div>

        {/* CHAT */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="bg-slate-900 rounded-lg p-4 h-48 overflow-y-auto mb-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CP</div>
                <div className="bg-slate-700 rounded-lg p-3 max-w-xs">
                  <p className="text-white text-sm">Interested in your Kobe and Spider-Gwen for my Gretzky!</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="bg-blue-600 rounded-lg p-3 max-w-xs">
                  <p className="text-white text-sm">Sounds fair! Can you send photos?</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CP</div>
                <div className="bg-slate-700 rounded-lg p-3 max-w-xs">
                  <p className="text-white text-sm">Let me check the condition...</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Message..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
              />
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-4">
          <Button className="bg-green-600 hover:bg-green-700 py-6 text-lg">Accept Trade</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 py-6 text-lg">
            Counter Propose
          </Button>
          <Button variant="outline" className="border-red-600/30 text-red-400 hover:bg-red-600/10 py-6 text-lg">
            Cancel Trade
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 4: Interactive Swap ============
  const V4_InteractiveSwap = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Trade Negotiation</h1>

        {/* SWAP VISUALIZATION */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* YOUR ITEMS */}
          <div>
            <h3 className="text-white font-bold mb-4 text-center">Your Offer</h3>
            <div className="space-y-3">
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-blue-500 cursor-move hover:shadow-lg transition-all">
                <div className="text-3xl mb-2">🏀</div>
                <p className="text-white font-semibold text-sm">Kobe Rookie</p>
                <p className="text-blue-400 font-bold">$1,650</p>
              </div>
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-blue-500 cursor-move hover:shadow-lg transition-all">
                <div className="text-3xl mb-2">📚</div>
                <p className="text-white font-semibold text-sm">Spider-Gwen</p>
                <p className="text-blue-400 font-bold">$1,000</p>
              </div>
            </div>
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3 mt-4 text-center">
              <p className="text-slate-300 text-xs">Total</p>
              <p className="text-white font-bold text-xl">$2,650</p>
            </div>
          </div>

          {/* SWAP ARROWS */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl mb-4">⇄</div>
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-4">Value Gap</p>
              <p className="text-red-400 font-bold text-lg">-$5,450</p>
              <p className="text-slate-500 text-xs mt-2">(206% in their favor)</p>
            </div>
          </div>

          {/* THEIR ITEMS */}
          <div>
            <h3 className="text-white font-bold mb-4 text-center">Their Offer</h3>
            <div className="space-y-3">
              <div className="bg-slate-700 p-4 rounded-lg border-2 border-green-500 cursor-move hover:shadow-lg transition-all">
                <div className="text-3xl mb-2">🏒</div>
                <p className="text-white font-semibold text-sm">Gretzky Rookie</p>
                <p className="text-green-400 font-bold">$8,100</p>
              </div>
            </div>
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 mt-4 text-center">
              <p className="text-slate-300 text-xs">Total</p>
              <p className="text-white font-bold text-xl">$8,100</p>
            </div>
          </div>
        </div>

        {/* CHAT */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-lg p-4 h-40 overflow-y-auto mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">CP</div>
                <div className="bg-slate-700 rounded-lg p-2 max-w-xs">
                  <p className="text-white text-sm">Interested in trading!</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="bg-blue-600 rounded-lg p-2 max-w-xs">
                  <p className="text-white text-sm">Sounds good!</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Message..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm"
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-4">
          <Button className="bg-green-600 hover:bg-green-700">Accept Trade</Button>
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Counter Propose
          </Button>
          <Button variant="outline" className="border-red-600/30 text-red-400 hover:bg-red-600/10">
            Cancel Trade
          </Button>
        </div>
      </div>
    </div>
  );

  // ============ VARIANT 5: Minimalist Luxury ============
  const V5_MinimalistLuxury = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-light text-white tracking-wide">Trade Proposal</h1>
              <p className="text-slate-400 text-sm">TR-000001 • CollectorPro</p>
            </div>
            <Badge className="bg-yellow-600">Negotiating</Badge>
          </div>
        </div>

        {/* ITEMS COMPARISON */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-4">You Offer</p>
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-4">
                <p className="text-white font-light text-lg">1996 Kobe Bryant Rookie</p>
                <p className="text-slate-400 text-sm">PSA 8</p>
                <p className="text-white font-semibold text-lg mt-2">$1,650</p>
              </div>
              <div className="border-b border-slate-700 pb-4">
                <p className="text-white font-light text-lg">Edge of Spider-Verse #2</p>
                <p className="text-slate-400 text-sm">CGC 9.0</p>
                <p className="text-white font-semibold text-lg mt-2">$1,000</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Total Value</p>
              <p className="text-white text-3xl font-light">$2,650</p>
            </div>
          </div>

          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-4">They Offer</p>
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-4">
                <p className="text-white font-light text-lg">1979 Wayne Gretzky Rookie</p>
                <p className="text-slate-400 text-sm">O-Pee-Chee</p>
                <p className="text-white font-semibold text-lg mt-2">$8,100</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Total Value</p>
              <p className="text-white text-3xl font-light">$8,100</p>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-slate-700 my-8"></div>

        {/* CHAT */}
        <div className="mb-8">
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-4">Conversation</p>
          <div className="space-y-6">
            <div>
              <p className="text-slate-500 text-xs mb-2">CollectorPro • 2 hours ago</p>
              <p className="text-white font-light">Interested in your Kobe and Spider-Gwen for my Gretzky.</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs mb-2">You • 1 hour ago</p>
              <p className="text-white font-light">That sounds fair! Can you send photos of the Gretzky card?</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-2">CollectorPro • 30 mins ago</p>
              <p className="text-white font-light">Sounds good! Let me check the condition...</p>
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Your message..."
            className="flex-1 bg-transparent border-b border-slate-600 px-0 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-slate-400 font-light"
          />
          <Button className="bg-slate-700 hover:bg-slate-600 text-white border-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4">
          <Button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-0 py-6">Accept Trade</Button>
          <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700/50 py-6">
            Counter Propose
          </Button>
          <Button variant="outline" className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700/50 py-6">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Trade Negotiation Page - 5 Designs</h1>
          <p className="text-slate-400">The "War Room" where two collectors negotiate a trade</p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto mb-8">
          <Tabs value={selectedVariant} onValueChange={setSelectedVariant} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
              <TabsTrigger value="v1" className="text-xs sm:text-sm">V1: Split-Screen</TabsTrigger>
              <TabsTrigger value="v2" className="text-xs sm:text-sm">V2: Chat-First</TabsTrigger>
              <TabsTrigger value="v3" className="text-xs sm:text-sm">V3: Gallery</TabsTrigger>
              <TabsTrigger value="v4" className="text-xs sm:text-sm">V4: Swap Grid</TabsTrigger>
              <TabsTrigger value="v5" className="text-xs sm:text-sm">V5: Luxury</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selectedVariant === "v1" && <V1_SplitScreen />}
        {selectedVariant === "v2" && <V2_ChatFirst />}
        {selectedVariant === "v3" && <V3_VisualGallery />}
        {selectedVariant === "v4" && <V4_InteractiveSwap />}
        {selectedVariant === "v5" && <V5_MinimalistLuxury />}
      </div>
    </div>
  );
}
