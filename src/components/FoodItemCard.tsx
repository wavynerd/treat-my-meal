import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
}

interface FoodItemCardProps {
  item: FoodItem;
  onDeleted: (itemId: string) => void;
}

export const FoodItemCard = ({ item, onDeleted }: FoodItemCardProps) => {
  const handleDelete = async () => {
    const { error } = await supabase
      .from("food_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to delete item");
      console.error(error);
    } else {
      toast.success("Item deleted successfully");
      onDeleted(item.id);
      
      // Delete image from storage if exists
      if (item.image_url) {
        const path = item.image_url.split('/').pop();
        if (path) {
          await supabase.storage.from("food-images").remove([path]);
        }
      }
    }
  };

  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  return (
    <Card className="overflow-hidden shadow-soft hover:shadow-medium transition-all">
      <div className="relative h-48 bg-muted overflow-hidden">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-card">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
      </div>
      
      <CardContent className="pt-4">
        <h3 className="text-xl font-bold mb-2">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="text-2xl font-bold text-primary">
          {currencySymbols[item.currency] || item.currency} {item.price.toFixed(2)}
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="flex-1">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete "{item.name}" from your list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};
