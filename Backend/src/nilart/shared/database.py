from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings

engine = create_engine(settings.database_url, pool_pre_ping=True,
                       connect_args={"connect_timeout": 3})


def session_dependency():
    with Session(engine) as session:
        yield session
