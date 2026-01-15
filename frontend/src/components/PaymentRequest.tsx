import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

export const PaymentRequest = () => {
  const { address } = useWallet();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');

  const handleRequest = () => {
    alert(`Request sent to @${username} for ${amount} USDCx.`);
  };

  if (!address) {
    return <div className="p-4">Connect your wallet to request payments.</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Request Payment</h2>
      <p className="text-sm text-gray-600 mb-4">
        Register a username on the Username page to request by handle.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Recipient Username</label>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="@alice"
          className="w-full p-3 border rounded-lg"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Amount (USDCx)</label>
        <input
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          step="0.01"
          className="w-full p-3 border rounded-lg"
        />
      </div>

      <button
        onClick={handleRequest}
        disabled={!username || !amount}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        Send Request
      </button>
    </div>
  );
};
