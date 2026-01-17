import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
} from 'viem';
import { sepolia } from 'viem/chains';
import { bytes32FromBytes, remoteRecipientCoder } from './bridgeHelpers';

// xReserve contract details (Ethereum Sepolia Testnet)
export const XRESERVE_ADDRESS =
  import.meta.env.VITE_XRESERVE_CONTRACT || '';
export const USDC_CONTRACT_ADDRESS =
  import.meta.env.VITE_USDC_CONTRACT || '';
export const STACKS_DOMAIN =
  import.meta.env.VITE_STACKS_DOMAIN || '10003';

export const XRESERVE_ABI = [
  {
    name: "depositToRemote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "value", type: "uint256" },
      { name: "remoteDomain", type: "uint32" },
      { name: "remoteRecipient", type: "bytes32" },
      { name: "localToken", type: "address" },
      { name: "maxFee", type: "uint256" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "allowance", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

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

  const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum as any)
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: custom(window.ethereum as any)
  });

  const [address] = await walletClient.requestAddresses();
  const chainId = await walletClient.getChainId();

  if (chainId !== 11155111) {
    // Attempt to switch chain
    try {
      await walletClient.switchChain({ id: sepolia.id });
    } catch (e) {
      throw new Error('Please switch MetaMask to Sepolia.');
    }
  }

  if (amount < 1) {
    throw new Error('Minimum bridge amount is 1 USDC.');
  }

  // Prepare deposit params (USDC has 6 decimals)
  const amountInUnits = parseUnits(amount.toString(), 6);
  const maxFee = parseUnits('0', 6);
  const hookData = "0x";

  // Encode Stacks recipient
  const remoteRecipient = bytes32FromBytes(remoteRecipientCoder.encode(stacksAddress));

  // Check balance
  const balance = await publicClient.readContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address]
  });

  if (balance < amountInUnits) {
    throw new Error('Insufficient USDC balance on Sepolia.');
  }

  // Check allowance
  const allowance = await publicClient.readContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, XRESERVE_ADDRESS as `0x${string}`]
  });

  if (allowance < amountInUnits) {
    const hash = await walletClient.writeContract({
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [XRESERVE_ADDRESS as `0x${string}`, amountInUnits],
      account: address
    });

    await publicClient.waitForTransactionReceipt({ hash });
  }

  // Deposit
  const txHash = await walletClient.writeContract({
    address: XRESERVE_ADDRESS as `0x${string}`,
    abi: XRESERVE_ABI,
    functionName: 'depositToRemote',
    args: [
      amountInUnits,
      parseInt(STACKS_DOMAIN), // STACKS_DOMAIN is string '10003'
      remoteRecipient,
      USDC_CONTRACT_ADDRESS as `0x${string}`,
      maxFee,
      hookData
    ],
    account: address
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
};

export const monitorBridgeStatus = async (
  txHash: string
): Promise<'pending' | 'completed' | 'failed'> => {
  try {
    // Use a reliable public RPC for reading transaction status
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http('https://ethereum-sepolia.publicnode.com')
    });

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status === 'success') {
      return 'completed';
    } else if (receipt.status === 'reverted') {
      return 'failed';
    }

    return 'pending';
  } catch (error) {
    // TransactionReceiptNotFoundError or other errors likely mean it's still pending
    return 'pending';
  }
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
