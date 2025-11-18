import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const reference = searchParams.get("reference");
  const provider = searchParams.get("provider") || "paystack";

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    } else {
      setStatus("failed");
    }
  }, [reference]);

  const verifyPayment = async (ref: string) => {
    try {
      const functionName = provider === "stripe" ? "stripe-payment" : "paystack-payment";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: "verify",
          reference: ref,
        },
      });

      if (error) throw error;

      if (data?.status === "completed") {
        setStatus("success");
      } else {
        setStatus("failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("failed");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === "success" ? (
            <>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Payment Successful!</CardTitle>
              <CardDescription>
                Thank you for your purchase. The recipient will be notified about your gift.
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Payment Failed</CardTitle>
              <CardDescription>
                Something went wrong with your payment. Please try again or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={() => navigate("/")} className="w-full">
            Go to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
