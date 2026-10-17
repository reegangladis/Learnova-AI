from abc import ABC, abstractmethod
from typing import Any

import pandas as pd


class BaseDatasetLoader(ABC):
    """Abstract interface for loading and preprocessing raw analytics datasets."""

    @abstractmethod
    def load_student_interactions(
        self, filters: dict[str, Any] | None = None
    ) -> pd.DataFrame:
        """Loads raw student interaction logs, quiz attempts, and video progress."""

    @abstractmethod
    def load_course_catalog(self) -> pd.DataFrame:
        """Loads course metadata, taxonomy, difficulty ratings, and enrollment stats."""
