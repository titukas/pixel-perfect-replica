import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Loader2, QrCode, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/household";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InvitationData = { token: string; expires_at: string };

export function InvitePartnerButton({
  householdId,
  onPaired,
}: {
  householdId: string;
  onPaired?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="royal" className="w-full" onClick={() => setOpen(true)}>
        <UserPlus /> Connect with your partner
      </Button>
      <InvitePartnerDialog
        open={open}
        onOpenChange={setOpen}
        householdId={householdId}
        onPaired={onPaired}
      />
    </>
  );
}

export function InvitePartnerDialog({
  open,
  onOpenChange,
  householdId,
  onPaired,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  householdId: string;
  onPaired?: () => void;
}) {
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const { data, error } = await supabase.rpc("create_invitation");
    setLoading(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setInvitation(data as unknown as InvitationData);
    setCopied(false);
  }

  function reset() {
    setInvitation(null);
    setCopied(false);
  }

  const inviteUrl = invitation
    ? `${window.location.origin}/accept?code=${invitation.token}`
    : "";

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — long-press the link to copy manually");
    }
  }

  async function share() {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Connect on Prince & Princess",
          text: "Let's share chores and rewards together!",
          url: inviteUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  const expiryStr = invitation
    ? new Date(invitation.expires_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Invite your partner</DialogTitle>
          <DialogDescription className="text-center">
            Share any of these three ways. The invitation expires in 30 minutes.
          </DialogDescription>
        </DialogHeader>

        {!invitation ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-center text-sm text-muted-foreground">
              Generate a unique invitation code your partner can use to join your household.
            </p>
            <Button variant="royal" size="lg" onClick={generate} disabled={loading}>
              {loading && <Loader2 className="animate-spin" />} Generate invitation
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qr"><QrCode className="size-4" /> QR</TabsTrigger>
              <TabsTrigger value="link"><Share2 className="size-4" /> Link</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>

            {/* QR Code */}
            <TabsContent value="qr" className="flex flex-col items-center gap-3 pt-4">
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <QRCodeCanvas
                  value={inviteUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Ask your partner to scan this code with their phone camera.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy link
                </Button>
                <Button variant="outline" size="sm" onClick={share}>
                  <Share2 className="size-4" /> Share
                </Button>
              </div>
            </TabsContent>

            {/* Shareable Link */}
            <TabsContent value="link" className="flex flex-col gap-3 pt-4">
              <Input readOnly value={inviteUrl} className="text-xs" onFocus={(e) => e.target.select()} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink} className="flex-1">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy link
                </Button>
                <Button variant="outline" size="sm" onClick={share} className="flex-1">
                  <Share2 className="size-4" /> Share
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Send this link to your partner via any messaging app.
              </p>
            </TabsContent>

            {/* Manual Code */}
            <TabsContent value="code" className="flex flex-col items-center gap-3 pt-4">
              <div className="rounded-2xl bg-card px-6 py-4 text-center shadow-card">
                <p className="text-xs text-muted-foreground">Your invitation code</p>
                <p className="mt-1 select-all font-mono text-2xl font-bold tracking-[0.2em] text-primary">
                  {invitation.token}
                </p>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Ask your partner to enter this code on the accept invitation page.
              </p>
              <Button variant="outline" size="sm" onClick={copyLink}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy link
              </Button>
            </TabsContent>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Expires at {expiryStr}</p>
              <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Regenerate"}
              </Button>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
