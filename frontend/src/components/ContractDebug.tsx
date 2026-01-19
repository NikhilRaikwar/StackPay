import { useState } from 'react';
import { motion } from 'framer-motion';
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

    const tabs = [
        { id: 'info', label: 'Interface' },
        { id: 'source', label: 'Source' },
        { id: 'maps', label: 'Maps' },
        { id: 'vars', label: 'Variables' },
        { id: 'read', label: 'Read-Only' },
        { id: 'fast-read', label: 'Fast Call' },
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-premium p-0 overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 border-b border-app-border bg-slate-50">
                    <h2 className="font-serif text-4xl mb-1">Debug</h2>
                    <p className="text-sm text-text-pale font-medium uppercase tracking-widest">Contract API Explorer</p>
                    <div className="mt-4 p-3 bg-white border border-app-border rounded-xl">
                        <p className="text-[10px] font-bold text-text-pale uppercase tracking-widest mb-1">Target Contract</p>
                        <p className="text-xs font-mono text-text-dim break-all">{PAYMENT_CONTRACT_ADDRESS}.{PAYMENT_CONTRACT_NAME}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="p-4 border-b border-app-border flex flex-wrap gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-accent-indigo text-white shadow-premium'
                                : 'bg-white text-text-dim border border-app-border hover:bg-app-hover'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {activeTab === 'info' && (
                        <button
                            onClick={() => handleApiCall(() => getContractInterface(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME))}
                            className="btn-primary"
                        >
                            Fetch Interface
                        </button>
                    )}

                    {activeTab === 'source' && (
                        <button
                            onClick={() => handleApiCall(() => getContractSource(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME))}
                            className="btn-primary"
                        >
                            Fetch Source Code
                        </button>
                    )}

                    {activeTab === 'maps' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Map Name</label>
                                <input
                                    className="input-premium"
                                    placeholder="e.g., payment-requests"
                                    value={mapId}
                                    onChange={e => setMapId(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Key (String ASCII)</label>
                                <input
                                    className="input-premium"
                                    placeholder="Enter key"
                                    value={mapKey}
                                    onChange={e => setMapKey(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleApiCall(async () => {
                                    const val = serializeCV(stringAsciiCV(mapKey));
                                    const serializedKey = typeof val === 'string' ? val : bytesToHex(val);
                                    const hexKey = `0x${serializedKey}`;
                                    return getMapEntry(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, mapId || 'payment-requests', hexKey);
                                })}
                                className="btn-primary"
                            >
                                Fetch Map Entry
                            </button>
                        </div>
                    )}

                    {activeTab === 'vars' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleApiCall(() => getDataVar(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, 'total-volume'))}
                                className="btn-primary"
                            >
                                Get Total Volume
                            </button>
                            <button
                                onClick={() => handleApiCall(() => getConstantVal(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, 'usdcx-contract'))}
                                className="btn-secondary"
                            >
                                Get USDCx Address
                            </button>
                        </div>
                    )}

                    {activeTab === 'read' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Function Name</label>
                                <input
                                    className="input-premium"
                                    placeholder="e.g., get-payment-request"
                                    value={fnName}
                                    onChange={e => setFnName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Arguments (Hex, comma separated)</label>
                                <input
                                    className="input-premium"
                                    placeholder="Leave empty if none"
                                    value={fnArgs}
                                    onChange={e => setFnArgs(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleApiCall(async () => {
                                    const args = fnArgs ? fnArgs.split(',').map(s => s.trim()) : [];
                                    const result = await callReadOnlyFunction(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, fnName, PAYMENT_CONTRACT_ADDRESS, args);
                                    if (result.okay && result.result) {
                                        const decoded = deserializeCV(result.result);
                                        return { ...result, decoded: cvToJSON(decoded) };
                                    }
                                    return result;
                                })}
                                className="btn-primary"
                            >
                                Call Read-Only
                            </button>
                        </div>
                    )}

                    {activeTab === 'fast-read' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-pale uppercase tracking-widest">Function Name</label>
                                <input
                                    className="input-premium"
                                    placeholder="e.g., get-total-volume"
                                    value={fnName}
                                    onChange={e => setFnName(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleApiCall(async () => {
                                    const result = await fastCallReadOnlyFunction(PAYMENT_CONTRACT_ADDRESS, PAYMENT_CONTRACT_NAME, fnName, PAYMENT_CONTRACT_ADDRESS, []);
                                    if (result.okay && result.result) {
                                        const decoded = deserializeCV(result.result);
                                        return { ...result, decoded: cvToJSON(decoded) };
                                    }
                                    return result;
                                })}
                                className="h-14 px-8 bg-amber-500 text-white rounded-full font-bold transition-all duration-300 hover:bg-amber-600 shadow-premium active:scale-95"
                            >
                                Fast Call (No Cost)
                            </button>
                        </div>
                    )}

                    {/* Output */}
                    <div className="mt-8 p-6 bg-slate-900 rounded-2xl border border-slate-700 min-h-[200px] max-h-[400px] overflow-auto">
                        {loading && (
                            <div className="flex items-center gap-3 text-accent-indigo">
                                <div className="w-4 h-4 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-medium">Loading data from blockchain...</span>
                            </div>
                        )}
                        {error && (
                            <div className="text-red-400 text-sm font-mono">Error: {error}</div>
                        )}
                        {output && (
                            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                                {JSON.stringify(output, null, 2)}
                            </pre>
                        )}
                        {!loading && !error && !output && (
                            <div className="text-slate-500 text-sm italic">Output will appear here...</div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
