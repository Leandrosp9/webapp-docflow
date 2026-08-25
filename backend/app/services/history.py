from sqlalchemy.orm import Session

from app.core.enums import HistoryAction
from app.models.entities import DocumentHistory


def add_history(
    db: Session,
    document_id: str,
    user_id: str,
    action: HistoryAction | str,
    details: str,
) -> DocumentHistory:
    item = DocumentHistory(
        document_id=document_id,
        user_id=user_id,
        action=action.value if isinstance(action, HistoryAction) else action,
        details=details,
    )
    db.add(item)
    return item

