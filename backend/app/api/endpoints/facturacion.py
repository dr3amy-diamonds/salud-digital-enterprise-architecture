# backend/app/api/endpoints/facturacion.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.security import require_role
from backend.app.db.session import get_db
from backend.app.models import Factura, Paciente
from backend.app.schemas import FacturaCreate

router = APIRouter()


@router.post("/facturas", status_code=201)
def crear_factura(payload: FacturaCreate, db: Session = Depends(get_db), _u=Depends(require_role(["cajero", "admin"]))):
    if not db.query(Paciente).filter(Paciente.id == payload.paciente_id).first():
        raise HTTPException(status_code=404, detail="Paciente no existe")
    f = Factura(paciente_id=payload.paciente_id, atencion_id=payload.atencion_id, total=payload.total, concepto=payload.concepto)
    db.add(f)
    db.commit()
    db.refresh(f)
    return {"id": f.id, "paciente_id": f.paciente_id, "total": float(f.total), "concepto": f.concepto}


@router.patch("/facturas/{factura_id}/pagar", status_code=200)
def pagar_factura(
    factura_id: int,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["cajero", "gerencia", "admin"])),
):
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    factura.estado_pago = "Pagada"
    db.commit()
    db.refresh(factura)
    return {"id": factura.id, "estado_pago": factura.estado_pago}


@router.get("/facturas")
def listar_facturas(
    paciente_id: int | None = None,
    db: Session = Depends(get_db),
    _u=Depends(require_role(["cajero", "gerencia", "admin"])),
):
    q = db.query(Factura)
    if paciente_id:
        q = q.filter(Factura.paciente_id == paciente_id)
    rows = q.order_by(Factura.id.desc()).limit(100).all()
    return [{"id": r.id, "paciente_id": r.paciente_id, "total": float(r.total), "concepto": r.concepto, "estado_pago": r.estado_pago} for r in rows]


@router.get("/resumen")
@router.get("/resumen-diario")
def resumen(db: Session = Depends(get_db), _u=Depends(require_role(["cajero", "gerencia", "admin"]))):
    rows = db.execute(text("SELECT dia, cantidad_facturas, total_recaudado FROM facturacion.v_facturacion_diaria ORDER BY dia")).mappings().all()
    return [{"dia": str(r["dia"]), "cantidad_facturas": r["cantidad_facturas"], "total_recaudado": float(r["total_recaudado"] or 0)} for r in rows]
