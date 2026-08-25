import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.enums import DocumentStatus, HistoryAction, UserRole
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.entities import Company, Document, DocumentHistory, DocumentVersion, User

logger = logging.getLogger("docflow.seed")
DEMO_PASSWORD = "DocFlowDemo2026!"


DOCUMENTS = [
    {
        "title": "Política de Segurança da Informação",
        "description": "Diretrizes corporativas para proteção de dados, acessos e ativos digitais.",
        "category": "Segurança",
        "status": DocumentStatus.PUBLISHED.value,
        "versions": [
            (
                "Esta política estabelece os controles mínimos de segurança da NovaTech. "
                "Acesso a sistemas exige autenticação individual, senhas fortes e revisão trimestral. "
                "Incidentes devem ser comunicados ao time de Segurança em até 24 horas.",
                "Versão inicial para revisão executiva",
            ),
            (
                "Esta política estabelece os controles mínimos de segurança da NovaTech. "
                "Acesso a sistemas exige autenticação individual, senhas fortes, MFA e revisão trimestral. "
                "Incidentes devem ser comunicados ao time de Segurança em até 4 horas. "
                "Dados confidenciais devem ser criptografados em trânsito e em repouso.",
                "Inclusão de MFA, criptografia e novo prazo de incidentes",
            ),
        ],
    },
    {
        "title": "Política de Home Office",
        "description": "Regras para trabalho remoto, disponibilidade, segurança e ergonomia.",
        "category": "Pessoas",
        "status": DocumentStatus.IN_REVIEW.value,
        "versions": [
            (
                "O trabalho remoto pode ocorrer até três dias por semana, mediante alinhamento com a liderança. "
                "A jornada deve respeitar o horário acordado e os equipamentos corporativos devem ser usados "
                "exclusivamente para atividades profissionais.",
                "Primeira versão consolidada com RH",
            )
        ],
    },
    {
        "title": "Procedimento de Onboarding",
        "description": "Checklist de integração para novas pessoas colaboradoras.",
        "category": "Operações",
        "status": DocumentStatus.CHANGES_REQUESTED.value,
        "versions": [
            (
                "Antes do primeiro dia, RH confirma documentação e gestor solicita acessos. "
                "No primeiro dia, a pessoa recebe equipamentos, participa da apresentação institucional "
                "e conhece o plano de 30 dias.",
                "Fluxo inicial de integração",
            )
        ],
    },
    {
        "title": "Código de Conduta",
        "description": "Princípios éticos e comportamentos esperados nas relações profissionais.",
        "category": "Compliance",
        "status": DocumentStatus.APPROVED.value,
        "versions": [
            (
                "Agimos com integridade, respeito e transparência. Não toleramos discriminação, assédio, "
                "conflitos de interesse não declarados ou uso indevido de informações. Dúvidas e relatos "
                "devem ser encaminhados ao canal de ética.",
                "Revisão anual de compliance",
            )
        ],
    },
    {
        "title": "Política de Reembolso",
        "description": "Critérios e fluxo para despesas corporativas reembolsáveis.",
        "category": "Financeiro",
        "status": DocumentStatus.DRAFT.value,
        "versions": [
            (
                "Despesas previamente aprovadas devem ser enviadas com comprovante fiscal em até dez dias. "
                "O reembolso será processado na folha seguinte após validação financeira.",
                "Rascunho para alinhamento com Financeiro",
            )
        ],
    },
    {
        "title": "Procedimento de Backup",
        "description": "Rotina de cópias, retenção e testes de restauração dos sistemas críticos.",
        "category": "Tecnologia",
        "status": DocumentStatus.PUBLISHED.value,
        "versions": [
            (
                "Backups incrementais são executados diariamente e cópias completas semanalmente. "
                "A retenção mínima é de 90 dias. Testes de restauração são realizados mensalmente e "
                "registrados pela equipe de Infraestrutura.",
                "Padronização da retenção e testes",
            )
        ],
    },
]


def get_or_create_user(db, company, name, email, role):
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(
            company_id=company.id,
            name=name,
            email=email,
            password_hash=hash_password(DEMO_PASSWORD),
            role=role,
        )
        db.add(user)
        db.flush()
    return user


def seed() -> None:
    configure_logging()
    with SessionLocal() as db:
        company = db.scalar(select(Company).where(Company.name == "NovaTech Solutions"))
        if not company:
            company = Company(name="NovaTech Solutions")
            db.add(company)
            db.flush()

        admin = get_or_create_user(
            db, company, "Ana Ribeiro", "admin@docflow.demo", UserRole.ADMIN.value
        )
        collaborator = get_or_create_user(
            db,
            company,
            "Bruno Costa",
            "collaborator@docflow.demo",
            UserRole.COLLABORATOR.value,
        )
        reviewer = get_or_create_user(
            db, company, "Camila Mendes", "camila@docflow.demo", UserRole.COLLABORATOR.value
        )
        get_or_create_user(
            db, company, "Diego Rocha", "diego@docflow.demo", UserRole.COLLABORATOR.value
        )

        base_time = datetime.now(UTC) - timedelta(days=8)
        for index, data in enumerate(DOCUMENTS):
            existing = db.scalar(
                select(Document).where(
                    Document.company_id == company.id, Document.title == data["title"]
                )
            )
            if existing:
                continue
            author = admin if index in {0, 1, 3, 5} else collaborator
            assigned = reviewer if index != 4 else collaborator
            document = Document(
                company_id=company.id,
                title=data["title"],
                description=data["description"],
                category=data["category"],
                status=data["status"],
                current_version=len(data["versions"]),
                created_by=author.id,
                assigned_reviewer_id=assigned.id,
                created_at=base_time + timedelta(days=index),
                updated_at=base_time + timedelta(days=index, hours=6),
            )
            db.add(document)
            db.flush()
            for version_number, (content, summary) in enumerate(data["versions"], start=1):
                db.add(
                    DocumentVersion(
                        document_id=document.id,
                        version_number=version_number,
                        content=content,
                        created_by=author.id,
                        change_summary=summary,
                        created_at=document.created_at + timedelta(hours=version_number - 1),
                    )
                )
            events = [
                (HistoryAction.DOCUMENT_CREATED.value, author.id, "created the document"),
                (HistoryAction.VERSION_CREATED.value, author.id, "published version v1.0"),
            ]
            if data["status"] != DocumentStatus.DRAFT.value:
                events.append(
                    (
                        HistoryAction.SENT_TO_REVIEW.value,
                        author.id,
                        f"sent the document to {assigned.name} for review",
                    )
                )
            if data["status"] == DocumentStatus.CHANGES_REQUESTED.value:
                events.append(
                    (
                        HistoryAction.CHANGES_REQUESTED.value,
                        assigned.id,
                        "requested clearer ownership and completion deadlines",
                    )
                )
            if len(data["versions"]) > 1:
                events.append(
                    (HistoryAction.VERSION_CREATED.value, author.id, "published version v1.1")
                )
            if data["status"] in {DocumentStatus.APPROVED.value, DocumentStatus.PUBLISHED.value}:
                events.append(
                    (HistoryAction.APPROVED.value, assigned.id, "approved the document")
                )
            if data["status"] == DocumentStatus.PUBLISHED.value:
                events.append(
                    (HistoryAction.PUBLISHED.value, admin.id, "published the document")
                )
            for event_index, (action, user_id, details) in enumerate(events):
                db.add(
                    DocumentHistory(
                        document_id=document.id,
                        user_id=user_id,
                        action=action,
                        details=details,
                        created_at=document.created_at + timedelta(hours=event_index + 1),
                    )
                )
        db.commit()
        logger.info("seed_completed")


if __name__ == "__main__":
    seed()
