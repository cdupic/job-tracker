// src/pages/FollowUpPage.tsx
import { useState } from 'react'
import { useJobs, useUpdateJob } from '@/hooks/useJobs'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { useCompanies } from '@/hooks/useCompanies'
import { useProfiles, type CandidateProfile } from '@/hooks/useProfiles'
import { useI18n } from '@/i18n'
import { cn, formatDate } from '@/lib/utils'
import {
    Mail, ChevronRight, Loader2, Copy, Check, Pencil, X,
    Building2, Calendar, Tag, FileText, Globe, User, Save, BookmarkCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COLUMN_COLOR_STYLES, FALLBACK_COLOR_STYLE, type JobApplication, type FollowUpEmail } from '@/types'
import { toast } from '@/hooks/useToast'

import { useOpenRouter, OPENROUTER_URL } from '@/hooks/useOpenRouter'

// ── Mail language options ─────────────────────────────────────────────────────
const MAIL_LANGUAGES = [
    { value: 'français', label: '🇫🇷 Français' },
    { value: 'anglais', label: '🇬🇧 Anglais' },
    { value: 'allemand', label: '🇩🇪 Allemand' },
    { value: 'espagnol', label: '🇪🇸 Espagnol' },
    { value: 'italien', label: '🇮🇹 Italien' },
    { value: 'néerlandais', label: '🇳🇱 Néerlandais' },
] as const
type MailLanguage = typeof MAIL_LANGUAGES[number]['value']

// ── Status contexts ───────────────────────────────────────────────────────────
const STATUS_CONTEXTS: Record<string, { label: string; intent: string; tone: string }> = {
    applied: {
        label: 'Candidature initiale envoyée, aucune réponse',
        intent: "Relancer poliment pour confirmer la bonne réception et réitérer l'intérêt sans insister.",
        tone: 'patient, chaleureux, professionnel',
    },
    responded: {
        label: 'Réponse reçue, aucun entretien planifié',
        intent: "Faire un suivi pour montrer de l'enthousiasme et demander naturellement les prochaines étapes.",
        tone: 'enthousiaste, proactif, respectueux',
    },
    interview: {
        label: 'Entretien passé, en attente de décision',
        intent: "Remercier pour le temps accordé, renforcer l'adéquation, et demander le calendrier.",
        tone: 'reconnaissant, confiant, concis',
    },
}

function getStatusContext(statusId: string) {
    return STATUS_CONTEXTS[statusId] ?? STATUS_CONTEXTS['applied']
}

// ── Prompt data interfaces ────────────────────────────────────────────────────
interface PromptCandidateData {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    skills?: string
    degrees?: string
    experiences?: string
    notes?: string
}

interface PromptContactData {
    name?: string
    role?: string
    email?: string
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(params: {
    job: JobApplication
    candidate: PromptCandidateData
    contact: PromptContactData | null
    statusLabel: string
    statusContext: typeof STATUS_CONTEXTS['applied']
    language: MailLanguage
}): string {
    const { job, candidate, contact, statusLabel, statusContext, language } = params

    const replyLang =
        language === 'anglais' ? 'English' :
            language === 'allemand' ? 'German' :
                language === 'espagnol' ? 'Spanish' :
                    language === 'italien' ? 'Italian' :
                        language === 'néerlandais' ? 'Dutch' :
                            'French'

    const subjectLabel = language === 'anglais' ? 'Subject' : 'Objet'

    const hasNotes = candidate.notes && candidate.notes.trim() !== '' && candidate.notes.trim().toLowerCase() !== 'n/a'
    const notesLine = hasNotes ? candidate.notes!.trim() : 'aucune'

    const profileLines: string[] = []
    if (candidate.skills) profileLines.push(`Compétences : ${candidate.skills}`)
    if (candidate.degrees) profileLines.push(`Diplômes : ${candidate.degrees}`)
    if (candidate.experiences) profileLines.push(`Expériences :\n${candidate.experiences}`)
    const profileBlock = profileLines.length > 0 ? profileLines.join('\n') : 'non renseigné'

    const contactBlock = contact && contact.name
        ? [
            `Nom : ${contact.name}`,
            contact.role ? `Rôle : ${contact.role}` : null,
            contact.email ? `Email : ${contact.email}` : null,
        ].filter(Boolean).join('\n')
        : 'non renseigné'

    const closingFormulas = language === 'anglais'
        ? '"Best regards", "Kind regards", "Yours sincerely"'
        : language === 'allemand'
            ? '"Mit freundlichen Grüßen"'
            : language === 'espagnol'
                ? '"Atentamente", "Un cordial saludo"'
                : language === 'italien'
                    ? '"Cordiali saluti"'
                    : language === 'néerlandais'
                        ? '"Met vriendelijke groet"'
                        : '"Cordialement", "Bien à vous", "Sincèrement"'

    return `Write a professional follow-up email in ${replyLang} for a job application.

--- CANDIDAT ---
Prénom : ${candidate.firstName}
Nom : ${candidate.lastName}
${candidate.email ? `Email : ${candidate.email}` : ''}

--- PROFIL DU CANDIDAT ---
${profileBlock}

--- CANDIDATURE ---
Entreprise : ${job.company}
Poste : ${job.role}
Notes sur la candidature : ${notesLine}

--- CONTACT CHEZ L'ENTREPRISE ---
${contactBlock}

--- CONTEXTE ---
Statut : ${statusLabel}
Intention : ${statusContext.intent}
Ton : ${statusContext.tone}
Langue du mail : ${language}

--- INSTRUCTIONS ---
- 3-4 paragraphes courts maximum.
- Sois humain et spécifique.
- COMPÉTENCES : Pour toute mention des compétences techniques ou humaines du candidat, tu dois t'appuyer UNIQUEMENT sur ce qui est écrit dans "PROFIL DU CANDIDAT" et "Notes sur la candidature". N'invente, n'extrapole ou n'assume AUCUNE compétence, trait de personnalité ou expérience qui n'y est pas explicitement mentionnée.
- Si un contact est renseigné, adresse le mail directement à cette personne (utilise son prénom si disponible).
- Arrête AVANT la formule de clôture (n'écris pas ${closingFormulas}, ni le nom du candidat).

Réponds UNIQUEMENT avec :
${subjectLabel} : [sujet]
---
[corps du mail]`
}

// ── Format experiences for prompt ─────────────────────────────────────────────
function formatExperiencesForPrompt(profile: CandidateProfile): string {
    if (profile.experiences.length === 0) return ''
    return profile.experiences.map(e => {
        const period = e.endDate
            ? `${e.startDate} → ${e.endDate}`
            : `${e.startDate} → en cours`
        const typeLabel = e.type === 'pro' ? '[Pro]' : '[Perso]'
        return `  ${typeLabel} ${e.title} @ ${e.organization} (${period})\n  ${e.description}`
    }).join('\n')
}

// ── Step indicator ────────────────────────────────────────────────────────────
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

// ── InfoRow ───────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value?: string }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-sm text-foreground">{value}</span>
            </div>
        </div>
    )
}

// ── Language selector pills ───────────────────────────────────────────────────
function LanguageSelector({ value, onChange }: { value: MailLanguage; onChange: (l: MailLanguage) => void }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Label>Langue du mail</Label>
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

// ── Editable Job Info Panel ───────────────────────────────────────────────────
interface JobInfoPanelProps {
    job: JobApplication
    statusLabel: string
    onStatusChange: (s: string) => void
    onNotesChange: (n: string) => void
    columns: { id: string; label: string; color: string }[]
}

function JobInfoPanel({ job, statusLabel, onStatusChange, onNotesChange, columns }: JobInfoPanelProps) {
    const [editing, setEditing] = useState(false)
    const [localStatus, setLocalStatus] = useState(job.status)
    const [localNotes, setLocalNotes] = useState(job.notes ?? '')
    const { t } = useI18n()

    function save() { onStatusChange(localStatus); onNotesChange(localNotes); setEditing(false) }

    const col = columns.find(c => c.id === (editing ? localStatus : job.status))
    const colors = col ? COLUMN_COLOR_STYLES[col.color as keyof typeof COLUMN_COLOR_STYLES] ?? FALLBACK_COLOR_STYLE : FALLBACK_COLOR_STYLE

    return (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Candidature</h3>
                <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {editing ? 'Annuler' : 'Modifier'}
                </button>
            </div>

            {editing ? (
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5"><Label>Entreprise</Label><Input value={job.company} disabled className="opacity-60" /></div>
                        <div className="flex flex-col gap-1.5"><Label>Poste</Label><Input value={job.role} disabled className="opacity-60" /></div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Statut</Label>
                        <Select value={localStatus} onValueChange={setLocalStatus}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{columns.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Notes <span className="text-muted-foreground/50 normal-case font-normal">— seule source pour les compétences du mail</span></Label>
                        <Textarea value={localNotes} onChange={e => setLocalNotes(e.target.value)} placeholder="Compétences à valoriser, points clés à mentionner…" rows={3} />
                    </div>
                    <Button size="sm" onClick={save}>Enregistrer</Button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <InfoRow icon={Building2} label="Entreprise" value={job.company} />
                    <InfoRow icon={Tag} label="Poste" value={job.role} />
                    <InfoRow icon={Calendar} label="Date" value={formatDate(job.dateApplied, t.intlLocale)} />
                    <div className="flex items-start gap-2.5">
                        <span className={cn('h-2 w-2 rounded-full inline-block mt-1 shrink-0', colors.dot)} />
                        <div className="flex flex-col gap-0">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Statut</span>
                            <Badge className={cn(colors.badge, 'text-[10px] w-fit mt-0.5')}>{statusLabel}</Badge>
                        </div>
                    </div>
                    {job.notes ? (
                        <div className="col-span-2"><InfoRow icon={FileText} label="Notes (source compétences)" value={job.notes} /></div>
                    ) : (
                        <div className="col-span-2 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>Pas de notes — le mail ne mentionnera aucune compétence spécifique. <strong>Modifier</strong> pour en ajouter.</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function FollowUpPage() {
    const { data: jobs = [] } = useJobs()
    const updateJob = useUpdateJob()
    const { columns } = useKanbanConfig()
    const { data: companies = [] } = useCompanies()
    const { profiles } = useProfiles()
    const { t } = useI18n()
    const { getApiKey, selectedModel, hasKey } = useOpenRouter()

    // Step 1
    const [step, setStep] = useState(1)
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

    // Step 2 - profile mode
    const [candidateMode, setCandidateMode] = useState<'manual' | 'profile'>('manual')
    const [selectedProfileId, setSelectedProfileId] = useState<string>('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [signature, setSignature] = useState('')
    const [mailLanguage, setMailLanguage] = useState<MailLanguage>('français')
    const [firstNameErr, setFirstNameErr] = useState(false)
    const [lastNameErr, setLastNameErr] = useState(false)
    const [overrideStatus, setOverrideStatus] = useState<string | null>(null)
    const [overrideNotes, setOverrideNotes] = useState<string | null>(null)

    // Step 3
    const [prompt, setPrompt] = useState('')
    const [editingPromptMode, setEditingPromptMode] = useState<'fields' | 'raw'>('fields')
    const [pf_firstName, setPfFirstName] = useState('')
    const [pf_lastName, setPfLastName] = useState('')
    const [pf_skills, setPfSkills] = useState('')
    const [pf_degrees, setPfDegrees] = useState('')
    const [pf_experiences, setPfExperiences] = useState('')
    const [pf_company, setPfCompany] = useState('')
    const [pf_role, setPfRole] = useState('')
    const [pf_notes, setPfNotes] = useState('')
    const [pf_contact_name, setPfContactName] = useState('')
    const [pf_contact_role, setPfContactRole] = useState('')
    const [pf_contact_email, setPfContactEmail] = useState('')
    const [pf_status, setPfStatus] = useState('')
    const [pf_tone, setPfTone] = useState('')
    const [pf_intent, setPfIntent] = useState('')
    const [pf_language, setPfLanguage] = useState<MailLanguage>('français')

    // Step 4
    const [loading, setLoading] = useState(false)
    const [generatedSubject, setGeneratedSubject] = useState('')
    const [generatedBody, setGeneratedBody] = useState('')
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const [saved, setSaved] = useState(false)

    // Derived
    const selectedJob = jobs.find(j => j.id === selectedJobId)
    const effectiveStatus = overrideStatus ?? selectedJob?.status ?? ''
    const effectiveNotes = overrideNotes ?? selectedJob?.notes ?? ''
    const col = columns.find(c => c.id === effectiveStatus)
    const effectiveStatusLabel = col?.label ?? effectiveStatus

    const jobCompany = selectedJob?.companyId
        ? companies.find(c => c.id === selectedJob.companyId)
        : companies.find(c => c.name === selectedJob?.company?.toLowerCase().trim())
    const jobContact = jobCompany?.contacts?.[0] ?? null

    const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null

    const followUpJobs = [...jobs].sort(
        (a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()
    )

    // ── Helpers ───────────────────────────────────────────────────────────────
    function buildCandidateData(): PromptCandidateData {
        if (candidateMode === 'profile' && selectedProfile) {
            return {
                firstName: selectedProfile.firstName,
                lastName: selectedProfile.lastName,
                email: selectedProfile.email,
                phone: selectedProfile.phone,
                skills: selectedProfile.skills || undefined,
                degrees: selectedProfile.degrees || undefined,
                experiences: formatExperiencesForPrompt(selectedProfile) || undefined,
                notes: effectiveNotes || undefined,
            }
        }
        return {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            notes: effectiveNotes || undefined,
        }
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    function goToStep2() {
        if (!selectedJobId) return
        setOverrideStatus(null)
        setOverrideNotes(null)
        setStep(2)
    }

    function goToStep3() {
        if (candidateMode === 'manual') {
            if (!firstName.trim()) { setFirstNameErr(true); return }
            if (!lastName.trim()) { setLastNameErr(true); return }
        }
        setFirstNameErr(false)
        setLastNameErr(false)

        const ctx = getStatusContext(effectiveStatus)
        const candidate = buildCandidateData()
        const contact = jobContact
            ? { name: jobContact.name, role: jobContact.role, email: jobContact.email }
            : selectedJob?.contact?.name
                ? { name: selectedJob.contact.name, email: selectedJob.contact.email }
                : null

        setPfFirstName(candidate.firstName)
        setPfLastName(candidate.lastName)
        setPfSkills(candidate.skills ?? '')
        setPfDegrees(candidate.degrees ?? '')
        setPfExperiences(candidate.experiences ?? '')
        setPfCompany(selectedJob?.company ?? '')
        setPfRole(selectedJob?.role ?? '')
        setPfNotes(effectiveNotes)
        setPfContactName(contact?.name ?? '')
        setPfContactRole(contact?.role ?? '')
        setPfContactEmail(contact?.email ?? '')
        setPfStatus(effectiveStatusLabel)
        setPfTone(ctx.tone)
        setPfIntent(ctx.intent)
        setPfLanguage(mailLanguage)

        setPrompt(buildPrompt({
            job: { ...selectedJob!, notes: effectiveNotes, status: effectiveStatus },
            candidate,
            contact,
            statusLabel: effectiveStatusLabel,
            statusContext: ctx,
            language: mailLanguage,
        }))
        setEditingPromptMode('fields')
        setStep(3)
    }

    function syncPromptFromFields() {
        const candidate: PromptCandidateData = {
            firstName: pf_firstName, lastName: pf_lastName,
            skills: pf_skills || undefined, degrees: pf_degrees || undefined,
            experiences: pf_experiences || undefined, notes: pf_notes || undefined,
        }
        const contact: PromptContactData | null = pf_contact_name
            ? { name: pf_contact_name, role: pf_contact_role || undefined, email: pf_contact_email || undefined }
            : null
        setPrompt(buildPrompt({
            job: { ...selectedJob!, company: pf_company, role: pf_role, notes: pf_notes, status: effectiveStatus },
            candidate, contact,
            statusLabel: pf_status,
            statusContext: { label: pf_status, intent: pf_intent, tone: pf_tone },
            language: pf_language,
        }))
    }

    async function generateMail() {
        setStep(4)
        setLoading(true)
        setError('')
        setGeneratedSubject('')
        setGeneratedBody('')
        setSaved(false)

        const candidate: PromptCandidateData = {
            firstName: pf_firstName, lastName: pf_lastName,
            skills: pf_skills || undefined, degrees: pf_degrees || undefined,
            experiences: pf_experiences || undefined, notes: pf_notes || undefined,
        }
        const contact: PromptContactData | null = pf_contact_name
            ? { name: pf_contact_name, role: pf_contact_role || undefined, email: pf_contact_email || undefined }
            : null

        const finalPrompt = editingPromptMode === 'fields'
            ? buildPrompt({
                job: { ...selectedJob!, company: pf_company, role: pf_role, notes: pf_notes, status: effectiveStatus },
                candidate, contact,
                statusLabel: pf_status,
                statusContext: { label: pf_status, intent: pf_intent, tone: pf_tone },
                language: pf_language,
            })
            : prompt

        try {
            const apiKey = await getApiKey()
            if (!apiKey) throw new Error('Clé API OpenRouter non configurée. Va dans Paramètres → OpenRouter pour la renseigner.')

            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'Follow-up Email Generator',
                },
                body: JSON.stringify({ model: selectedModel, messages: [{ role: 'user', content: finalPrompt }] }),
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const text: string = data?.choices?.[0]?.message?.content ?? ''

            const subjMatch = text.match(/(?:Objet|Subject)\s*:\s*(.+?)(?:\n|$)/i)
            const subject = subjMatch ? subjMatch[1].trim() : `Suivi – ${pf_role}`

            let body = text
            const separatorIdx = text.indexOf('---')
            if (separatorIdx !== -1) {
                body = text.slice(separatorIdx + 3).trim()
            } else {
                body = text.replace(/(?:Objet|Subject)\s*:.+?(\n|$)/i, '').trim()
            }

            body = body
                .split(/\n(?:Cordialement|Bien à vous|Sincèrement|Best regards|Kind regards|Yours sincerely|Mit freundlichen Grüßen|Atentamente|Cordiali saluti|Met vriendelijke groet)/i)[0]
                .trim()

            setGeneratedSubject(subject)
            setGeneratedBody(body)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue')
        } finally {
            setLoading(false)
        }
    }

    function copyToClipboard() {
        const subjectPrefix = pf_language === 'anglais' ? 'Subject' : 'Objet'
        const sig = candidateMode === 'profile' && selectedProfile?.email
            ? (signature || `${selectedProfile.firstName} ${selectedProfile.lastName}${selectedProfile.email ? `\n${selectedProfile.email}` : ''}${selectedProfile.phone ? `\n${selectedProfile.phone}` : ''}`)
            : signature
        const full = `${subjectPrefix} : ${generatedSubject}\n\n${generatedBody}${sig ? `\n\n${sig}` : ''}`
        navigator.clipboard.writeText(full)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function saveEmailToJob() {
        if (!selectedJob || !generatedSubject || !generatedBody) return

        const newEmail: FollowUpEmail = {
            id: crypto.randomUUID(),
            subject: generatedSubject,
            body: generatedBody,
            language: pf_language,
            generatedAt: new Date().toISOString(),
        }

        const existing = selectedJob.followUpEmails ?? []
        await updateJob.mutateAsync({
            id: selectedJob.id,
            updates: {
                followUpEmails: [...existing, newEmail],
                followed: false,
            }
        })
        setSaved(true)
        toast({
            title: 'Email sauvegardé',
            description: `Ajouté à la candidature ${selectedJob.company} · ${selectedJob.role}`,
        })
    }

    function reset() {
        setStep(1); setSelectedJobId(null)
        setFirstName(''); setLastName(''); setSignature(''); setMailLanguage('français')
        setGeneratedSubject(''); setGeneratedBody(''); setError('')
        setCandidateMode('manual'); setSelectedProfileId('')
        setSaved(false)
    }

    const steps = ['Candidature', 'Candidat', 'Prompt', 'Email']

    const effectiveSignature = (() => {
        if (signature) return signature
        if (candidateMode === 'profile' && selectedProfile) {
            const lines = [`${selectedProfile.firstName} ${selectedProfile.lastName}`]
            if (selectedProfile.email) lines.push(selectedProfile.email)
            if (selectedProfile.phone) lines.push(selectedProfile.phone)
            return lines.join('\n')
        }
        return ''
    })()

    return (
        <div className="max-w-xl flex flex-col gap-6">
            <div>
                <h1 className="font-display text-3xl text-foreground">Relancer</h1>
                <p className="text-sm text-muted-foreground mt-1">Génère un email de suivi personnalisé</p>
            </div>

            {/* No key warning */}
            {!hasKey && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                    <span className="text-base shrink-0">⚠️</span>
                    <span>
                        Aucune clé API OpenRouter configurée.{' '}
                        <a href="/settings" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                            Va dans Paramètres
                        </a>{' '}
                        pour la renseigner avant de pouvoir générer un mail.
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

            {/* ── Step 1: Choose job ── */}
            {step === 1 && (
                <div className="flex flex-col gap-4 animate-slide-up">
                    <p className="text-sm text-muted-foreground">Choisis la candidature à relancer :</p>
                    {followUpJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-dashed border-border">
                            <Mail className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">Aucune candidature enregistrée</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {followUpJobs.map(job => {
                                const c = columns.find(c => c.id === job.status)
                                const colors = c ? COLUMN_COLOR_STYLES[c.color as keyof typeof COLUMN_COLOR_STYLES] ?? FALLBACK_COLOR_STYLE : FALLBACK_COLOR_STYLE
                                const isSelected = selectedJobId === job.id
                                const hasContact = !!job.contact?.name || !!companies.find(co =>
                                    co.id === job.companyId || co.name === job.company?.toLowerCase().trim()
                                )?.contacts?.length
                                const emailCount = job.followUpEmails?.length ?? 0
                                return (
                                    <button
                                        key={job.id}
                                        onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                                        className={cn(
                                            'flex items-center gap-4 text-left rounded-xl border p-4 transition-all',
                                            isSelected
                                                ? 'border-foreground bg-accent shadow-sm'
                                                : 'border-border bg-card hover:border-foreground/30 hover:bg-accent/30'
                                        )}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">{job.company}</p>
                                            <p className="text-xs text-muted-foreground truncate">{job.role}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-mono text-muted-foreground/60">{formatDate(job.dateApplied, t.intlLocale)}</p>
                                                {hasContact && (
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                                        <User className="h-2.5 w-2.5" /> contact
                                                    </span>
                                                )}
                                                {job.followed && (
                                                    <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                                                        <Check className="h-2.5 w-2.5" /> relancé
                                                    </span>
                                                )}
                                                {emailCount > 0 && (
                                                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                                                        {emailCount}✉ sauvegardé{emailCount > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge className={cn(colors.badge, 'text-[10px] shrink-0')}>{c?.label ?? job.status}</Badge>
                                        {isSelected && <Check className="h-4 w-4 text-foreground shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    <Button onClick={goToStep2} disabled={!selectedJobId} className="self-end">
                        Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* ── Step 2: Candidate info ── */}
            {step === 2 && selectedJob && (
                <div className="flex flex-col gap-4 animate-slide-up">
                    <JobInfoPanel
                        job={{ ...selectedJob, notes: effectiveNotes, status: effectiveStatus }}
                        statusLabel={effectiveStatusLabel}
                        onStatusChange={s => setOverrideStatus(s)}
                        onNotesChange={n => setOverrideNotes(n)}
                        columns={columns}
                    />

                    {(jobContact || selectedJob.contact?.name) && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
                            <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Contact détecté chez {selectedJob.company}</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {(jobContact?.name || selectedJob.contact?.name)}
                                    {(jobContact?.role) && ` · ${jobContact.role}`}
                                    {(jobContact?.email || selectedJob.contact?.email) && ` · ${jobContact?.email || selectedJob.contact?.email}`}
                                </p>
                                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60 mt-0.5">Le mail sera adressé directement à cette personne.</p>
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vos informations</h3>

                        {profiles.length > 0 && (
                            <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
                                {([
                                    { key: 'manual', label: '✏️ Manuel' },
                                    { key: 'profile', label: '👤 Profil' },
                                ] as const).map(m => (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => setCandidateMode(m.key)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                                            candidateMode === m.key
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {candidateMode === 'profile' && (
                            <div className="flex flex-col gap-2">
                                <Label>Sélectionner un profil</Label>
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

                                {selectedProfile && (
                                    <div className="rounded-lg bg-muted/50 border border-border p-3 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-display shrink-0">
                                                {selectedProfile.firstName.charAt(0)}{selectedProfile.lastName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{selectedProfile.firstName} {selectedProfile.lastName}</p>
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
                                                <span className="text-foreground/60 font-medium">{selectedProfile.experiences.length} expérience(s)</span> incluse(s) dans le prompt
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {candidateMode === 'manual' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label>Prénom *</Label>
                                    <Input value={firstName} onChange={e => { setFirstName(e.target.value); setFirstNameErr(false) }} placeholder="Jean" className={firstNameErr ? 'border-destructive' : ''} />
                                    {firstNameErr && <p className="text-xs text-destructive">Requis</p>}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Nom *</Label>
                                    <Input value={lastName} onChange={e => { setLastName(e.target.value); setLastNameErr(false) }} placeholder="Dupont" className={lastNameErr ? 'border-destructive' : ''} />
                                    {lastNameErr && <p className="text-xs text-destructive">Requis</p>}
                                </div>
                            </div>
                        )}

                        <LanguageSelector value={mailLanguage} onChange={setMailLanguage} />

                        <div className="flex flex-col gap-1.5">
                            <Label>
                                Signature{' '}
                                <span className="text-muted-foreground/50 normal-case font-normal">
                                    (optionnel{candidateMode === 'profile' && selectedProfile ? ' — auto-générée depuis le profil si vide' : ''})
                                </span>
                            </Label>
                            <Textarea value={signature} onChange={e => setSignature(e.target.value)} placeholder={`Bien à vous,\nJean Dupont\n+33 6 00 00 00 00`} rows={3} />
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                        <Button onClick={goToStep3} disabled={candidateMode === 'profile' && !selectedProfileId}>
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
                                {(['fields', 'raw'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => { if (mode === 'raw') syncPromptFromFields(); setEditingPromptMode(mode) }}
                                        className={cn(
                                            'text-xs px-2.5 py-1 rounded-md border transition-all',
                                            editingPromptMode === mode
                                                ? 'bg-foreground text-background border-foreground'
                                                : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40'
                                        )}
                                    >
                                        {mode === 'fields' ? 'Champs' : 'Prompt brut'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editingPromptMode === 'fields' ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Candidat</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5"><Label>Prénom</Label><Input value={pf_firstName} onChange={e => setPfFirstName(e.target.value)} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Nom</Label><Input value={pf_lastName} onChange={e => setPfLastName(e.target.value)} /></div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Compétences</Label>
                                    <Textarea value={pf_skills} onChange={e => setPfSkills(e.target.value)} rows={2} placeholder="Vide = aucune compétence mentionnée" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Diplômes</Label>
                                    <Input value={pf_degrees} onChange={e => setPfDegrees(e.target.value)} placeholder="Master Finance…" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Expériences</Label>
                                    <Textarea value={pf_experiences} onChange={e => setPfExperiences(e.target.value)} rows={3} placeholder="Expériences pro / perso…" />
                                </div>

                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1 border-t border-border">Candidature</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5"><Label>Entreprise</Label><Input value={pf_company} onChange={e => setPfCompany(e.target.value)} /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Poste</Label><Input value={pf_role} onChange={e => setPfRole(e.target.value)} /></div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label>Notes <span className="text-muted-foreground/50 font-normal normal-case">— seule source compétences additionnelles</span></Label>
                                    <Textarea value={pf_notes} onChange={e => setPfNotes(e.target.value)} rows={2} />
                                </div>

                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1 border-t border-border">Contact entreprise</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-1.5"><Label>Nom</Label><Input value={pf_contact_name} onChange={e => setPfContactName(e.target.value)} placeholder="Marie Dupont" /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Rôle</Label><Input value={pf_contact_role} onChange={e => setPfContactRole(e.target.value)} placeholder="DRH" /></div>
                                    <div className="flex flex-col gap-1.5"><Label>Email</Label><Input value={pf_contact_email} onChange={e => setPfContactEmail(e.target.value)} placeholder="m@co.com" /></div>
                                </div>

                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest pt-1 border-t border-border">Contexte</p>
                                <div className="flex flex-col gap-1.5"><Label>Statut</Label><Input value={pf_status} onChange={e => setPfStatus(e.target.value)} /></div>
                                <div className="flex flex-col gap-1.5"><Label>Ton</Label><Input value={pf_tone} onChange={e => setPfTone(e.target.value)} /></div>
                                <div className="flex flex-col gap-1.5"><Label>Intention</Label><Textarea value={pf_intent} onChange={e => setPfIntent(e.target.value)} rows={2} /></div>
                                <LanguageSelector value={pf_language} onChange={setPfLanguage} />
                            </div>
                        ) : (
                            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={22} className="font-mono text-xs" />
                        )}
                    </div>

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                        <Button onClick={generateMail}><Mail className="h-4 w-4" />Générer le mail</Button>
                    </div>
                </div>
            )}

            {/* ── Step 4: Email ── */}
            {step === 4 && (
                <div className="flex flex-col gap-4 animate-slide-up">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-border bg-card">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Génération en cours…</p>
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col gap-3">
                            <p className="text-sm font-semibold text-destructive">Erreur lors de la génération</p>
                            <p className="text-xs text-muted-foreground font-mono">{error}</p>
                            <Button variant="outline" size="sm" onClick={() => setStep(3)}>Réessayer</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email généré</h3>
                                        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                            {MAIL_LANGUAGES.find(l => l.value === pf_language)?.label ?? pf_language}
                                        </span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="shrink-0">
                                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                        {copied ? 'Copié !' : 'Copier tout'}
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>{pf_language === 'anglais' ? 'Subject' : 'Objet'}</Label>
                                    <Input value={generatedSubject} onChange={e => setGeneratedSubject(e.target.value)} className="font-medium" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label>Corps du mail</Label>
                                    <Textarea value={generatedBody} onChange={e => setGeneratedBody(e.target.value)} rows={11} className="text-sm leading-relaxed" />
                                </div>

                                {effectiveSignature && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Signature <span className="text-muted-foreground/50 normal-case font-normal">(incluse lors de la copie)</span></Label>
                                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-muted-foreground whitespace-pre-wrap font-mono text-xs">
                                            {effectiveSignature}
                                        </div>
                                    </div>
                                )}

                                {/* Save to job button */}
                                {selectedJob && (
                                    <div className="pt-3 border-t border-border">
                                        {saved ? (
                                            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                                <BookmarkCheck className="h-4 w-4" />
                                                <span className="font-medium">Sauvegardé dans la candidature</span>
                                                <span className="text-xs text-muted-foreground">· La candidature est maintenant marquée « relancé »</span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={saveEmailToJob}
                                                className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/30 transition-all text-left group"
                                            >
                                                <Save className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                                <div className="flex flex-col gap-0">
                                                    <span className="text-sm font-medium text-foreground">Sauvegarder dans la candidature</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Ajoute cet email à {selectedJob.company} · {selectedJob.role} 
                                                    </span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <Button variant="outline" onClick={reset}><X className="h-4 w-4" />Nouveau</Button>
                                <Button variant="outline" onClick={() => setStep(3)}>Modifier le prompt</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
