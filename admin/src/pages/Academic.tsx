import { useState, type FormEvent } from 'react'
import { GraduationCap, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createSection,
  deleteSection,
  getAcademic,
  updateSection,
  type SectionInput,
} from '../lib/db'
import { errorMessage, useAsync } from '../lib/useAsync'
import { useSchool } from '../lib/school'
import type { GradeLevel, SectionRow, Strand } from '../lib/types'
import { ErrorBlock, FormError, LoadingBlock } from '../components/states'
import {
  Badge,
  Button,
  Card,
  CardTitle,
  DataPoint,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
} from '../components/ui'

export function Academic() {
  const school = useSchool()
  const { data, loading, error, reload } = useAsync(getAcademic, [])
  const [grade, setGrade] = useState('')
  const [editing, setEditing] = useState<SectionRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  async function remove(section: SectionRow) {
    setRowError(null)
    try {
      await deleteSection(section.id)
      reload()
    } catch (err) {
      setRowError(errorMessage(err))
    }
  }

  if (loading && !data) return <LoadingBlock label="Loading academic setup…" />
  if (error && !data) return <ErrorBlock message={error} onRetry={reload} />
  if (!data) return null

  const rows = grade
    ? data.sections.filter((s) => s.gradeLevel === grade)
    : data.sections
  const enrolled = rows.reduce((sum, s) => sum + s.enrolled, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Academic Setup"
        description="The school year, grade levels, sections and strands the rest of the system reads from."
      >
        <Button
          variant="primary"
          onClick={() => setAdding(true)}
          disabled={data.activeYear === null}
        >
          <Plus size={18} strokeWidth={2.4} />
          Add section
        </Button>
      </PageHeader>

      {data.activeYear === null && (
        <FormError message="No school year is marked active, so sections cannot be added and nobody can be enrolled." />
      )}

      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <GraduationCap size={24} strokeWidth={1.8} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
              Active school year
            </span>
            <span className="display-title text-[32px] leading-none text-ink">
              {data.activeYear?.label ?? 'None'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <DataPoint label="School ID" value={school.schoolId ?? '—'} />
          <DataPoint label="Grade levels" value={String(data.grades.length)} />
          <DataPoint label="Sections" value={String(data.sections.length)} />
          <DataPoint label="Strands" value={String(data.strands.length)} />
        </div>
      </Card>

      {rowError && <FormError message={rowError} />}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-5">
            <div className="flex flex-col gap-1">
              <CardTitle>Sections</CardTitle>
              <p className="text-sm text-muted">
                {rows.length} sections · {enrolled.toLocaleString()} learners
              </p>
            </div>
            <Field label="Grade level" htmlFor="grade" className="w-[170px]">
              <Select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">All grades</option>
                {data.grades.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="py-3 pl-6">
                  Section
                </th>
                <th scope="col" className="py-3">
                  Grade
                </th>
                <th scope="col" className="py-3">
                  Strand
                </th>
                <th scope="col" className="py-3 text-right">
                  Learners
                </th>
                <th scope="col" className="py-3 pr-6 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <SectionTableRow
                  key={s.id}
                  section={s}
                  onEdit={() => setEditing(s)}
                  onDelete={() => remove(s)}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-muted">
                    No sections for that grade level yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-6">
          <ListCard
            title="Grade levels"
            description="Junior high is Grades 7–10; senior high is 11–12."
            items={data.grades.map((g) => g.name)}
          />
          <ListCard
            title="Strands"
            description="Offered to senior high only. The registrar form hides this field for Grades 7–10, and the database refuses one on a junior-high section."
            items={data.strands.map((s) => s.code)}
          />
        </div>
      </div>

      {(adding || editing) && data.activeYear && (
        <SectionDialog
          section={editing}
          grades={data.grades}
          strands={data.strands}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={() => {
            setAdding(false)
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function SectionTableRow({
  section,
  onEdit,
  onDelete,
}: {
  section: SectionRow
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pr-4 pl-6">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">
            {section.name}
          </span>
          <span className="text-[13px] text-muted">
            Adviser: {section.adviser ?? '—'}
          </span>
        </div>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">{section.gradeLevel}</td>
      <td className="py-3 pr-4">
        {section.strand ? (
          <Badge tone="info">{section.strand}</Badge>
        ) : (
          <span className="text-[15px] text-subtle">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-right text-[15px] text-ink tabular-nums">
        {section.enrolled}
      </td>
      <td className="py-3 pr-6">
        <div className="flex items-center justify-end gap-2">
          <IconButton label={`Edit ${section.name}`} onClick={onEdit}>
            <Pencil size={15} strokeWidth={1.9} />
          </IconButton>
          {/*
            No confirm dialog: the API refuses to delete a section anybody is
            enrolled in, and says how many. An empty section is cheap to remake.
          */}
          <IconButton label={`Delete ${section.name}`} onClick={onDelete}>
            <Trash2 size={15} strokeWidth={1.9} />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

function ListCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: string[]
}) {
  return (
    <Card className="p-6">
      <CardTitle>{title}</CardTitle>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">
        {description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-line bg-cream px-2.5 py-1.5 text-[14px] font-medium text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SectionDialog({
  section,
  grades,
  strands,
  onClose,
  onSaved,
}: {
  section: SectionRow | null
  grades: GradeLevel[]
  strands: Strand[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(section?.name ?? '')
  const [gradeId, setGradeId] = useState(
    section?.gradeLevelId ?? grades[0]?.id ?? 0,
  )
  const [strandId, setStrandId] = useState<number | null>(
    section?.strandId ?? null,
  )
  const [adviser, setAdviser] = useState(section?.adviser ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A strand belongs to senior high only, and a trigger enforces it — so the
  // field disappears rather than offering a choice the database will refuse.
  const seniorHigh = grades.find((g) => g.id === gradeId)?.seniorHigh ?? false

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const body: SectionInput = {
      name,
      gradeLevelId: gradeId,
      strandId: seniorHigh ? strandId : null,
      adviser,
    }

    try {
      section ? await updateSection(section.id, body) : await createSection(body)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={section ? 'Edit section' : 'Add section'}
        className="flex w-[520px] max-w-full flex-col gap-5 rounded-2xl border border-line bg-white p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="display-title text-[28px] leading-none text-ink">
              {section ? 'Edit section' : 'Add section'}
            </h2>
            <p className="text-sm text-muted">
              Learners are enrolled into a section, and the section carries the
              grade and strand.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={17} strokeWidth={2.2} />
          </IconButton>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Section name" htmlFor="section-name" required>
            <Input
              id="section-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sampaguita"
              required
            />
          </Field>

          <Field label="Grade level" htmlFor="section-grade" required>
            <Select
              id="section-grade"
              value={gradeId}
              onChange={(e) => setGradeId(Number(e.target.value))}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {seniorHigh && (
          <Field label="Strand" htmlFor="section-strand">
            <Select
              id="section-strand"
              value={strandId ?? ''}
              onChange={(e) =>
                setStrandId(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <option value="">No strand</option>
              {strands.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                  {s.name ? ` — ${s.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Adviser" htmlFor="section-adviser">
          <Input
            id="section-adviser"
            value={adviser}
            onChange={(e) => setAdviser(e.target.value)}
            placeholder="J. Aquino"
          />
        </Field>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Saving…' : section ? 'Save changes' : 'Add section'}
          </Button>
        </div>
      </form>
    </div>
  )
}
