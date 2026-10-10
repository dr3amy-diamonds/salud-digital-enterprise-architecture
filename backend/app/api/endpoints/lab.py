# backend/app/api/endpoints/lab.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import require_role
from backend.app.db.session import get_db
from backend.app.models import OrdenLab, Paciente, ResultadoLab, Usuario
from backend.app.schemas import OrdenCreate, ResultadoCreate

router = APIRouter()


@router.post("/ordenes", status_code=201)
def crear_orden(payload: OrdenCreate, db: Session = Depends(get_db), _u=Depends(require_role(["bacteriologo", "admin"]))):
    if not db.query(Paciente).filter(Paciente.id == payload.paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    o = OrdenLab(paciente_id=payload.paciente_id, atencion_id=payload.atencion_id, tipo_examen=payload.tipo_examen)
    db.add(o)
    db.commit()
    db.refresh(o)
    return {"id": o.id, "paciente_id": o.paciente_id, "tipo_examen": o.tipo_examen}


@router.get("/ordenes")
def listar_ordenes(
    paciente_id: int | None = None,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["medico", "bacteriologo", "gerencia", "admin"])),
):
    q = db.query(OrdenLab)
    if paciente_id:
        q = q.filter(OrdenLab.paciente_id == paciente_id)
    rows = q.order_by(OrdenLab.id.desc()).limit(100).all()
    return [{"id": r.id, "paciente_id": r.paciente_id, "tipo_examen": r.tipo_examen, "estado": r.estado} for r in rows]


@router.post("/resultados", status_code=201)
def crear_resultado(payload: ResultadoCreate, db: Session = Depends(get_db), user=Depends(require_role(["bacteriologo", "admin"]))):
    orden = db.query(OrdenLab).filter(OrdenLab.id == payload.orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no existe")
    if db.query(ResultadoLab).filter(ResultadoLab.orden_id == payload.orden_id).first():
        raise HTTPException(status_code=400, detail="Orden ya tiene resultado")
    actor = db.query(Usuario).filter(Usuario.username == user["username"]).first()
    r = ResultadoLab(
        orden_id=payload.orden_id,
        detalle_resultado=payload.detalle_resultado,
        bacteriologo_id=payload.bacteriologo_id or (actor.id if actor else 0),
    )
    db.add(r)
    orden.estado = "Procesada"
    db.commit()
    db.refresh(r)
    return {"id": r.id, "orden_id": r.orden_id}


@router.get("/resultados")
def listar_resultados(
    orden_id: int | None = None,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["medico", "bacteriologo", "admin"])),
):
    q = db.query(ResultadoLab)
    if orden_id:
        q = q.filter(ResultadoLab.orden_id == orden_id)
    rows = q.order_by(ResultadoLab.id.desc()).limit(100).all()
    return [{"id": r.id, "orden_id": r.orden_id, "detalle": r.detalle_resultado} for r in rows]
