// frontend/src/components/PriceSummary.jsx
const fmt = (n) =>
  `₱${(Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const Row = ({ label, value, sub, accent, bold }) => (
  <div
    className={`flex justify-between items-center py-1 ${
      sub ? "text-sm text-gray-500" : ""
    } ${bold ? "font-semibold text-gray-800" : ""} ${
      accent ? "text-green-600 font-medium" : ""
    }`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default function PriceSummary({ appointment }) {
  const {
    servicesTotal = 0,
    kgPrice = 0,
    totalAmount = 0,
    vatRate = 0,
    vatAmount = 0,
    promoCode,
    discountAmount = 0,
    discountType,
    discountValue,
    finalAmount = 0,
  } = appointment;

  const vatPercent = Math.round((vatRate || 0) * 100);

  return (
    <div className="space-y-1 text-gray-700 text-sm">
      <Row label="Services"  value={fmt(servicesTotal)} sub />
      <Row label="Kg Price"  value={fmt(kgPrice)}       sub />

      <div className="border-t border-dashed border-gray-200 my-1" />

      <Row label="Subtotal"  value={fmt(totalAmount)} />

      {vatAmount > 0 && (
        <Row
          label={`VAT (${vatPercent}%)`}
          value={`+ ${fmt(vatAmount)}`}
          sub
        />
      )}

      {discountAmount > 0 && (
        <Row
          label={
            promoCode
              ? `Promo "${promoCode}" (${
                  discountType === "percentage" ? `${discountValue}%` : fmt(discountValue)
                } off)`
              : "Discount"
          }
          value={`- ${fmt(discountAmount)}`}
          accent
        />
      )}

      <div className="border-t border-gray-300 my-1" />

      <Row label="Total Due" value={fmt(finalAmount)} bold />
    </div>
  );
}