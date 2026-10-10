# backend/app/api/endpoints/farmacia.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import require_role
from backend.app.db.session import get_db
from backend.app.models import Paciente, Receta
from backend.app.schemas import RecetaCreate

router = APIRouter()


@router.post("/recetas", status_code=201)
def crear_receta(
    payload: RecetaCreate,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["medico", "farmaceutico", "admin"])),
):
    if not db.query(Paciente).filter(Paciente.id == payload.paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    r = Receta(paciente_id=payload.paciente_id, atencion_id=payload.atencion_id, medicamento=payload.medicamento, dosis=payload.dosis)
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "paciente_id": r.paciente_id, "medicamento": r.medicamento}


@router.get("/recetas")
def listar_recetas(
    paciente_id: int | None = None,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["medico", "farmaceutico", "gerencia", "admin"])),
):
    q = db.query(Receta)
    if paciente_id:
        q = q.filter(Receta.paciente_id == paciente_id)
    rows = q.order_by(Receta.id.desc()).limit(100).all()
    return [{"id": r.id, "paciente_id": r.paciente_id, "medicamento": r.medicamento, "dosis": r.dosis, "estado": r.estado} for r in rows]
