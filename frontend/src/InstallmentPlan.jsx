import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import axios from "./axiosConfig";

/* 1️⃣ backend base */
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function InstallmentPlan() {
  const { bookingId } = useParams();
  const { user } = useContext(AuthContext);

  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  /* load (or create) plan */
  useEffect(() => {
    if (!user || !bookingId) return; // wait until both are ready

    const fetchPlan = async () => {
      try {
        setLoading(true);
        const res = await axios.post(`/payments/create/${bookingId}`);
        setPlan(res.data);
        setError(""); // clear error on success
      } catch (err) {
        console.error("Error loading plan:", err);
        setError("Unable to load payment plan.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [bookingId, user]);


  /* pay one installment */
  const handlePay = async (paymentId) => {
    try {
      const { data } = await axios.post(`/payments/installment-payment/${paymentId}`);
      const w = window.open(data.url, "_blank");
      if (!w) { alert("Pop-up blocked!"); return; }

      await axios.post(`/payments/pay/${paymentId}`);

      setPlan((prev) => {
        const upd = prev.map((p) => p._id === paymentId ? { ...p, status: "Paid" } : p);
        // Check if all installments are paid and confirm the booking
        if (upd.every((p) => p.status === "Paid")) {
          // Call confirm-full-payment to add points
          axios.post(`/payments/confirm-full-payment/${bookingId}`)
            .catch(err => console.error("Error confirming full payment:", err));
        }
        return upd;
      });

      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 4000);
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed.");
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error)   return <p>{error}</p>;

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxWidth: "600px",
        width: "100%",
      }}>
        {paymentSuccess && (
          <div style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: 10,
            borderRadius: 6,
            marginBottom: 16,
            border: "1px solid #c3e6cb",
          }}>
            ✅ Payment Successful!
          </div>
        )}

        <h2 style={{ marginBottom: "1.5rem" }}>Installment Plan for Booking #{bookingId}</h2>

        {plan.map((inst) => (
          <div key={inst._id} style={{
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px",
            border: "1px solid #dee2e6",
            borderRadius: "6px"
          }}>
            <div>
              <strong>#{inst.installmentNumber}</strong>{" "}
              ${inst.amount.toFixed(2)} — {inst.status}
            </div>

            <div>
              {inst.status === "Paid" && (
                <a
                  href={`${API_BASE}/payments/invoice/installment/${inst._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: "#007bff",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: 4,
                    textDecoration: "none",
                    marginLeft: 8,
                  }}
                >
                  Invoice
                </a>
              )}
              {inst.status === "Unpaid" && (
                <button
                  onClick={() => handlePay(inst._id)}
                  style={{
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    padding: "4px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                    marginLeft: 8,
                  }}
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
