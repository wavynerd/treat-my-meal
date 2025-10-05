import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, Share2, DollarSign, Shield } from "lucide-react";
import heroImage from "@/assets/hero-food.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                Share Your
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Cravings</span>
                , Let Others Treat You
              </h2>
              <p className="text-xl text-muted-foreground">
                Create your personalized food wishlist and share it with friends, family, or generous strangers. 
                Turn your lunch dreams into reality!
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="bg-gradient-hero hover:opacity-90">
                  Create Your List
                </Button>
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-hero opacity-20 blur-3xl rounded-full"></div>
              <img 
                src={heroImage} 
                alt="Delicious food spread" 
                className="relative rounded-2xl shadow-strong w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold mb-4">
              How LunchBuddy Works
            </h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to start receiving delicious treats
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all">
              <div className="w-14 h-14 bg-gradient-hero rounded-xl flex items-center justify-center mb-6">
                <UtensilsCrossed className="h-7 w-7 text-primary-foreground" />
              </div>
              <h4 className="text-2xl font-bold mb-3">Create Your List</h4>
              <p className="text-muted-foreground">
                Add your favorite foods with photos, descriptions, and prices. Build your dream lunch menu in minutes.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all">
              <div className="w-14 h-14 bg-gradient-hero rounded-xl flex items-center justify-center mb-6">
                <Share2 className="h-7 w-7 text-primary-foreground" />
              </div>
              <h4 className="text-2xl font-bold mb-3">Share Your Link</h4>
              <p className="text-muted-foreground">
                Get a unique shareable link to your food wishlist. Share it on social media, messaging apps, or anywhere!
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all">
              <div className="w-14 h-14 bg-gradient-hero rounded-xl flex items-center justify-center mb-6">
                <DollarSign className="h-7 w-7 text-primary-foreground" />
              </div>
              <h4 className="text-2xl font-bold mb-3">Get Treated</h4>
              <p className="text-muted-foreground">
                Others can purchase items from your list. The money goes directly to you with secure payment processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-card rounded-3xl p-12 shadow-medium max-w-4xl mx-auto">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">Safe & Secure</h3>
                <p className="text-lg text-muted-foreground mb-4">
                  Your privacy and security are our top priorities. All payments are processed through secure, 
                  trusted payment gateways. We verify users and protect your personal information.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Transparent pricing:</strong> A small 5% service fee is added to purchases to keep LunchBuddy running.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold text-primary-foreground mb-6">
            Ready to Start Sharing?
          </h3>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of food lovers who are already treating each other to delicious meals.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6"
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <span className="font-bold">LunchBuddy</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 LunchBuddy. Making lunch dreams come true.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
