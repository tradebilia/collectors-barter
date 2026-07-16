import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, TrendingUp, Users, ShieldCheck, Star } from "lucide-react";

const HomepageLayoutMockupsV2: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <Badge variant="outline" className="mb-6 border-blue-500/50 text-blue-400 px-4 py-1 rounded-full bg-blue-500/5">
            The Ultimate Collector's Exchange
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            TRADEBILIA
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A premium marketplace for serious collectors. Trade, buy, and sell rare items with confidence and security.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="rounded-full px-10 py-7 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20">
              <Plus className="mr-2 h-5 w-5" /> Start Trading
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-10 py-7 text-lg border-white/10 hover:bg-white/5">
              Explore Collections
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
          {[
            { label: "Total Members", value: "12,400+", icon: Users },
            { label: "Active Listings", value: "45,000+", icon: TrendingUp },
            { label: "Total Value", value: "$12.5M", icon: Star },
            { label: "Secure Trades", value: "8,900+", icon: ShieldCheck },
          ].map((stat, i) => (
            <div key={i} className="text-center md:border-r last:border-0 border-white/10">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Categories */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2">Featured Categories</h2>
            <p className="text-gray-400">Browse by your passion</p>
          </div>
          <Button variant="link" className="text-blue-400 hover:text-blue-300">View All Categories →</Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Vintage Comics", count: "1,200 items", color: "from-blue-500/20" },
            { name: "Sports Cards", count: "3,500 items", color: "from-green-500/20" },
            { name: "Rare Coins", count: "800 items", color: "from-yellow-500/20" },
            { name: "Video Games", count: "2,100 items", color: "from-red-500/20" },
          ].map((cat, i) => (
            <Card key={i} className="bg-white/5 border-white/10 hover:border-blue-500/50 transition-all duration-300 group cursor-pointer overflow-hidden">
              <div className={`h-40 bg-gradient-to-br ${cat.color} to-transparent group-hover:scale-110 transition-transform duration-500`}></div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">{cat.name}</h3>
                <p className="text-gray-400 text-sm">{cat.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white/5 border-y border-white/5 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The Barter Process</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Trading on Tradebilia is designed to be seamless, secure, and rewarding.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: "List & Showcase", desc: "Upload high-res photos and detailed specs of your collectibles.", icon: "01" },
              { title: "Propose a Trade", desc: "Find items you want and offer your own in exchange.", icon: "02" },
              { title: "Secure Handshake", desc: "Finalize details and ship with our protected tracking system.", icon: "03" },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="text-8xl font-black text-white/5 absolute -top-10 -left-4 group-hover:text-blue-500/10 transition-colors">{step.icon}</div>
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold mb-3">{step.title}</h4>
                  <p className="text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-blue-600/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">Ready to complete your collection?</h2>
          <p className="text-xl text-white/80 mb-10 relative z-10">Join thousands of collectors today and start trading the items you love.</p>
          <Button size="lg" className="rounded-full px-12 py-8 text-xl bg-white text-blue-600 hover:bg-gray-100 shadow-xl relative z-10">
            Create Your Account
          </Button>
        </div>
      </section>
      
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>&copy; 2026 Tradebilia. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomepageLayoutMockupsV2;
