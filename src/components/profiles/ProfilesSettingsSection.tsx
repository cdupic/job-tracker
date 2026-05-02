import { useState } from 'react'
import { Plus, Pencil, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProfileForm } from './ProfileForm'
import { useProfiles, type CandidateProfile } from '@/hooks/useProfiles'
import { cn } from '@/lib/utils'

export function ProfilesSettingsSection() {
    const { profiles } = useProfiles()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editing, setEditing] = useState<CandidateProfile | null>(null)

    function openCreate() {
        setEditing(null)
        setDialogOpen(true)
    }

    function openEdit(p: CandidateProfile) {
        setEditing(p)
        setDialogOpen(true)
    }

    return (
        <>
            <section className="bg-card border border-border rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold">Profils candidat</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Vos informations pré-remplies pour la génération de mails de relance
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Nouveau profil
                    </Button>
                </div>

                {profiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Aucun profil créé</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">
                                Crée un profil pour pré-remplir les mails de relance avec tes informations.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4" />
                            Créer mon premier profil
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {profiles.map(profile => (
                            <div
                                key={profile.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                            >
                                {/* Avatar */}
                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display text-base">
                                    {profile.firstName.charAt(0).toUpperCase()}{profile.lastName.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {profile.firstName} {profile.lastName}
                                        {profile.email && ` · ${profile.email}`}
                                    </p>
                                    {(profile.experiences.length > 0 || profile.skills) && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                            {profile.experiences.length > 0 && `${profile.experiences.length} exp.`}
                                            {profile.experiences.length > 0 && profile.skills && ' · '}
                                            {profile.skills && profile.skills.slice(0, 60) + (profile.skills.length > 60 ? '…' : '')}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => openEdit(profile)}
                                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? `Modifier · ${editing.name}` : 'Nouveau profil candidat'}
                        </DialogTitle>
                    </DialogHeader>
                    <ProfileForm
                        profile={editing ?? undefined}
                        onClose={() => setDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}
