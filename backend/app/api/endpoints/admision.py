# backend/app/api/endpoints/admision.py
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import paciente_id_from_token, require_role
from backend.app.db.session import get_db
from backend.app.models import Cita, Paciente
from backend.app.schemas import CitaCreate, CitaOut, CitaReprogramar, PacienteCreate

router = APIRouter()

LECTURA = ["medico", "bacteriologo", "farmaceutico", "cajero", "gerencia", "admin"]
ESCRITURA = ["medico", "cajero", "admin"]
CITAS_ESCRITURA = ["paciente", "medico", "cajero", "admin"]


def _validar_fecha_futura(fecha: datetime) -> None:
    referencia = datetime.now(timezone.utc) if fecha.tzinfo is not None else datetime.now()
    if fecha <= referencia:
        raise HTTPException(status_code=400, detail="La fecha de la cita debe ser futura")


def _cita_gestionable(cita_id: int, user: dict, db: Session) -> Cita:
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no existe")
    if user["role"] == "paciente":
        paciente_id = paciente_id_from_token(user)
        if cita.paciente_id != paciente_id:
            raise HTTPException(status_code=403, detail="No puede gestionar citas de otro paciente")
    return cita


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


@router.post("/citas", status_code=201, response_model=CitaOut)
def crear_cita(
    payload: CitaCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(CITAS_ESCRITURA)),
):
    _validar_fecha_futura(payload.fecha)
    if user["role"] == "paciente":
        paciente_id = paciente_id_from_token(user)
        if payload.paciente_id is not None and payload.paciente_id != paciente_id:
            raise HTTPException(status_code=403, detail="No puede agendar citas para otro paciente")
        estado = "Agendada"
    else:
        if payload.paciente_id is None:
            raise HTTPException(status_code=400, detail="paciente_id es obligatorio")
        paciente_id = payload.paciente_id
        estado = payload.estado
    if not db.query(Paciente).filter(Paciente.id == paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    c = Cita(paciente_id=paciente_id, fecha=payload.fecha, especialidad=payload.especialidad, estado=estado)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/citas/mis-citas", response_model=list[CitaOut])
def listar_mis_citas(
    db: Session = Depends(get_db),
    user=Depends(require_role(["paciente"])),
):
    paciente_id = paciente_id_from_token(user)
    return (
        db.query(Cita)
        .filter(Cita.paciente_id == paciente_id)
        .order_by(Cita.fecha.desc(), Cita.id.desc())
        .limit(100)
        .all()
    )


@router.patch("/citas/{cita_id}/cancelar", response_model=CitaOut)
def cancelar_cita(
    cita_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(CITAS_ESCRITURA)),
):
    cita = _cita_gestionable(cita_id, user, db)
    cita.estado = "Cancelada"
    db.commit()
    db.refresh(cita)
    return cita


@router.patch("/citas/{cita_id}/reprogramar", response_model=CitaOut)
def reprogramar_cita(
    cita_id: int,
    payload: CitaReprogramar,
    db: Session = Depends(get_db),
    user=Depends(require_role(CITAS_ESCRITURA)),
):
    _validar_fecha_futura(payload.fecha)
    cita = _cita_gestionable(cita_id, user, db)
    cita.fecha = payload.fecha
    db.commit()
    db.refresh(cita)
    return cita


@router.get("/citas")
def listar_citas(paciente_id: int | None = None, db: Session = Depends(get_db), _u=Depends(require_role(LECTURA))) -> list:
    q = db.query(Cita)
    if paciente_id:
        q = q.filter(Cita.paciente_id == paciente_id)
    rows = q.order_by(Cita.id.desc()).limit(100).all()
    return [{"id": r.id, "paciente_id": r.paciente_id, "fecha": r.fecha, "especialidad": r.especialidad, "estado": r.estado} for r in rows]
