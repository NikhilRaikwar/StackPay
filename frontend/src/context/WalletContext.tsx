import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AppConfig, UserSession, connect } from '@stacks/connect';

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

  const connectWallet = useCallback(async () => {
    console.log('Connect wallet clicked, calling connect...');
    try {
      const response = await connect();
      console.log('Wallet connection finished', response);

      if (response.addresses && response.addresses.length > 0) {
        const stxAddressData = response.addresses.find((a: { symbol: string; address: string }) => a.symbol === 'STX') || response.addresses[0];
        const address = stxAddressData.address;

        const mockUserData = {
          profile: {
            stxAddress: {
              testnet: address,
              mainnet: address
            }
          }
        };

        // Persist for legacy support (UserSession and stacksUtils)
        // We try to write a minimal session structure that UserSession and stacksUtils might recognize
        const sessionData = {
          userData: mockUserData,
          version: '1.0.0'
        };
        localStorage.setItem('blockstack-session', JSON.stringify(sessionData));

        setUserData(mockUserData);
        setIsConnected(true);
        setAddress(address);
      }
    } catch (error) {
      console.error('Error calling connect:', error);
      alert('Failed to connect wallet.');
    }
  }, []);

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
      const accounts = await (window.ethereum as { request: (args: { method: string }) => Promise<string[]> }).request({
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
