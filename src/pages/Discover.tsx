import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Users, Gift, UtensilsCrossed, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  profile_image_url: string | null;
  item_count?: number;
}

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string | null;
  image_url: string | null;
  user_id: string;
  profiles?: {
    username: string;
    full_name: string | null;
  };
}

export default function Discover() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredUsers, setFeaturedUsers] = useState<Profile[]>([]);
  const [trendingItems, setTrendingItems] = useState<FoodItem[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchFeaturedData();
  }, []);

  const fetchFeaturedData = async () => {
    try {
      setLoading(true);

      // Fetch profiles with their item counts - featured users are those with most items
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, profile_image_url")
        .not("username", "is", null)
        .limit(12);

      if (profilesError) throw profilesError;

      // Get item counts for each profile
      const profilesWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from("food_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);
          return { ...profile, item_count: count || 0 };
        })
      );

      // Sort by item count and filter those with at least 1 item
      const featured = profilesWithCounts
        .filter((p) => p.item_count > 0)
        .sort((a, b) => b.item_count - a.item_count)
        .slice(0, 6);

      setFeaturedUsers(featured);

      // Fetch trending items (most recent unfulfilled items)
      const { data: items, error: itemsError } = await supabase
        .from("food_items")
        .select("id, name, description, price, currency, image_url, user_id")
        .eq("fulfilled", false)
        .order("created_at", { ascending: false })
        .limit(9);

      if (itemsError) throw itemsError;

      // Fetch profiles for each item
      const itemsWithProfiles = await Promise.all(
        (items || []).map(async (item) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", item.user_id)
            .maybeSingle();
          return { ...item, profiles: profile };
        })
      );

      setTrendingItems(itemsWithProfiles);
    } catch (error) {
      console.error("Error fetching discover data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, profile_image_url")
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setSearching(false);
    }
  };

  const getCurrencySymbol = (currency: string | null) => {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
    };
    return symbols[currency || "USD"] || "$";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <UtensilsCrossed className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              LunchBuddy
            </h1>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Log In
            </Button>
            <Button onClick={() => navigate("/auth")} className="bg-gradient-hero hover:opacity-90">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl font-bold text-center mb-4">
            Discover <span className="bg-gradient-hero bg-clip-text text-transparent">Wishlists</span>
          </h2>
          <p className="text-center text-muted-foreground mb-6">
            Find users and gift them something delicious
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((profile) => (
                <Card
                  key={profile.id}
                  className="cursor-pointer hover:shadow-medium transition-all"
                  onClick={() => navigate(`/@${profile.username}`)}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={profile.profile_image_url || undefined} />
                      <AvatarFallback>
                        {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{profile.full_name || profile.username}</CardTitle>
                      <CardDescription>@{profile.username}</CardDescription>
                    </div>
                  </CardHeader>
                  {profile.bio && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tabs for Featured Users and Trending Items */}
        <Tabs defaultValue="featured" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Featured Users
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending Items
            </TabsTrigger>
          </TabsList>

          <TabsContent value="featured">
            {featuredUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No featured users yet. Be the first to create a wishlist!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredUsers.map((profile) => (
                  <Card
                    key={profile.id}
                    className="cursor-pointer hover:shadow-medium transition-all group"
                    onClick={() => navigate(`/@${profile.username}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                          <AvatarImage src={profile.profile_image_url || undefined} />
                          <AvatarFallback className="text-xl">
                            {profile.full_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{profile.full_name || profile.username}</CardTitle>
                          <CardDescription>@{profile.username}</CardDescription>
                          <Badge variant="secondary" className="mt-2">
                            <Gift className="h-3 w-3 mr-1" />
                            {profile.item_count} items
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {profile.bio && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending">
            {trendingItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No trending items yet. Be the first to add one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingItems.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden cursor-pointer hover:shadow-medium transition-all"
                    onClick={() => navigate(`/@${item.profiles?.username}`)}
                  >
                    {item.image_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      {item.description && (
                        <CardDescription className="line-clamp-2">{item.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-primary">
                          {getCurrencySymbol(item.currency)}
                          {item.price.toFixed(2)}
                        </p>
                        <Badge variant="outline">
                          by @{item.profiles?.username}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
