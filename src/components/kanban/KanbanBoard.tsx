// src/components/kanban/KanbanBoard.tsx
import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { useJobs, useUpdateJob } from '@/hooks/useJobs'
import { useSettings } from '@/hooks/useSettings'
import { STATUS_ORDER, type JobApplication, type JobStatus } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { JobCard } from './JobCard'

export function KanbanBoard() {
  const { data: jobs = [] } = useJobs()
  const updateJob = useUpdateJob()
  const { settings } = useSettings()
  const [activeJob, setActiveJob] = useState<JobApplication | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getJobsByStatus(status: JobStatus): JobApplication[] {
    return jobs.filter((j) => j.status === status)
  }

  function handleDragStart(event: DragStartEvent) {
    const job = jobs.find((j) => j.id === event.active.id)
    setActiveJob(job ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column (status) or another card
    const newStatus = STATUS_ORDER.includes(overId as JobStatus)
      ? (overId as JobStatus)
      : jobs.find((j) => j.id === overId)?.status

    const job = jobs.find((j) => j.id === jobId)
    if (!job || !newStatus || job.status === newStatus) return

    updateJob.mutate({ id: jobId, updates: { status: newStatus } })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 pb-8">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            jobs={getJobsByStatus(status)}
            followUpDays={settings.followUpDays}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeJob && (
          <div className="scale-105 shadow-2xl opacity-95">
            <JobCard job={activeJob} followUpDays={settings.followUpDays} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
