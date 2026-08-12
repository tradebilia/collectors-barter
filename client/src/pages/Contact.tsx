import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { Mail, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const CONTACT_HERO_URL = "/manus-storage/Contact_Us_10be55f2.svg";

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("suggestion");
  const [subjectText, setSubjectText] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const submitTicketMutation = trpc.admin.submitTicket.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setTicketId(data.ticketId);
    },
    onError: (e) => {
      toast.error("Failed to submit: " + e.message);
    },
  });

  const categoryMap: Record<string, "general" | "listing" | "trade" | "account" | "billing" | "bug" | "other"> = {
    suggestion: "general",
    question: "general",
    feedback: "general",
    bug: "bug",
    other: "other",
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nameVal = user ? ((user as any).displayName || (user as any).username || name) : name;
    const emailVal = user ? ((user as any).email || email) : email;

    if (!nameVal.trim() || !emailVal.trim() || !subjectText.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    submitTicketMutation.mutate({
      name: nameVal,
      email: emailVal,
      subject: subjectText,
      message,
      category: categoryMap[category] ?? "general",
      priority: category === "bug" ? "high" : "medium",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,132,255,0.16),transparent_28%),linear-gradient(180deg,#050814_0%,#0b1220_35%,#101827_100%)] text-white">
      <TopBar />

      {/* Hero Section */}
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white border-b border-white/10">
        <div className="absolute inset-0" style={{
          backgroundImage: "url(/manus-storage/Background_23084d14.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-4xl items-center justify-center -ml-32">
            <img
              src={CONTACT_HERO_URL}
              alt="Contact Us"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <CategoryBar />

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
              {submitted ? (
                <div className="flex flex-col items-center py-8 text-center space-y-4">
                  <CheckCircle className="h-14 w-14 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Message Received!</h3>
                  <p className="text-white/70 text-sm">
                    Your support ticket <strong className="text-white">{ticketId}</strong> has been submitted. We typically respond within 24–48 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 border-white/20 text-white hover:bg-white/10"
                    onClick={() => { setSubmitted(false); setSubjectText(""); setMessage(""); setName(""); setEmail(""); setCategory("suggestion"); }}
                  >
                    Submit Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {!user && (
                    <>
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
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-white">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
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
                    <Label htmlFor="subject" className="text-white">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief summary of your message"
                      value={subjectText}
                      onChange={(e) => setSubjectText(e.target.value)}
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                    />
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
                    disabled={submitTicketMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {submitTicketMutation.isPending ? "Submitting..." : "Send Message"}
                  </Button>
                </form>
              )}
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
                  href="mailto:admin@tradebilia.com"
                  className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                >
                  admin@tradebilia.com
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
