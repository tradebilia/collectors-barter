import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopRightIcons } from "@/components/TopRightIcons";
import { Search, Mail } from "lucide-react";

const TRADEBILIA_LOGO_URL = "/images/tradebilia-logo.svg";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create mailto link content
      const mailtoSubject = `Tradebilia ${subject === "suggestion" ? "Suggestion" : subject === "question" ? "Question" : "Feedback"}: ${name}`;
      const mailtoBody = `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`;

      // For now, we'll just show a success message and copy to clipboard
      // In a real app, you'd send this to a backend endpoint
      const fullMessage = `${mailtoSubject}\n\n${mailtoBody}`;
      
      // Copy to clipboard for user to send
      await navigator.clipboard.writeText(fullMessage);
      
      toast.success("Message prepared! Please send to: rich@tradebilia.com");
      
      // Reset form
      setName("");
      setEmail("");
      setSubject("suggestion");
      setMessage("");
    } catch (error) {
      toast.error("Failed to prepare message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,132,255,0.16),transparent_28%),linear-gradient(180deg,#050814_0%,#0b1220_35%,#101827_100%)] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <Link href="/" className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
            Home
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="font-['Oswald'] text-[2.15rem] font-semibold leading-none tracking-[-0.05em] text-white sm:text-[2.45rem]">Contact</span>
            <div className="relative hidden min-w-[260px] sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input className="h-9 rounded-sm border-0 bg-white pl-10 pr-3 text-sm text-slate-950" placeholder="Search..." />
            </div>
          </div>
          <TopRightIcons className="ml-auto flex items-center gap-3 md:gap-4" iconColor="text-white/85" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Form */}
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Send us a Message</CardTitle>
              <CardDescription>Share your suggestions, questions, or feedback about Tradebilia</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-white">Subject *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="border-white/20 bg-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/20 bg-slate-950">
                      <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                      <SelectItem value="question">❓ Question</SelectItem>
                      <SelectItem value="feedback">💭 Feedback</SelectItem>
                      <SelectItem value="bug">🐛 Bug Report</SelectItem>
                      <SelectItem value="other">📝 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-white">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what's on your mind..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSubmitting ? "Preparing..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Direct Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/80">
                  You can also reach us directly at:
                </p>
                <a
                  href="mailto:rich@tradebilia.com"
                  className="inline-block px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium transition"
                >
                  rich@tradebilia.com
                </a>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">What We'd Love to Hear</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/80">
                <div>
                  <p className="font-semibold text-white mb-1">💡 Suggestions</p>
                  <p>Help us improve Tradebilia with your ideas and feature requests</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">❓ Questions</p>
                  <p>Ask anything about how to use Tradebilia or our trading platform</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">💭 Feedback</p>
                  <p>Share your experience and let us know what's working well</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">🐛 Bug Reports</p>
                  <p>Found an issue? Let us know so we can fix it</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  We typically respond to all messages within 24-48 hours. Thank you for helping us build a better collector community!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
