// src/pages/CoverLettersPage.tsx
import { useState, useRef, useEffect, useMemo } from 'react'
import {
    FileText, Plus, ChevronRight, Loader2, Copy, Check, X,
    Trash2, Pencil, Search, Globe, Building2, Layers,
    ArrowLeft, BookOpen, AlertTriangle, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { useCoverLetters } from '@/hooks/useCoverLetters'
import { useJobs } from '@/hooks/useJobs'
import { useCompanies } from '@/hooks/useCompanies'
import { usePeriods } from '@/hooks/usePeriods'
import { useProfiles } from '@/hooks/useProfiles'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { useOpenRouter, OPENROUTER_URL } from '@/hooks/useOpenRouter'
import { useI18n } from '@/i18n'
import {
    COLUMN_COLOR_STYLES, FALLBACK_COLOR_STYLE,
    PERIOD_COLOR_STYLES, type PeriodColor, type CoverLetter,
} from '@/types'
import type { CandidateProfile, ProfileExperience } from '@/hooks/useProfiles'

// ── Constants ─────────────────────────────────────────────────────────────────
const MAIL_LANGUAGES = [
    { value: 'français', label: '🇫🇷 Français' },
    { value: 'anglais', label: '🇬🇧 Anglais' },
    { value: 'allemand', label: '🇩🇪 Allemand' },
    { value: 'espagnol', label: '🇪🇸 Espagnol' },
    { value: 'italien', label: '🇮🇹 Italien' },
    { value: 'néerlandais', label: '🇳🇱 Néerlandais' },
] as const
type MailLanguage = typeof MAIL_LANGUAGES[number]['value']

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatExperiencesForPrompt(profile: CandidateProfile): string {
    if (!profile.experiences.length) return ''
    return profile.experiences.map(e => {
        const period = e.endDate ? `${e.startDate} → ${e.endDate}` : `${e.startDate} → en cours`
        const typeLabel = e.type === 'pro' ? '[Pro]' : '[Perso]'
        return `  ${typeLabel} ${e.title} @ ${e.organization} (${period})\n  ${e.description}`
    }).join('\n')
}

function buildPrompt(params: {
    company: string
    role: string
    jobTitle: string
    jobContent: string
    profile: {
        firstName: string
        lastName: string
        skills?: string
        degrees?: string
        experiences?: string
    }
    language: MailLanguage
    tone: string
    intent: string
}): string {
    const { company, role, jobTitle, jobContent, profile, language, tone, intent } = params

    const replyLang =
        language === 'anglais' ? 'English' :
            language === 'allemand' ? 'German' :
                language === 'espagnol' ? 'Spanish' :
                    language === 'italien' ? 'Italian' :
                        language === 'néerlandais' ? 'Dutch' : 'French'

    const profileBlock = [
        profile.skills ? `Compétences : ${profile.skills}` : null,
        profile.degrees ? `Diplômes : ${profile.degrees}` : null,
        profile.experiences ? `Expériences :\n${profile.experiences}` : null,
    ].filter(Boolean).join('\n') || 'non renseigné'

    const closingExamples = language === 'anglais'
        ? '"Yours sincerely", "Best regards"'
        : language === 'allemand' ? '"Mit freundlichen Grüßen"'
            : '"Cordialement", "Bien à vous"'

    return `Write a professional cover letter in ${replyLang} for the following job application.

--- CANDIDATE ---
First name: ${profile.firstName}
Last name: ${profile.lastName}

--- CANDIDATE PROFILE ---
${profileBlock}

--- JOB APPLICATION ---
Company: ${company}
Role applied for: ${role}
Job posting title: ${jobTitle}
Job posting content:
${jobContent || 'Not provided'}

--- INSTRUCTIONS ---
Tone: ${tone}
Intent: ${intent}
Language: ${language}

- Write 4 paragraphs maximum.
- Be specific: reference actual skills from the profile that match the job requirements.
- Do NOT invent skills or experiences not mentioned in the profile.
- Do NOT include: date, postal address, "Dear Sir/Madam" openers.
- Address the letter to the company by name if possible.
- Stop BEFORE the closing formula (do NOT write ${closingExamples}, nor the candidate's name).

Reply ONLY with the letter body — no subject line, no preamble.`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StepDot({ step, current }: { step: number; current: number }) {
    const done = current > step
    return (
        <div className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-mono border-2 transition-all',
            done ? 'bg-foreground border-foreground text-background' :
                current === step ? 'bg-background border-foreground text-foreground' :
                    'bg-background border-border text-muted-foreground'
        )}>
            {done ? <Check className="h-3 w-3" /> : step}
        </div>
    )
}

function LanguageSelector({ value, onChange }: { value: MailLanguage; onChange: (l: MailLanguage) => void }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Label>Langue de la lettre</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {MAIL_LANGUAGES.map(lang => (
                    <button
                        key={lang.value}
                        type="button"
                        onClick={() => onChange(lang.value as MailLanguage)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                            value === lang.value
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                        )}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Cover Letter Card (list) ──────────────────────────────────────────────────
function CoverLetterCard({
                             letter,
                             onClick,
                             onDelete,
                         }: {
    letter: CoverLetter
    onClick: () => void
    onDelete: (e: React.MouseEvent) => void
}) {
    const { data: periods = [] } = usePeriods()
    const { t } = useI18n()
    const period = periods.find(p => p.id === letter.periodId)

    return (
        <button
            onClick={onClick}
            className={cn(
                'group text-left bg-card border border-border rounded-xl p-5',
                'hover:border-foreground/20 hover:shadow-md transition-all duration-150',
                'flex flex-col gap-3 animate-slide-up relative'
            )}
        >
            {/* Delete button */}
            <div
                role="button"
                tabIndex={0}
                onClick={onDelete}
                onKeyDown={e => e.key === 'Enter' && onDelete(e as any)}
                className="absolute top-3 right-3 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
                <Trash2 className="h-3 w-3" />
            </div>

            {/* Header */}
            <div className="flex flex-col gap-1 pr-6">
                <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                    {letter.title}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs text-muted-foreground">{letter.company}</span>
                    {letter.role && (
                        <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs text-muted-foreground">{letter.role}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Preview */}
            <p className="text-xs text-muted-foreground/70 line-clamp-3 leading-relaxed">
                {letter.generatedContent}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {period && (
                        <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border',
                            PERIOD_COLOR_STYLES[period.color as PeriodColor]?.badge,
                            PERIOD_COLOR_STYLES[period.color as PeriodColor]?.border,
                        )}>
                            <span className={cn('h-1 w-1 rounded-full', PERIOD_COLOR_STYLES[period.color as PeriodColor]?.dot)} />
                            {period.name}
                        </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground/50">
                        {formatDate(letter.createdAt.split('T')[0], t.intlLocale)}
                    </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                    {MAIL_LANGUAGES.find(l => l.value === letter.language)?.label ?? letter.language}
                </span>
            </div>
        </button>
    )
}

// ── Letter Viewer ─────────────────────────────────────────────────────────────
function LetterViewer({
                          letter,
                          onBack,
                          onDelete,
                          onUpdate,
                      }: {
    letter: CoverLetter
    onBack: () => void
    onDelete: () => void
    onUpdate: (updates: Partial<CoverLetter>) => void
}) {
    const { t } = useI18n()
    const { data: periods = [] } = usePeriods()
    const period = periods.find(p => p.id === letter.periodId)
    const [content, setContent] = useState(letter.generatedContent)
    const [title, setTitle] = useState(letter.title)
    const [editingTitle, setEditingTitle] = useState(false)
    const [copied, setCopied] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const dirty = content !== letter.generatedContent || title !== letter.title

    function handleSave() {
        onUpdate({ generatedContent: content, title })
    }

    function handleCopy() {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (confirmDelete) {
        return (
            <div className="flex flex-col gap-5 max-w-xl">
                <button onClick={() => setConfirmDelete(false)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour
                </button>
                <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-destructive">Supprimer « {letter.title} » ?</p>
                        <p className="text-xs text-muted-foreground mt-1">Cette action est irréversible.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                    <Button variant="destructive" size="sm" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" /> Supprimer
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 max-w-xl">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Toutes les lettres
                </button>
                <div className="flex items-center gap-2">
                    {dirty && (
                        <Button size="sm" variant="outline" onClick={handleSave}>
                            <Save className="h-3.5 w-3.5" /> Enregistrer les modifications
                        </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copié !' : 'Copier'}
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-5">
                {/* Title */}
                <div className="flex items-start gap-2 border-b border-border pb-4">
                    {editingTitle ? (
                        <div className="flex-1 flex items-center gap-2">
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="font-display text-lg h-auto py-1"
                                autoFocus
                                onBlur={() => setEditingTitle(false)}
                                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-2 group/title">
                            <h2 className="font-display text-xl text-foreground leading-tight">{title}</h2>
                            <button
                                onClick={() => setEditingTitle(true)}
                                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        {letter.company} · {letter.role}
                    </span>
                    {period && (
                        <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border',
                            PERIOD_COLOR_STYLES[period.color as PeriodColor]?.badge,
                            PERIOD_COLOR_STYLES[period.color as PeriodColor]?.border,
                        )}>
                            <span className={cn('h-1 w-1 rounded-full', PERIOD_COLOR_STYLES[period.color as PeriodColor]?.dot)} />
                            {period.name}
                        </span>
                    )}
                    <span className="font-mono">{MAIL_LANGUAGES.find(l => l.value === letter.language)?.label ?? letter.language}</span>
                </div>

                {/* Letter content */}
                <Textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={22}
                    className="text-sm leading-relaxed resize-none"
                />
            </div>

            {/* Delete */}
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" /> Supprimer la lettre
                </Button>
            </div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CoverLettersPage() {
    const { letters, saveLetter, updateLetter, deleteLetter } = useCoverLetters()
    const { data: jobs = [] } = useJobs()
    const { data: companies = [] } = useCompanies()
    const { data: periods = [] } = usePeriods()
    const { profiles } = useProfiles()
    const { columns } = useKanbanConfig()
    const { getApiKey, selectedModel, hasKey } = useOpenRouter()
    const { t } = useI18n()

    // ── View state ────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<'list' | 'create' | 'view'>('list')
    const [viewingId, setViewingId] = useState<string | null>(null)

    // ── List filters ──────────────────────────────────────────────────────────
    const [filterPeriodId, setFilterPeriodId] = useState<string | null>(null)
    const [filterCompany, setFilterCompany] = useState('')

    // ── Wizard state ──────────────────────────────────────────────────────────
    const [step, setStep] = useState(1)

    // Step 1 — job info
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
    const [jobCompany, setJobCompany] = useState('')
    const [jobRole, setJobRole] = useState('')
    const [jobTitle, setJobTitle] = useState('')
    const [jobContent, setJobContent] = useState('')
    const [jobPeriodId, setJobPeriodId] = useState('')

    // Step 2 — profile + language
    const [selectedProfileId, setSelectedProfileId] = useState('')
    const [language, setLanguage] = useState<MailLanguage>('français')
    const [tone, setTone] = useState('professionnel, enthousiaste, précis')
    const [intent, setIntent] = useState("Démontrer l'adéquation avec le poste en s'appuyant sur les compétences et expériences du profil.")

    // Step 3 — prompt
    const [editingMode, setEditingMode] = useState<'fields' | 'raw'>('fields')
    const [prompt, setPrompt] = useState('')
    // Editable prompt fields
    const [pf_firstName, setPfFirstName] = useState('')
    const [pf_lastName, setPfLastName] = useState('')
    const [pf_skills, setPfSkills] = useState('')
    const [pf_degrees, setPfDegrees] = useState('')
    const [pf_experiences, setPfExperiences] = useState('')
    const [pf_company, setPfCompany] = useState('')
    const [pf_role, setPfRole] = useState('')
    const [pf_jobTitle, setPfJobTitle] = useState('')
    const [pf_jobContent, setPfJobContent] = useState('')
    const [pf_language, setPfLanguage] = useState<MailLanguage>('français')
    const [pf_tone, setPfTone] = useState('')
    const [pf_intent, setPfIntent] = useState('')

    // Step 4 — result
    const [generating, setGenerating] = useState(false)
    const [generated, setGenerated] = useState('')
    const [genError, setGenError] = useState('')
    const [saveTitle, setSaveTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [copied, setCopied] = useState(false)

    const abortRef = useRef<AbortController | null>(null)
    useEffect(() => () => { abortRef.current?.abort() }, [])

    // ── Derived ───────────────────────────────────────────────────────────────
    const selectedJob = jobs.find(j => j.id === selectedJobId)
    const selectedProfile = profiles.find(p => p.id === selectedProfileId)
    const viewingLetter = letters.find(l => l.id === viewingId)

    // Filtered letters
    const filteredLetters = useMemo(() => {
        let list = letters
        if (filterPeriodId) list = list.filter(l => l.periodId === filterPeriodId)
        if (filterCompany.trim()) {
            const q = filterCompany.toLowerCase()
            list = list.filter(l => l.company.toLowerCase().includes(q) || l.title.toLowerCase().includes(q))
        }
        return list
    }, [letters, filterPeriodId, filterCompany])

    // Group by company
    const grouped = useMemo(() => {
        const map = new Map<string, CoverLetter[]>()
        filteredLetters.forEach(l => {
            const key = l.company || 'Sans entreprise'
            if (!map.has(key)) map.set(key, [])
            map.get(key)!.push(l)
        })
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    }, [filteredLetters])

    // ── Wizard helpers ────────────────────────────────────────────────────────
    function resetWizard() {
        setStep(1)
        setSelectedJobId(null)
        setJobCompany(''); setJobRole(''); setJobTitle(''); setJobContent(''); setJobPeriodId('')
        setSelectedProfileId(''); setLanguage('français')
        setTone('professionnel, enthousiaste, précis')
        setIntent("Démontrer l'adéquation avec le poste en s'appuyant sur les compétences et expériences du profil.")
        setPrompt(''); setEditingMode('fields')
        setGenerated(''); setGenError(''); setSaveTitle(''); setSaved(false)
    }

    function handleSelectJob(jobId: string) {
        const job = jobs.find(j => j.id === jobId)
        if (!job) return
        setSelectedJobId(jobId)
        setJobCompany(job.company)
        setJobRole(job.role)
        setJobPeriodId(job.periodId ?? '')
        setJobTitle(job.role) // prefill job title from role
    }

    function goToStep2() {
        if (!jobCompany.trim() || !jobRole.trim()) return
        setStep(2)
    }

    function buildCurrentPrompt() {
        const profile = {
            firstName: pf_firstName,
            lastName: pf_lastName,
            skills: pf_skills || undefined,
            degrees: pf_degrees || undefined,
            experiences: pf_experiences || undefined,
        }
        return buildPrompt({
            company: pf_company,
            role: pf_role,
            jobTitle: pf_jobTitle,
            jobContent: pf_jobContent,
            profile,
            language: pf_language,
            tone: pf_tone,
            intent: pf_intent,
        })
    }

    function goToStep3() {
        if (!selectedProfileId) return
        const prof = selectedProfile!

        // Init prompt fields
        setPfFirstName(prof.firstName)
        setPfLastName(prof.lastName)
        setPfSkills(prof.skills || '')
        setPfDegrees(prof.degrees || '')
        setPfExperiences(formatExperiencesForPrompt(prof))
        setPfCompany(jobCompany)
        setPfRole(jobRole)
        setPfJobTitle(jobTitle)
        setPfJobContent(jobContent)
        setPfLanguage(language)
        setPfTone(tone)
        setPfIntent(intent)

        setPrompt(buildPrompt({
            company: jobCompany,
            role: jobRole,
            jobTitle,
            jobContent,
            profile: {
                firstName: prof.firstName,
                lastName: prof.lastName,
                skills: prof.skills || undefined,
                degrees: prof.degrees || undefined,
                experiences: formatExperiencesForPrompt(prof) || undefined,
            },
            language,
            tone,
            intent,
        }))
        setEditingMode('fields')
        setStep(3)
    }

    function syncRawFromFields() {
        setPrompt(buildCurrentPrompt())
    }

    async function generate() {
        setStep(4)
        setGenerating(true)
        setGenError('')
        setGenerated('')

        const finalPrompt = editingMode === 'fields' ? buildCurrentPrompt() : prompt

        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl

        try {
            const apiKey = await getApiKey()
            if (!apiKey) throw new Error('Clé API OpenRouter non configurée. Rendez-vous dans Paramètres → OpenRouter.')

            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                signal: ctrl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'JAT Cover Letter',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    temperature: 0.4,
                    messages: [{ role: 'user', content: finalPrompt }],
                }),
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const text: string = data?.choices?.[0]?.message?.content ?? ''

            // Strip potential closing formulas
            const cleaned = text
                .split(/\n(?:Cordialement|Bien à vous|Sincèrement|Best regards|Kind regards|Yours sincerely|Mit freundlichen Grüßen|Atentamente|Cordiali saluti|Met vriendelijke groet)/i)[0]
                .trim()

            setGenerated(cleaned)
            // Auto-suggest save title
            setSaveTitle(`${jobCompany} — ${jobRole}`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            setGenError(err instanceof Error ? err.message : 'Erreur inconnue')
        } finally {
            setGenerating(false)
        }
    }

    async function handleSave() {
        if (!saveTitle.trim() || !generated.trim()) return
        setSaving(true)
        await saveLetter({
            title: saveTitle.trim(),
            company: pf_company || jobCompany,
            companyId: selectedJob?.companyId,
            role: pf_role || jobRole,
            periodId: jobPeriodId || undefined,
            jobId: selectedJobId ?? undefined,
            profileId: selectedProfileId || undefined,
            jobTitle: pf_jobTitle || jobTitle,
            jobContent: pf_jobContent || jobContent,
            language: pf_language,
            generatedContent: generated,
        })
        setSaved(true)
        setSaving(false)
    }

    async function handleDelete() {
        if (!viewingId) return
        await deleteLetter(viewingId)
        setViewingId(null)
        setMode('list')
    }

    // ── View: letter detail ───────────────────────────────────────────────────
    if (mode === 'view' && viewingLetter) {
        return (
            <div className="flex flex-col h-full">
                <LetterViewer
                    letter={viewingLetter}
                    onBack={() => { setViewingId(null); setMode('list') }}
                    onDelete={handleDelete}
                    onUpdate={updates => updateLetter(viewingLetter.id, updates)}
                />
            </div>
        )
    }

    // ── View: create wizard ───────────────────────────────────────────────────
    if (mode === 'create') {
        const steps = ['Poste', 'Profil', 'Prompt', 'Lettre']

        return (
            <div className="max-w-xl flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { abortRef.current?.abort(); resetWizard(); setMode('list') }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Toutes les lettres
                    </button>
                </div>

                <div>
                    <h1 className="font-display text-3xl text-foreground">Nouvelle lettre</h1>
                    <p className="text-sm text-muted-foreground mt-1">Génère une lettre de motivation personnalisée</p>
                </div>

                {/* No key warning */}
                {!hasKey && (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                        <span className="text-base shrink-0">⚠️</span>
                        <span>Aucune clé API OpenRouter configurée.{' '}
                            <a href="/settings" className="underline font-medium">Paramètres</a>{' '}
                            pour la renseigner.
                        </span>
                    </div>
                )}

                {/* Step indicators */}
                <div className="flex items-center gap-2">
                    {steps.map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <StepDot step={i + 1} current={step} />
                                <span className={cn(
                                    'text-xs hidden sm:block',
                                    step === i + 1 ? 'text-foreground font-medium' :
                                        step > i + 1 ? 'text-muted-foreground' : 'text-muted-foreground/40'
                                )}>{label}</span>
                            </div>
                            {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                        </div>
                    ))}
                </div>

                {/* ── Step 1: Poste ── */}
                {step === 1 && (
                    <div className="flex flex-col gap-4 animate-slide-up">
                        {/* Optional: pick from existing applications */}
                        {jobs.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <Label>Importer depuis une candidature existante <span className="text-muted-foreground/50 font-normal normal-case">(optionnel)</span></Label>
                                <Select value={selectedJobId ?? ''} onValueChange={v => v ? handleSelectJob(v) : setSelectedJobId(null)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir une candidature…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {jobs.map(j => {
                                            const col = columns.find(c => c.id === j.status)
                                            const colors = col ? COLUMN_COLOR_STYLES[col.color] : FALLBACK_COLOR_STYLE
                                            return (
                                                <SelectItem key={j.id} value={j.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn('h-2 w-2 rounded-full shrink-0', colors.dot)} />
                                                        <span>{j.company} · {j.role}</span>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                                {selectedJobId && (
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedJobId(null); setJobCompany(''); setJobRole('') }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start flex items-center gap-1"
                                    >
                                        <X className="h-3 w-3" /> Retirer la sélection
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="border-t border-border" />

                        {/* Manual fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label>Entreprise *</Label>
                                <Input value={jobCompany} onChange={e => setJobCompany(e.target.value)} placeholder="Google, LVMH…" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Poste *</Label>
                                <Input value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="Software Engineer…" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Titre de l'annonce</Label>
                            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Stage Développeur Full-Stack — Paris" />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label>Contenu de l'annonce <span className="text-muted-foreground/50 font-normal normal-case">— colle le texte de l'offre</span></Label>
                            <Textarea
                                value={jobContent}
                                onChange={e => setJobContent(e.target.value)}
                                placeholder="Nous recherchons un développeur passionné…"
                                rows={6}
                            />
                        </div>

                        {/* Period */}
                        {periods.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <Label>Période <span className="text-muted-foreground/50 font-normal normal-case">(optionnel)</span></Label>
                                <div className="flex gap-1.5 flex-wrap">
                                    <button type="button" onClick={() => setJobPeriodId('')}
                                            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                                !jobPeriodId ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                                            )}>Aucune</button>
                                    {periods.map(p => {
                                        const colors = PERIOD_COLOR_STYLES[p.color as PeriodColor]
                                        const isActive = jobPeriodId === p.id
                                        return (
                                            <button key={p.id} type="button" onClick={() => setJobPeriodId(p.id)}
                                                    className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                                        isActive ? cn(colors.badge, 'border', colors.border) : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                                                    )}>
                                                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                                                {p.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={goToStep2} disabled={!jobCompany.trim() || !jobRole.trim()}>
                                Suivant <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Profil + Langue ── */}
                {step === 2 && (
                    <div className="flex flex-col gap-5 animate-slide-up">
                        {/* Job recap */}
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground">{jobCompany}</span>
                                <span className="text-sm text-muted-foreground"> · {jobRole}</span>
                            </div>
                        </div>

                        {/* Profile selector */}
                        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profil candidat</h3>

                            {profiles.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Aucun profil créé.{' '}
                                    <a href="/settings" className="underline text-foreground">Créer un profil</a>{' '}
                                    dans Paramètres.
                                </p>
                            ) : (
                                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un profil…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {profiles.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{p.name}</span>
                                                    <span className="text-xs text-muted-foreground">{p.firstName} {p.lastName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {selectedProfile && (
                                <div className="rounded-lg bg-muted/50 border border-border p-3 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-display shrink-0">
                                            {selectedProfile.firstName.charAt(0)}{selectedProfile.lastName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{selectedProfile.firstName} {selectedProfile.lastName}</p>
                                            {selectedProfile.email && <p className="text-xs text-muted-foreground">{selectedProfile.email}</p>}
                                        </div>
                                    </div>
                                    {selectedProfile.skills && (
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            <span className="text-foreground/60 font-medium">Compétences : </span>{selectedProfile.skills}
                                        </p>
                                    )}
                                    {selectedProfile.experiences.length > 0 && (
                                        <p className="text-[11px] text-muted-foreground">
                                            <span className="text-foreground/60 font-medium">{selectedProfile.experiences.length} exp.</span> incluse(s)
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Language */}
                        <div className="rounded-xl border border-border bg-card p-5">
                            <LanguageSelector value={language} onChange={setLanguage} />
                        </div>

                        {/* Tone + Intent */}
                        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paramètres de rédaction</h3>
                            <div className="flex flex-col gap-1.5">
                                <Label>Ton</Label>
                                <Input value={tone} onChange={e => setTone(e.target.value)} placeholder="professionnel, enthousiaste, précis…" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Intention</Label>
                                <Textarea value={intent} onChange={e => setIntent(e.target.value)} rows={2} />
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                            <Button onClick={goToStep3} disabled={!selectedProfileId}>
                                Voir le prompt <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Prompt ── */}
                {step === 3 && (
                    <div className="flex flex-col gap-4 animate-slide-up">
                        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prompt généré</h3>
                                <div className="flex gap-1.5">
                                    {(['fields', 'raw'] as const).map(m => (
                                        <button key={m}
                                                onClick={() => { if (m === 'raw') syncRawFromFields(); setEditingMode(m) }}
                                                className={cn(
                                                    'text-xs px-2.5 py-1 rounded-md border transition-all',
                                                    editingMode === m
                                                        ? 'bg-foreground text-background border-foreground'
                                                        : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40'
                                                )}
                                        >{m === 'fields' ? 'Champs' : 'Prompt brut'}</button>
                                    ))}
                                </div>
                            </div>

                            {editingMode === 'fields' ? (
                                <div className="flex flex-col gap-3">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Candidat</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5"><Label>Prénom</Label><Input value={pf_firstName} onChange={e => setPfFirstName(e.target.value)} /></div>
                                        <div className="flex flex-col gap-1.5"><Label>Nom</Label><Input value={pf_lastName} onChange={e => setPfLastName(e.target.value)} /></div>
                                    </div>
                                    <div className="flex flex-col gap-1.5"><Label>Compétences</Label><Textarea value={pf_skills} onChange={e => setPfSkills(e.target.value)} rows={2} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Diplômes</Label><Input value={pf_degrees} onChange={e => setPfDegrees(e.target.value)} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Expériences</Label><Textarea value={pf_experiences} onChange={e => setPfExperiences(e.target.value)} rows={3} /></div>

                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1 border-t border-border">Annonce</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1.5"><Label>Entreprise</Label><Input value={pf_company} onChange={e => setPfCompany(e.target.value)} /></div>
                                        <div className="flex flex-col gap-1.5"><Label>Poste</Label><Input value={pf_role} onChange={e => setPfRole(e.target.value)} /></div>
                                    </div>
                                    <div className="flex flex-col gap-1.5"><Label>Titre de l'annonce</Label><Input value={pf_jobTitle} onChange={e => setPfJobTitle(e.target.value)} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Contenu de l'annonce</Label><Textarea value={pf_jobContent} onChange={e => setPfJobContent(e.target.value)} rows={4} /></div>

                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1 border-t border-border">Paramètres</p>
                                    <LanguageSelector value={pf_language} onChange={setPfLanguage} />
                                    <div className="flex flex-col gap-1.5"><Label>Ton</Label><Input value={pf_tone} onChange={e => setPfTone(e.target.value)} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Intention</Label><Textarea value={pf_intent} onChange={e => setPfIntent(e.target.value)} rows={2} /></div>
                                </div>
                            ) : (
                                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={24} className="font-mono text-xs" />
                            )}
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                            <Button onClick={generate}>
                                <BookOpen className="h-4 w-4" /> Générer la lettre
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Step 4: Lettre générée ── */}
                {step === 4 && (
                    <div className="flex flex-col gap-4 animate-slide-up">
                        {generating ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-border bg-card">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Rédaction en cours…</p>
                            </div>
                        ) : genError ? (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col gap-3">
                                <p className="text-sm font-semibold text-destructive">Erreur lors de la génération</p>
                                <p className="text-xs font-mono text-muted-foreground">{genError}</p>
                                <Button variant="outline" size="sm" onClick={() => setStep(3)}>Modifier le prompt</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lettre générée</h3>
                                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                                            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            {copied ? 'Copié !' : 'Copier'}
                                        </Button>
                                    </div>
                                    <Textarea value={generated} onChange={e => setGenerated(e.target.value)} rows={18} className="text-sm leading-relaxed" />
                                </div>

                                {/* Save section */}
                                {!saved ? (
                                    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enregistrer la lettre</h3>
                                        <div className="flex gap-2">
                                            <Input
                                                value={saveTitle}
                                                onChange={e => setSaveTitle(e.target.value)}
                                                placeholder="Titre de la lettre…"
                                                className="flex-1"
                                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                            />
                                            <Button size="sm" onClick={handleSave} disabled={!saveTitle.trim() || saving}>
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                Enregistrer
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                                        <Check className="h-4 w-4 shrink-0" />
                                        <p className="text-sm font-medium flex-1">Lettre enregistrée avec succès.</p>
                                        <button onClick={() => { resetWizard(); setMode('list') }} className="text-xs underline hover:no-underline">
                                            Voir toutes les lettres
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between">
                                    <Button variant="outline" size="sm" onClick={() => { abortRef.current?.abort(); resetWizard(); setMode('list') }}>
                                        <X className="h-4 w-4" /> Annuler sans enregistrer
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                                        Modifier le prompt
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // ── View: list ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="font-display text-3xl text-foreground">Lettres de motivation</h1>
                    <p className="text-sm text-muted-foreground mt-1">Triées par entreprise et période</p>
                </div>
                <Button size="sm" onClick={() => { resetWizard(); setMode('create') }}>
                    <Plus className="h-4 w-4" /> Nouvelle lettre
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 mb-6">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={filterCompany} onChange={e => setFilterCompany(e.target.value)} placeholder="Rechercher une lettre…" className="pl-9" />
                </div>
                {periods.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <button onClick={() => setFilterPeriodId(null)}
                                className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                    filterPeriodId === null ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                                )}>Toutes</button>
                        {periods.map(p => {
                            const colors = PERIOD_COLOR_STYLES[p.color as PeriodColor] ?? PERIOD_COLOR_STYLES.blue
                            const isActive = filterPeriodId === p.id
                            return (
                                <button key={p.id} onClick={() => setFilterPeriodId(p.id)}
                                        className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                            isActive ? cn(colors.badge, 'border', colors.border) : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
                                        )}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                                    {p.name}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Content */}
            {letters.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">Aucune lettre de motivation</p>
                        <p className="text-sm text-muted-foreground mt-1">Crée ta première lettre personnalisée par l'IA.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { resetWizard(); setMode('create') }}>
                        <Plus className="h-4 w-4" /> Créer une lettre
                    </Button>
                </div>
            ) : filteredLetters.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Aucun résultat pour ces filtres.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8 pb-8">
                    {grouped.map(([company, companyLetters]) => (
                        <div key={company}>
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{company}</h2>
                                <span className="text-[10px] font-mono text-muted-foreground/50">{companyLetters.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {companyLetters.map(letter => (
                                    <CoverLetterCard
                                        key={letter.id}
                                        letter={letter}
                                        onClick={() => { setViewingId(letter.id); setMode('view') }}
                                        onDelete={e => { e.stopPropagation(); deleteLetter(letter.id) }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
