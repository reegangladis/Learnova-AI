import logging
import sys


def setup_ai_logging(log_level: str = "INFO") -> logging.Logger:
    """Sets up logging for AI Service."""
    logger = logging.getLogger("learnova_ai")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    for handler in list(logger.handlers):
        logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [AI-SERVICE] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


logger = setup_ai_logging()
