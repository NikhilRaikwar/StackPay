
import { useState } from 'react';
import {
    getContractInterface,
    getContractSource,
    getMapEntry,
    getDataVar,
    getConstantVal,
    callReadOnlyFunction,
    fastCallReadOnlyFunction
} from '../utils/stacksApi';
import { PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME } from '../utils/stacksUtils';
import { serializeCV, cvToJSON, deserializeCV, stringAsciiCV } from '@stacks/transactions';

export const ContractDebug = () => {
    const [activeTab, setActiveTab] = useState('info');
    const [output, setOutput] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Inputs for testing
    const [mapId, setMapId] = useState('');
    const [mapKey, setMapKey] = useState('');
    const [fnName, setFnName] = useState('get-total-payments-created');
    const [fnArgs, setFnArgs] = useState('');

    const handleApiCall = async (callFn: () => Promise<any>) => {
        setLoading(true);
        setError(null);
        setOutput(null);
        try {
            const result = await callFn();
            setOutput(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const bytesToHex = (bytes: Uint8Array) => {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    return (
        <div className="terminal-card p-6 max-w-4xl mx-auto mt-10">
            <h2 className="text-xl font-bold text-neon-green mb-4">Contract API Debugger</h2>
            <div className="mb-4">
                <p className="text-xs font-mono text-text-muted">Target: {PAYMENT_CONTRACT_ADDRESS}.{PAYMENT_CONTRACT_NAME}</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-terminal-border pb-4">
                {['info', 'source', 'maps', 'vars', 'read', 'fast-read'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 text-sm font-mono rounded ${activeTab === tab ? 'bg-neon-cyan text-terminal-bg' : 'bg-terminal-card border border-terminal-border text-text-muted'
                            }`}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {activeTab === 'info' && (
                    <button
                        onClick={() => handleApiCall(() => getContractInterface(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME))}
                        className="btn-neon text-xs px-4 py-2"
                    >
                        Fetch Interface
                    </button>
                )}

                {activeTab === 'source' && (
                    <button
                        onClick={() => handleApiCall(() => getContractSource(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME))}
                        className="btn-neon text-xs px-4 py-2"
                    >
                        Fetch Source Code
                    </button>
                )}

                {activeTab === 'maps' && (
                    <div className="space-y-2">
                        <input
                            className="w-full bg-terminal-bg border border-terminal-border p-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:border-neon-cyan outline-none rounded"
                            placeholder="Map Name (e.g., payment-requests)"
                            value={mapId}
                            onChange={e => setMapId(e.target.value)}
                        />
                        <input
                            className="w-full bg-terminal-bg border border-terminal-border p-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:border-neon-cyan outline-none rounded"
                            placeholder="Key (String ASCII)"
                            value={mapKey}
                            onChange={e => setMapKey(e.target.value)}
                        />
                        <button
                            onClick={() => handleApiCall(async () => {
                                // Assuming key is string-ascii for this demo
                                const val = serializeCV(stringAsciiCV(mapKey));
                                const serializedKey = typeof val === 'string' ? val : bytesToHex(val);
                                const hexKey = `0x${serializedKey}`;
                                return getMapEntry(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, mapId || 'payment-requests', hexKey);
                            })}
                            className="btn-neon text-xs px-4 py-2"
                        >
                            Fetch Map Entry
                        </button>
                    </div>
                )}

                {activeTab === 'vars' && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleApiCall(() => getDataVar(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, 'total-volume'))}
                                className="btn-neon text-xs px-4 py-2 flex-1"
                            >
                                Get Total Volume (Var)
                            </button>
                            <button
                                onClick={() => handleApiCall(() => getConstantVal(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, 'usdcx-contract'))}
                                className="btn-neon text-xs px-4 py-2 flex-1 bg-neon-magenta text-white"
                            >
                                Get USDCx Address (Const)
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'read' && (
                    <div className="space-y-2">
                        <input
                            className="w-full bg-terminal-bg border border-terminal-border p-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:border-neon-cyan outline-none rounded"
                            placeholder="Function Name (e.g., get-payment-request)"
                            value={fnName}
                            onChange={e => setFnName(e.target.value)}
                        />
                        <input
                            className="w-full bg-terminal-bg border border-terminal-border p-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:border-neon-cyan outline-none rounded"
                            placeholder="Arguments (Hex encoded, comma separated) - Leave empty if none"
                            value={fnArgs}
                            onChange={e => setFnArgs(e.target.value)}
                        />
                        <button
                            onClick={() => handleApiCall(async () => {
                                // Arguments handling is complex in a generic generic debugger, passing empty for no-arg funcs
                                // For specific tests, add logic here.
                                // Defaulting to sender = contract address for read-only
                                const args = fnArgs ? fnArgs.split(',').map(s => s.trim()) : [];
                                const result = await callReadOnlyFunction(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, fnName, PAYMENT_CONTRACT_ADDRESS, args);
                                if (result.okay && result.result) {
                                    const decoded = deserializeCV(result.result);
                                    return { ...result, decoded: cvToJSON(decoded) };
                                }
                                return result;
                            })}
                            className="btn-neon text-xs px-4 py-2"
                        >
                            Call Read-Only
                        </button>
                    </div>
                )}

                {activeTab === 'fast-read' && (
                    <div className="space-y-2">
                        <input
                            className="w-full bg-terminal-bg border border-terminal-border p-2 text-sm text-white font-mono placeholder:text-text-muted/50 focus:border-neon-cyan outline-none rounded"
                            placeholder="Function Name (e.g. get-total-volume)"
                            value={fnName}
                            onChange={e => setFnName(e.target.value)}
                        />
                        <button
                            onClick={() => handleApiCall(async () => {
                                const result = await fastCallReadOnlyFunction(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, fnName, PAYMENT_CONTRACT_ADDRESS, []);
                                if (result.okay && result.result) {
                                    const decoded = deserializeCV(result.result);
                                    return { ...result, decoded: cvToJSON(decoded) };
                                }
                                return result;
                            })}
                            className="btn-neon text-xs px-4 py-2 bg-neon-yellow text-terminal-bg border-neon-yellow"
                        >
                            Fast Call (No Cost)
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-black rounded border border-terminal-border min-h-[200px] max-h-[500px] overflow-auto">
                {loading && <div className="text-neon-cyan animate-pulse">Loading data from blockchain...</div>}
                {error && <div className="text-red-500 font-mono">Error: {error}</div>}
                {output && (
                    <pre className="text-xs font-mono text-neon-green/80 whitespace-pre-wrap">
                        {JSON.stringify(output, null, 2)}
                    </pre>
                )}
                {!loading && !error && !output && <div className="text-text-muted text-xs italic">Output will appear here...</div>}
            </div>
        </div>
    );
};
