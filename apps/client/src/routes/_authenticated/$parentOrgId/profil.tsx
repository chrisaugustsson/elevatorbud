import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useUser } from "@elevatorbud/auth";
import { useTheme } from "@elevatorbud/ui/hooks/use-theme";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@elevatorbud/ui/components/ui/avatar";
import { Moon, Sun, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$parentOrgId/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-muted-foreground">
          Hantera ditt konto och dina inställningar.
        </p>
      </div>

      <Separator />

      <ProfileInfoCard />
      <ThemeCard theme={theme} setTheme={setTheme} />
      <PasswordCard />
    </div>
  );
}

function ProfileInfoCard() {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const hasChanges =
    firstName !== (user.firstName ?? "") ||
    lastName !== (user.lastName ?? "");

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await user.update({ firstName, lastName });
      toast.success("Profilen har uppdaterats.");
    } catch {
      toast.error("Kunde inte uppdatera profilen.");
    } finally {
      setSaving(false);
    }
  }

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personlig information</CardTitle>
        <CardDescription>
          Uppdatera ditt namn och din profilbild.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Förnamn</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Efternamn</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving && <Loader2 className="animate-spin" />}
            Spara ändringar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ThemeCard({
  theme,
  setTheme,
}: {
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Utseende</CardTitle>
        <CardDescription>Välj mellan ljust och mörkt tema.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
              theme === "light"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Sun className="size-6" />
            <span className="text-sm font-medium">Ljust</span>
            {theme === "light" && (
              <Check className="absolute top-2 right-2 size-4 text-primary" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
              theme === "dark"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Moon className="size-6" />
            <span className="text-sm font-medium">Mörkt</span>
            {theme === "dark" && (
              <Check className="absolute top-2 right-2 size-4 text-primary" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  async function handleChangePassword() {
    if (!user || !canSubmit) return;
    setError("");
    setSaving(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Lösenordet har ändrats.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kunde inte ändra lösenordet.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Byt lösenord</CardTitle>
        <CardDescription>
          Lösenordet måste vara minst 8 tecken.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nytt lösenord</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Bekräfta nytt lösenord</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive">
              Lösenorden matchar inte.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={handleChangePassword} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="animate-spin" />}
            Byt lösenord
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
