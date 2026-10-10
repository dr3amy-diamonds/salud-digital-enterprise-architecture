# backend/app/api/endpoints/admision.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import require_role
from backend.app.db.session import get_db
from backend.app.models import Cita, Paciente
from backend.app.schemas import CitaCreate, PacienteCreate

router = APIRouter()

LECTURA = ["medico", "bacteriologo", "farmaceutico", "cajero", "gerencia", "admin"]
ESCRITURA = ["medico", "cajero", "admin"]


@router.post("/pacientes", status_code=201)
def crear_paciente(
    payload: PacienteCreate,
    db: Session = Depends(get_db),
    _u=Depends(require_role(ESCRITURA)),
):
    if db.query(Paciente).filter(Paciente.documento == payload.documento).first():
        raise HTTPException(status_code=400, detail="Documento ya registrado")
    p = Paciente(nombre=payload.nombre, documento=payload.documento, telefono=payload.telefono, email=payload.email)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "nombre": p.nombre, "documento": p.documento}


@router.get("/pacientes")
def listar_pacientes(db: Session = Depends(get_db), _u=Depends(require_role(LECTURA))):
    rows = db.query(Paciente).order_by(Paciente.id.desc()).limit(100).all()
    return [{"id": r.id, "nombre": r.nombre, "documento": r.documento, "telefono": r.telefono} for r in rows]


@router.post("/citas", status_code=201)
def crear_cita(payload: CitaCreate, db: Session = Depends(get_db), _u=Depends(require_role(ESCRITURA))):
    if not db.query(Paciente).filter(Paciente.id == payload.paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    c = Cita(paciente_id=payload.paciente_id, fecha=payload.fecha, especialidad=payload.especialidad, estado=payload.estado)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "paciente_id": c.paciente_id, "especialidad": c.especialidad}


@router.get("/citas")
def listar_citas(paciente_id: int | None = None, db: Session = Depends(get_db), _u=Depends(require_role(LECTURA))) -> list:
    q = db.query(Cita)
    if paciente_id:
        q = q.filter(Cita.paciente_id == paciente_id)
    rows = q.order_by(Cita.id.desc()).limit(100).all()
    return [{"id": r.id, "paciente_id": r.paciente_id, "fecha": r.fecha, "especialidad": r.especialidad, "estado": r.estado} for r in rows]
