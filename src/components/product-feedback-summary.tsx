"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductFeedbackDialog } from "@/components/product-feedback-dialog";
import { Product } from "@/lib/products";
import { ProductFeedback } from "@/lib/product-feedback";
import { useAuth } from "@/contexts/auth-context";

interface ProductFeedbackSummaryProps {
  product: Product;
  showButton?: boolean;
  className?: string;
  onFeedbackUpdated?: () => void;
}

export function ProductFeedbackSummary({
  product,
  showButton = true,
  className,
  onFeedbackUpdated
}: ProductFeedbackSummaryProps) {
  const [feedbackStats, setFeedbackStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<ProductFeedback | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchFeedbackData = async () => {
    if (!product.id) return;
    
    try {
      setLoading(true);
      
      // Fetch product feedback stats
      const statsResponse = await fetch(`/api/product-feedback?productId=${product.id}`);
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setFeedbackStats(data.stats);
      }
      
      // If user is a shop, fetch their specific feedback
      if (user?.role === 'shop' && user.username) {
        const feedbackResponse = await fetch(
          `/api/product-feedback?productId=${product.id}&shopId=${user.username}`,
          {
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            }
          }
        );
        
        if (feedbackResponse.ok) {
          const feedback = await feedbackResponse.json();
          setExistingFeedback(feedback);
        }
      }
    } catch (error) {
      console.error("Error fetching feedback data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, [product.id, user?.username]);

  const handleFeedbackSubmitted = () => {
    fetchFeedbackData();
    onFeedbackUpdated?.();
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-4 h-4 text-gray-300" />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const averageRating = feedbackStats?.averageRating || 0;
  const totalFeedbacks = feedbackStats?.totalFeedbacks || 0;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= averageRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
        
        {totalFeedbacks > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              ({totalFeedbacks} review{totalFeedbacks !== 1 ? 's' : ''})
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No reviews yet</span>
        )}
        
        {showButton && user?.role === 'shop' && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2 h-8 px-2 text-xs"
            onClick={() => setIsDialogOpen(true)}
          >
            {existingFeedback ? "Edit Review" : "Add Review"}
          </Button>
        )}
      </div>

      {showButton && user?.role === 'shop' && (
        <ProductFeedbackDialog
          product={product}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onFeedbackSubmitted={handleFeedbackSubmitted}
          existingFeedback={existingFeedback}
        />
      )}
    </div>
  );
}