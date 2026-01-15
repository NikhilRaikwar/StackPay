import { useState } from 'react';
import { bridgeUSDCFromEthereum, pollBridgeStatus } from '../utils/bridgeUtils';

export const useBridge = () => {
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  const startBridge = async (amount: number, stacksAddress: string) => {
    const hash = await bridgeUSDCFromEthereum(amount, stacksAddress);
    setTxHash(hash);
    setBridgeStatus('pending');

    pollBridgeStatus(hash, (status) => {
      setBridgeStatus(status);
    });

    return hash;
  };

  return { bridgeStatus, txHash, startBridge };
};
