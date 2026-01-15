import { openContractCall } from '@stacks/connect';
import {
  noneCV,
  standardPrincipalCV,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  Pc,
  serializeCV,
  deserializeCV,
  cvToJSON,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

const network = STACKS_TESTNET;

// USDCx contract details
export const USDCX_CONTRACT_ADDRESS =
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const USDCX_CONTRACT_NAME = 'usdcx';
export const USDCX_ASSET_NAME = 'usdcx-token';

// Your deployed contracts (update after deployment)
export const PAYMENT_CONTRACT_ADDRESS = 'ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5';
export const PAYMENT_CONTRACT_NAME = 'payment-requests';
export const USERNAME_CONTRACT_ADDRESS =
  'ST2Y455NJPETB2SRSD0VDZP3KJE50WNHY0BN3TWY5';
export const USERNAME_CONTRACT_NAME = 'username-registry';

const stacksApiUrl =
  STACKS_TESTNET.client.baseUrl ?? 'https://api.testnet.hiro.so';

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
        arguments: [`0x${serializeCV(stringAsciiCV(username))}`],
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

    const postConditions = [
      Pc.origin()
        .willSendEq(amountInMicroUnits)
        .ft(`${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}`, USDCX_ASSET_NAME),
    ];

    const options = {
      contractAddress: USDCX_CONTRACT_ADDRESS,
      contractName: USDCX_CONTRACT_NAME,
      functionName: 'transfer',
      functionArgs: [
        uintCV(amountInMicroUnits),
        standardPrincipalCV(senderAddress),
        standardPrincipalCV(recipient),
        noneCV(),
      ],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options);
  });

export const createPaymentRequest = async (
  requestId: string,
  recipient: string,
  amount: number,
  memo: string
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);
    const userAddress =
      network.client.baseUrl === 'https://api.mainnet.hiro.so'
        ? JSON.parse(localStorage.getItem('blockstack-session') || '{}')
          ?.userData?.profile?.stxAddress?.mainnet
        : JSON.parse(localStorage.getItem('blockstack-session') || '{}')
          ?.userData?.profile?.stxAddress?.testnet;

    if (!userAddress) {
      reject(new Error('User address not found'));
      return;
    }

    const postConditions = [
      Pc.principal(userAddress)
        .willSendEq(amountInMicroUnits)
        .ft(
          `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}`,
          USDCX_ASSET_NAME
        ),
    ];

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'create-payment-request',
      functionArgs: [
        stringAsciiCV(requestId),
        standardPrincipalCV(recipient),
        uintCV(amountInMicroUnits),
        stringUtf8CV(memo),
      ],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options);
  });

export const claimPayment = async (
  requestId: string,
  amount: number
) =>
  new Promise<string>((resolve, reject) => {
    const amountInMicroUnits = Math.floor(amount * 1_000_000);
    const contractPrincipal = `${PAYMENT_CONTRACT_ADDRESS}.${PAYMENT_CONTRACT_NAME}`;

    // Calculate Post Condition: Contract transfers USDCx to Recipient
    const postConditions = [
      Pc.principal(contractPrincipal)
        .willSendEq(amountInMicroUnits)
        .ft(
          `${USDCX_CONTRACT_ADDRESS}.${USDCX_CONTRACT_NAME}`,
          USDCX_ASSET_NAME
        ),
    ];

    const options = {
      contractAddress: PAYMENT_CONTRACT_ADDRESS,
      contractName: PAYMENT_CONTRACT_NAME,
      functionName: 'claim-payment',
      functionArgs: [stringAsciiCV(requestId)],
      network,
      postConditions,
      onFinish: (data: any) => resolve(data.txId as string),
      onCancel: () => reject(new Error('Transaction canceled')),
    };

    void openContractCall(options);
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
