import { ethers } from 'ethers';

// xReserve contract details (Ethereum Sepolia Testnet)
export const XRESERVE_ADDRESS =
  import.meta.env.VITE_XRESERVE_CONTRACT || '';
export const USDC_CONTRACT_ADDRESS =
  import.meta.env.VITE_USDC_CONTRACT || '';
export const STACKS_DOMAIN =
  import.meta.env.VITE_STACKS_DOMAIN || '10003';

export const XRESERVE_ABI = [
  'function deposit(uint256 amount, string stacksAddress) public payable',
  'function getBridgeStatus(bytes32 txHash) public view returns (string)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function balanceOf(address owner) public view returns (uint256)',
];

export const bridgeUSDCFromEthereum = async (
  amount: number,
  stacksAddress: string
): Promise<string> => {
  if (!XRESERVE_ADDRESS) {
    throw new Error('Missing xReserve contract address.');
  }
  if (!USDC_CONTRACT_ADDRESS) {
    throw new Error('Missing USDC contract address.');
  }
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111) {
    throw new Error('Please switch MetaMask to Sepolia.');
  }
  const signer = provider.getSigner();

  if (amount < 10) {
    throw new Error('Minimum bridge amount is 10 USDC.');
  }
  const amountInWei = ethers.utils.parseUnits(amount.toString(), 6);

  const usdcContract = new ethers.Contract(
    USDC_CONTRACT_ADDRESS,
    ERC20_ABI,
    signer
  );
  const signerAddress = await signer.getAddress();
  const balance: ethers.BigNumber = await usdcContract.balanceOf(signerAddress);
  if (balance.lt(amountInWei)) {
    throw new Error('Insufficient USDC balance on Sepolia.');
  }
  const currentAllowance: ethers.BigNumber = await usdcContract.allowance(
    signerAddress,
    XRESERVE_ADDRESS
  );

  if (currentAllowance.lt(amountInWei)) {
    const approveTx = await usdcContract.approve(XRESERVE_ADDRESS, amountInWei);
    await approveTx.wait();
  }

  const xReserveContract = new ethers.Contract(
    XRESERVE_ADDRESS,
    XRESERVE_ABI,
    signer
  );

  const tx = await xReserveContract.deposit(amountInWei, stacksAddress, {
    value: ethers.utils.parseEther('0.01'),
  });

  await tx.wait();
  return tx.hash as string;
};

export const monitorBridgeStatus = async (
  txHash: string
): Promise<'pending' | 'completed' | 'failed'> => {
  const response = await fetch(
    `https://api.testnet.hiro.so/bridge/status/${txHash}`
  );

  if (!response.ok) {
    return 'pending';
  }

  const data = await response.json();
  return data.status ?? 'pending';
};

export const pollBridgeStatus = (
  txHash: string,
  onStatusChange: (status: 'pending' | 'completed' | 'failed') => void
): NodeJS.Timeout => {
  const interval = setInterval(async () => {
    const status = await monitorBridgeStatus(txHash);
    onStatusChange(status);

    if (status === 'completed' || status === 'failed') {
      clearInterval(interval);
    }
  }, 10000);

  return interval;
};
