import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  currency: string;
  onSuccess: () => void;
}

export const WithdrawalDialog = ({
  open,
  onOpenChange,
  walletBalance,
  currency,
  onSuccess,
}: WithdrawalDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDetails, setPaymentDetails] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
    routing_number: "",
  });

  const getCurrencySymbol = (curr: string) => {
    switch (curr?.toUpperCase()) {
      case 'NGN': return '₦';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawalAmount = parseFloat(amount);
    
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (withdrawalAmount > walletBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!paymentDetails.bank_name || !paymentDetails.account_number || !paymentDetails.account_name) {
      toast.error("Please fill in all bank details");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          currency: currency,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
        });

      if (error) throw error;

      toast.success("Withdrawal request submitted successfully!");
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setAmount("");
      setPaymentDetails({
        bank_name: "",
        account_number: "",
        account_name: "",
        routing_number: "",
      });
    } catch (error: any) {
      console.error("Error submitting withdrawal:", error);
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Request Withdrawal
          </DialogTitle>
          <DialogDescription>
            Available balance: {getCurrencySymbol(currency)}{walletBalance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Withdraw</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getCurrencySymbol(currency)}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={walletBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Bank Details</Label>
            <Input
              placeholder="Bank Name"
              value={paymentDetails.bank_name}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })}
              required
            />
            <Input
              placeholder="Account Name"
              value={paymentDetails.account_name}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, account_name: e.target.value })}
              required
            />
            <Input
              placeholder="Account Number"
              value={paymentDetails.account_number}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
              required
            />
            <Input
              placeholder="Routing/Sort Code (optional)"
              value={paymentDetails.routing_number}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, routing_number: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="flex-1 bg-gradient-hero hover:opacity-90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
