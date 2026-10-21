import type { Paciente } from '../../lib/apiTypes'

interface PatientSelectProps {
  id: string
  patients: Paciente[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  label?: string
}

export function PatientSelect({
  id,
  patients,
  value,
  onChange,
  required = true,
  label = 'Paciente',
}: PatientSelectProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">Selecciona un paciente</option>
        {patients.map((patient) => (
          <option key={patient.id} value={patient.id}>
            {patient.nombre} · {patient.documento}
          </option>
        ))}
      </select>
    </div>
  )
}
