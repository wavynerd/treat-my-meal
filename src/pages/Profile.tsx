import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle } from "lucide-react";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [profile, setProfile] = useState({
    full_name: "",
    country: "",
    currency: "USD",
    bio: "",
    username: "",
    profile_image_url: "",
    wallet_balance: 0,
    social_links: {
      twitter: "",
      instagram: "",
      facebook: "",
      website: "",
    },
  });

  useEffect(() => {
    fetchProfile();
    fetchWithdrawalRequests();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      const socialLinks = data.social_links as any || {};
      setProfile({
        full_name: data.full_name || "",
        country: data.country || "",
        currency: data.currency || "USD",
        bio: data.bio || "",
        username: data.username || "",
        profile_image_url: data.profile_image_url || "",
        wallet_balance: Number(data.wallet_balance) || 0,
        social_links: {
          twitter: socialLinks.twitter || "",
          instagram: socialLinks.instagram || "",
          facebook: socialLinks.facebook || "",
          website: socialLinks.website || "",
        },
      });
    }
  };

  const fetchWithdrawalRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("id, amount, currency, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setWithdrawalRequests(data);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency?.toUpperCase()) {
      case 'NGN': return '₦';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <Badge className="bg-accent text-accent-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('food-images')
        .getPublicUrl(filePath);

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_image_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image_url: publicUrl });
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error("Failed to upload image");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        country: profile.country,
        currency: profile.currency,
        bio: profile.bio,
        username: profile.username,
        social_links: profile.social_links,
      })
      .eq("id", user.id);

    setIsLoading(false);

    if (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } else {
      toast.success("Profile updated successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Wallet Balance Card */}
        <Card className="mb-6 bg-gradient-hero">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm opacity-90">Wallet Balance</p>
                <p className="text-3xl font-bold">{getCurrencySymbol(profile.currency)}{profile.wallet_balance.toFixed(2)}</p>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => setShowWithdrawalDialog(true)}
                disabled={profile.wallet_balance <= 0}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Withdrawal Requests */}
        {withdrawalRequests.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {withdrawalRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">
                        {getCurrencySymbol(request.currency)}{request.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Customize your public profile and account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.profile_image_url} />
                    <AvatarFallback>
                      {profile.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profile-image')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="your-username"
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Your public wishlist URL: {window.location.origin}/@{profile.username || "username"}
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell people a bit about yourself..."
                  rows={4}
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  placeholder="e.g., United States"
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Preferred Currency</Label>
                <Select 
                  value={profile.currency} 
                  onValueChange={(value) => setProfile({ ...profile, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <Label>Social Links</Label>
                <div className="space-y-3">
                  <Input
                    placeholder="Twitter username (without @)"
                    value={profile.social_links.twitter}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      social_links: { ...profile.social_links, twitter: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Instagram username (without @)"
                    value={profile.social_links.instagram}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      social_links: { ...profile.social_links, instagram: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Facebook profile URL"
                    value={profile.social_links.facebook}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      social_links: { ...profile.social_links, facebook: e.target.value }
                    })}
                  />
                  <Input
                    placeholder="Personal website URL"
                    value={profile.social_links.website}
                    onChange={(e) => setProfile({ 
                      ...profile, 
                      social_links: { ...profile.social_links, website: e.target.value }
                    })}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-hero hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        walletBalance={profile.wallet_balance}
        currency={profile.currency}
        onSuccess={() => {
          fetchProfile();
          fetchWithdrawalRequests();
        }}
      />
    </div>
  );
};

export default Profile;
