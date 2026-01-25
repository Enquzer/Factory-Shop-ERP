"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle2, XCircle, Info, ExternalLink, Building2, Search, Link2, RefreshCw } from "lucide-react";
import { Shop } from "@/lib/shops";

export default function TelegramSettingsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [detectedGroups, setDetectedGroups] = useState<{ id: string; title: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username: string; first_name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchShops();
    fetchBotInfo();
    const interval = setInterval(fetchDetectedGroups, 5000); // Poll every 5 seconds for new groups
    fetchDetectedGroups();
    return () => clearInterval(interval);
  }, []);

  const handleSyncGroups = async () => {
    setIsSyncing(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch("/api/telegram/sync", {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Found ${data.updatesFound} updates. ${data.newGroupsDetected} new groups added to your list.`,
        });
        fetchDetectedGroups();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with Telegram",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchDetectedGroups = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch("/api/telegram/detected-groups", {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDetectedGroups(data.groups);
        }
      }
    } catch (error) {
      console.error("Error fetching detected groups:", error);
    }
  };

  const fetchBotInfo = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch("/api/telegram/bot-info", {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBotInfo(data.bot);
        }
      }
    } catch (error) {
      console.error("Error fetching bot info:", error);
    }
  };

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch("/api/shops?limit=100", {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      }); // Fetch more shops at once for settings
      if (!response.ok) throw new Error("Failed to fetch shops");
      const data = await response.json();
      
      // Handle both paginated object and array responses
      if (data && typeof data === 'object' && 'shops' in data) {
        setShops(data.shops);
      } else if (Array.isArray(data)) {
        setShops(data);
      } else {
        setShops([]);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        title: "Error",
        description: "Failed to load shops. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateChannelId = async (shopId: string, channelId: string) => {
    setIsSaving(shopId);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/shops?id=${shopId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({ telegram_channel_id: channelId || null }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Unauthorized: Please login again.");
        throw new Error("Failed to update channel ID");
      }

      toast({
        title: "Success",
        description: "Telegram channel ID updated successfully.",
      });

      // Update local state (force refresh shops)
      await fetchShops();
    } catch (error: any) {
      console.error("Error updating channel ID:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update channel ID.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleTestChannel = async (channelId: string, shopName: string) => {
    if (!channelId) {
      toast({
        title: "Warning",
        description: "Please enter a channel ID first.",
      });
      return;
    }

    setIsTesting(channelId);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({ channelId, shopName }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test Successful",
          description: `Test message sent to ${shopName} channel. Verified by ID: ${result.messageId}`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Failed to send test message.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing channel:", error);
      toast({
        title: "Error",
        description: "An error occurred during testing.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Telegram Notifications</h1>
        <p className="text-muted-foreground">
          Manage shop-specific Telegram channels for automated order reports and alerts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                How to link a shop
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 space-y-3">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center shrink-0 font-bold">1</div>
                <p>Create a Telegram group or channel for the shop.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center shrink-0 font-bold">2</div>
                <p>Add <strong>@{botInfo?.username || "the bot"}</strong> to that group as an <strong>Administrator</strong>.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center shrink-0 font-bold">3</div>
                <p>The group will automatically appear in the <strong>"Auto-Detected"</strong> list on the right.</p>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center shrink-0 font-bold">4</div>
                <p>Simply click <strong>"Link to Shop"</strong> to connect it instantly. No more manual IDs!</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Shop Connections
            </h2>
            {shops.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No shops found. Register a shop first to configure notifications.
                </CardContent>
              </Card>
            ) : (
              shops.map((shop) => (
                <Card key={shop.id} className="overflow-hidden">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{shop.name}</h3>
                        <Badge variant={shop.status === "Active" ? "default" : "secondary"}>
                          {shop.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">@{shop.username}</p>
                    </div>

                    <div className="flex-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="ID starts with -100..."
                          defaultValue={shop.telegram_channel_id || ""}
                          className="font-mono text-sm h-9"
                          id={`channel-${shop.id}`}
                        />
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            const input = document.getElementById(`channel-${shop.id}`) as HTMLInputElement;
                            handleUpdateChannelId(shop.id, input.value);
                          }}
                          disabled={isSaving === shop.id}
                        >
                          {isSaving === shop.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end shrink-0 min-w-[100px]">
                        {shop.telegram_channel_id ? (
                          <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Connected
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                            <XCircle className="h-3 w-3" /> Disconnected
                          </span>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500 hover:text-primary"
                        disabled={!shop.telegram_channel_id || isTesting === shop.telegram_channel_id}
                        onClick={() => handleTestChannel(shop.telegram_channel_id || "", shop.name)}
                        title="Send Test Message"
                      >
                        {isTesting === shop.telegram_channel_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className={botInfo ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
            <CardHeader className="pb-2">
              <CardTitle className={botInfo ? "text-green-800 flex items-center gap-2 text-base" : "text-amber-800 flex items-center gap-2 text-base"}>
                <CheckCircle2 className="h-5 w-5" />
                Live Bot Status
              </CardTitle>
            </CardHeader>
            <CardContent className={botInfo ? "text-sm text-green-700 space-y-2" : "text-sm text-amber-700 space-y-2"}>
              {botInfo ? (
                <>
                  <p><strong>Name:</strong> {botInfo.first_name}</p>
                  <p><strong>Username:</strong> <a href={`https://t.me/${botInfo.username}`} target="_blank" className="underline font-bold">@{botInfo.username}</a></p>
                  <div className="pt-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">ONLINE</Badge>
                  </div>
                </>
              ) : (
                <p>Bot not configured or offline. Check your <code>.env</code> file.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" /> Auto-Detected
                  </CardTitle>
                  <CardDescription className="text-xs">
                    New groups appear here.
                  </CardDescription>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-primary" 
                  onClick={handleSyncGroups}
                  disabled={isSyncing}
                  title="Manual Scan for Groups"
                >
                  <RefreshCw className={isSyncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-auto">
                {detectedGroups.length === 0 ? (
                  <div className="py-8 px-4 text-center text-muted-foreground text-sm">
                    No groups detected yet. Try adding the bot to a group.
                  </div>
                ) : (
                  detectedGroups.map((group) => (
                    <div key={group.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-sm leading-none">{group.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-1">{group.id}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase h-5 px-1">
                          {group.type}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <select 
                          className="text-xs border rounded px-2 h-7 flex-1 bg-white"
                          id={`select-shop-${group.id}`}
                        >
                          <option value="">Select Shop...</option>
                          {shops.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <Button 
                          size="sm" 
                          className="h-7 text-[10px] px-2"
                          onClick={() => {
                            const shopId = (document.getElementById(`select-shop-${group.id}`) as HTMLSelectElement).value;
                            if (!shopId) {
                              toast({ title: "Warning", description: "Select a shop first" });
                              return;
                            }
                            handleUpdateChannelId(shopId, group.id);
                          }}
                        >
                          <Link2 className="h-3 w-3 mr-1" /> Link
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-800 flex items-center gap-2 text-sm italic">
                <ExternalLink className="h-4 w-4" /> System Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-500 space-y-2">
              <p>Bot is listening for groups via Webhook.</p>
              <p><strong>Webhook URL:</strong> <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/webhook` : '...'}</code></p>
              <p className="text-amber-600 font-medium pt-1">
                Note: Webhooks require a public URL (ngrok, Heroku, etc.) to work.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
