import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopBar } from "@/components/TopBar";
import { CategoryBar } from "@/components/CategoryBar";
import { Mail } from "lucide-react";

const CONTACT_HERO_URL = "/images/Contact_Us_8b246a6c.svg";

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
      
      toast.success("Message prepared! Please send to: admin@tradebilia.com");
      
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
      <TopBar />

      {/* Hero Section */}
      <section className="relative z-0 w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden bg-[#00143A] text-white border-b border-white/10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url(/images/Mainpage_9b45311d.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }} />
        <div className="container relative flex h-64 items-center justify-center py-0 sm:h-72 sm:py-0 lg:h-80 lg:py-0">
          <div className="flex w-full max-w-6xl items-center justify-center -ml-32">
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
