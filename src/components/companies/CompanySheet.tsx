import { useState } from 'react'
import { Globe, Plus, Trash2, Loader2, ExternalLink, User, Mail, AlertTriangle, X } from 'lucide-react'
import { cn, formatDate, daysBetween, ensureUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    useCompany,
    useUpdateCompany,
    useCreateCompany,
    useDeleteCompany,
} from '@/hooks/useCompanies'
import { useJobs, useUpdateJob } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { toast } from '@/hooks/useToast'
import { type CompanyContact, COLUMN_COLOR_STYLES, FALLBACK_COLOR_STYLE, PERIOD_COLOR_STYLES } from '@/types'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { useI18n } from '@/i18n'

interface CompanySheetProps {
    companyId?: string
    companyName?: string
    jobId?: string
    onClose: () => void
}

export function CompanySheet({ companyId, companyName, jobId, onClose }: CompanySheetProps) {
    const { t } = useI18n()
    const { data: company, isLoading } = useCompany(companyId)
    const { data: allJobs = [] } = useJobs()
    const { data: periods = [] } = usePeriods()
    const { columns } = useKanbanConfig()
    const createCompany = useCreateCompany()
    const updateCompany = useUpdateCompany()
    const deleteCompany = useDeleteCompany()
    const updateJob = useUpdateJob()

    const [displayName, setDisplayName] = useState('')
    const [website, setWebsite] = useState('')
    const [sector, setSector] = useState('')
    const [notes, setNotes] = useState('')
    const [contacts, setContacts] = useState<CompanyContact[]>([])
    const [isEditing, setIsEditing] = useState(!companyId)
    const [duplicateError, setDuplicateError] = useState('')

    // Confirmation suppression
    const [confirmDelete, setConfirmDelete] = useState(false)

    const [initialized, setInitialized] = useState(false)
    if (company && !initialized) {
        setDisplayName(company.displayName)
        setWebsite(company.website ?? '')
        setSector(company.sector ?? '')
        setNotes(company.notes ?? '')
        setContacts(company.contacts)
        setInitialized(true)
    } else if (!company && !companyId && !initialized) {
        setDisplayName(companyName ?? '')
        setInitialized(true)
    }

    const linkedJobs = allJobs.filter((j) => {
        if (companyId && j.companyId === companyId) return true
        if (company && j.company.toLowerCase().trim() === company.name) return true
        return false
    })

    const respondedJobs = linkedJobs.filter((j) => j.status !== 'applied' && j.status !== 'abandoned')
    const avgResponseDays = respondedJobs.length === 0 ? null
        : Math.round(respondedJobs.reduce((acc, j) => acc + daysBetween(j.dateApplied), 0) / respondedJobs.length)

    function addContact() {
        setContacts([...contacts, { id: crypto.randomUUID() }])
    }

    function updateContact(id: string, field: keyof CompanyContact, value: string) {
        setContacts(contacts.map((c) => c.id === id ? { ...c, [field]: value } : c))
    }

    function removeContact(id: string) {
        setContacts(contacts.filter((c) => c.id !== id))
    }

    async function handleSave() {
        if (!displayName.trim()) return
        setDuplicateError('')

        const payload = {
            displayName: displayName.trim(),
            website: website.trim() || undefined,
            sector: sector.trim() || undefined,
            notes: notes.trim() || undefined,
            contacts,
        }

        try {
            let savedId = companyId
            if (companyId) {
                await updateCompany.mutateAsync({ id: companyId, updates: payload })
                toast({ title: t.companies.toastUpdated })
            } else {
                const created = await createCompany.mutateAsync({
                    ...payload,
                    name: payload.displayName.toLowerCase().trim(),
                })
                savedId = created.id
                toast({ title: t.companies.toastCreated })
            }

            if (jobId && savedId) {
                await updateJob.mutateAsync({ id: jobId, updates: { companyId: savedId } })
            }

            setIsEditing(false)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : ''
            if (msg.startsWith('DUPLICATE_COMPANY:')) {
                setDuplicateError(`Une fiche existe déjà pour "${displayName.trim()}".`)
            } else {
                throw err
            }
        }
    }

    // Suppression : d'abord détacher les jobs (mettre companyId à undefined),
    // puis supprimer la fiche
    async function handleConfirmDelete() {
        if (!companyId) return

        // Détacher tous les jobs liés
        for (const job of linkedJobs) {
            await updateJob.mutateAsync({ id: job.id, updates: { companyId: undefined } })
        }

        await deleteCompany.mutateAsync(companyId)
        toast({ title: t.companies.toastDeleted, variant: 'destructive' })
        onClose()
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const isPending = createCompany.isPending || updateCompany.isPending
    const isDeleting = deleteCompany.isPending

    // ── Écran de confirmation suppression ──────────────────────────────────────
    if (confirmDelete) {
        return (
            <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-semibold text-destructive">
                            Supprimer « {company?.displayName ?? displayName} » ?
                        </p>
                        {linkedJobs.length > 0 ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Cette fiche est liée à{' '}
                                    <span className="font-semibold text-foreground">
                                        {linkedJobs.length} candidature{linkedJobs.length > 1 ? 's' : ''}
                                    </span>
                                    {' '}:
                                </p>
                                <ul className="flex flex-col gap-1 mt-1">
                                    {linkedJobs.slice(0, 5).map(j => (
                                        <li key={j.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                            {j.role} — {formatDate(j.dateApplied, t.intlLocale)}
                                        </li>
                                    ))}
                                    {linkedJobs.length > 5 && (
                                        <li className="text-xs text-muted-foreground/60 italic">
                                            + {linkedJobs.length - 5} autre{linkedJobs.length - 5 > 1 ? 's' : ''}…
                                        </li>
                                    )}
                                </ul>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Ces candidatures ne seront <span className="font-semibold">pas supprimées</span> — elles seront simplement détachées de cette fiche.
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Aucune candidature liée. Cette action est irréversible.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting}
                    >
                        Annuler
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        {linkedJobs.length > 0
                            ? `Supprimer (détacher ${linkedJobs.length} candidature${linkedJobs.length > 1 ? 's' : ''})`
                            : 'Supprimer la fiche'}
                    </Button>
                </div>
            </div>
        )
    }

    // ── Fiche normale ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border shrink-0">
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex flex-col gap-1">
                            <Input
                                value={displayName}
                                onChange={(e) => { setDisplayName(e.target.value); setDuplicateError('') }}
                                placeholder={t.companies.namePlaceholder}
                                className={cn(
                                    'font-display text-xl h-auto py-1 px-2 -ml-2 border-0 border-b rounded-none focus-visible:ring-0 text-foreground',
                                    duplicateError ? 'border-destructive' : ''
                                )}
                            />
                            {duplicateError && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {duplicateError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <h2 className="font-display text-xl text-foreground">{company?.displayName ?? displayName}</h2>
                    )}
                    {!isEditing && company?.sector && (
                        <p className="text-xs text-muted-foreground mt-0.5">{company.sector}</p>
                    )}
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-5">
                {/* Stats row */}
                {linkedJobs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="font-display text-2xl text-foreground">{linkedJobs.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t.companies.statApplications}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="font-display text-2xl text-foreground">{respondedJobs.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t.companies.statResponses}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="font-display text-2xl text-foreground">{avgResponseDays ?? '—'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{t.companies.statAvgDays}</p>
                        </div>
                    </div>
                )}

                {/* Website + Sector (edit mode) */}
                {isEditing && (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label>{t.companies.websiteLabel}</Label>
                            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>{t.companies.sectorLabel}</Label>
                            <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder={t.companies.sectorPlaceholder} />
                        </div>
                    </div>
                )}

                {/* Website display */}
                {!isEditing && company?.website && (
                    <a
                        href={ensureUrl(company.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                )}

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                    <Label>{t.companies.notesLabel}</Label>
                    {isEditing ? (
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.companies.notesPlaceholder} rows={3} />
                    ) : (
                        company?.notes
                            ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
                            : <p className="text-xs text-muted-foreground/50 italic">{t.companies.noNotes}</p>
                    )}
                </div>

                {/* Contacts */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <Label>{t.companies.contactsLabel}</Label>
                        {isEditing && (
                            <button type="button" onClick={addContact} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <Plus className="h-3.5 w-3.5" /> {t.companies.addContact}
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        contacts.length === 0 ? (
                            <button
                                type="button"
                                onClick={addContact}
                                className="flex items-center justify-center gap-2 h-12 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" /> {t.companies.addFirstContact}
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {contacts.map((c) => (
                                    <div key={c.id} className="flex flex-col gap-1.5 p-3 bg-muted/40 rounded-lg relative">
                                        <button
                                            type="button"
                                            onClick={() => removeContact(c.id)}
                                            className="absolute top-2 right-2 h-5 w-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <div className="grid grid-cols-2 gap-2 pr-6">
                                            <Input value={c.name ?? ''} onChange={(e) => updateContact(c.id, 'name', e.target.value)} placeholder={t.form.contactNamePlaceholder} className="h-7 text-xs" />
                                            <Input value={c.role ?? ''} onChange={(e) => updateContact(c.id, 'role', e.target.value)} placeholder={t.companies.contactRolePlaceholder} className="h-7 text-xs" />
                                        </div>
                                        <Input value={c.email ?? ''} onChange={(e) => updateContact(c.id, 'email', e.target.value)} placeholder={t.form.contactEmailPlaceholder} className="h-7 text-xs" />
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        contacts.length === 0 ? (
                            <p className="text-xs text-muted-foreground/50 italic">{t.companies.noContacts}</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {contacts.map((c) => (
                                    <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display">
                                            {c.name ? c.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{c.name || t.card.contactUnknown}</p>
                                            {c.role && <p className="text-xs text-muted-foreground truncate">{c.role}</p>}
                                            {c.email && (
                                                <a href={`mailto:${c.email}`} className="text-xs text-muted-foreground hover:text-primary transition-colors truncate flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{c.email}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Applications timeline */}
                {linkedJobs.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <Label>{t.companies.applicationsLabel}</Label>
                        <div className="flex flex-col gap-1.5">
                            {[...linkedJobs]
                                .sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())
                                .map((job) => {
                                    const col = columns.find((c) => c.id === job.status)
                                    const colors = col ? COLUMN_COLOR_STYLES[col.color] : FALLBACK_COLOR_STYLE
                                    const period = periods.find((p) => p.id === job.periodId)
                                    return (
                                        <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-medium text-foreground truncate">{job.role}</p>
                                                    {period && (
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border shrink-0',
                                                            PERIOD_COLOR_STYLES[period.color].badge,
                                                            PERIOD_COLOR_STYLES[period.color].border
                                                        )}>
                                                            <span className={cn('h-1 w-1 rounded-full', PERIOD_COLOR_STYLES[period.color].dot)} />
                                                            {period.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-mono text-muted-foreground">{formatDate(job.dateApplied, t.intlLocale)}</p>
                                            </div>
                                            <Badge className={cn(colors.badge, 'text-[10px]')}>{col?.label ?? job.status}</Badge>
                                        </div>
                                    )
                                })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border shrink-0">
                {isEditing && companyId ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                        {t.form.delete}
                    </Button>
                ) : <div />}

                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            {companyId && (
                                <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setDuplicateError('') }}>
                                    {t.form.cancel}
                                </Button>
                            )}
                            <Button size="sm" onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t.form.save}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                            {t.companies.edit}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
