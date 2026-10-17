import logging
import sys


def setup_ml_logging(log_level: str = "INFO") -> logging.Logger:
    """Sets up logging for ML Service."""
    logger = logging.getLogger("learnova_ml")
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    for handler in list(logger.handlers):
        logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [ML-SERVICE] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.propagate = False
    return logger


logger = setup_ml_logging()
