
import { STACKS_TESTNET } from '@stacks/network';

const STACKS_API_BASE_URL = STACKS_TESTNET.client.baseUrl || 'https://api.testnet.hiro.so';

// Generic types for responses
interface StacksApiResponse<T> {
    okay?: boolean;
    result?: string; // Hex encoded Clarity value
    data?: string;   // Hex encoded data for map/var/constant
    proof?: string;
    count?: number;
    total?: number;
    results?: T[];
    [key: string]: any;
}

/**
 * 1. Get contract interface
 * GET /v2/contracts/interface/{contract_address}/{contract_name}
 */
export const getContractInterface = async (contractAddress: string, contractName: string) => {
    const url = `${STACKS_API_BASE_URL}/v2/contracts/interface/${contractAddress}/${contractName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching contract interface: ${response.statusText}`);
    return response.json();
};

/**
 * 2. Get specific data-map inside a contract
 * POST /v2/map_entry/{contract_address}/{contract_name}/{map_name}
 */
export const getMapEntry = async (
    contractAddress: string,
    contractName: string,
    mapName: string,
    keyHex: string
) => {
    const url = `${STACKS_API_BASE_URL}/v2/map_entry/${contractAddress}/${contractName}/${mapName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyHex) // The body is the hex string itself, not an object
    });
    if (!response.ok) throw new Error(`Error fetching map entry: ${response.statusText}`);
    return response.json() as Promise<{ data: string; proof?: string }>;
};

/**
 * 3. Get contract source
 * GET /v2/contracts/source/{contract_address}/{contract_name}
 */
export const getContractSource = async (contractAddress: string, contractName: string) => {
    const url = `${STACKS_API_BASE_URL}/v2/contracts/source/${contractAddress}/${contractName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching contract source: ${response.statusText}`);
    return response.json() as Promise<{ source: string; publish_height: number; proof: string }>;
};

/**
 * 4. Call read-only function
 * POST /v2/contracts/call-read/{contract_address}/{contract_name}/{function_name}
 */
export const callReadOnlyFunction = async (
    contractAddress: string,
    contractName: string,
    functionName: string,
    senderAddress: string,
    args: string[] // Array of hex-encoded Clarity values
) => {
    const url = `${STACKS_API_BASE_URL}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: senderAddress,
            arguments: args
        })
    });
    if (!response.ok) throw new Error(`Error calling read-only function: ${response.statusText}`);
    return response.json() as Promise<StacksApiResponse<any>>;
};

/**
 * 5. Call read-only function in fast mode (no cost and memory tracking)
 * POST /v3/contracts/fast-call-read/{contract_address}/{contract_name}/{function_name}
 * Note: Requires Authorization header usually, but on public nodes it might vary.
 */
export const fastCallReadOnlyFunction = async (
    contractAddress: string,
    contractName: string,
    functionName: string,
    senderAddress: string,
    args: string[]
) => {
    const url = `${STACKS_API_BASE_URL}/v3/contracts/fast-call-read/${contractAddress}/${contractName}/${functionName}`;
    // Note: Public nodes might not support v3 fast-call-read without auth, or at all.
    // We'll try it, but fall back or handle errors gracefully in usage.
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: senderAddress,
            arguments: args
        })
    });
    if (!response.ok) throw new Error(`Error calling fast read-only function: ${response.statusText}`);
    return response.json() as Promise<StacksApiResponse<any>>;
};

/**
 * 6. Get trait implementation details
 * GET /v2/traits/{contract_address}/{contract_name}/{trait_contract_address}/{trait_contract_name}/{trait_name}
 */
export const getTraitImplementation = async (
    contractAddress: string,
    contractName: string,
    traitContractAddress: string,
    traitContractName: string,
    traitName: string
) => {
    const url = `${STACKS_API_BASE_URL}/v2/traits/${contractAddress}/${contractName}/${traitContractAddress}/${traitContractName}/${traitName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching trait implementation: ${response.statusText}`);
    return response.json() as Promise<{ is_implemented: boolean }>;
};

/**
 * 7. Get contract data variable
 * GET /v2/data_var/{principal}/{contract_name}/{var_name}
 */
export const getDataVar = async (
    contractAddress: string,
    contractName: string,
    varName: string
) => {
    const url = `${STACKS_API_BASE_URL}/v2/data_var/${contractAddress}/${contractName}/${varName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching data variable: ${response.statusText}`);
    return response.json() as Promise<{ data: string; proof?: string }>;
};

/**
 * 8. Get the value of a constant inside a contract
 * GET /v2/constant_val/{contract_address}/{contract_name}/{constant_name}
 */
export const getConstantVal = async (
    contractAddress: string,
    contractName: string,
    constantName: string
) => {
    const url = `${STACKS_API_BASE_URL}/v2/constant_val/${contractAddress}/${contractName}/${constantName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching constant value: ${response.statusText}`);
    return response.json() as Promise<{ data: string }>;
};

// --- Helper for specific project needs ---

export const getSmartContractMetadata = async (contractAddress: string, contractName: string) => {
    try {
        const [source, interfaceData] = await Promise.all([
            getContractSource(contractAddress, contractName),
            getContractInterface(contractAddress, contractName)
        ]);
        return { source, interface: interfaceData };
    } catch (error) {
        console.error("Failed to fetch contract metadata", error);
        return null;
    }
};

// --- Transaction History ---

export interface Transaction {
    tx_id: string;
    tx_status: string;
    tx_type: string;
    fee_rate: string;
    sender_address: string;
    sponsored: boolean;
    block_height: number;
    burn_block_time: number;
    block_time?: number; // Added for convenience (mapped from burn_block_time or receipt_time)
    receipt_time?: number; // For mempool transactions
    parent_tx_id: string;
    tx_index: number;
    token_transfer?: {
        recipient_address: string;
        amount: string;
        memo: string;
    };
    contract_call?: {
        contract_id: string;
        function_name: string;
        function_args: {
            hex: string;
            repr: string;
            name: string;
            type: string;
        }[];
    };
    smart_contract?: {
        contract_id: string;
        source_code: string;
    };
    ft_transfers?: {
        asset_identifier: string;
        amount: string;
        sender?: string;
        recipient?: string;
    }[];
    [key: string]: any;
}

export interface TransactionListResponse {
    limit: number;
    offset: number;
    total: number;
    results: Transaction[];
}

export interface MempoolTransactionListResponse {
    limit: number;
    offset: number;
    total: number;
    results: Transaction[];
}

/**
 * Get account transactions
 * GET /extended/v1/address/{address}/transactions
 */
export const getAccountTransactions = async (address: string, limit: number = 50, offset: number = 0) => {
    const url = `${STACKS_API_BASE_URL}/extended/v1/address/${address}/transactions?limit=${limit}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching account transactions: ${response.statusText}`);
    return response.json() as Promise<TransactionListResponse>;
};

/**
 * Get account mempool transactions
 * GET /extended/v1/address/{address}/mempool
 */
export const getAccountMempoolTransactions = async (address: string, limit: number = 50, offset: number = 0) => {
    const url = `${STACKS_API_BASE_URL}/extended/v1/address/${address}/mempool?limit=${limit}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching account mempool transactions: ${response.statusText}`);
    return response.json() as Promise<MempoolTransactionListResponse>;
};

/**
 * Broadcast raw transaction
 * POST /v2/transactions
 */
export const broadcastTransaction = async (txHex: string | Uint8Array) => {
    const url = `${STACKS_API_BASE_URL}/v2/transactions`;
    const body = typeof txHex === 'string' ? txHex : Array.from(txHex).map(b => b.toString(16).padStart(2, '0')).join('');

    // content: application/json -> schema: { tx: string (hex) }
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx: body })
    });

    if (!response.ok) {
        try {
            const err = await response.json();
            throw new Error(`Broadcast failed: ${err.error} - ${err.reason}`);
        } catch (e: any) {
            throw new Error(`Error broadcasting transaction: ${response.statusText}`);
        }
    }
    return response.json() as Promise<string>; // Returns txid
};

/**
 * Retrieve transaction details by TXID
 * GET /v3/transaction/{txid}
 */
export const getTransactionById = async (txid: string) => {
    const url = `${STACKS_API_BASE_URL}/v3/transaction/${txid}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching transaction: ${response.statusText}`);
    return response.json() as Promise<{
        index_block_hash: string;
        tx: string; // Hex
        result: string; // Hex Clarity result
    }>;
};

/**
 * Get unconfirmed transaction
 * GET /v2/transactions/unconfirmed/{txid}
 */
export const getUnconfirmedTransactionById = async (txid: string) => {
    const url = `${STACKS_API_BASE_URL}/v2/transactions/unconfirmed/${txid}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error fetching unconfirmed transaction: ${response.statusText}`);
    return response.json() as Promise<{
        tx: string;
        status: "Mempool" | { Microblock: { block_hash: string; seq: number } };
    }>;
};
