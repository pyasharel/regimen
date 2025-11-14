import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Trash2, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { getSignedUrl } from "@/utils/storageUtils";

export const AccountSettings = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user signed in with Google
      const provider = user.app_metadata?.provider || user.user_metadata?.provider;
      setIsGoogleUser(provider === 'google');
      setEmail(user.email || '');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
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

  const handlePasswordReset = async () => {
    setSendingReset(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("No email found for this account");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;
      
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (store the path, not the signed URL)
      const avatarPath = fileName;

      // Update profile with the file path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarPath })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Generate signed URL for display
      const signedUrl = await getSignedUrl('avatars', avatarPath);
      setAvatarUrl(signedUrl || avatarPath);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Call edge function to delete account (requires service role key)
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      toast.success("Account deleted successfully");
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4 safe-top">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Account</h1>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Profile Picture Section */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Profile Picture</h2>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg">
                {fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  asChild
                >
                  <span>{uploadingAvatar ? "Uploading..." : "Change Picture"}</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                {isGoogleUser ? "Using your Google profile picture" : "JPG, PNG or GIF. Max 2MB."}
              </p>
            </div>
          </div>
        </div>

        {/* Name Section - Compact */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Full Name</h2>
          </div>
          <div className="flex gap-2">
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={profileLoaded ? "Enter your name" : "Loading..."}
              disabled={!profileLoaded}
              className="flex-1"
            />
            <Button onClick={handleNameUpdate} disabled={loading || !fullName.trim()} size="sm" className="whitespace-nowrap">
              {loading ? "..." : "Update"}
            </Button>
          </div>
        </div>

        {/* Email Section - Compact */}
        <div className="space-y-3 p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Email Address</h2>
          </div>
          {isGoogleUser ? (
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="flex-1 bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your email is managed by Google and cannot be changed here. Update it in your Google Account settings.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1"
              />
              <Button onClick={handleEmailUpdate} disabled={loading || !email} size="sm" className="whitespace-nowrap">
                {loading ? "..." : "Update"}
              </Button>
            </div>
          )}
        </div>

        {/* Password Section - Only show for non-Google users */}
        {!isGoogleUser && (
          <div className="space-y-3 p-4 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-secondary" />
              <h2 className="text-sm font-semibold">Password</h2>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                For security, we'll send you an email with a link to reset your password.
              </p>
              <Button 
                onClick={handlePasswordReset} 
                disabled={sendingReset} 
                size="sm" 
                variant="outline"
                className="w-full"
              >
                {sendingReset ? "Sending..." : "Send Password Reset Email"}
              </Button>
            </div>
          </div>
        )}

        {/* Delete Account Section - Red and subtle */}
        <div className="mt-8 pt-6 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
