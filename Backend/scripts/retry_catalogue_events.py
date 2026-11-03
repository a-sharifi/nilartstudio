"""Bounded retry of catalogue revision events rejected by an older sandbox worker.

Preserves event/provider identities and never replays events already consumed.
Only the isolated demo is permitted; payload validation occurs inside rolled-back
savepoints before requeueing the original transactional outbox records.
"""
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.shared.outbox import consume_event

if '--demo-only' not in sys.argv:
    raise SystemExit('Explicit --demo-only required')
with Session(create_engine(settings.database_url)) as db,db.begin():
    assert db.scalar(text('SELECT current_database()'))=='nilart_demo','Isolated demo required'
    rows=db.execute(text("SELECT id,event_type,payload FROM outbox_events e WHERE event_type IN ('catalog.bundle_saved','catalog.profile_saved','catalog.artwork_saved') AND published_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM processed_events p WHERE p.event_id=e.id) ORDER BY occurred_at,id LIMIT 100 FOR UPDATE SKIP LOCKED")).mappings().all()
    for row in rows:
        checkpoint=db.begin_nested()
        consume_event(db,dict(row))
        checkpoint.rollback()
        db.execute(text('UPDATE outbox_events SET published_at=NULL,attempts=0 WHERE id=:id'),{'id':row['id']})
    print('Requeued original unconsumed catalogue events:',len(rows))
