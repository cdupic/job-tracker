// src/components/periods/PeriodForm.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react'
import { cn, todayISO } from '@/lib/utils'
import { useCreatePeriod, useUpdatePeriod, useDeletePeriod } from '@/hooks/usePeriods'
import { toast } from '@/hooks/useToast'
import { ALL_PERIOD_COLORS, PERIOD_COLOR_STYLES, type Period, type PeriodColor } from '@/types'
import { useI18n } from '@/i18n'

interface PeriodFormProps {
    period?: Period
    onClose: () => void
}

export function PeriodForm({ period, onClose }: PeriodFormProps) {
    const isEdit = !!period
    const { t } = useI18n()

    const [name, setName] = useState(period?.name ?? '')
    const [color, setColor] = useState<PeriodColor>(period?.color ?? 'blue')
    const [startDate, setStartDate] = useState(period?.startDate ?? todayISO())
    const [endDate, setEndDate] = useState(period?.endDate ?? '')
    const [nameError, setNameError] = useState('')

    const createPeriod = useCreatePeriod()
    const updatePeriod = useUpdatePeriod()
    const deletePeriod = useDeletePeriod()

    const isPending = createPeriod.isPending || updatePeriod.isPending

    function parseDate(str: string) {
        if (!str) return undefined
        const [y, m, d] = str.split('-').map(Number)
        return new Date(y, m - 1, d)
    }

    function toISO(d: Date) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { setNameError(t.periods.errorName); return }
        setNameError('')

        const payload = {
            name: name.trim(),
            color,
            startDate,
            endDate: endDate || undefined,
        }

        if (isEdit) {
            await updatePeriod.mutateAsync({ id: period.id, updates: payload })
            toast({ title: t.periods.toastUpdated })
        } else {
            await createPeriod.mutateAsync(payload)
            toast({ title: t.periods.toastCreated })
        }
        onClose()
    }

    async function handleDelete() {
        if (!period) return
        await deletePeriod.mutateAsync(period.id)
        toast({ title: t.periods.toastDeleted, variant: 'destructive' })
        onClose()
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-name">{t.periods.nameLabel}</Label>
                <Input
                    id="period-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.periods.namePlaceholder}
                    className={nameError ? 'border-destructive' : ''}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-1.5">
                <Label>{t.periods.colorLabel}</Label>
                <div className="flex gap-2 flex-wrap">
                    {ALL_PERIOD_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={cn(
                                'h-7 w-7 rounded-full transition-all border-2',
                                PERIOD_COLOR_STYLES[c].dot,
                                color === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                            )}
                            title={c}
                        />
                    ))}
                </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label>{t.periods.startDateLabel}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(parseDate(startDate)!, 'PPP', { locale: t.dateFnsLocale }) : <span>{t.form.chooseDate}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100] bg-card" align="start">
                            <Calendar
                                mode="single"
                                locale={t.dateFnsLocale}
                                selected={parseDate(startDate)}
                                onSelect={(d) => { if (d) setStartDate(toISO(d)) }}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={2015}
                                toYear={new Date().getFullYear() + 3}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label>{t.periods.endDateLabel}</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(parseDate(endDate)!, 'PPP', { locale: t.dateFnsLocale }) : <span>{t.periods.ongoing}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100] bg-card" align="start">
                            <div className="p-2">
                                <button
                                    type="button"
                                    onClick={() => setEndDate('')}
                                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-accent transition-colors mb-1"
                                >
                                    {t.periods.clearEndDate}
                                </button>
                            </div>
                            <Calendar
                                mode="single"
                                locale={t.dateFnsLocale}
                                selected={parseDate(endDate)}
                                onSelect={(d) => { if (d) setEndDate(toISO(d)) }}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={2015}
                                toYear={new Date().getFullYear() + 3}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Preview badge */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.periods.preview}</span>
                <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border',
                    PERIOD_COLOR_STYLES[color].badge,
                    PERIOD_COLOR_STYLES[color].border
                )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', PERIOD_COLOR_STYLES[color].dot)} />
                    {name || t.periods.namePlaceholder}
                    {!endDate && <span className="text-[9px] font-mono px-1 rounded bg-white/20 dark:bg-black/20">{t.periods.active}</span>}
        </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
                {isEdit ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                        disabled={deletePeriod.isPending}
                    >
                        {deletePeriod.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {t.form.delete}
                    </Button>
                ) : <div />}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>{t.form.cancel}</Button>
                    <Button type="submit" size="sm" disabled={isPending}>
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isEdit ? t.form.save : t.periods.create}
                    </Button>
                </div>
            </div>
        </form>
    )
}
