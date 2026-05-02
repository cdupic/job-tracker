// src/components/profiles/ProfileForm.tsx
import { useState } from 'react'
import { Plus, Trash2, Loader2, GripVertical, X, Briefcase, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { type CandidateProfile, type ProfileExperience, useProfiles } from '@/hooks/useProfiles'
import { useCompanies } from '@/hooks/useCompanies'

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

export function ProfileForm({ profile, onClose }: ProfileFormProps) {
    const isEdit = !!profile
    const { saveProfile, updateProfile, deleteProfile } = useProfiles()
    const { data: companies = [] } = useCompanies()

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
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>Annuler</Button>
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

// function MonthInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
//     return (
//         <div className="flex flex-col gap-1 flex-1">
//             <Label className="text-[10px]">{label}</Label>
//             <Input
//                 type="month"
//                 value={value}
//                 onChange={e => onChange(e.target.value)}
//                 className="h-7 text-xs"
//             />
//         </div>
//     )
// }
