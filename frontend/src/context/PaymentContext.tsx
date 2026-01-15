import { createContext, useContext, useMemo, useState } from 'react';

export interface PaymentRecord {
  id: string;
  amount: number;
  recipient: string;
  memo: string;
  status: 'pending' | 'completed' | 'cancelled';
  txId?: string;
  createdAt: string;
}

interface PaymentContextType {
  payments: PaymentRecord[];
  addPayment: (payment: PaymentRecord) => void;
  updatePaymentStatus: (id: string, status: PaymentRecord['status']) => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: React.ReactNode }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const addPayment = (payment: PaymentRecord) => {
    setPayments((prev) => [payment, ...prev]);
  };

  const updatePaymentStatus = (id: string, status: PaymentRecord['status']) => {
    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === id ? { ...payment, status } : payment
      )
    );
  };

  const contextValue = useMemo(
    () => ({ payments, addPayment, updatePaymentStatus }),
    [payments]
  );

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePaymentContext = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePaymentContext must be used within PaymentProvider');
  }
  return context;
};
