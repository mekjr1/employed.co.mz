from arq.connections import RedisSettings

from app.config import settings
from app.workers.cron import cron_jobs
from app.workers.tasks import settle_simulated_intent


def _setting(name: str, default=None):
    return getattr(settings, name.lower(), getattr(settings, name, default))


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(_setting("REDIS_URL", "redis://localhost:6379/0"))
    functions = [settle_simulated_intent]
    cron_jobs = cron_jobs
    max_jobs = 10
    job_timeout = 300
