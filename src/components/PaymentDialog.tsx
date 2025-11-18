import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Gift } from "lucide-react";

interface FoodItem {
  id: string;
  name: string;
  price: number;
  currency: string | null;
}

interface PaymentDialogProps {
  item: FoodItem;
  recipientName: string;
  onClose: () => void;
}

export default function PaymentDialog({ item, recipientName, onClose }: PaymentDialogProps) {
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [loading, setLoading] = useState(false);

  const serviceFeePercent = 5;
  const serviceFee = item.price * (serviceFeePercent / 100);
  const totalAmount = item.price + serviceFee;

  const getCurrencySymbol = (currency: string | null) => {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
    };
    return symbols[currency || "USD"] || currency || "$";
  };

  const handlePayment = async () => {
    if (!buyerEmail) {
      toast.error("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("paystack-payment", {
        body: {
          action: "initialize",
          foodItemId: item.id,
          buyerEmail,
          buyerNote,
        },
      });

      if (error) throw error;

      if (data?.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        throw new Error("Payment initialization failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to initialize payment");
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Buy {item.name}
          </DialogTitle>
          <DialogDescription>
            You're about to buy this gift for {recipientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Breakdown */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Item Price</span>
              <span className="font-medium">
                {getCurrencySymbol(item.currency)}
                {item.price.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Service Fee ({serviceFeePercent}%)</span>
              <span>
                {getCurrencySymbol(item.currency)}
                {serviceFee.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">
                {getCurrencySymbol(item.currency)}
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Buyer Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Your Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              You'll receive a confirmation at this email
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Add a Message (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Write a sweet message for the recipient..."
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handlePayment} className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {getCurrencySymbol(item.currency)}
                  {totalAmount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
