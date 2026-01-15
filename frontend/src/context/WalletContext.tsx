import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';

interface WalletContextType {
  userSession: UserSession;
  userData: any;
  isConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  address: string | null;
  ethAddress: string | null;
  connectEthereumWallet: () => Promise<void>;
  disconnectEthereumWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const appConfig = new AppConfig(['store_write', 'publish_data']);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [userSession] = useState(() => new UserSession({ appConfig }));
  const [userData, setUserData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((data) => {
        setUserData(data);
        setIsConnected(true);
        setAddress(data.profile.stxAddress.testnet);
      }).catch((err) => {
        console.error('Error handling pending sign in:', err);
      });
      return;
    }

    if (userSession.isUserSignedIn()) {
      const data = userSession.loadUserData();
      setUserData(data);
      setIsConnected(true);
      setAddress(data.profile.stxAddress.testnet);
    }
  }, [userSession]);

  const connectWallet = useCallback(() => {
    console.log('Connect wallet clicked, calling showConnect...');
    try {
      showConnect({
        appDetails: {
          name: 'StacksPay Pro',
          icon: window.location.origin + '/vite.svg',
        },
        onFinish: () => {
          console.log('Wallet connection finished');
          // Update state immediately without reload
          if (userSession.isUserSignedIn()) {
            const data = userSession.loadUserData();
            setUserData(data);
            setIsConnected(true);
            setAddress(data.profile.stxAddress.testnet);
          }
        },
        onCancel: () => {
          console.log('User cancelled wallet connection');
        },
        userSession,
      });
      console.log('showConnect called successfully');
    } catch (error) {
      console.error('Error calling showConnect:', error);
      alert('Failed to open wallet connection modal. Please make sure you have Leather or Xverse wallet installed.');
    }
  }, [userSession]);

  const disconnectWallet = useCallback(() => {
    userSession.signUserOut();
    setUserData(null);
    setIsConnected(false);
    setAddress(null);
    window.location.reload();
  }, [userSession]);

  const connectEthereumWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Ethereum wallet');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setEthAddress(accounts[0] ?? null);
    } catch (error) {
      console.error('Failed to connect Ethereum wallet:', error);
      alert('Failed to connect Ethereum wallet');
    }
  }, []);

  const disconnectEthereumWallet = useCallback(() => {
    setEthAddress(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      userSession,
      userData,
      isConnected,
      connectWallet,
      disconnectWallet,
      address,
      ethAddress,
      connectEthereumWallet,
      disconnectEthereumWallet,
    }),
    [userSession, userData, isConnected, address, ethAddress, connectWallet, disconnectWallet, connectEthereumWallet, disconnectEthereumWallet]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
};
