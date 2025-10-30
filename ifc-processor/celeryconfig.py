"""
Celery Configuration
Redis broker for task queue
"""
import os

# Redis broker URL (from environment or default to localhost)
broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Task settings
task_serializer = 'json'
result_serializer = 'json'
accept_content = ['json']
timezone = 'UTC'
enable_utc = True

# Task execution settings
task_acks_late = True  # Task acknowledged after completion
task_reject_on_worker_lost = True  # Reject task if worker crashes
worker_prefetch_multiplier = 1  # One task at a time per worker

# Task time limits
task_soft_time_limit = 300  # 5 minutes soft limit
task_time_limit = 600  # 10 minutes hard limit

# Result expiry
result_expires = 3600  # Results expire after 1 hour

# Worker settings
worker_max_tasks_per_child = 100  # Restart worker after 100 tasks (memory cleanup)
worker_disable_rate_limits = False

# Task routing
task_routes = {
    'app.workers.ifc_processing.process_ifc_file': {'queue': 'ifc_processing'},
}

# Logging
worker_hijack_root_logger = False
worker_log_format = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
worker_task_log_format = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'