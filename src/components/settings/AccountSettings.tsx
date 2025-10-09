import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AccountSettings = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
      setProfileLoaded(true);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      setProfileLoaded(true);
    }
  };

  const handleNameUpdate = async () => {
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log('Updating name for user:', user.id, 'to:', fullName.trim());

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          full_name: fullName.trim(),
          onboarding_completed: true 
        }, { 
          onConflict: 'user_id' 
        })
        .select();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Update successful:', data);
      toast.success("Name updated successfully");
      
      // Reload to verify
      setTimeout(() => loadUserProfile(), 500);
    } catch (error: any) {
      console.error('Name update error:', error);
      toast.error(error.message || "Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success("Email update initiated. Check your inbox for confirmation.");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Delete user data first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete compounds and doses
      await supabase.from('compounds').delete().eq('user_id', user.id);
      await supabase.from('doses').delete().eq('user_id', user.id);
      
      toast.success("Account deleted successfully");
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Account</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Name Section */}
        <div className="space-y-4 p-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Full Name</h2>
              <p className="text-sm text-muted-foreground">Update your display name</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium">Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={profileLoaded ? "Enter your name" : "Loading..."}
                className="mt-1.5"
                disabled={!profileLoaded}
              />
            </div>
            <Button onClick={handleNameUpdate} disabled={loading || !fullName.trim()} className="w-full">
              {loading ? "Updating..." : "Update Name"}
            </Button>
          </div>
        </div>

        {/* Email Section */}
        <div className="space-y-4 p-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Email Address</h2>
              <p className="text-sm text-muted-foreground">Update your email for account access</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">New Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleEmailUpdate} disabled={loading || !email} className="w-full">
              {loading ? "Updating..." : "Update Email"}
            </Button>
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4 p-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
              <Lock className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Password</h2>
              <p className="text-sm text-muted-foreground">Change your account password</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1.5"
              />
            </div>
            <Button onClick={handlePasswordUpdate} disabled={loading || !newPassword} className="w-full">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </div>

        {/* Delete Account Section - Moved to bottom with less emphasis */}
        <div className="mt-12 pt-6 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
