// components/marketplace/RazorpayCheckout.js
"use client"
import Script from "next/script"

export default function RazorpayCheckout({ amount, product, onSuccess, onCancel }) {
  const handlePayment = async () => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    
    if (!key || key.includes("test_your_key_id")) {
      alert("Razorpay Key ID is missing. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID in .env.local");
      onCancel();
      return;
    }

    const options = {
      key,
      amount: amount * 100, // amount in paisa
      currency: "INR",
      name: "Ev.CRM",
      description: `Token booking for ${product.brand} ${product.model}`,
      handler: function (response) {
        onSuccess(response.razorpay_payment_id);
      },
      prefill: {
        name: "Test User",
        email: "test@example.com",
        contact: "9876543210"
      },
      theme: { color: "#059669" }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <button 
        onClick={handlePayment}
        style={{ 
          width:"100%", background:"#059669", color:"#fff", border:"none", 
          borderRadius:14, padding:15, fontSize:15, fontWeight:900, 
          cursor:"pointer", boxShadow:"0 4px 20px rgba(5,150,105,0.35)" 
        }}
      >
        🚗 Pay Token — {amount === 10000 ? "₹10,000" : `₹${amount.toLocaleString()}`}
      </button>
    </>
  );
}
