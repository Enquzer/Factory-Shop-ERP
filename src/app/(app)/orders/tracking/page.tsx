import { OrderTracking } from "../_components/order-tracking";

export default function OrderTrackingPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Order Tracking</h1>
      </div>
      <OrderTracking />
    </div>
  );
}