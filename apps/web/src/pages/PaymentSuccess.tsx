import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (reference) {
      // Fetch receipt or assume it's handled
      // In real, verify and get receipt
      fetch(`${import.meta.env.VITE_API_URL}/payments/${reference}/receipt`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => setReceiptUrl(data.receiptUrl))
        .catch(console.error);
    }
  }, [reference]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Payment Successful!</h1>
        <p className="text-gray-700 mb-6">Your rent payment has been processed.</p>
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600"
          >
            Download Receipt
          </a>
        )}
        <p className="text-sm text-gray-500 mt-4">A receipt has also been sent to your phone via SMS.</p>
      </div>
    </div>
  );
}