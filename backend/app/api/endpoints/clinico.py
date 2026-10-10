# backend/app/api/endpoints/clinico.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import require_role
from backend.app.db.session import get_db
from backend.app.models import Cita, HistoriaClinica, Paciente, Usuario
from backend.app.schemas import HistoriaCreate

router = APIRouter()

# Privacidad HCE: admin NO entra aqui, ni gerencia al detalle.
SOLO_MEDICO = ["medico"]


@router.post("/historias", status_code=201)
def crear_historia(payload: HistoriaCreate, db: Session = Depends(get_db), user=Depends(require_role(SOLO_MEDICO))):
    if not db.query(Paciente).filter(Paciente.id == payload.paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    if payload.cita_id:
        cita = db.query(Cita).filter(Cita.id == payload.cita_id).first()
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no existe")
        if db.query(HistoriaClinica).filter(HistoriaClinica.cita_id == payload.cita_id).first():
            raise HTTPException(status_code=400, detail="Cita ya tiene historia")
    medico = db.query(Usuario).filter(Usuario.username == user["username"]).first()
    h = HistoriaClinica(
        paciente_id=payload.paciente_id,
        cita_id=payload.cita_id,
        motivo_consulta=payload.motivo_consulta,
        diagnostico=payload.diagnostico,
        medico_id=medico.id if medico else 0,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return {"id": h.id, "paciente_id": h.paciente_id, "diagnostico": h.diagnostico}


@router.get("/historias")
def listar_historias(paciente_id: int | None = None, db: Session = Depends(get_db), _u=Depends(require_role(SOLO_MEDICO))) -> list:
    q = db.query(HistoriaClinica)
    if paciente_id:
        q = q.filter(HistoriaClinica.paciente_id == paciente_id)
    rows = q.order_by(HistoriaClinica.id.desc()).limit(100).all()
    return [
        {"id": r.id, "paciente_id": r.paciente_id, "cita_id": r.cita_id, "motivo": r.motivo_consulta, "diagnostico": r.diagnostico}
        for r in rows
    ]
