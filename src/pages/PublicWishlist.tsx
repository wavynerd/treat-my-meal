import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift, Loader2 } from "lucide-react";
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
}

export default function PublicWishlist() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (userId) {
      fetchPublicWishlist(userId);
    }
  }, [userId]);

  const fetchPublicWishlist = async (userId: string) => {
    try {
      setLoading(true);

      // Fetch profile
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
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.profile_image_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{profile.full_name || "Anonymous"}'s Wishlist</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Gift className="h-4 w-4" />
                {foodItems.length} {foodItems.length === 1 ? "item" : "items"} on the list
              </CardDescription>
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
