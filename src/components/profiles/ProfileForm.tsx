// src/components/profiles/ProfileForm.tsx
import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Loader2, GripVertical, X, Briefcase, BookOpen, FileText, Sparkles, AlertTriangle, CheckCircle2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type CandidateProfile, type ProfileExperience, useProfiles } from '@/hooks/useProfiles'
import { useCompanies } from '@/hooks/useCompanies'
import { useOpenRouter, OPENROUTER_URL } from '@/hooks/useOpenRouter'

interface ProfileFormProps {
    profile?: CandidateProfile
    onClose: () => void
}

function emptyExp(type: 'pro' | 'perso'): ProfileExperience {
    return {
        id: crypto.randomUUID(),
        type,
        title: '',
        organization: '',
        startDate: '',
        endDate: undefined,
        description: '',
    }
}

function MonthInput({ label, value, onChange, placeholder }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
    return (
        <div className="flex flex-col gap-1.5 flex-1">
            <Label>{label}</Label>
            <Input
                type="month"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? 'YYYY-MM'}
                className="text-sm"
            />
        </div>
    )
}

// ── Types pour l'extraction IA ─────────────────────────────────────────────────
interface ExtractedCV {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    skills?: string
    degrees?: string
    experiences?: Array<{
        type: 'pro' | 'perso'
        title: string
        organization: string
        startDate: string
        endDate?: string
        description: string
    }>
}

// ── Composant bannière de résultat import ─────────────────────────────────────
function ImportBanner({
                          status,
                          fileName,
                          onDismiss,
                      }: {
    status: 'loading' | 'success' | 'error' | 'no_key'
    fileName?: string
    onDismiss?: () => void
}) {
    if (status === 'loading') {
        return (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-sm text-blue-700 dark:text-blue-300">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span className="flex-1">
                    Analyse du CV <span className="font-medium">{fileName}</span> en cours…
                </span>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Champs pré-remplis depuis le CV</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                        Vérifiez et modifiez les informations extraites avant d'enregistrer.
                    </p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="text-emerald-500 hover:text-emerald-700 transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        )
    }

    if (status === 'no_key') {
        return (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Clé API requise</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                        Configurez votre clé OpenRouter dans{' '}
                        <a href="/settings" className="underline font-medium">Paramètres</a>{' '}
                        pour utiliser l'import CV.
                    </p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">Échec de l'extraction</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Le modèle n'a pas pu lire ce PDF. Vérifiez que le fichier n'est pas protégé, ou renseignez les champs manuellement.
                    </p>
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        )
    }

    return null
}

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
    const isEdit = !!profile
    const { saveProfile, updateProfile, deleteProfile } = useProfiles()
    const { data: companies = [] } = useCompanies()
    const { getApiKey, selectedModel, hasKey } = useOpenRouter()

    const [name, setName] = useState(profile?.name ?? '')
    const [firstName, setFirstName] = useState(profile?.firstName ?? '')
    const [lastName, setLastName] = useState(profile?.lastName ?? '')
    const [email, setEmail] = useState(profile?.email ?? '')
    const [phone, setPhone] = useState(profile?.phone ?? '')
    const [skills, setSkills] = useState(profile?.skills ?? '')
    const [degrees, setDegrees] = useState(profile?.degrees ?? '')
    const [experiences, setExperiences] = useState<ProfileExperience[]>(
        profile?.experiences ?? []
    )

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [activeTab, setActiveTab] = useState<'info' | 'exp'>('info')

    // Import CV state
    const fileRef = useRef<HTMLInputElement>(null)
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'no_key'>('idle')
    const [importFileName, setImportFileName] = useState('')
    const abortControllerRef = useRef<AbortController | null>(null)

    // Abort any in-flight CV request when the form unmounts (dialog closed)
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort()
        }
    }, [])

    function handleCancel() {
        abortControllerRef.current?.abort()
        onClose()
    }

    function validate() {
        const e: Record<string, string> = {}
        if (!name.trim()) e.name = 'Requis'
        if (!firstName.trim()) e.firstName = 'Requis'
        if (!lastName.trim()) e.lastName = 'Requis'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    function handleSave() {
        if (!validate()) return
        setSaving(true)
        const payload = {
            name: name.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            skills: skills.trim(),
            degrees: degrees.trim(),
            experiences,
        }
        if (isEdit) {
            updateProfile(profile.id, payload)
        } else {
            saveProfile(payload)
        }
        setSaving(false)
        onClose()
    }

    function handleDelete() {
        if (!profile) return
        deleteProfile(profile.id)
        onClose()
    }

    // ── Experience helpers ────────────────────────────────────────────────────
    function addExp(type: 'pro' | 'perso') {
        setExperiences(prev => [...prev, emptyExp(type)])
    }

    function updateExp(id: string, field: keyof ProfileExperience, value: string | undefined) {
        setExperiences(prev =>
            prev.map(e => e.id === id ? { ...e, [field]: value } : e)
        )
    }

    function removeExp(id: string) {
        setExperiences(prev => prev.filter(e => e.id !== id))
    }

    // ── CV Import ─────────────────────────────────────────────────────────────
    async function handleCVImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''

        setImportFileName(file.name)

        // Check API key
        const apiKey = await getApiKey()
        if (!apiKey) {
            setImportStatus('no_key')
            return
        }

        setImportStatus('loading')

        // Cancel any previous in-flight request and create a fresh controller
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            // Encode PDF to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                    const result = reader.result as string
                    // result is "data:application/pdf;base64,XXXX"
                    resolve(result)
                }
                reader.onerror = reject
                reader.readAsDataURL(file)
            })

            const prompt = `Analyse ce CV et extrais les informations en JSON structuré.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après.

Format JSON exact attendu:
{
  "firstName": "prénom du candidat",
  "lastName": "nom de famille du candidat",
  "email": "email ou null",
  "phone": "téléphone ou null",
  "skills": "liste des compétences séparées par des virgules (ex: React, TypeScript, Python, leadership, communication)",
  "degrees": "diplômes en texte libre, un par ligne (ex: Master Finance, HEC Paris, 2024)",
  "experiences": [
    {
      "type": "pro",
      "title": "intitulé du poste ou mission",
      "organization": "nom de l'entreprise ou organisation",
      "startDate": "YYYY-MM (ex: 2022-09)",
      "endDate": "YYYY-MM ou null si en cours",
      "description": "missions et réalisations clés, en 1-3 phrases"
    }
  ]
}

Règles:
- type = "pro" pour expériences professionnelles et stages, "perso" pour associatif, bénévolat, projets perso
- Dates au format YYYY-MM obligatoire (approxime si nécessaire, ex: "2020" → "2020-01")
- skills: TOUTES les compétences tech et soft skills, séparées par des virgules
- degrees: texte libre, une ligne par diplôme
- Si une info est absente du CV, utilise null pour les champs scalaires et [] pour les tableaux`

            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'JAT CV Parser',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: selectedModel,
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: prompt,
                                },
                                {
                                    type: 'file',
                                    file: {
                                        filename: file.name,
                                        file_data: base64,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            const rawText: string = data?.choices?.[0]?.message?.content ?? ''

            // Try to parse JSON from response
            let extracted: ExtractedCV
            try {
                // Strip potential markdown code fences
                const cleaned = rawText
                    .replace(/^```(?:json)?\s*/i, '')
                    .replace(/\s*```\s*$/, '')
                    .trim()
                extracted = JSON.parse(cleaned)
            } catch {
                // Try to find JSON in the text
                const jsonMatch = rawText.match(/\{[\s\S]*\}/)
                if (!jsonMatch) throw new Error('No JSON found in response')
                extracted = JSON.parse(jsonMatch[0])
            }

            // Apply extracted data to form fields (only overwrite if value exists)
            if (extracted.firstName) setFirstName(extracted.firstName)
            if (extracted.lastName) setLastName(extracted.lastName)
            if (extracted.email) setEmail(extracted.email)
            if (extracted.phone) setPhone(extracted.phone)
            if (extracted.skills) setSkills(extracted.skills)
            if (extracted.degrees) setDegrees(extracted.degrees)
            if (extracted.experiences && extracted.experiences.length > 0) {
                const mapped: ProfileExperience[] = extracted.experiences.map(exp => ({
                    id: crypto.randomUUID(),
                    type: exp.type === 'perso' ? 'perso' : 'pro',
                    title: exp.title ?? '',
                    organization: exp.organization ?? '',
                    startDate: exp.startDate ?? '',
                    endDate: exp.endDate ?? undefined,
                    description: exp.description ?? '',
                }))
                setExperiences(mapped)
                // Switch to exp tab to show extracted experiences
                setActiveTab('exp')
            }

            // Auto-generate profile name from firstName+lastName if not set
            if (!name.trim() && extracted.firstName && extracted.lastName) {
                setName(`${extracted.firstName} ${extracted.lastName}`)
            }

            setImportStatus('success')
        } catch (err) {
            // If the request was aborted (dialog closed / cancel), ignore silently
            if (err instanceof DOMException && err.name === 'AbortError') return
            console.error('CV import error:', err)
            setImportStatus('error')
        }
    }

    const proExps = experiences.filter(e => e.type === 'pro')
    const persoExps = experiences.filter(e => e.type === 'perso')

    // ── Render ────────────────────────────────────────────────────────────────
    if (confirmDelete) {
        return (
            <div className="flex flex-col gap-5">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                    Supprimer le profil «&nbsp;{profile?.name}&nbsp;» ? Cette action est irréversible.
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" /> Supprimer
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            {/* ── Import CV banner ── */}
            {importStatus !== 'idle' && (
                <ImportBanner
                    status={importStatus}
                    fileName={importFileName}
                    onDismiss={() => setImportStatus('idle')}
                />
            )}

            {/* ── Import CV button ── */}
            <div className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border border-dashed transition-colors',
                importStatus === 'loading'
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                    : 'border-border hover:border-foreground/30 bg-muted/20 hover:bg-muted/40'
            )}>
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {importStatus === 'loading'
                        ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        : <Sparkles className="h-4 w-4 text-muted-foreground" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                        {importStatus === 'loading' ? 'Analyse en cours…' : 'Importer un CV (PDF)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {importStatus === 'loading'
                            ? `Extraction des données de ${importFileName}`
                            : "L'IA pré-remplira automatiquement les champs du profil"
                        }
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={importStatus === 'loading'}
                    onClick={() => fileRef.current?.click()}
                    className="shrink-0"
                >
                    {importStatus === 'loading'
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Upload className="h-3.5 w-3.5" />
                    }
                    {importStatus === 'loading' ? 'Analyse…' : 'Choisir un PDF'}
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleCVImport}
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
                {(['info', 'exp'] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-1.5 rounded-md text-xs font-medium transition-all',
                            activeTab === tab
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab === 'info' ? 'Informations' : 'Expériences & diplômes'}
                        {tab === 'exp' && experiences.length > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-mono">
                                {experiences.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'info' && (
                <div className="flex flex-col gap-4">
                    {/* Profile name */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Nom du profil * <span className="text-muted-foreground/50 font-normal normal-case">(ex : "Stage M2 Finance")</span></Label>
                        <Input
                            value={name}
                            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                            placeholder="Profil principal, Stage été 2025…"
                            className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label>Prénom *</Label>
                            <Input
                                value={firstName}
                                onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: '' })) }}
                                placeholder="Jean"
                                className={errors.firstName ? 'border-destructive' : ''}
                            />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Nom *</Label>
                            <Input
                                value={lastName}
                                onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: '' })) }}
                                placeholder="Dupont"
                                className={errors.lastName ? 'border-destructive' : ''}
                            />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label>Email</Label>
                            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@email.com" type="email" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Téléphone</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" />
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Compétences techniques & humaines</Label>
                        <Textarea
                            value={skills}
                            onChange={e => setSkills(e.target.value)}
                            placeholder="React, TypeScript, Python, gestion de projet agile, leadership d'équipe, analyse financière…"
                            rows={3}
                        />
                        <p className="text-[11px] text-muted-foreground">Séparées par des virgules ou en prose — seront reprises telles quelles dans le prompt.</p>
                    </div>
                </div>
            )}

            {activeTab === 'exp' && (
                <div className="flex flex-col gap-5">
                    {/* Degrees */}
                    <div className="flex flex-col gap-1.5">
                        <Label>Diplômes</Label>
                        <Textarea
                            value={degrees}
                            onChange={e => setDegrees(e.target.value)}
                            placeholder="Master Finance, HEC Paris, 2024&#10;Licence Économie, Paris 1, 2022"
                            rows={3}
                        />
                    </div>

                    {/* Pro experiences */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <Label className="normal-case text-sm font-semibold text-foreground">Expériences professionnelles</Label>
                            </div>
                            <button
                                type="button"
                                onClick={() => addExp('pro')}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Ajouter
                            </button>
                        </div>

                        {proExps.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => addExp('pro')}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Ajouter une expérience pro
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {proExps.map(exp => (
                                    <ExperienceCard
                                        key={exp.id}
                                        exp={exp}
                                        onChange={updateExp}
                                        onRemove={removeExp}
                                        companies={companies}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Perso experiences */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <Label className="normal-case text-sm font-semibold text-foreground">Expériences personnelles</Label>
                            </div>
                            <button
                                type="button"
                                onClick={() => addExp('perso')}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Ajouter
                            </button>
                        </div>

                        {persoExps.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => addExp('perso')}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> Ajouter une expérience perso
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {persoExps.map(exp => (
                                    <ExperienceCard
                                        key={exp.id}
                                        exp={exp}
                                        onChange={updateExp}
                                        onRemove={removeExp}
                                        companies={companies}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
                {isEdit ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 className="h-4 w-4" /> Supprimer
                    </Button>
                ) : <div />}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleCancel}>Annuler</Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? 'Enregistrer' : 'Créer le profil'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ── Experience card ───────────────────────────────────────────────────────────
function ExperienceCard({
                            exp, onChange, onRemove, companies,
                        }: {
    exp: ProfileExperience
    onChange: (id: string, field: keyof ProfileExperience, value: string | undefined) => void
    onRemove: (id: string) => void
    companies: { id: string; displayName: string; name: string }[]
}) {
    const [orgInput, setOrgInput] = useState(exp.organization)
    const [showSuggestions, setShowSuggestions] = useState(false)

    const suggestions = orgInput.trim().length > 0
        ? companies.filter(c =>
            c.displayName.toLowerCase().includes(orgInput.toLowerCase()) &&
            c.displayName.toLowerCase() !== orgInput.toLowerCase()
        ).slice(0, 4)
        : []

    function selectCompany(c: typeof companies[0]) {
        setOrgInput(c.displayName)
        onChange(exp.id, 'organization', c.displayName)
        onChange(exp.id, 'companyId', c.id)
        setShowSuggestions(false)
    }

    return (
        <div className="flex flex-col gap-2.5 p-3.5 bg-muted/40 rounded-xl border border-border relative">
            <button
                type="button"
                onClick={() => onRemove(exp.id)}
                className="absolute top-2.5 right-2.5 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
                <X className="h-3 w-3" />
            </button>

            {/* Title + Organization */}
            <div className="grid grid-cols-2 gap-2 pr-6">
                <div className="flex flex-col gap-1">
                    <Label className="text-[10px]">Intitulé</Label>
                    <Input
                        value={exp.title}
                        onChange={e => onChange(exp.id, 'title', e.target.value)}
                        placeholder="Stage développeur, Bénévolat…"
                        className="h-7 text-xs"
                    />
                </div>
                <div className="flex flex-col gap-1 relative">
                    <Label className="text-[10px]">Organisation</Label>
                    <Input
                        value={orgInput}
                        onChange={e => {
                            setOrgInput(e.target.value)
                            onChange(exp.id, 'organization', e.target.value)
                            onChange(exp.id, 'companyId', undefined)
                            setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Entreprise, asso…"
                        className="h-7 text-xs"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                            {suggestions.map(c => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onMouseDown={() => selectCompany(c)}
                                    className="flex items-center w-full px-3 py-2 text-xs text-left hover:bg-accent transition-colors gap-2"
                                >
                                    <span className="text-muted-foreground">🏢</span>
                                    <span className="font-medium text-foreground">{c.displayName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dates */}
            <div className="flex gap-2 items-end">
                <MonthInput
                    label="Début"
                    value={exp.startDate}
                    onChange={v => onChange(exp.id, 'startDate', v)}
                />
                <div className="flex flex-col gap-1 flex-1">
                    <Label className="text-[10px]">Fin</Label>
                    <Input
                        type="month"
                        value={exp.endDate ?? ''}
                        onChange={e => onChange(exp.id, 'endDate', e.target.value || undefined)}
                        className="h-7 text-xs"
                    />
                </div>
                {exp.endDate && (
                    <button
                        type="button"
                        onClick={() => onChange(exp.id, 'endDate', undefined)}
                        className="text-[10px] text-muted-foreground hover:text-foreground mb-0.5 shrink-0 whitespace-nowrap"
                    >
                        ↩ en cours
                    </button>
                )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
                <Label className="text-[10px]">Descriptif</Label>
                <Textarea
                    value={exp.description}
                    onChange={e => onChange(exp.id, 'description', e.target.value)}
                    placeholder="Missions, réalisations, technologies…"
                    rows={2}
                    className="text-xs resize-none"
                />
            </div>
        </div>
    )
}
