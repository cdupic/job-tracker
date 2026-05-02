// src/hooks/useOpenRouter.ts
//
// Responsabilités :
//  1. Stocker la clé API chiffrée dans localStorage (AES-GCM via Web Crypto)
//  2. Tester la validité de la clé
//  3. Stocker le modèle choisi
//  4. Fetcher + cacher les modèles OpenRouter (refresh auto si > 7 jours)

import { useState, useCallback, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY_ENC    = 'jat_or_key_enc'     // clé chiffrée (base64 JSON)
const STORAGE_KEY_SALT   = 'jat_or_key_salt'    // sel de dérivation (base64)
const STORAGE_KEY_MODEL  = 'jat_or_model'       // model id choisi
const STORAGE_KEY_MODELS = 'jat_or_models_cache'// cache liste modèles
const MODELS_TTL_MS      = 7 * 24 * 60 * 60 * 1000  // 1 semaine

export const DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
export const OPENROUTER_KEY_URL    = 'https://openrouter.ai/api/v1/key'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface KeyInfo {
    label?: string
    limit?: number | null
    limit_remaining?: number | null
    is_free_tier?: boolean
    usage?: number
}

export interface OpenRouterModel {
    id: string
    name: string
    description?: string
    pricing?: {
        prompt: string    // cost per token as string, "0" = free
        completion: string
    }
    context_length?: number
    isFree?: boolean    // derived
}

interface ModelsCache {
    models: OpenRouterModel[]
    fetchedAt: number   // Date.now()
}

// ── Web Crypto helpers ────────────────────────────────────────────────────────
// On dérive une clé AES-GCM depuis un mot de passe fixe + sel aléatoire par device.
// Le "mot de passe" est une constante connue du code — la protection est contre
// la lecture directe du localStorage, pas contre un attaquant qui a le code source.
// Pour une vraie app multi-utilisateurs, utiliser un backend.

const DERIVE_PASSWORD = 'jat-openrouter-v1'

async function getOrCreateSalt(): Promise<Uint8Array> {
    const stored = localStorage.getItem(STORAGE_KEY_SALT)
    if (stored) {
        return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    }
    const salt = crypto.getRandomValues(new Uint8Array(16))
    localStorage.setItem(STORAGE_KEY_SALT, btoa(String.fromCharCode(...salt)))
    return salt
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(DERIVE_PASSWORD),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    )
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

async function encryptApiKey(apiKey: string): Promise<string> {
    const salt = await getOrCreateSalt()
    const key = await deriveKey(salt)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const enc = new TextEncoder()
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(apiKey)
    )
    const payload = {
        iv: btoa(String.fromCharCode(...iv)),
        ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    }
    return JSON.stringify(payload)
}

async function decryptApiKey(stored: string): Promise<string | null> {
    try {
        const { iv: ivB64, ct: ctB64 } = JSON.parse(stored)
        const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
        const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
        const salt = await getOrCreateSalt()
        const key = await deriveKey(salt)
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
        return new TextDecoder().decode(decrypted)
    } catch {
        return null
    }
}

// ── Models cache ──────────────────────────────────────────────────────────────
function readModelsCache(): ModelsCache | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY_MODELS)
        if (!raw) {
            // Fallback: check localStorage for persistence across sessions
            const ls = localStorage.getItem(STORAGE_KEY_MODELS)
            if (!ls) return null
            return JSON.parse(ls) as ModelsCache
        }
        return JSON.parse(raw) as ModelsCache
    } catch {
        return null
    }
}

function writeModelsCache(data: ModelsCache): void {
    const str = JSON.stringify(data)
    sessionStorage.setItem(STORAGE_KEY_MODELS, str)
    localStorage.setItem(STORAGE_KEY_MODELS, str)  // persist across sessions
}

function isCacheStale(cache: ModelsCache | null): boolean {
    if (!cache) return true
    return Date.now() - cache.fetchedAt > MODELS_TTL_MS
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export type ApiKeyStatus = 'unknown' | 'valid' | 'invalid' | 'testing'

export function useOpenRouter() {
    // API key state
    const [hasKey, setHasKey] = useState<boolean>(() => !!localStorage.getItem(STORAGE_KEY_ENC))
    const [keyStatus, setKeyStatus] = useState<ApiKeyStatus>('unknown')

    // Model state
    const [selectedModel, setSelectedModelState] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY_MODEL) ?? DEFAULT_MODEL
    })

    // Models list
    const [models, setModels] = useState<OpenRouterModel[]>(() => {
        return readModelsCache()?.models ?? []
    })
    const [modelsLoading, setModelsLoading] = useState(false)
    const [modelsError, setModelsError] = useState<string | null>(null)
    const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)

    // ── Get decrypted key (for API calls) ────────────────────────────────────
    const getApiKey = useCallback(async (): Promise<string | null> => {
        const stored = localStorage.getItem(STORAGE_KEY_ENC)
        if (!stored) return null
        return decryptApiKey(stored)
    }, [])

    // ── Save key ─────────────────────────────────────────────────────────────
    const saveApiKey = useCallback(async (apiKey: string): Promise<void> => {
        if (!apiKey.trim()) {
            localStorage.removeItem(STORAGE_KEY_ENC)
            setHasKey(false)
            setKeyStatus('unknown')
            return
        }
        const encrypted = await encryptApiKey(apiKey.trim())
        localStorage.setItem(STORAGE_KEY_ENC, encrypted)
        setHasKey(true)
    }, [])

    // ── Test key via GET /api/v1/key (pas de consommation de tokens) ────────────
    const testApiKey = useCallback(async (apiKey?: string): Promise<boolean> => {
        setKeyStatus('testing')
        try {
            const key = apiKey ?? await getApiKey()
            if (!key) { setKeyStatus('invalid'); return false }

            const res = await fetch(OPENROUTER_KEY_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'JAT Key Test',
                },
            })

            if (res.status === 401) {
                setKeyStatus('invalid')
                setKeyInfo(null)
                return false
            }
            if (!res.ok) {
                // Autre erreur réseau — on considère la clé invalide par sécurité
                setKeyStatus('invalid')
                setKeyInfo(null)
                return false
            }

            const json = await res.json()
            const info: KeyInfo = json.data ?? {}
            setKeyInfo(info)
            setKeyStatus('valid')
            return true
        } catch {
            setKeyStatus('invalid')
            setKeyInfo(null)
            return false
        }
    }, [getApiKey])

    // ── Save & test key (combined action for UI) ──────────────────────────────
    const saveAndTestKey = useCallback(async (apiKey: string): Promise<boolean> => {
        await saveApiKey(apiKey)
        return testApiKey(apiKey)
    }, [saveApiKey, testApiKey])

    // ── Delete key ────────────────────────────────────────────────────────────
    const deleteApiKey = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY_ENC)
        localStorage.removeItem(STORAGE_KEY_SALT)
        setHasKey(false)
        setKeyStatus('unknown')
    }, [])

    // ── Set model ─────────────────────────────────────────────────────────────
    const setSelectedModel = useCallback((modelId: string) => {
        localStorage.setItem(STORAGE_KEY_MODEL, modelId)
        setSelectedModelState(modelId)
    }, [])

    // ── Fetch models ─────────────────────────────────────────────────────────
    const fetchModels = useCallback(async (force = false) => {
        const cache = readModelsCache()
        if (!force && !isCacheStale(cache) && cache) {
            setModels(cache.models)
            return
        }

        setModelsLoading(true)
        setModelsError(null)
        try {
            // Récupère la clé pour authentifier la requête (liste plus complète avec clé)
            const apiKey = await getApiKey()
            const authHeaders: Record<string, string> = {
                'HTTP-Referer': 'https://localhost',
                'X-Title': 'JAT',
            }
            if (apiKey) authHeaders['Authorization'] = `Bearer ${apiKey}`

            const res = await fetch(OPENROUTER_MODELS_URL, { headers: authHeaders })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const raw: OpenRouterModel[] = (data.data ?? []).map((m: any) => ({
                id: m.id,
                name: m.name,
                description: m.description,
                pricing: m.pricing,
                context_length: m.context_length,
                isFree: m.pricing
                    ? parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0
                    : false,
            }))
            const sorted = raw.sort((a, b) => a.name.localeCompare(b.name))
            writeModelsCache({ models: sorted, fetchedAt: Date.now() })
            setModels(sorted)
        } catch (e) {
            setModelsError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setModelsLoading(false)
        }
    }, [])

    // ── Auto-verify key on mount if one is stored ───────────────────────────────
    useEffect(() => {
        if (localStorage.getItem(STORAGE_KEY_ENC)) {
            // Vérifie silencieusement la clé stockée au démarrage
            testApiKey()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-fetch models on mount (once per session, respecting TTL) ────────────
    useEffect(() => {
        const sessionRaw = sessionStorage.getItem(STORAGE_KEY_MODELS)
        if (sessionRaw) {
            try {
                const cache = JSON.parse(sessionRaw) as ModelsCache
                if (!isCacheStale(cache)) {
                    setModels(cache.models)
                    return
                }
            } catch { /* fall through */ }
        }
        fetchModels()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        // Key
        hasKey,
        keyStatus,
        getApiKey,
        saveApiKey,
        testApiKey,
        saveAndTestKey,
        deleteApiKey,
        // Model
        selectedModel,
        setSelectedModel,
        // Models list
        models,
        modelsLoading,
        modelsError,
        fetchModels,
        // Key info (credits, tier, etc.)
        keyInfo,
    }
}
