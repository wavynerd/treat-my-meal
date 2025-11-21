import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, Twitter, Instagram, Facebook, Globe } from "lucide-react";
import { toast } from "sonner";
import PaymentDialog from "@/components/PaymentDialog";

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string | null;
  image_url: string | null;
  fulfilled: boolean;
  fulfilled_at: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  profile_image_url: string | null;
  currency: string | null;
  bio: string | null;
  username: string | null;
  social_links: any;
}

export default function PublicWishlist() {
  const { userId, username } = useParams<{ userId?: string; username?: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (username) {
      fetchPublicWishlistByUsername(username);
    } else if (userId) {
      fetchPublicWishlistById(userId);
    }
  }, [userId, username]);

  const fetchPublicWishlistByUsername = async (username: string) => {
    try {
      setLoading(true);

      // Fetch profile by username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch food items
      const { data: itemsData, error: itemsError } = await supabase
        .from("food_items")
        .select("*")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;
      setFoodItems(itemsData || []);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicWishlistById = async (userId: string) => {
    try {
      setLoading(true);

      // Fetch profile by ID
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch food items
      const { data: itemsData, error: itemsError } = await supabase
        .from("food_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;
      setFoodItems(itemsData || []);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string | null) => {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
    };
    return symbols[currency || "USD"] || currency || "$";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Wishlist Not Found</CardTitle>
            <CardDescription>This wishlist doesn't exist or has been removed.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_image_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl">{profile.full_name || "Anonymous"}'s Wishlist</CardTitle>
                  {profile.username && (
                    <Badge variant="outline">@{profile.username}</Badge>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-muted-foreground mb-3">{profile.bio}</p>
                )}
                <CardDescription className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  {foodItems.length} {foodItems.length === 1 ? "item" : "items"} on the list
                </CardDescription>
                {/* Social Links */}
                {profile.social_links && (
                  <div className="flex gap-3 mt-4">
                    {profile.social_links.twitter && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://twitter.com/${profile.social_links.twitter}`} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {profile.social_links.instagram && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://instagram.com/${profile.social_links.instagram}`} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {profile.social_links.facebook && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {profile.social_links.website && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Food Items Grid */}
        {foodItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">This wishlist is empty.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foodItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow relative">
                {item.fulfilled && (
                  <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    ✓ Already Purchased
                  </div>
                )}
                {item.image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  {item.description && (
                    <CardDescription>{item.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-2xl font-bold text-primary">
                    {getCurrencySymbol(item.currency)}
                    {item.price.toFixed(2)}
                  </p>
                  <Button
                    onClick={() => setSelectedItem(item)}
                    className="w-full"
                    disabled={item.fulfilled}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    {item.fulfilled ? "Already Purchased" : "Buy This Gift"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <PaymentDialog
          item={selectedItem}
          recipientName={profile.full_name || "Anonymous"}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
