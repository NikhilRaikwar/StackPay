import { openContractCall } from '@stacks/connect';
import {
  noneCV,
  principalCV,
  standardPrincipalCV,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  serializeCV,
  deserializeCV,
  cvToJSON,
  type FungiblePostCondition,
} from '@stacks/transactions';

import { STACKS_TESTNET } from '@stacks/network';

const network = STACKS_TESTNET;

// USDCx contract details - Official Testnet Token
export const USDCX_CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const USDCX_CONTRACT_NAME = 'usdcx';
export const USDCX_ASSET_NAME = 'usdcx-token';

// Your deployed contracts (update after deployment)
export const PAYMENT_CONTRACT_ADDRESS = 'ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5';
export const PAYMENT_CONTRACT_NAME = 'payment-requests-v9';
export const USERNAME_CONTRACT_ADDRESS =
  'ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5';
export const USERNAME_CONTRACT_NAME = 'username-registry';

const stacksApiUrl =
  STACKS_TESTNET.client.baseUrl ?? 'https://api.testnet.hiro.so';


function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const resolveStacksRecipient = async (input: string) => {
  const trimmed = input.trim();

  // If it looks like a standard Stacks address, return it
  if (trimmed.startsWith('ST') || trimmed.startsWith('SP') || trimmed.startsWith('SM')) {
    return trimmed;
  }

  // Otherwise treat as username (remove @ if present)
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  if (!username) {
    throw new Error('Username is required.');
  }

  const response = await fetch(
    `${stacksApiUrl}/v2/contracts/call-read/${USERNAME_CONTRACT_ADDRESS}/${USERNAME_CONTRACT_NAME}/get-address`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: USERNAME_CONTRACT_ADDRESS,
        arguments: [`0x${typeof serializeCV(stringAsciiCV(username)) === 'string' ? serializeCV(stringAsciiCV(username)) : bytesToHex(serializeCV(stringAsciiCV(username)) as any)}`],
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to resolve username.');
  }
  const result = await response.json();
  if (!result.okay) {
    throw new Error('Username not found.');
  }

  const clarityValue = deserializeCV(result.result);
  const jsonResult = cvToJSON(clarityValue);

  // Check specifically for valid address return
  if (!jsonResult.value || (typeof jsonResult.value.value === 'string' && !jsonResult.value.value.startsWith('S'))) {
    throw new Error('Username not found.');
  }

  return jsonResult.value.value as string;
};

export const sendUSDCx = async (
  recipient: string,
  amount: number,
  senderAddress: string
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);

    // Explicitly construct FungiblePostCondition
    const postCondition: FungiblePostCondition = {
      type: 'ft-postcondition',
      address: senderAddress,
      condition: 'eq',
      amount: amountInMicroUnits,
      asset: `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}::${USDCX_ASSET_NAME}`,
    };

    const postConditions = [postCondition];

    const options = {
      contractAddress: USDCX_CONTRACT_ADDRESS,
      contractName: USDCX_CONTRACT_NAME,
      functionName: 'transfer',
      functionArgs: [
        uintCV(amountInMicroUnits),
        standardPrincipalCV(senderAddress),
        principalCV(recipient),
        noneCV(),
      ] as any[],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const createPaymentRequest = async (
  requestId: string,
  recipient: string,
  amount: number,
  memo: string,
  userAddress: string
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);

    if (!userAddress) {
      reject(new Error('User address not found'));
      return;
    }

    // Logging inputs for debugging
    console.log('[createPaymentRequest]', { requestId, recipient, amountInMicroUnits });

    // Explicitly construct FungiblePostCondition
    const postCondition: FungiblePostCondition = {
      type: 'ft-postcondition',
      address: userAddress,
      condition: 'eq',
      amount: amountInMicroUnits,
      asset: `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}::${USDCX_ASSET_NAME}`,
    };

    const postConditions = [postCondition];

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'create-payment-request',
      functionArgs: [
        stringAsciiCV(requestId),
        principalCV(recipient),
        uintCV(amountInMicroUnits),
        stringUtf8CV(memo),
      ] as any[],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const createInvoiceRequest = async (
  requestId: string,
  recipient: string,
  amount: number,
  memo: string
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'create-invoice-request',
      functionArgs: [
        stringAsciiCV(requestId),
        principalCV(recipient),
        uintCV(amountInMicroUnits),
        stringUtf8CV(memo),
      ] as any[],
      network,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const payInvoice = async (
  requestId: string,
  amount: number,
  userAddress: string
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);

    if (!userAddress) {
      reject(new Error('User address not found'));
      return;
    }

    // Post condition: Payer sends USDCx to Creator
    const postCondition: FungiblePostCondition = {
      type: 'ft-postcondition',
      address: userAddress,
      condition: 'eq',
      amount: amountInMicroUnits,
      asset: `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}::${USDCX_ASSET_NAME}`,
    };

    const postConditions = [postCondition];

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'pay-invoice',
      functionArgs: [stringAsciiCV(requestId)] as any[],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const cancelPaymentRequest = async (requestId: string) =>
  new Promise<string>((resolve, reject) => {
    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'cancel-payment-request',
      functionArgs: [stringAsciiCV(requestId)] as any[],
      network,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const getPaymentRequest = async (requestId: string) => {
  const response = await fetch(
    `${stacksApiUrl}/v2/contracts/call-read/${PAYMENT_CONTRACT_ADDRESS}/${PAYMENT_CONTRACT_NAME}/get-payment-request`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: PAYMENT_CONTRACT_ADDRESS,
        arguments: [`0x${typeof serializeCV(stringAsciiCV(requestId)) === 'string' ? serializeCV(stringAsciiCV(requestId)) : bytesToHex(serializeCV(stringAsciiCV(requestId)) as any)}`],
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch payment request.');
  }
  const result = await response.json();
  if (!result.okay) {
    return null;
  }

  const clarityValue = deserializeCV(result.result);
  const jsonResult = cvToJSON(clarityValue);

  // If result is none (null in JSON), return null
  if (jsonResult.value === null) return null;

  return jsonResult.value;
};

export const claimPayment = async (
  requestId: string,
  amount: number
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);
    const contractPrincipal = `${PAYMENT_CONTRACT_ADDRESS}.${PAYMENT_CONTRACT_NAME}`;

    const postCondition: FungiblePostCondition = {
      type: 'ft-postcondition',
      address: contractPrincipal,
      condition: 'eq',
      amount: amountInMicroUnits,
      asset: `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}::${USDCX_ASSET_NAME}`,
    };

    const postConditions = [postCondition];

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'claim-payment',
      functionArgs: [stringAsciiCV(requestId)] as any[],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options as any);
  });

export const getUSDCxBalance = async (address: string): Promise<number> => {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
  );
  const data = await response.json();

  const usdcxKey = `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}::${USDCX_ASSET_NAME}`;
  const balance = data.fungible_tokens?.[usdcxKey]?.balance || '0';

  return parseInt(balance, 10) / 1_000_000;
};
