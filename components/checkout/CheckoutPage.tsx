// components/checkout/CheckoutPage.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Package,
  Store,
  Truck,
  ChevronRight,
  Check,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { UserProfile } from "@/types/types";
import { DELIVERY_LEAD_TIME, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING, TAX_RATE } from "@/constants";

interface CheckoutPageProps {
  userProfile: UserProfile | null;
}

export default function CheckoutPage({ userProfile }: CheckoutPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { items, itemCount, checkout } = useCart();
  const { formatPrice, getPrice, currency } = useCurrency();

  // Form state
  const [deliveryType, setDeliveryType] = useState<"delivery" | "inStore">("delivery");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Contact info
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Shipping address
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("RU");

  // Initialize form with user profile data
  useEffect(() => {
    if (userProfile) {
      if (userProfile.email) setEmail(userProfile.email);
      if (userProfile.displayName) setFullName(userProfile.displayName);

      if (userProfile.address) {
        if (userProfile.address.fullName) setFullName(userProfile.address.fullName);
        if (userProfile.address.phone) setPhone(userProfile.address.phone);
        if (userProfile.address.street) setStreet(userProfile.address.street);
        if (userProfile.address.city) setCity(userProfile.address.city);
        if (userProfile.address.state) setState(userProfile.address.state);
        if (userProfile.address.zipCode) setZipCode(userProfile.address.zipCode);
        // if (userProfile.address.country) setCountry(userProfile.address.country);
      }
    }
  }, [userProfile]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const price = getPrice(item.prices);
      return sum + price * item.quantity;
    }, 0);

    const tax = subtotal * TAX_RATE;
    const shipping =
      deliveryType === "delivery"
        ? subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : STANDARD_SHIPPING
        : 0;
    const total = subtotal + tax + shipping;

    return { subtotal, tax, shipping, total };
  }, [items, getPrice, deliveryType]);

  const handlePlaceOrder = async () => {
    // Validate form
    if (!email || !phone || !fullName) {
      toast.error("Please fill in all required contact fields");
      return;
    }

    if (deliveryType === "delivery" && (!street || !city || !state || !zipCode || !country)) {
      toast.error("Please fill in all required address fields");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to place an order");
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare checkout data
      const checkoutData = {
        deliveryType,
        email,
        phone,
        fullName,
        shippingAddress: deliveryType === "delivery" ? {
          street,
          city,
          state,
          zipCode,
          country,
        } : undefined,
      };

      // Call checkout function from useCart
      const result = await checkout(user.id, checkoutData, currency.code);

      if (!result.success) {
        toast.error(result.error || "Failed to place order");
        setIsProcessing(false);
        return;
      }

      // The confirmation carries the payment instructions, so the toast does
      // not claim anything is finished — nothing is paid yet.
      toast.success("Order received.");
      router.push(`/checkout/success?orderId=${result.orderId}`);
      
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast.error(error.message || "Failed to place order");
      setIsProcessing(false);
    }
  };

  const canPlaceOrder = () => {
    if (!email || !phone || !fullName) return false;
    if (deliveryType === "delivery") {
      return street && city && state && zipCode && country;
    }
    return true;
  };

  // Redirect if cart is empty
  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-background pt-20 flex items-center justify-center px-6">
        <div className="text-center">
          <Package className="h-16 w-16 text-foreground/20 mx-auto mb-4" />
          <h2 className="font-heading uppercase text-2xl mb-2">Your cart is empty</h2>
          <p className="text-foreground/60 mb-6">
            Add some items to your cart before checking out
          </p>
          <Button
            onClick={() => router.push("/clothings")}
            className="bg-sage-deep text-background hover:bg-sage-deep/90 hover:text-background rounded-none"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-heading text-4xl md:text-5xl tracking-wide uppercase mb-2">
            Checkout
          </h1>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Delivery Type */}
            <Card className="rounded-none">
              <CardContent className="p-6">
                <h2 className="font-body text-lg font-medium uppercase tracking-wider mb-6">
                  Delivery Method
                </h2>

                <RadioGroup
                  value={deliveryType}
                  onValueChange={(value: any) => setDeliveryType(value)}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <label
                      className={`relative flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${
                        deliveryType === "delivery"
                          ? "border-foreground bg-foreground/5"
                          : "border-foreground/20 hover:border-foreground/40"
                      }`}
                    >
                      <RadioGroupItem value="delivery" id="delivery" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="h-5 w-5" />
                          <span className="font-body font-medium">
                            Home Delivery
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60">
                          Delivery in 3-7 business days
                        </p>
                      </div>
                    </label>

                    <label
                      className={`relative flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${
                        deliveryType === "inStore"
                          ? "border-foreground bg-foreground/5"
                          : "border-foreground/20 hover:border-foreground/40"
                      }`}
                    >
                      <RadioGroupItem value="inStore" id="inStore" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="h-5 w-5" />
                          <span className="font-body font-medium">
                            Store Pickup
                          </span>
                        </div>
                        <p className="text-sm text-foreground/60">
                          Pick up in 1-2 business days
                        </p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>

                {deliveryType === "inStore" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-terra-deep/10 border border-sage/20 rounded"
                  >
                    <p className="text-sm font-body">
                      <strong>Ramazah Store</strong>
                      <br />
                      Leninsky Avenue, 146
                      <br />
                      Moscow, 117198
                      <br />
                      Mon-Sun: 10AM - 9PM
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Contact & Shipping Information */}
            <Card className="rounded-none">
              <CardContent className="p-6">
                <h2 className="font-body text-lg font-medium uppercase tracking-wider mb-6">
                  Contact Information
                </h2>

                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="font-body text-sm">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="mt-1.5 rounded-none"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone" className="font-body text-sm">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1.5 rounded-none"
                      required
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Shipping Address (only for delivery) */}
                  {deliveryType === "delivery" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      <h3 className="font-body text-base font-medium">
                        Shipping Address
                      </h3>

                      {/* Full Name */}
                      <div>
                        <Label htmlFor="fullName" className="font-body text-sm">
                          Full Name *
                        </Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="mt-1.5 rounded-none"
                          required
                        />
                      </div>

                      {/* Street Address */}
                      <div>
                        <Label htmlFor="street" className="font-body text-sm">
                          Street Address *
                        </Label>
                        <Input
                          id="street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="123 Main Street, Apt 4B"
                          className="mt-1.5 rounded-none"
                          required
                        />
                      </div>

                      {/* City & State */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="font-body text-sm">
                            City *
                          </Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="New York"
                            className="mt-1.5 rounded-none"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state" className="font-body text-sm">
                            State *
                          </Label>
                          <Input
                            id="state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="NY"
                            className="mt-1.5 rounded-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Zip & Country */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zipCode" className="font-body text-sm">
                            Zip Code *
                          </Label>
                          <Input
                            id="zipCode"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            placeholder="10001"
                            className="mt-1.5 rounded-none"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="country" className="font-body text-sm">
                            Country *
                          </Label>
                          <Select value={country || "RU"} onValueChange={setCountry}>
                            <SelectTrigger className="mt-1.5 rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="RU">Russia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {deliveryType === "inStore" && (
                    <div>
                      <Label htmlFor="pickupName" className="font-body text-sm">
                        Pickup Name *
                      </Label>
                      <Input
                        id="pickupName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Who will pick up the order?"
                        className="mt-1.5 rounded-none"
                        required
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/*
              Said before the button, not after it. There is no card step: this
              raises an invoice, and the shop packs when the transfer lands. A
              customer who expects a payment screen and does not get one assumes
              the order failed.
            */}
            <p className="mb-3 font-body text-sm leading-relaxed text-ink-muted">
              No card payment — placing the order raises an invoice, and the next
              screen has the account details to transfer to. Delivery runs{" "}
              {DELIVERY_LEAD_TIME} once we have packed it.
            </p>

            <Button
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder() || isProcessing}
              className="w-full rounded-none bg-sage-deep text-background hover:bg-sage-deep/90 hover:text-background py-6 text-base"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 mr-2 border-2 border-background border-t-transparent rounded-full"
                  />
                  Processing Order...
                </>
              ) : (
                <>
                  Place order
                </>
              )}
            </Button>
          </motion.div>

          {/* Right Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:sticky lg:top-24 h-fit"
          >
            <Card className="rounded-none">
              <CardContent className="p-6">
                <h2 className="font-body text-lg font-medium uppercase tracking-wider mb-6">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div data-lenis-prevent className="space-y-4 mb-6 max-h-[400px] pt-2 overflow-y-auto">
                  {items.map((item) => {
                    const itemPrice = getPrice(item.prices);

                    return (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative w-20 h-20 bg-foreground/5 rounded flex-shrink-0">
                          {item.image && (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover rounded"
                            />
                          )}
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-body">
                            {item.quantity}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-body text-sm font-medium line-clamp-2 mb-1">
                            {item.name}
                          </h3>
                          {item.size && (
                            <p className="text-xs text-foreground/60">
                              Size: {item.size}
                            </p>
                          )}
                          {item.color && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                              <div
                                className="w-3 h-3 rounded-full border border-foreground/20"
                                style={{ backgroundColor: item.color.hex }}
                              />
                              <span>{item.color.name}</span>
                            </div>
                          )}
                          <p className="font-body text-sm font-semibold mt-2">
                            {formatPrice(itemPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-6" />

                {/* Totals */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Subtotal</span>
                    <span className="font-body font-medium">
                      {formatPrice(cartTotals.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Tax (8%)</span>
                    <span className="font-body font-medium">
                      {formatPrice(cartTotals.tax)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Shipping</span>
                    <span className="font-body font-medium">
                      {cartTotals.shipping === 0 ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatPrice(cartTotals.shipping)
                      )}
                    </span>
                  </div>

                  {deliveryType === "delivery" &&
                    cartTotals.subtotal < FREE_SHIPPING_THRESHOLD &&
                    cartTotals.shipping > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-3 bg-terra-deep/10 border border-sage/30 rounded"
                      >
                        <p className="text-xs text-foreground/70">
                          Add{" "}
                          {formatPrice(
                            FREE_SHIPPING_THRESHOLD - cartTotals.subtotal
                          )}{" "}
                          more for free shipping
                        </p>
                      </motion.div>
                    )}

                  <Separator />

                  <div className="flex items-center justify-between pt-2">
                    <span className="font-body text-base font-medium">
                      TOTAL
                    </span>
                    <span className="font-body text-2xl font-semibold">
                      {formatPrice(cartTotals.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <div className="mt-6 space-y-3 text-sm text-foreground/70 font-body">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>Free returns within 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span>Authenticity guaranteed</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}