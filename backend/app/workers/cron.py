from arq.cron import cron

from app.workers.tasks import delete_scheduled_accounts, expire_old_jobs

cron_jobs = [
    cron(expire_old_jobs, hour={0, 6, 12, 18}),
    cron(delete_scheduled_accounts, hour={3}),
]
