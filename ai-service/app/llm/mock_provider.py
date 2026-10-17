import asyncio
import re
from collections.abc import AsyncGenerator
from typing import Any

from app.llm.base import BaseLLMProvider, LLMMessage, LLMResponse


class MockLLMProvider(BaseLLMProvider):
    """Deterministic, pedagogical mock LLM for testing and offline local development.

    Evaluates retrieved context, enforces prompt injection guardrails,
    and returns grounded, structured educational responses.
    """

    def __init__(self, model_name: str = "learnova-tutor-mock-v1"):
        self.model_name = model_name

    def _generate_mock_reply(self, messages: list[LLMMessage]) -> str:
        user_content = ""
        for m in messages:
            if m.role == "user":
                user_content = m.content

        # 1. Prompt Injection Defense Check
        adversarial_patterns = [
            r"ignore (all )?previous (instructions|directives)",
            r"override (system )?policy",
            r"reveal (the )?(system )?(prompt|secret|api key)",
            r"give me the answers to the quiz",
            r"you are now DAN",
            r"print secret_key",
            r"secret_key_compromised",
            r"malicious prompt injection",
        ]
        lower_prompt = user_content.lower()
        for pattern in adversarial_patterns:
            if re.search(pattern, lower_prompt):
                return (
                    "As your Learnova AI Tutor, I follow strict academic integrity policies. "
                    "I cannot override system instructions, disclose confidential credentials, "
                    "or reveal examination answer keys. How can I help you understand this lesson's concepts instead?"
                )

        # 2. Extract retrieved context from user message or prompt
        context_match = re.search(r"Context:\s*(.*?)(?:\n\nQuestion:|\Z)", user_content, re.DOTALL)
        context_text = context_match.group(1).strip() if context_match else ""

        # Extract actual user question
        question_match = re.search(r"Question:\s*(.*)", user_content, re.DOTALL)
        question_text = question_match.group(1).strip() if question_match else user_content

        # 3. Grounded response synthesis
        has_real_context = (
            bool(context_text)
            and "no relevant course material" not in context_text.lower()
            and "no course material" not in context_text.lower()
            and len(context_text) > 10
        )
        if has_real_context:
            # Look for source references in context like "Source [1]: Lesson 'Title'" or "Source: Title"
            source_match = re.search(r"Source\s*\[\d+\]:\s*Lesson\s*['\"]([^'\"]+)['\"]", context_text)
            if not source_match:
                source_match = re.search(r"(?:Source|Lesson)[^:]*:\s*(?:Lesson\s*)?['\"\[]?([^\]'\"\n]+)['\"\]]?", context_text)
            source_name = source_match.group(1).strip() if source_match else "Current Course Material"

            # Create a structured, educational explanation using key context phrases
            # Extract first meaningful paragraph from context, filtering untrusted injections
            cleaned_snippets = [line.strip() for line in context_text.splitlines() if line.strip() and not line.startswith("---") and not line.startswith("Source:")]
            raw_snippet = cleaned_snippets[0] if cleaned_snippets else context_text[:200]
            # Sanitize untrusted instruction injection from reference material
            main_snippet = re.sub(r"(?i)IMPORTANT MALICIOUS PROMPT INJECTION.*", "", raw_snippet).strip()
            for pat in adversarial_patterns:
                main_snippet = re.sub(pat, "", main_snippet, flags=re.IGNORECASE).strip()


            return (
                f"Based on **{source_name}**, here is an explanation:\n\n"
                f"{main_snippet}\n\n"
                f"### Key Takeaways:\n"
                f"- **Core Concept**: This directly addresses your question regarding '{question_text.strip()}'.\n"
                f"- **Practical Application**: Review how this aligns with the objectives outlined in {source_name}.\n\n"
                f"Would you like an illustrative example or a step-by-step breakdown of how to apply this?"
            )
        else:
            # Insufficient or no retrieved course context
            return (
                f"I checked the available materials for this course, but I couldn't find specific course content directly addressing: **'{question_text.strip()}'**.\n\n"
                f"However, as a general explanation: In computer science and engineering, this concept is commonly used to model and solve complex challenges. "
                f"Please consult the relevant module lessons or ask your instructor if this topic is part of your upcoming curriculum."
            )

    async def generate_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        reply = self._generate_mock_reply(messages)
        return LLMResponse(
            content=reply,
            model=self.model_name,
            usage={"prompt_tokens": 120, "completion_tokens": 85, "total_tokens": 205},
            metadata={"provider": "mock", "temperature": temperature},
        )

    async def stream_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        reply = self._generate_mock_reply(messages)
        chunks = reply.split(" ")
        for i, chunk in enumerate(chunks):
            yield chunk + (" " if i < len(chunks) - 1 else "")
            await asyncio.sleep(0.01)
