import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { UtensilsCrossed, Plus, Share2, LogOut, Settings, History } from "lucide-react";
import { FoodItemCard } from "@/components/FoodItemCard";
import { AddFoodItemDialog } from "@/components/AddFoodItemDialog";

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  fulfilled: boolean;
  fulfilled_at: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  // Real-time notifications for new gift purchases
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transaction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const transaction = payload.new;
          
          // Fetch food item details for the notification
          const { data: foodItem } = await supabase
            .from('food_items')
            .select('name')
            .eq('id', transaction.food_item_id)
            .single();

          const itemName = foodItem?.name || 'a gift';
          const currencySymbol = transaction.currency === 'USD' ? '$' : 
                                 transaction.currency === 'EUR' ? '€' : 
                                 transaction.currency === 'GBP' ? '£' : 
                                 transaction.currency === 'NGN' ? '₦' : '$';
          
          toast.success(
            `🎉 New Gift Received!`,
            {
              description: `${transaction.buyer_email} just bought you ${itemName} (${currencySymbol}${transaction.item_price})`,
              duration: 8000,
            }
          );

          // Refresh the food items list to show updated fulfilled status
          if (user) {
            fetchFoodItems(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    fetchFoodItems(session.user.id);
  };

  const fetchFoodItems = async (userId: string) => {
    setIsLoading(true);
    
    // Fetch profile data for wallet balance and username
    const { data: profileData } = await supabase
      .from("profiles")
      .select("wallet_balance, username")
      .eq("id", userId)
      .single();

    if (profileData) {
      setWalletBalance(Number(profileData.wallet_balance) || 0);
      setUsername(profileData.username || "");
    }

    // Fetch food items
    const { data, error } = await supabase
      .from("food_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load food items");
      console.error(error);
    } else {
      setFoodItems(data || []);
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleShare = async () => {
    if (!user) return;
    
    const shareUrl = username 
      ? `${window.location.origin}/@${username}`
      : `${window.location.origin}/wishlist/${user.id}`;
    const shareText = `Check out my food wishlist on LunchBuddy! 🍔`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My LunchBuddy Wishlist",
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error("Failed to copy link");
      }
    }
  };

  const handleItemAdded = () => {
    if (user) {
      fetchFoodItems(user.id);
    }
    setShowAddDialog(false);
  };

  const handleItemDeleted = (itemId: string) => {
    setFoodItems(foodItems.filter(item => item.id !== itemId));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                LunchBuddy
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => navigate("/transactions")}>
                <History className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate("/profile")}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, {user?.email?.split('@')[0] || 'Friend'}!
            </h2>
            <p className="text-muted-foreground">
              Manage your food wishlist and share it with others
            </p>
          </div>
          <Card className="bg-gradient-hero text-white border-0 min-w-[200px]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Wallet</p>
                  <p className="text-2xl font-bold">${walletBalance.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-hero hover:opacity-90"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Food Item
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-5 w-5 mr-2" />
            Share Your List
          </Button>
        </div>

        {/* Food Items Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : foodItems.length === 0 ? (
          <Card className="p-12 text-center">
            <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No food items yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your wishlist by adding your first food item!
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-hero hover:opacity-90">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Item
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foodItems.map((item) => (
              <FoodItemCard 
                key={item.id} 
                item={item} 
                onDeleted={handleItemDeleted}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Food Item Dialog */}
      <AddFoodItemDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onItemAdded={handleItemAdded}
      />
    </div>
  );
};

export default Dashboard;
