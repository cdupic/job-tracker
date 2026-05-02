// src/components/openrouter/OpenRouterSettingsSection.tsx
import { useState, useMemo } from 'react'
import {
    Eye, EyeOff, Check, X, Loader2, RefreshCw,
    Search, Zap, Lock, Unlock, AlertTriangle, Trash2, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    useOpenRouter,
    DEFAULT_MODEL,
    type OpenRouterModel,
    type ApiKeyStatus,
    type KeyInfo,
} from '@/hooks/useOpenRouter'

// ── Key status badge ──────────────────────────────────────────────────────────
function KeyStatusBadge({ status }: { status: ApiKeyStatus }) {
    if (status === 'unknown') return null
    if (status === 'testing') return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Test en cours…
    </span>
    )
    if (status === 'valid') return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
      <Check className="h-3.5 w-3.5" /> Clé valide
    </span>
    )
    return (
        <span className="flex items-center gap-1 text-xs text-destructive font-medium">
      <X className="h-3.5 w-3.5" /> Clé invalide
    </span>
    )
}

// ── Model card ────────────────────────────────────────────────────────────────
function ModelCard({
                       model, selected, onSelect,
                   }: {
    model: OpenRouterModel
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'flex items-start gap-3 text-left p-3 rounded-lg border transition-all w-full',
                selected
                    ? 'border-foreground bg-accent shadow-sm'
                    : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/30'
            )}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{model.name}</span>
                    {model.isFree && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
              <Zap className="h-2.5 w-2.5" /> gratuit
            </span>
                    )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{model.id}</p>
                {model.context_length && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {(model.context_length / 1000).toFixed(0)}k tokens
                    </p>
                )}
            </div>
            {selected && <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />}
        </button>
    )
}

// ── Main section ──────────────────────────────────────────────────────────────
export function OpenRouterSettingsSection() {
    const {
        hasKey, keyStatus, keyInfo,
        saveAndTestKey, deleteApiKey,
        selectedModel, setSelectedModel,
        models, modelsLoading, modelsError, fetchModels,
    } = useOpenRouter()

    // Key input state
    const [keyInput, setKeyInput] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [saving, setSaving] = useState(false)

    // Model picker state
    const [modelSearch, setModelSearch] = useState('')
    const [filterFree, setFilterFree] = useState<'all' | 'free' | 'paid'>('all')
    const [showPicker, setShowPicker] = useState(false)

    // ── Save key ──────────────────────────────────────────────────────────────
    async function handleSaveKey() {
        if (!keyInput.trim()) return
        setSaving(true)
        await saveAndTestKey(keyInput.trim())
        setKeyInput('')
        setSaving(false)
    }

    // ── Filtered models ───────────────────────────────────────────────────────
    const filteredModels = useMemo(() => {
        let list = models
        if (filterFree === 'free') list = list.filter(m => m.isFree)
        if (filterFree === 'paid') list = list.filter(m => !m.isFree)
        if (modelSearch.trim()) {
            const q = modelSearch.toLowerCase()
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
            )
        }
        return list
    }, [models, filterFree, modelSearch])

    const currentModel = models.find(m => m.id === selectedModel)
    const isDefault = selectedModel === DEFAULT_MODEL

    return (
        <section className="bg-card border border-border rounded-xl p-6 mb-4">
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h2 className="text-sm font-semibold">OpenRouter — IA</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Clé API et modèle pour la génération des emails de relance
                    </p>
                </div>
                <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Obtenir une clé <ExternalLink className="h-3 w-3" />
                </a>
            </div>

            {/* ── API Key ── */}
            <div className="flex flex-col gap-3">
                <Label>Clé API OpenRouter</Label>

                {hasKey ? (
                    /* Key already saved — show status + account info */
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/40">
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            {keyStatus === 'valid'
                                ? <Lock className="h-4 w-4 text-emerald-500" />
                                : keyStatus === 'testing' || keyStatus === 'unknown'
                                    ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                    : <Unlock className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-foreground font-medium">
                  {keyStatus === 'valid'
                      ? 'Clé enregistrée et chiffrée'
                      : keyStatus === 'testing' || keyStatus === 'unknown'
                          ? 'Vérification de la clé…'
                          : 'Clé enregistrée (erreur de validation)'}
                </span>
                                <KeyStatusBadge status={keyStatus} />
                            </div>
                            {/* Infos compte depuis GET /api/v1/key */}
                            {keyInfo && keyStatus === 'valid' && (
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    {keyInfo.is_free_tier && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Zap className="h-2.5 w-2.5" /> Free tier
                    </span>
                                    )}
                                    {keyInfo.limit_remaining != null && (
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Crédits restants&nbsp;: {Number(keyInfo.limit_remaining).toFixed(4)}
                    </span>
                                    )}
                                    {keyInfo.usage != null && (
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Utilisé&nbsp;: {Number(keyInfo.usage).toFixed(4)}
                    </span>
                                    )}
                                    {keyInfo.label && (
                                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]" title={keyInfo.label}>
                      {keyInfo.label}
                    </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm('Supprimer la clé API ?')) deleteApiKey()
                            }}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    /* No key saved yet — or unknown status — show input */
                    <>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyInput}
                                    onChange={e => setKeyInput(e.target.value)}
                                    placeholder="sk-or-v1-…"
                                    className="pr-9 font-mono text-xs"
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey() }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleSaveKey}
                                disabled={!keyInput.trim() || saving}
                                className="shrink-0"
                            >
                                {saving
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Check className="h-4 w-4" />}
                                Enregistrer & tester
                            </Button>
                        </div>
                        {keyStatus === 'testing' && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Test de la clé en cours…
                            </div>
                        )}
                        {keyStatus === 'invalid' && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <X className="h-3.5 w-3.5" /> Clé refusée par OpenRouter. Vérifie qu'elle est correcte.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* ── Model picker ── */}
            <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-border">
                <div className="flex items-center justify-between">
                    <Label>Modèle</Label>
                    <button
                        type="button"
                        onClick={() => fetchModels(true)}
                        disabled={modelsLoading}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={cn('h-3 w-3', modelsLoading && 'animate-spin')} />
                        Actualiser
                    </button>
                </div>

                {/* Current model display */}
                <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:border-foreground/30 transition-colors"
                    onClick={() => setShowPicker(v => !v)}
                >
                    <div className="flex-1 min-w-0">
                        {currentModel ? (
                            <>
                                <p className="text-sm font-medium text-foreground truncate">{currentModel.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] font-mono text-muted-foreground truncate">{currentModel.id}</p>
                                    {currentModel.isFree && (
                                        <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded shrink-0">gratuit</span>
                                    )}
                                    {isDefault && (
                                        <span className="text-[9px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded shrink-0">défaut</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-foreground truncate">{selectedModel}</p>
                                {isDefault && <p className="text-[10px] text-muted-foreground">Modèle par défaut</p>}
                            </>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{showPicker ? '▲' : '▼'}</span>
                </div>

                {/* Picker panel */}
                {showPicker && (
                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
                        {/* Search + filter */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={modelSearch}
                                    onChange={e => setModelSearch(e.target.value)}
                                    placeholder="Rechercher un modèle…"
                                    className="pl-8 h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Free/paid filter pills */}
                        <div className="flex gap-1.5">
                            {(['all', 'free', 'paid'] as const).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilterFree(f)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all',
                                        filterFree === f
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                                    )}
                                >
                                    {f === 'all' && 'Tous'}
                                    {f === 'free' && <><Zap className="h-2.5 w-2.5" /> Gratuits</>}
                                    {f === 'paid' && 'Payants'}
                                </button>
                            ))}
                            {models.length > 0 && (
                                <span className="ml-auto text-[10px] font-mono text-muted-foreground self-center">
                  {filteredModels.length} modèle{filteredModels.length > 1 ? 's' : ''}
                </span>
                            )}
                        </div>

                        {/* List */}
                        {modelsLoading ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des modèles…
                            </div>
                        ) : modelsError ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {modelsError}
                            </div>
                        ) : filteredModels.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Aucun modèle trouvé</p>
                        ) : (
                            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto scrollbar-thin pr-0.5">
                                {filteredModels.map(model => (
                                    <ModelCard
                                        key={model.id}
                                        model={model}
                                        selected={model.id === selectedModel}
                                        onSelect={() => { setSelectedModel(model.id); setShowPicker(false) }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Reset to default */}
                        {!isDefault && (
                            <button
                                type="button"
                                onClick={() => { setSelectedModel(DEFAULT_MODEL); setShowPicker(false) }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center mt-1"
                            >
                                ↩ Revenir au modèle par défaut
                            </button>
                        )}
                    </div>
                )}

                {modelsError && !showPicker && (
                    <p className="text-xs text-muted-foreground">
                        Impossible de charger la liste des modèles.{' '}
                        <button onClick={() => fetchModels(true)} className="underline hover:text-foreground">Réessayer</button>
                    </p>
                )}
            </div>
        </section>
    )
}
