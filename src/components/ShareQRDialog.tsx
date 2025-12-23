import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Twitter, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ShareQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  username: string;
}

export const ShareQRDialog = ({ open, onOpenChange, shareUrl, username }: ShareQRDialogProps) => {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `lunchbuddy-${username || "wishlist"}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareText = `Check out my wishlist on LunchBuddy! 🎁`;

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share Your Wishlist</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="p-4 bg-white rounded-xl shadow-sm">
            <QRCodeSVG
              id="qr-code"
              value={shareUrl}
              size={200}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Scan this QR code to view the wishlist
          </p>
          <div className="w-full p-3 bg-muted rounded-lg">
            <p className="text-sm font-mono truncate text-center">{shareUrl}</p>
          </div>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button className="flex-1 bg-gradient-hero hover:opacity-90" onClick={handleDownloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
          </div>

          {/* Social Share Buttons */}
          <div className="w-full pt-2 border-t">
            <p className="text-sm text-muted-foreground text-center mb-3">Share on social media</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={handleTwitterShare}
                className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
                title="Share on Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFacebookShare}
                className="hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]"
                title="Share on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleWhatsAppShare}
                className="hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
