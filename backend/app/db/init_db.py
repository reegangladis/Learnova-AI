import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.db.session import get_engine, get_session_factory
from backend.app.models import (
    Base,
    Course,
    CourseCategory,
    CourseDifficulty,
    CourseModule,
    CourseStatus,
    Enrollment,
    EnrollmentStatus,
    Lesson,
    LessonContentType,
    Organization,
    QuestionOption,
    QuestionType,
    Quiz,
    QuizQuestion,
    QuizStatus,
)
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository

logger = logging.getLogger("learnova")


async def init_db() -> None:
    """Initializes tables and seeds default roles, admin users, and rich sample courses with modules, PPT, quizzes, and self-assessments."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = get_session_factory()
    async with session_factory() as session:
        role_repo = RoleRepository(session)
        await role_repo.ensure_default_roles_and_permissions()

        # 1. Organization
        org_stmt = select(Organization).where(Organization.slug == "learnova-global")
        res = await session.execute(org_stmt)
        org = res.scalars().first()
        if not org:
            org = Organization(name="Learnova Academy Global", slug="learnova-global", is_active=True)
            session.add(org)
            await session.flush()

        # 2. Users
        user_repo = UserRepository(session)
        seed_users = [
            ("superadmin@learnova.ai", "SuperAdmin123!", "Elena", "Vance", SystemRole.SUPER_ADMIN.value),
            ("admin@learnova.ai", "Admin123!", "Marcus", "Chen", SystemRole.ADMIN.value),
            ("instructor@learnova.ai", "Instructor123!", "Sarah", "Connor", SystemRole.INSTRUCTOR.value),
            ("student@learnova.ai", "Student123!", "Alex", "Morgan", SystemRole.STUDENT.value),
        ]

        created_users = {}
        for email, pwd, first, last, role_name in seed_users:
            u = await user_repo.get_by_email(email)
            if not u:
                u = await user_repo.create(
                    email=email,
                    password_hash=hash_password(pwd),
                    first_name=first,
                    last_name=last,
                    organization_id=org.id,
                    is_active=True,
                    is_verified=True,
                )
                role = await role_repo.get_role_by_name(role_name)
                if role:
                    await role_repo.assign_role_to_user(u, role)
                logger.info(f"Seeded user: {email} ({role_name})")
            created_users[role_name] = u

        instructor = created_users.get(SystemRole.INSTRUCTOR.value)
        student = created_users.get(SystemRole.STUDENT.value)

        # 3. Categories Definition
        categories_data = [
            ("Cloud & DevOps", "cloud-devops", "Cloud Architecture, Containerization, Kubernetes, and Production CI/CD."),
            ("AI & Data Science", "ai-data-science", "Cutting-edge Artificial Intelligence, Machine Learning, and LLM Engineering."),
            ("Software Engineering", "software-engineering", "High-Performance Systems, Concurrency, and Scalable Backend Architectures."),
            ("Cybersecurity", "cybersecurity", "Zero Trust Architecture, Threat Intelligence, and Security Operations."),
        ]

        categories_map = {}
        for name, slug, desc in categories_data:
            cat_stmt = select(CourseCategory).where(CourseCategory.slug == slug)
            cat_res = await session.execute(cat_stmt)
            cat = cat_res.scalars().first()
            if not cat:
                cat = CourseCategory(name=name, slug=slug, description=desc)
                session.add(cat)
                await session.flush()
            categories_map[slug] = cat

        # 4. Rich Sample Courses Specification
        sample_courses_specs = [
            {
                "title": "Full-Stack Cloud & DevOps Engineering",
                "slug": "fullstack-cloud-devops-engineering",
                "category_slug": "cloud-devops",
                "short_description": "Master Linux container runtimes, production Docker optimization, Kubernetes clusters, and GitOps.",
                "description": "<p>A comprehensive, hands-on curriculum taking engineers from low-level container primitives to enterprise Kubernetes deployment pipelines.</p>",
                "difficulty": CourseDifficulty.INTERMEDIATE.value,
                "duration_minutes": 320,
                "objectives": [
                    "Design multi-stage Docker container builds",
                    "Configure Kubernetes pods, services, and ingress controllers",
                    "Automate continuous deployment with GitOps pipelines",
                ],
                "prerequisites": ["Linux CLI basics", "Basic networking concepts"],
                "modules": [
                    {
                        "title": "Module 1: Container Architecture & Dockerfile Optimization",
                        "description": "Deep-dive into namespaces, cgroups, layers, and secure multi-stage builds.",
                        "lessons": [
                            {
                                "title": "Lesson 1.1: Container Primitives & Runtime Internals",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Understanding Container Virtualization</h3><p>Unlike virtual machines with guest operating systems, containers share the host Linux kernel via cgroups and namespaces (pid, net, ipc, mnt, uts, user).</p><p>Key takeaway: process isolation enables sub-second boot times and minimal overhead compared to hypervisors.</p>",
                                "duration": 20,
                            },
                            {
                                "title": "Lesson 1.2: Multi-Stage Production Docker Builds",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                                "duration": 35,
                            },
                            {
                                "title": "Lesson 1.3: Presentation Slides: Container Storage & Networking",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 25,
                            },
                        ],
                        "self_assessment": {
                            "title": "Self-Assessment: Container Fundamentals",
                            "instructions": "Test your grasp on containerization primitives, Dockerfile best practices, and caching.",
                            "questions": [
                                {
                                    "text": "Which Linux kernel feature is responsible for limiting CPU and memory resources for a container?",
                                    "options": [
                                        ("cgroups (Control Groups)", True, "cgroups allocate and enforce resource quotas per container."),
                                        ("Namespaces", False, "Namespaces govern visibility and isolation, not resource throttling."),
                                        ("Chroot jail", False, "Chroot limits filesystem root access only."),
                                        ("AppArmor", False, "AppArmor is a security enforcement MAC mechanism."),
                                    ],
                                },
                                {
                                    "text": "Why are multi-stage builds recommended for compiled languages like Go or Rust?",
                                    "options": [
                                        ("They exclude build tools and source code from the final runtime image", True, "Minimizing image attack surface and deployment transfer size."),
                                        ("They require root access inside the runner", False, "Multi-stage builds actually improve least-privilege compliance."),
                                        ("They disable container networking", False, "Networking is independent of build stages."),
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Module 2: Production Kubernetes & GitOps Orchestration",
                        "description": "Deploy resilient workloads with StatefulSets, Ingress, and automated ArgoCD pipelines.",
                        "lessons": [
                            {
                                "title": "Lesson 2.1: Kubernetes Control Plane & Scheduling",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Kubernetes Architecture Overview</h3><p>The control plane consists of kube-apiserver, etcd distributed storage, kube-scheduler, and kube-controller-manager.</p><p>Kubelet agents run on each worker node to ensure assigned Pod manifests stay healthy.</p>",
                                "duration": 30,
                            },
                            {
                                "title": "Lesson 2.2: Ingress Controllers & Zero-Downtime Rollouts",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                                "duration": 40,
                            },
                            {
                                "title": "Lesson 2.3: Presentation Slides: GitOps & Helm Architecture",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 25,
                            },
                        ],
                        "graded_quiz": {
                            "title": "Module 2 Graded Quiz: Production Kubernetes Deployment",
                            "duration_minutes": 20,
                            "passing_score": 75.0,
                            "questions": [
                                {
                                    "text": "Which Kubernetes resource provides an immutable distributed key-value store for cluster state?",
                                    "options": [
                                        ("etcd", True, "etcd guarantees strong consistency for all cluster metadata."),
                                        ("CoreDNS", False, "CoreDNS provides cluster DNS name resolution."),
                                        ("kube-proxy", False, "kube-proxy manages local iptables/IPVS network routing rules."),
                                    ],
                                },
                                {
                                    "text": "What rollout strategy creates new pods before terminating old ones for zero downtime?",
                                    "options": [
                                        ("RollingUpdate", True, "RollingUpdate replaces instances gradually based on maxSurge and maxUnavailable."),
                                        ("Recreate", False, "Recreate terminates all existing pods first, incurring downtime."),
                                        ("Static Pod", False, "Static pods are managed by kubelet directly on a node."),
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                "title": "Enterprise AI Engineering & Large Language Models",
                "slug": "enterprise-ai-engineering-llms",
                "category_slug": "ai-data-science",
                "short_description": "Build production LLM agents, vector RAG pipelines with Redis, and evaluation harnesses.",
                "description": "<p>Learn cutting-edge LLM system architecture: embedding generation, semantic vector caching, ReAct agent loops, and grounded response verification.</p>",
                "difficulty": CourseDifficulty.ADVANCED.value,
                "duration_minutes": 380,
                "objectives": [
                    "Implement multi-query semantic search with vector databases",
                    "Design autonomous agents equipped with structured tool-calling",
                    "Guard against prompt injections and hallucination drifts",
                ],
                "prerequisites": ["Intermediate Python", "Understanding of vector math and cosine similarity"],
                "modules": [
                    {
                        "title": "Module 1: Transformer Foundations & Advanced Prompting",
                        "description": "Mechanistic interpretability of attention heads, few-shot patterns, and chain-of-thought.",
                        "lessons": [
                            {
                                "title": "Lesson 1.1: Self-Attention Mechanics & Context Windows",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Scaled Dot-Product Attention</h3><p>Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V</p><p>By projecting query, key, and value matrices, transformer architectures compute pairwise token importance dynamically across the full context window.</p>",
                                "duration": 25,
                            },
                            {
                                "title": "Lesson 1.2: Chain-of-Thought & Reasoning Loops",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                                "duration": 30,
                            },
                            {
                                "title": "Lesson 1.3: Presentation Slides: LLM Inference & Quantization Deck",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 20,
                            },
                        ],
                        "self_assessment": {
                            "title": "Self-Assessment: Attention Dynamics & Prompting",
                            "instructions": "Evaluate your understanding of attention layers, few-shot conditioning, and reasoning loops.",
                            "questions": [
                                {
                                    "text": "What is the primary role of the temperature parameter in LLM token sampling?",
                                    "options": [
                                        ("Controls randomness by flattening or sharpening the logits distribution", True, "Lower temperature produces deterministic output; higher increases entropy."),
                                        ("Determines the maximum number of output tokens", False, "That is governed by max_tokens."),
                                        ("Scales the embedding dimension size", False, "Embedding dimensions are fixed at model pretraining time."),
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Module 2: Production RAG Systems & Vector Databases",
                        "description": "Chunking heuristics, dense vs sparse hybrid search, and semantic verification.",
                        "lessons": [
                            {
                                "title": "Lesson 2.1: Semantic Chunking & Vector Embeddings",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Retrieval Augmented Generation (RAG)</h3><p>Standard fixed-size chunking can bisect sentences and disrupt semantic context. Recursive character chunking with overlap maintains coherent context boundaries.</p>",
                                "duration": 30,
                            },
                            {
                                "title": "Lesson 2.2: Building Hybrid Search Pipelines with Redis",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                                "duration": 45,
                            },
                            {
                                "title": "Lesson 2.3: Presentation Slides: Enterprise RAG Architecture Deck",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 25,
                            },
                        ],
                        "graded_quiz": {
                            "title": "Module 2 Graded Quiz: Enterprise RAG Mastery",
                            "duration_minutes": 25,
                            "passing_score": 80.0,
                            "questions": [
                                {
                                    "text": "Which metric evaluates whether all facts in the generated answer are grounded in retrieved context?",
                                    "options": [
                                        ("Faithfulness / Hallucination Rate", True, "Faithfulness checks that statements are directly supported by context."),
                                        ("Context Recall", False, "Context recall evaluates whether relevant ground-truth facts were retrieved."),
                                        ("BLEU Score", False, "BLEU measures exact n-gram overlap rather than semantic truthfulness."),
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                "title": "Advanced Python & Distributed Data Systems",
                "slug": "advanced-python-distributed-data",
                "category_slug": "software-engineering",
                "short_description": "Master memory allocation, async event loops, high-concurrency FastAPI, and Apache PySpark.",
                "description": "<p>A deep engineering dive into the CPython runtime, asynchronous event loops, and large-scale data engineering with Spark DataFrames.</p>",
                "difficulty": CourseDifficulty.ADVANCED.value,
                "duration_minutes": 340,
                "objectives": [
                    "Profile and optimize memory usage using tracemalloc and Py-Spy",
                    "Construct non-blocking asynchronous streaming pipelines with Asyncio",
                    "Write distributed transformations using Apache PySpark",
                ],
                "prerequisites": ["Solid understanding of Python OOP and functional paradigms"],
                "modules": [
                    {
                        "title": "Module 1: Concurrency, Asyncio & Memory Internals",
                        "description": "GIL behavior, cooperative multitasking, task cancellation, and memory profiling.",
                        "lessons": [
                            {
                                "title": "Lesson 1.1: CPython GIL & Memory Management",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>The Global Interpreter Lock (GIL)</h3><p>CPython uses reference counting with a cyclic garbage collector. The GIL prevents race conditions during reference counter increments across threads.</p><p>For CPU-bound tasks, multiprocessing or C-extensions bypass the GIL; for IO-bound workloads, asyncio event loops provide massive concurrency.</p>",
                                "duration": 25,
                            },
                            {
                                "title": "Lesson 1.2: High-Throughput Async Pipelines with FastAPI",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                                "duration": 35,
                            },
                            {
                                "title": "Lesson 1.3: Presentation Slides: Python Memory Profiling Deck",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 20,
                            },
                        ],
                        "self_assessment": {
                            "title": "Self-Assessment: Python Concurrency Primitives",
                            "instructions": "Test your knowledge of coroutines, event loops, and thread safety in Python.",
                            "questions": [
                                {
                                    "text": "What happens when you call a blocking synchronous library like time.sleep() inside an async def coroutine?",
                                    "options": [
                                        ("It freezes the entire event loop, blocking all other concurrent coroutines", True, "Always use asyncio.sleep() or run blocking calls in asyncio.to_thread()."),
                                        ("Python automatically runs it on a separate background thread", False, "Asyncio does not automatically thread-wrap synchronous blocking calls."),
                                        ("It raises a RuntimeError", False, "It will execute synchronously and stall the worker."),
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Module 2: Distributed Data Processing with Apache PySpark",
                        "description": "Catalyst optimizer, DAG execution, wide vs narrow transformations, and shuffling.",
                        "lessons": [
                            {
                                "title": "Lesson 2.1: Resilient Distributed Datasets & Catalyst Engine",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Apache Spark Architecture</h3><p>Spark operates with a Driver node that coordinates distributed Worker executors across a cluster.</p><p>Transformations are lazily evaluated: Spark builds a Directed Acyclic Graph (DAG) and optimizes it using the Catalyst optimizer before executing actions.</p>",
                                "duration": 30,
                            },
                            {
                                "title": "Lesson 2.2: Streaming Pipelines with Kafka & PySpark",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
                                "duration": 40,
                            },
                            {
                                "title": "Lesson 2.3: Presentation Slides: Distributed Data Architecture Deck",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 25,
                            },
                        ],
                        "graded_quiz": {
                            "title": "Module 2 Graded Quiz: PySpark Optimization & Shuffling",
                            "duration_minutes": 25,
                            "passing_score": 70.0,
                            "questions": [
                                {
                                    "text": "Which operation triggers a wide dependency and distributed data shuffle across partitions in Spark?",
                                    "options": [
                                        ("groupByKey() / reduceByKey()", True, "Groupings require re-partitioning data across network nodes."),
                                        ("map()", False, "map() is a narrow transformation executed within each partition."),
                                        ("filter()", False, "filter() preserves partition boundaries without network exchange."),
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                "title": "Enterprise Cybersecurity & Zero Trust Systems",
                "slug": "enterprise-cybersecurity-zero-trust",
                "category_slug": "cybersecurity",
                "short_description": "Architect zero-trust networks, micro-segmentation, OAuth 2.0 / mTLS token flows, and threat response.",
                "description": "<p>Implement zero-trust security postures: mutual TLS service mesh authentication, continuous identity verification, SIEM integration, and incident mitigation.</p>",
                "difficulty": CourseDifficulty.INTERMEDIATE.value,
                "duration_minutes": 290,
                "objectives": [
                    "Design zero-trust boundary verification models",
                    "Enforce strict mutual TLS and cryptographic identity tokens",
                    "Conduct automated incident triages and vulnerability assessments",
                ],
                "prerequisites": ["TCP/IP fundamentals", "Public Key Infrastructure (PKI) concepts"],
                "modules": [
                    {
                        "title": "Module 1: Zero Trust Core Tenets & Identity Protection",
                        "description": "Never trust, always verify: contextual access policies, device health attestations, and mTLS.",
                        "lessons": [
                            {
                                "title": "Lesson 1.1: Foundational Pillars of Zero Trust Architecture",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Never Trust, Always Verify</h3><p>Traditional perimeter defense relies on castle-and-moat security. Zero Trust assumes the internal network is compromised and validates identity, context, device posture, and permissions on every single request.</p>",
                                "duration": 20,
                            },
                            {
                                "title": "Lesson 1.2: Hardening OAuth 2.0 & Mutual TLS Handshakes",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                                "duration": 35,
                            },
                            {
                                "title": "Lesson 1.3: Presentation Slides: Zero Trust Identity & Defense Slides",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 20,
                            },
                        ],
                        "self_assessment": {
                            "title": "Self-Assessment: Zero Trust Controls & PKI",
                            "instructions": "Assess your understanding of mutual authentication, least-privilege policies, and certificate validation.",
                            "questions": [
                                {
                                    "text": "What distinguishes Mutual TLS (mTLS) from standard TLS?",
                                    "options": [
                                        ("Both the client and server present and authenticate digital certificates", True, "Standard TLS only verifies the server's identity to the client."),
                                        ("mTLS uses symmetrical encryption only", False, "mTLS uses asymmetrical public/private key pairs for handshakes."),
                                        ("mTLS eliminates the need for certificate authorities", False, "mTLS still verifies certificate chains against trusted roots."),
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        "title": "Module 2: Threat Detection & Incident Response",
                        "description": "OWASP API Top 10 defenses, SIEM rule authoring, forensic capture, and rapid containment.",
                        "lessons": [
                            {
                                "title": "Lesson 2.1: OWASP API Security & Broken Object Level Authorization (BOLA)",
                                "type": LessonContentType.TEXT.value,
                                "text": "<h3>Defending Against BOLA / IDOR</h3><p>Broken Object Level Authorization occurs when an endpoint accepts user-supplied identifiers without verifying that the requesting identity owns the resource.</p><p>Mitigation: validate tenant and ownership contexts inside database queries, rather than relying solely on client session tokens.</p>",
                                "duration": 25,
                            },
                            {
                                "title": "Lesson 2.2: Live SIEM Forensics & Automated Threat Hunting",
                                "type": LessonContentType.VIDEO.value,
                                "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
                                "duration": 40,
                            },
                            {
                                "title": "Lesson 2.3: Presentation Slides: Security Incident Response Playbook",
                                "type": LessonContentType.PDF.value,
                                "url": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                "duration": 25,
                            },
                        ],
                        "graded_quiz": {
                            "title": "Module 2 Graded Quiz: Enterprise Cyber Defense Final Exam",
                            "duration_minutes": 30,
                            "passing_score": 75.0,
                            "questions": [
                                {
                                    "text": "What is the recommended mitigation against Cross-Site Request Forgery (CSRF) in single-page apps?",
                                    "options": [
                                        ("Use SameSite=Lax/Strict cookie attributes and anti-CSRF challenge tokens", True, "Modern browsers restrict cross-origin cookie dispatch with SameSite."),
                                        ("Store user passwords in localStorage", False, "Storing credentials in localStorage creates severe XSS vulnerabilities."),
                                        ("Disable HTTPS redirects", False, "Disabling HTTPS violates fundamental transport security."),
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        ]

        # 5. Populate Courses, Modules, Lessons, Quizzes, and Enrollments
        for spec in sample_courses_specs:
            cat = categories_map.get(spec["category_slug"])
            if not cat or not instructor:
                continue

            course_stmt = select(Course).where(Course.slug == spec["slug"])
            c_res = await session.execute(course_stmt)
            course = c_res.scalars().first()

            if not course:
                course = Course(
                    instructor_id=instructor.id,
                    organization_id=None,  # Global public platform catalog course
                    category_id=cat.id,
                    title=spec["title"],
                    slug=spec["slug"],
                    short_description=spec["short_description"],
                    description=spec["description"],
                    difficulty=spec["difficulty"],
                    status=CourseStatus.PUBLISHED.value,
                    duration_minutes=spec["duration_minutes"],
                    learning_objectives=spec["objectives"],
                    prerequisites=spec["prerequisites"],
                )
                session.add(course)
                await session.flush()
                logger.info(f"Seeded course: {course.title}")

                for mod_idx, mod_spec in enumerate(spec["modules"], start=1):
                    module = CourseModule(
                        course_id=course.id,
                        title=mod_spec["title"],
                        description=mod_spec["description"],
                        order_index=mod_idx,
                    )
                    session.add(module)
                    await session.flush()

                    for les_idx, les_spec in enumerate(mod_spec["lessons"], start=1):
                        lesson = Lesson(
                            module_id=module.id,
                            title=les_spec["title"],
                            content_type=les_spec["type"],
                            text_content=les_spec.get("text"),
                            resource_url=les_spec.get("url"),
                            order_index=les_idx,
                            duration_minutes=les_spec.get("duration", 20),
                            is_preview=(les_idx == 1),
                        )
                        session.add(lesson)

                    # Self-Assessment Quiz (if configured)
                    if "self_assessment" in mod_spec:
                        sa_spec = mod_spec["self_assessment"]
                        sa_quiz = Quiz(
                            course_id=course.id,
                            instructor_id=instructor.id,
                            organization_id=org.id,
                            title=sa_spec["title"],
                            instructions=sa_spec["instructions"],
                            duration_minutes=0,  # untimed self-assessment
                            passing_score_percentage=60.0,
                            max_attempts=0,  # unlimited practice attempts
                            status=QuizStatus.PUBLISHED.value,
                        )
                        session.add(sa_quiz)
                        await session.flush()

                        for q_idx, q_spec in enumerate(sa_spec["questions"], start=1):
                            question = QuizQuestion(
                                quiz_id=sa_quiz.id,
                                question_text=q_spec["text"],
                                question_type=QuestionType.SINGLE_CHOICE.value,
                                order_index=q_idx,
                                points=10,
                            )
                            session.add(question)
                            await session.flush()

                            for opt_idx, (opt_text, is_correct, explanation) in enumerate(q_spec["options"], start=1):
                                opt = QuestionOption(
                                    question_id=question.id,
                                    option_text=opt_text,
                                    is_correct=is_correct,
                                    explanation=explanation,
                                    order_index=opt_idx,
                                )
                                session.add(opt)

                    # Graded Module Quiz (if configured)
                    if "graded_quiz" in mod_spec:
                        gq_spec = mod_spec["graded_quiz"]
                        g_quiz = Quiz(
                            course_id=course.id,
                            instructor_id=instructor.id,
                            organization_id=org.id,
                            title=gq_spec["title"],
                            instructions="Complete this graded assessment to evaluate your module mastery. Timed session.",
                            duration_minutes=gq_spec["duration_minutes"],
                            passing_score_percentage=gq_spec["passing_score"],
                            max_attempts=3,
                            status=QuizStatus.PUBLISHED.value,
                        )
                        session.add(g_quiz)
                        await session.flush()

                        for q_idx, q_spec in enumerate(gq_spec["questions"], start=1):
                            question = QuizQuestion(
                                quiz_id=g_quiz.id,
                                question_text=q_spec["text"],
                                question_type=QuestionType.SINGLE_CHOICE.value,
                                order_index=q_idx,
                                points=25,
                            )
                            session.add(question)
                            await session.flush()

                            for opt_idx, (opt_text, is_correct, explanation) in enumerate(q_spec["options"], start=1):
                                opt = QuestionOption(
                                    question_id=question.id,
                                    option_text=opt_text,
                                    is_correct=is_correct,
                                    explanation=explanation,
                                    order_index=opt_idx,
                                )
                                session.add(opt)

            # Auto-enroll student into this course if student exists
            if student and course:
                enr_stmt = select(Enrollment).where(
                    Enrollment.user_id == student.id,
                    Enrollment.course_id == course.id,
                )
                enr_res = await session.execute(enr_stmt)
                enrollment = enr_res.scalars().first()
                if not enrollment:
                    enrollment = Enrollment(
                        user_id=student.id,
                        course_id=course.id,
                        status=EnrollmentStatus.ACTIVE.value,
                    )
                    session.add(enrollment)
                    logger.info(f"Enrolled student ({student.email}) into course: {course.title}")

        await session.commit()
    logger.info("Database schema and rich sample courses initialization completed.")
