import React, { useState } from 'react';
import { Key, Copy, Trash2, Plus, Eye, EyeOff, BookOpen, Code2, Lock, Globe } from 'lucide-react';

const CARD = 'rounded-2xl border border-white/10 bg-white/5 p-6';
const INP = 'w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-gray-600 focus:outline-none focus:border-[#FF6B35]/60 focus:ring-1 focus:ring-[#FF6B35]/30';

const generatePublicKey = (env) => `estatemind_pk_${env === 'production' ? 'live' : 'test'}_${Math.random().toString(36).substr(2, 24)}`;
const generateSecretKey = (env) => `estatemind_sk_${env === 'production' ? 'live' : 'test'}_${Math.random().toString(36).substr(2, 40)}`;

const KEY_SCOPES = [
  { id: 'properties_read', label: 'Read Properties', description: 'Access property listings and details' },
  { id: 'valuations_read', label: 'Read Valuations', description: 'Access property valuations and estimates' },
  { id: 'analysis_read', label: 'Read Analysis', description: 'Access market analysis and trends' },
  { id: 'climate_read', label: 'Read Climate Data', description: 'Access climate risk assessments' },
  { id: 'simulator_read', label: 'Read Simulations', description: 'Access investment simulations' },
];

export default function AccountApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([
    {
      id: 1,
      name: 'Web App Integration',
      type: 'pair',
      publicKey: 'estatemind_pk_live_sample_public_key',
      secretKey: 'estatemind_sk_live_sample_secret_key',
      environment: 'production',
      scopes: ['properties_read', 'valuations_read', 'analysis_read'],
      created: '2026-01-15',
      lastUsed: '2026-05-09',
      visibleSecret: false,
    },
    {
      id: 2,
      name: 'Mobile App Development',
      type: 'pair',
      publicKey: 'estatemind_pk_test_sample_public_key',
      secretKey: 'estatemind_sk_test_sample_secret_key',
      environment: 'development',
      scopes: ['properties_read', 'valuations_read', 'analysis_read', 'climate_read'],
      created: '2026-02-20',
      lastUsed: '2026-05-08',
      visibleSecret: false,
    },
  ]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyConfig, setNewKeyConfig] = useState({
    name: '',
    environment: 'development',
    scopes: [],
  });
  const [copied, setCopied] = useState(null);
  const [msg, setMsg] = useState('');

  const handleCopy = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleVisibility = (id) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, visibleSecret: !k.visibleSecret } : k))
    );
  };

  const handleToggleScope = (scope) => {
    setNewKeyConfig((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleCreateKey = () => {
    if (!newKeyConfig.name.trim()) {
      setMsg('Please enter a key name');
      return;
    }

    if (newKeyConfig.scopes.length === 0) {
      setMsg('Please select at least one scope');
      return;
    }

    const newKey = {
      id: apiKeys.length + 1,
      name: newKeyConfig.name,
      type: 'pair',
      publicKey: generatePublicKey(newKeyConfig.environment),
      secretKey: generateSecretKey(newKeyConfig.environment),
      environment: newKeyConfig.environment,
      scopes: newKeyConfig.scopes,
      created: new Date().toISOString().split('T')[0],
      lastUsed: null,
      visibleSecret: false,
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setNewKeyConfig({ name: '', environment: 'development', scopes: [] });
    setShowCreateForm(false);
    setMsg('API key pair created successfully');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDeleteKey = (id) => {
    const ok = window.confirm('This action cannot be undone. The API key will be permanently deleted.');
    if (ok) {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      setMsg('API key deleted');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const getScopeLabel = (scopeId) => {
    const scope = KEY_SCOPES.find((s) => s.id === scopeId);
    return scope ? scope.label : scopeId;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0B0F19] via-[#1A2332] to-[#0B0F19] px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl space-y-6">
<<<<<<< HEAD
=======
        {/* Header */}
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
        <section className={CARD}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-[#FF6B35]" />
              <div>
                <h1 className="text-3xl font-black text-white">API Keys</h1>
<<<<<<< HEAD
                <p className="mt-1 text-sm text-gray-400">Manage credentials to integrate EstateMind with your platform</p>
=======
                <p className="text-sm text-gray-400 mt-1">Manage credentials to integrate EstateMind with your platform</p>
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-lg bg-[#FF6B35] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#E85C2C]"
            >
              <Plus size={16} />
              New Key
            </button>
          </div>
          {msg && <p className="mt-3 text-sm text-green-300">{msg}</p>}
        </section>

        {showCreateForm && (
          <section className={CARD}>
            <h3 className="mb-4 text-lg font-semibold text-white">Create New API Key Pair</h3>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Key Name *</label>
                <input
                  type="text"
                  value={newKeyConfig.name}
                  onChange={(e) => setNewKeyConfig({ ...newKeyConfig, name: e.target.value })}
                  placeholder="e.g., Production Web Integration"
                  className={INP}
                />
<<<<<<< HEAD
                <p className="mt-1 text-xs text-gray-500">A descriptive name to help you identify this key</p>
=======
                <p className="text-xs text-gray-500 mt-1">A descriptive name to help you identify this key</p>
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Environment *</label>
                <div className="grid gap-3 md:grid-cols-2">
                  {['development', 'production'].map((env) => (
                    <button
                      key={env}
                      onClick={() => setNewKeyConfig({ ...newKeyConfig, environment: env })}
<<<<<<< HEAD
                      className={`rounded-lg border p-3 text-left transition-colors ${
=======
                      className={`p-3 rounded-lg border transition-colors text-left ${
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                        newKeyConfig.environment === env
                          ? 'border-[#FF6B35] bg-[#FF6B35]/20 text-white'
                          : 'border-white/15 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      <p className="font-semibold capitalize">{env}</p>
<<<<<<< HEAD
                      <p className="mt-1 text-xs">
=======
                      <p className="text-xs mt-1">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                        {env === 'development' ? 'For testing and development' : 'For live production'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-gray-300">Permissions (Scopes) *</label>
                <div className="space-y-2">
                  {KEY_SCOPES.map((scope) => (
<<<<<<< HEAD
                    <label key={scope.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/5">
=======
                    <label key={scope.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                      <input
                        type="checkbox"
                        checked={newKeyConfig.scopes.includes(scope.id)}
                        onChange={() => handleToggleScope(scope.id)}
<<<<<<< HEAD
                        className="mt-1 h-4 w-4 rounded accent-[#FF6B35]"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{scope.label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{scope.description}</p>
=======
                        className="w-4 h-4 rounded accent-[#FF6B35] mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{scope.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{scope.description}</p>
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={handleCreateKey}
<<<<<<< HEAD
                  className="rounded-lg bg-[#FF6B35] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#E85C2C]"
=======
                  className="px-6 py-2.5 rounded-lg bg-[#FF6B35] text-white font-semibold hover:bg-[#E85C2C] transition-colors"
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                >
                  Create Key Pair
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
<<<<<<< HEAD
                  className="rounded-lg border border-white/15 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-white/5"
=======
                  className="px-6 py-2.5 rounded-lg border border-white/15 text-white font-semibold hover:bg-white/5 transition-colors"
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

<<<<<<< HEAD
=======
        {/* API Keys List */}
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <section className={CARD}>
              <p className="text-center text-gray-400">No API keys yet. Create one to get started.</p>
            </section>
          ) : (
            apiKeys.map((apiKey) => (
              <section key={apiKey.id} className={CARD}>
<<<<<<< HEAD
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{apiKey.name}</h3>
                      <span className={`rounded px-2 py-1 text-xs font-medium ${
=======
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">{apiKey.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                        apiKey.environment === 'production'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {apiKey.environment.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Created: {apiKey.created} {apiKey.lastUsed && `• Last used: ${apiKey.lastUsed}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(apiKey.id)}
<<<<<<< HEAD
                    className="rounded-lg p-2 transition-colors hover:bg-red-500/20"
=======
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>

<<<<<<< HEAD
                <div className="mb-4 border-b border-white/10 pb-4">
                  <p className="mb-2 text-xs font-medium text-gray-400">PERMISSIONS</p>
                  <div className="flex flex-wrap gap-2">
                    {apiKey.scopes.map((scope) => (
                      <span key={scope} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-gray-300">
=======
                {/* Scopes */}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-xs font-medium text-gray-400 mb-2">PERMISSIONS</p>
                  <div className="flex flex-wrap gap-2">
                    {apiKey.scopes.map((scope) => (
                      <span key={scope} className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium text-gray-300">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                        {getScopeLabel(scope)}
                      </span>
                    ))}
                  </div>
                </div>

<<<<<<< HEAD
                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-400">PUBLIC KEY</p>
                      <button
                        onClick={() => handleCopy(apiKey.publicKey, `pub_${apiKey.id}`)}
                        className="rounded p-1 transition-colors hover:bg-white/10"
                      >
                        <Copy size={14} className={copied === `pub_${apiKey.id}` ? 'text-green-400' : 'text-gray-400'} />
                      </button>
                    </div>
                    <div className="break-all rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-xs text-gray-300">
=======
                {/* Keys Display */}
                <div className="space-y-3">
                  {/* Public Key */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-400">PUBLIC KEY</p>
                      <button
                        onClick={() => handleCopy(apiKey.publicKey, `pub_${apiKey.id}`)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Copy
                          size={14}
                          className={copied === `pub_${apiKey.id}` ? 'text-green-400' : 'text-gray-400'}
                        />
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-gray-300 break-all">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                      {apiKey.publicKey}
                    </div>
                  </div>

<<<<<<< HEAD
                  <div>
                    <div className="mb-2 flex items-center justify-between">
=======
                  {/* Secret Key */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                      <p className="text-xs font-medium text-gray-400">SECRET KEY</p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleVisibility(apiKey.id)}
<<<<<<< HEAD
                          className="rounded p-1 transition-colors hover:bg-white/10"
=======
                          className="p-1 hover:bg-white/10 rounded transition-colors"
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                        >
                          {apiKey.visibleSecret ? (
                            <EyeOff size={14} className="text-gray-400" />
                          ) : (
                            <Eye size={14} className="text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(apiKey.secretKey, `sec_${apiKey.id}`)}
<<<<<<< HEAD
                          className="rounded p-1 transition-colors hover:bg-white/10"
                        >
                          <Copy size={14} className={copied === `sec_${apiKey.id}` ? 'text-green-400' : 'text-gray-400'} />
                        </button>
                      </div>
                    </div>
                    <div className="break-all rounded-lg border border-red-500/20 bg-black/40 p-3 font-mono text-xs text-gray-300">
                      {apiKey.visibleSecret ? apiKey.secretKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                    <p className="mt-2 text-xs text-red-400">⚠️ Keep your secret key confidential. Never expose it in client-side code.</p>
=======
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Copy
                            size={14}
                            className={copied === `sec_${apiKey.id}` ? 'text-green-400' : 'text-gray-400'}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-red-500/20 font-mono text-xs text-gray-300 break-all">
                      {apiKey.visibleSecret ? apiKey.secretKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                    <p className="text-xs text-red-400 mt-2">⚠️ Keep your secret key confidential. Never expose it in client-side code.</p>
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                  </div>
                </div>
              </section>
            ))
          )}
        </div>

<<<<<<< HEAD
        <section className={CARD}>
          <div className="mb-4 flex items-center gap-2">
=======
        {/* Integration Guide */}
        <section className={CARD}>
          <div className="flex items-center gap-2 mb-4">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
            <BookOpen size={18} className="text-[#FF6B35]" />
            <h2 className="text-xl font-semibold text-white">Integration Guide</h2>
          </div>

          <div className="space-y-4">
            <div>
<<<<<<< HEAD
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Code2 size={14} className="text-[#FF6B35]" />
                Authentication
              </h4>
              <div className="rounded-lg border border-white/5 bg-black/40 p-3">
                <p className="mb-2 font-mono text-xs text-gray-300">// Include Public Key in API requests</p>
                <p className="font-mono text-xs text-gray-300">curl -H "Authorization: Bearer estatemind_pk_..." https://api.estatemind.com/v1/properties</p>
=======
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Code2 size={14} className="text-[#FF6B35]" />
                Authentication
              </h4>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <p className="text-xs text-gray-300 font-mono mb-2">// Include Public Key in API requests</p>
                <p className="text-xs text-gray-300 font-mono">curl -H "Authorization: Bearer estatemind_pk_..." https://api.estatemind.com/v1/properties</p>
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
              </div>
            </div>

            <div>
<<<<<<< HEAD
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
=======
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                <Globe size={14} className="text-[#FF6B35]" />
                API Endpoints
              </h4>
              <div className="space-y-2 text-xs">
                <p className="text-gray-300"><span className="font-mono text-[#FF6B35]">GET</span> /v1/properties - List properties</p>
                <p className="text-gray-300"><span className="font-mono text-[#FF6B35]">GET</span> /v1/valuations - Get property valuations</p>
                <p className="text-gray-300"><span className="font-mono text-[#FF6B35]">GET</span> /v1/analysis - Get market analysis</p>
                <p className="text-gray-300"><span className="font-mono text-[#FF6B35]">GET</span> /v1/climate - Get climate risk data</p>
              </div>
            </div>

            <div>
<<<<<<< HEAD
              <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-[#FF6B35] hover:text-[#FFB38F]">
=======
              <a
                href="#"
                className="inline-flex items-center gap-2 text-[#FF6B35] hover:text-[#FFB38F] font-medium text-sm"
              >
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
                View Full API Documentation →
              </a>
            </div>
          </div>
        </section>

<<<<<<< HEAD
        <section className={CARD}>
          <div className="mb-4 flex items-center gap-2">
=======
        {/* Best Practices */}
        <section className={CARD}>
          <div className="flex items-center gap-2 mb-4">
>>>>>>> f285380 (fix: resolve Stripe payment form issues comprehensively)
            <Lock size={18} className="text-[#FF6B35]" />
            <h2 className="text-xl font-semibold text-white">Best Practices</h2>
          </div>

          <ul className="space-y-2 text-sm text-gray-300">
            <li>✓ Never commit API keys to version control</li>
            <li>✓ Use environment variables to store keys securely</li>
            <li>✓ Rotate keys regularly for security</li>
            <li>✓ Use the least permissive scopes needed</li>
            <li>✓ Monitor key usage in your dashboard</li>
            <li>✓ Delete unused keys immediately</li>
          </ul>
        </section>
      </div>
    </main>
  );
}