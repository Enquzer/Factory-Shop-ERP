"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/star-rating";
import { Product } from "@/lib/products";
import { ProductFeedback } from "@/lib/product-feedback";

interface ProductFeedbackDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFeedbackSubmitted?: () => void;
  existingFeedback?: ProductFeedback | null;
}

export function ProductFeedbackDialog({
  product,
  open,
  onOpenChange,
  onFeedbackSubmitted,
  existingFeedback
}: ProductFeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form with existing feedback
  useEffect(() => {
    if (open && existingFeedback) {
      setRating(existingFeedback.rating);
      setComment(existingFeedback.comment || "");
    } else if (open) {
      // Reset form when opening without existing feedback
      setRating(0);
      setComment("");
    }
  }, [open, existingFeedback]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please provide a star rating for this product.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/product-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        },
        body: JSON.stringify({
          productId: product.id,
          rating,
          comment: comment.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback");
      }

      toast({
        title: "Feedback Submitted",
        description: existingFeedback 
          ? "Your feedback has been updated successfully." 
          : "Thank you for your feedback!",
      });

      onFeedbackSubmitted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingFeedback) return;

    if (!confirm("Are you sure you want to delete your feedback for this product?")) {
      return;
    }

    try {
      const response = await fetch(`/api/product-feedback/${existingFeedback.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete feedback");
      }

      toast({
        title: "Feedback Deleted",
        description: "Your feedback has been removed.",
      });

      onFeedbackSubmitted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Feedback</DialogTitle>
          <DialogDescription>
            Share your experience with {product.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No Image</div>';
                  }}
                />
              ) : (
                <div className="text-muted-foreground text-xs">No Image</div>
              )}
            </div>
            <div>
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.productCode}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rating *</Label>
            <StarRating 
              rating={rating}
              onRatingChange={setRating}
              size="lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your thoughts about this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div className="text-right text-sm text-muted-foreground">
              {comment.length}/500 characters
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {existingFeedback && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete Feedback
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? "Submitting..." : existingFeedback ? "Update Feedback" : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}