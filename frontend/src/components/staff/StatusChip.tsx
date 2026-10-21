import { statusLabel, statusTone } from '../../lib/status'

export function StatusChip({ estado }: { estado: string | null | undefined }) {
  return (
    <span className={`status-chip status-chip-${statusTone(estado)}`}>{statusLabel(estado)}</span>
  )
}
