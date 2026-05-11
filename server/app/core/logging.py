from __future__ import annotations

import logging

from app.core.config import get_settings


def configure_logging() -> logging.Logger:
    settings = get_settings()
    logger = logging.getLogger("app")
    if logger.handlers:
        return logger

    level_name = (settings.log_level or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


def get_logger() -> logging.Logger:
    return logging.getLogger("app")
