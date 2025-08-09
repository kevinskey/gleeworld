import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Heart, HeartPulse, Megaphone, Bell, Mail, Users2, Link as LinkIcon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useNotifications } from "@/hooks/useNotifications";
import SendBucketOfLove from "@/components/buckets-of-love/SendBucketOfLove";
import { WellnessCheckins } from "@/components/chaplain/WellnessCheckins";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";

interface MemberDashboardV2Props {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

interface MemberProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const MemberDashboardV2 = ({ user }: MemberDashboardV2Props) => {
  // Announcements
  const { announcements, loading: annLoading } = useAnnouncements();

  // Notifications
  const { notifications: notifList = [] } = useNotifications();

  // Member directory preview (only members)
  const [members, setMembers] = useState<MemberProfileLite[]>([]);
  const [mLoading, setMLoading] = useState<boolean>(false);
  const [mError, setMError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      setMLoading(true);
      setMError(null);
      try {
        const { data, error } = await supabase
          .from("gw_profiles")
          .select("user_id, full_name, email, avatar_url, role, verified")
          .eq("role", "member")
          .eq("verified", true)
          .order("full_name", { ascending: true })
          .limit(24);
        if (error) throw error;
        const mapped: MemberProfileLite[] = (data || []).map((r: any) => ({
          id: r.user_id,
          full_name: r.full_name,
          email: r.email,
          avatar_url: r.avatar_url,
        }));
        setMembers(mapped);
      } catch (e: any) {
        setMError(e.message || "Failed to load members");
      } finally {
        setMLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // Load current user's avatar
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const { data, error } = await supabase
          .from("gw_profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .single();
        if (!error && data) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (e) {
        // Silent fail
      }
    };
    loadAvatar();
  }, [user.id]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const quickLinks = [
    { label: "Buckets of Love", icon: Heart, href: "/buckets" },
    { label: "Wellness", icon: HeartPulse, href: "/wellness" },
    { label: "Announcements", icon: Megaphone, href: "/announcements" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
    { label: "Directory", icon: Users2, href: "/directory" },
    { label: "Email", icon: Mail, href: "mailto:gleeclub@spelman.edu?subject=Glee%20Club%20Inquiry" },
  ];

  const firstName = user.full_name?.split(" ")[0] || "Member";

  return (
    <div className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Welcome + Community Hub */}
        <section aria-label="Member welcome" className="animate-fade-in">
          <Card className="relative overflow-hidden border bg-background/40">
            <div className="absolute inset-0">
              <img
                src="/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png"
                alt="Historic Spelman campus background"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background/70" />
            </div>
            <CardContent className="relative z-10 p-4 sm:p-6 md:p-8 h-[320px] md:h-[500px] flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                  <AvatarImage src={avatarUrl || undefined} alt={`${firstName} avatar`} />
                  <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome, {firstName}</h1>
                  <p className="text-sm text-muted-foreground">To Amaze and Inspire.</p>
                </div>
              </div>

              <div>
                <CommunityHubWidget />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Top grid with key modules */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Buckets of Love */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" /> Buckets of Love
              </CardTitle>
              <Badge variant="outline">Community</Badge>
            </CardHeader>
            <CardContent>
              <SendBucketOfLove />
            </CardContent>
          </Card>

          {/* Wellness */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" /> Wellness
              </CardTitle>
              <Badge variant="outline">Care</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">How are you feeling today?</div>
              <WellnessCheckins />
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" /> Quick Links
              </CardTitle>
              <Badge variant="outline">All members</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickLinks.map((q) => (
                <a key={q.label} href={q.href} target={q.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <Button variant="outline" className="w-full justify-start">
                    <q.icon className="mr-2 h-4 w-4" /> {q.label}
                    {q.href.startsWith("http") && <ExternalLink className="ml-auto h-3 w-3" />}
                  </Button>
                </a>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Divider for stacked collapsible modules */}
        <div className="flex items-center gap-3 pt-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">Modules</span>
          <Separator className="flex-1" />
        </div>

        <section>
          <Accordion type="multiple" className="w-full">
            {/* Announcements */}
            <AccordionItem value="announcements">
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Announcements</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {annLoading ? (
                      <div className="text-sm text-muted-foreground">Loading announcements…</div>
                    ) : announcements && announcements.length > 0 ? (
                      announcements.slice(0, 5).map((a) => (
                        <div key={(a as any).id} className="p-3 rounded-md border hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{(a as any).title}</h4>
                            {(a as any).is_published && <Badge className="text-xs" variant="secondary">Published</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{(a as any).content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No announcements yet.</div>
                    )}
                    <div className="pt-1"><Button variant="outline" asChild><a href="/announcements">View all</a></Button></div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Notifications */}
            <AccordionItem value="notifications">
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    {notifList && notifList.length > 0 ? (
                      notifList.slice(0, 8).map((n: any) => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-md border hover:bg-accent/50 transition-colors">
                          <Badge variant={n.is_read ? "outline" : "default"} className="mt-0.5 text-xs">
                            {n.type || "Notice"}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm">{n.title || n.message || "Notification"}</p>
                            {n.created_at && (
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">You're all caught up.</div>
                    )}
                    <div className="pt-1"><Button variant="outline" asChild><a href="/notifications">Open Notification Center</a></Button></div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Email */}
            <AccordionItem value="email">
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm text-muted-foreground">Compose an email with your default mail app.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <a href={`mailto:gleeclub@spelman.edu?subject=Glee%20Club%20Inquiry&body=Hello%20Team,`}>Email Glee Club</a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={`mailto:${user.email}?subject=Note%20to%20Self`}>Email Myself</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Directory (members only) */}
            <AccordionItem value="directory">
              <AccordionTrigger className="text-base">
                <div className="flex items-center gap-2"><Users2 className="h-4 w-4 text-primary" /> Member Directory</div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        placeholder="Search members"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="max-w-sm"
                        aria-label="Search members"
                      />
                      <Badge variant="outline">{filteredMembers.length} shown</Badge>
                    </div>

                    {mLoading ? (
                      <div className="text-sm text-muted-foreground">Loading members…</div>
                    ) : mError ? (
                      <div className="text-sm text-destructive">{mError}</div>
                    ) : filteredMembers.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No members found.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredMembers.map((m) => (
                          <div key={m.id} className="p-3 rounded-md border hover:bg-accent/50 transition-colors flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.avatar_url || undefined} alt={m.full_name || "Member avatar"} />
                              <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.full_name || "Member"}</p>
                              {/* Email intentionally hidden per privacy preference */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1">
                      <Button variant="outline" asChild>
                        <a href="/directory">Open Full Directory</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
};
