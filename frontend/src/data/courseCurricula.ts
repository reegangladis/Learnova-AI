import { Course, CourseModule } from "@/types/course";
import { LearningCourse, LearningModule, LearningLesson, SlideDeckItem } from "@/types/learning";
import {
  StudentCourseQuizItem,
  StudentQuizTakeResponse,
  QuizDetail,
  StudentQuizAttemptSummary,
} from "@/types/quiz";

export interface RichQuizSpec {
  detail: QuizDetail;
  defaultCompletedAttempt?: StudentQuizAttemptSummary & {
    selectedAnswers: Record<string, string[]>;
  };
}

const nowIso = "2026-11-20T10:00:00Z";

export const SEEDED_COURSES: Course[] = [
  {
    id: "c-devops-01",
    organization_id: null,
    instructor_id: "usr-instructor-01",
    instructor: {
      id: "usr-instructor-01",
      first_name: "Sarah",
      last_name: "Connor",
      email: "instructor@learnova.ai",
    },
    category_id: "cat-cloud",
    category: {
      id: "cat-cloud",
      name: "Cloud & DevOps",
      slug: "cloud-devops",
      description: "Cloud infrastructure, containers, and orchestration",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    title: "Full-Stack Cloud & DevOps Engineering",
    slug: "fullstack-cloud-devops-engineering",
    short_description:
      "Master Linux container runtimes, production Docker optimization, Kubernetes clusters, and GitOps.",
    description:
      "A comprehensive, hands-on curriculum taking engineers from low-level container primitives to enterprise Kubernetes deployment pipelines and automated GitOps operations.",
    difficulty: "intermediate",
    duration_minutes: 320,
    status: "published",
    language: "en",
    learning_objectives: [
      "Architect isolated Linux containers using namespaces and cgroups v2",
      "Design multi-stage Docker and distroless container builds",
      "Configure Kubernetes pods, CNI networking, and ingress controllers",
      "Automate continuous zero-downtime rollouts with Helm and ArgoCD",
    ],
    prerequisites: ["Linux CLI basics", "Basic TCP/IP networking concepts"],
    modules_count: 3,
    lessons_count: 9,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "c-ai-01",
    organization_id: null,
    instructor_id: "usr-instructor-02",
    instructor: {
      id: "usr-instructor-02",
      first_name: "Aravind",
      last_name: "Nair",
      email: "aravind.nair@learnova.ai",
    },
    category_id: "cat-ai",
    category: {
      id: "cat-ai",
      name: "AI & Data Science",
      slug: "ai-data-science",
      description: "Transformers, LLMs, and enterprise vector RAG",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    title: "Enterprise AI Engineering & Large Language Models",
    slug: "enterprise-ai-engineering-llms",
    short_description:
      "Architect enterprise RAG pipelines, optimize attention mechanisms, evaluate vector embeddings, and scale AI agents.",
    description:
      "Deep-dive engineering curriculum covering Transformer scaled dot-product attention, quantization, LangChain/FAISS retrieval pipelines, and grounded LLM evaluation.",
    difficulty: "advanced",
    duration_minutes: 420,
    status: "published",
    language: "en",
    learning_objectives: [
      "Implement scaled dot-product & multi-head attention mechanics",
      "Build production vector search pipelines with FAISS hybrid retrieval",
      "Deploy agentic ReAct workflows with structured tool-calling",
      "Evaluate RAG faithfulness and defend against prompt injection",
    ],
    prerequisites: ["Intermediate Python", "Linear algebra & cosine similarity fundamentals"],
    modules_count: 3,
    lessons_count: 9,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "c-python-01",
    organization_id: null,
    instructor_id: "usr-instructor-03",
    instructor: {
      id: "usr-instructor-03",
      first_name: "Vikram",
      last_name: "Rao",
      email: "vikram.rao@learnova.ai",
    },
    category_id: "cat-swe",
    category: {
      id: "cat-swe",
      name: "Software Engineering",
      slug: "software-engineering",
      description: "High-concurrency backend and distributed data engineering",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    title: "Advanced Python & Distributed Data Systems",
    slug: "advanced-python-distributed-data",
    short_description:
      "High-performance Python, CPython internals, async event loops, PySpark cluster computing, and streaming architectures.",
    description:
      "Master concurrent programming paradigms, CPython GIL profiling, FastAPI asyncio services, and distributed terabyte-scale data processing with PySpark and Kafka.",
    difficulty: "advanced",
    duration_minutes: 360,
    status: "published",
    language: "en",
    learning_objectives: [
      "Profile CPython memory allocation and GIL contention bottlenecks",
      "Build high-throughput asynchronous microservices with Asyncio & FastAPI",
      "Architect fault-tolerant PySpark DAG transformations and streaming jobs",
      "Optimize wide shuffle boundaries in distributed clusters",
    ],
    prerequisites: ["Python OOP fundamentals", "SQL and relational modeling"],
    modules_count: 3,
    lessons_count: 9,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "c-security-01",
    organization_id: null,
    instructor_id: "usr-instructor-04",
    instructor: {
      id: "usr-instructor-04",
      first_name: "Meera",
      last_name: "Krishnan",
      email: "meera.krishnan@learnova.ai",
    },
    category_id: "cat-sec",
    category: {
      id: "cat-sec",
      name: "Cybersecurity",
      slug: "cybersecurity",
      description: "Zero Trust network architecture and cloud defense",
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    },
    title: "Enterprise Cybersecurity & Zero Trust Systems",
    slug: "enterprise-cybersecurity-zero-trust",
    short_description:
      "Implement perimeterless Zero Trust network architectures, identity federation, mTLS authentication, and incident triage.",
    description:
      "Production cybersecurity defense training covering BeyondCorp Zero Trust principles, SPIFFE/SPIRE workload identity, OWASP API Top 10 mitigations, and SIEM forensics.",
    difficulty: "intermediate",
    duration_minutes: 380,
    status: "published",
    language: "en",
    learning_objectives: [
      "Architect microsegmented Zero Trust network boundaries",
      "Implement cryptographic workload identities with SPIFFE/SPIRE & mTLS",
      "Prevent BOLA/IDOR and CSRF vulnerabilities in modern APIs",
      "Conduct automated threat hunting and SIEM incident triages",
    ],
    prerequisites: ["Networking & TCP/IP fundamentals", "Public Key Infrastructure (PKI) basics"],
    modules_count: 3,
    lessons_count: 9,
    created_at: nowIso,
    updated_at: nowIso,
  },
];

export function resolveCourseId(idOrSlug?: string | null): string {
  if (!idOrSlug) return "c-devops-01";
  const lower = idOrSlug.toLowerCase();
  if (lower.includes("devops") || lower.includes("cloud")) return "c-devops-01";
  if (lower.includes("ai") || lower.includes("llm")) return "c-ai-01";
  if (lower.includes("python") || lower.includes("spark")) return "c-python-01";
  if (lower.includes("sec") || lower.includes("zero-trust") || lower.includes("cyber")) return "c-security-01";
  const match = SEEDED_COURSES.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
  return match ? match.id : "c-devops-01";
}

function makeLesson(
  id: string,
  moduleId: string,
  order: number,
  title: string,
  contentType: "text" | "video" | "pdf" | "external_resource",
  durationMinutes: number,
  options: {
    description?: string;
    textContent?: string;
    resourceUrl?: string;
    defaultCompleted?: boolean;
    slides?: SlideDeckItem[];
    presentationNotes?: string;
  }
): LearningLesson {
  return {
    id,
    module_id: moduleId,
    title,
    description: options.description || null,
    content_type: contentType,
    text_content: options.textContent || null,
    resource_url: options.resourceUrl || null,
    duration_minutes: durationMinutes,
    order_index: order,
    is_preview: order === 1,
    is_completed: Boolean(options.defaultCompleted),
    completed_at: options.defaultCompleted ? "2026-11-21T16:30:00Z" : null,
    playback_position_seconds: options.defaultCompleted ? durationMinutes * 60 : 0,
    playback_duration_seconds: durationMinutes * 60,
    slides: options.slides,
    presentation_notes: options.presentationNotes || null,
    metadata_json: options.slides ? { slides: options.slides } : {},
  };
}

export const COURSE_MODULES_MAP: Record<string, LearningModule[]> = {
  "c-devops-01": [
    {
      id: "mod-devops-0",
      course_id: "c-devops-01",
      title: "General & Orientation",
      description: "Course syllabus, lab environment setup, and cohort announcements.",
      order_index: 1,
      completed_lessons_count: 3,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-devops-0-1", "mod-devops-0", 1, "Announcements & Cohort Roadmap", "external_resource", 5, {
          description: "Welcome forum, weekly live session links, and Kubernetes lab cluster credentials.",
          resourceUrl: "https://kubernetes.io/docs/home/",
          defaultCompleted: true,
        }),
        makeLesson("les-devops-0-2", "mod-devops-0", 2, "Calendar of Events & Milestones", "text", 10, {
          description: "Key deadlines, hands-on lab schedule, and exam dates for Semester 1.",
          defaultCompleted: true,
          textContent: `### Program Milestones & Weekly Cadence\n\nWelcome to **Full-Stack Cloud & DevOps Engineering**. Keep track of the core semester checkpoints below:\n\n- **Week 1–2**: Linux Kernel Primitives, Namespaces & Multi-Stage Dockerfiles\n- **Week 3–4**: Kubernetes Control Plane, Pod Networking & CNI Plugins\n- **Week 5–6**: Helm Packaging, Ingress TLS & Automated ArgoCD GitOps\n\n#### Lab Prerequisites\nEnsure Docker Engine 26+ and \`kubectl\` CLI are installed locally before starting Module 1 hands-on exercises.`,
        }),
        makeLesson("les-devops-0-3", "mod-devops-0", 3, "Student Cloud Handbook & Lab Guide", "text", 15, {
          description: "Best practices for local Minikube/Kind clusters and container registries.",
          defaultCompleted: true,
          textContent: `### Local Cluster & CLI Setup\n\nFollow these steps to initialize your DevOps sandbox:\n\n- Install **Docker Desktop** or native Docker Engine on Linux/WSL2.\n- Verify cluster tooling using \`kind create cluster --name learnova-dev\`.\n- Configure container vulnerability scanning via **Trivy** before pushing artifacts to production.`,
        }),
      ],
    },
    {
      id: "mod-devops-1",
      course_id: "c-devops-01",
      title: "Module 1: Container Architecture & Dockerfile Optimization",
      description: "Deep dive into Linux cgroups v2, kernel namespaces, multi-stage builds, and distroless images.",
      order_index: 2,
      completed_lessons_count: 2,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-devops-1-1", "mod-devops-1", 1, "1.1 Reading on Screen: Container Primitives & Kernel Isolation", "text", 20, {
          description: "How Linux Namespaces and Control Groups (cgroups v2) power modern container runtimes.",
          defaultCompleted: true,
          textContent: `### Introduction to Container Runtime Primitives\n\nModern cloud infrastructure deploys millions of isolated microservices across shared bare-metal servers. Unlike heavyweight virtual machines that emulate entire guest operating systems via a hypervisor, Linux containers share the host kernel while maintaining strict process isolation.\n\nTwo foundational Linux kernel features make containerization possible:\n\n### 1. Kernel Namespaces (What a Process Can See)\nNamespaces partition global kernel resources so that one group of processes perceives its own dedicated set of system resources:\n\n- **PID Namespace**: Isolates the process ID space. Inside a container, your application runs as \`PID 1\`, unaware of host daemons.\n- **NET Namespace**: Assigns an independent network stack—virtual ethernet pairs (\`veth\`), loopback interfaces, routing tables, and iptables rules.\n- **MNT Namespace**: Gives the container its own filesystem mount tree layered via OverlayFS.\n- **IPC & UTS Namespaces**: Isolate inter-process memory queues and hostnames.\n\n### 2. Control Groups — cgroups v2 (How Much a Process Can Use)\nWhile namespaces handle visibility, **cgroups v2** prevent the "noisy neighbor" problem by enforcing deterministic resource quotas:\n\n- CPU bandwidth throttling via CFS quotas (\`cpu.max\`).\n- Hard memory caps (\`memory.max\`) triggering OOM-kills safely inside the container boundary rather than crashing the host.\n- Block I/O read/write IOPS throttling.\n\n### Selection of Minimal Base Images\nChoosing the right base image directly impacts pull latency, cold start speed, and CVE attack surface:\n\n- Standard Ubuntu (~78 MB): Useful for debugging, but ships shells and package managers.\n- Alpine Linux (~7 MB): Compact, uses \`musl libc\` which occasionally triggers DNS/C-extension edge cases.\n- **Google Distroless (~2–20 MB)**: Contains strictly your runtime binary and \`glibc\`—zero shell (\`/bin/sh\`), zero \`apt/apk\`, slashing CVE vulnerabilities to near zero.`,
        }),
        makeLesson("les-devops-1-2", "mod-devops-1", 2, "1.2 Recorded Session: Production Multi-Stage Dockerfile Builds", "video", 18, {
          description: "Live walkthrough optimizing Docker layer caching and stripping compiler toolchains.",
          defaultCompleted: true,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        }),
        makeLesson("les-devops-1-3", "mod-devops-1", 3, "1.3 Presentation Slides: Enterprise Container & Distroless Playbook", "pdf", 25, {
          description: "Interactive 6-slide architectural deck on distroless packaging, SBOMs, and non-root hardening.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          presentationNotes: "Review Slides 3 & 4 carefully before taking the Module 1 Self-Assessment.",
          slides: [
            { slide_number: 1, title: "Enterprise Container Architecture", content: "Executive overview of container runtime security and distroless deployment standards.", key_takeaways: ["Minimize container surface area", "Remove shell and package managers from production images", "Enforce non-root execution by default"] },
            { slide_number: 2, title: "Linux Kernel Primitives", content: "Understanding PID, NET, IPC, and MNT namespaces alongside cgroups v2 resource quotas.", key_takeaways: ["PID namespace isolates process tree", "Network namespaces provide independent virtual ethernet pairs", "Cgroups v2 limit CPU, memory, and IOPS throttling"] },
            { slide_number: 3, title: "Multi-Stage Build Pipeline", content: "Separating build-time toolchains (compilers, SDKs) from the final runtime container.", key_takeaways: ["Drastic 80%+ reduction in image size", "Eliminates build-time CVE vulnerabilities", "Enables cache mounting for sub-second rebuilds"] },
            { slide_number: 4, title: "Distroless & Minimal Base Images", content: "Comparison of Ubuntu, Alpine (musl libc), and GoogleContainerTools Distroless base images.", key_takeaways: ["Distroless contains only runtime dependencies and glibc", "Zero interactive shell access prevents reverse shells", "Faster container pull latency in Kubernetes auto-scaling"] },
            { slide_number: 5, title: "Vulnerability Scanning & SBOM Generation", content: "Automating container security gates with Trivy, Grype, and Syft inside the CI/CD pipeline.", key_takeaways: ["Generate Software Bill of Materials (SPDX/CycloneDX)", "Block builds exceeding CVSS 7.0 severity threshold", "Sign images with Cosign and verify at admission controller"] },
            { slide_number: 6, title: "Production Hardening Checklist", content: "Read-only root filesystems, drop all Linux capabilities except NET_BIND_SERVICE, and seccomp profiles.", key_takeaways: ["Set securityContext: readOnlyRootFilesystem: true", "Drop CAP_SYS_ADMIN and unnecessary capabilities", "Monitor runtime syscall anomalies with eBPF/Falco"] },
          ],
        }),
      ],
    },
    {
      id: "mod-devops-2",
      course_id: "c-devops-01",
      title: "Module 2: Production Kubernetes & GitOps Orchestration",
      description: "Master control plane state, CNI pod networking, ingress TLS, and ArgoCD rollouts.",
      order_index: 3,
      completed_lessons_count: 0,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-devops-2-1", "mod-devops-2", 1, "2.1 Reading on Screen: Kubernetes Control Plane & Pod Networking", "text", 30, {
          description: "Deep dive into kube-apiserver, etcd Raft consensus, CoreDNS, and CNI overlays.",
          defaultCompleted: false,
          textContent: `### Kubernetes Control Plane Architecture\n\nKubernetes orchestrates containerized workloads declaratively across node pools by continuously reconciling **desired state** (stored in \`etcd\`) with **actual cluster state**.\n\n### Core Control Plane Components\n- **kube-apiserver**: The single REST entry point validating Admission Controllers, RBAC rules, and persisting manifests.\n- **etcd**: Strongly consistent distributed key-value store backed by the Raft consensus protocol.\n- **kube-scheduler**: Filters and scores worker nodes based on affinity, taints/tolerations, and CPU/RAM headroom.\n- **kube-controller-manager**: Runs reconciliation loops (Deployment, ReplicaSet, Endpoints).\n\n### The Kubernetes Networking Model\nEvery Pod receives a unique cluster-wide routable IP via Container Network Interface (CNI) plugins such as Cilium (eBPF) or Calico:\n\n- Containers inside the same Pod share \`localhost\` and port space.\n- Pods communicate directly with other Pods across nodes without NAT.\n- **Services** (\`ClusterIP\`, \`NodePort\`, \`LoadBalancer\`) provide stable virtual IPs resolved internally by **CoreDNS**.`,
        }),
        makeLesson("les-devops-2-2", "mod-devops-2", 2, "2.2 Recorded Session: Ingress Controllers & Zero-Downtime Rollouts", "video", 24, {
          description: "Configuring RollingUpdate readiness probes and TLS termination at NGINX Ingress.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        }),
        makeLesson("les-devops-2-3", "mod-devops-2", 3, "2.3 Presentation Slides: Helm Charts & GitOps Architecture", "pdf", 25, {
          description: "Declarative cluster state management with Helm v3 and ArgoCD sync waves.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "Declarative Infrastructure & GitOps", content: "Treating Git repositories as the single source of truth for cluster state.", key_takeaways: ["Pull-based reconciliation vs Push CI scripts", "Instant audit trail & one-commit rollbacks", "Automatic drift detection and self-healing"] },
            { slide_number: 2, title: "Helm Chart Templating & Values", content: "Packaging Kubernetes Deployments, ConfigMaps, and Secrets into reusable Charts.", key_takeaways: ["Environment-specific overrides via values-prod.yaml", "Atomic upgrades with automatic rollback hooks", "Chart schema validation via values.schema.json"] },
            { slide_number: 3, title: "Readiness, Liveness & Startup Probes", content: "Preventing dropped HTTP requests during container boot and graceful SIGTERM drain.", key_takeaways: ["Readiness gates Service endpoint registration", "PreStop sleep hooks allow Envoy/kube-proxy propagation", "Graceful connection draining finishes in-flight requests"] },
            { slide_number: 4, title: "Canary & Blue-Green Deployments", content: "Progressive delivery strategies using Argo Rollouts and weighted traffic shifting.", key_takeaways: ["Shift 5% -> 25% -> 100% traffic incrementally", "Automated Prometheus metric analysis gates promotion", "Instant abort on p99 latency or 5xx spikes"] },
            { slide_number: 5, title: "Secrets Management in GitOps", content: "Storing encrypted secrets safely in Git via SealedSecrets and External Secrets Operator.", key_takeaways: ["Never commit plaintext base64 Kubernetes Secrets", "Sync credentials dynamically from AWS Secrets Manager / Vault", "Automate short-lived workload secret rotation"] },
            { slide_number: 6, title: "Multi-Cluster Hub-and-Spoke Topology", content: "Managing regional production clusters consistently using ArgoCD ApplicationSets.", key_takeaways: ["Uniform network policies and RBAC across regions", "Zero-touch disaster recovery provisioning", "Centralized compliance dashboard"] },
          ],
        }),
      ],
    },
  ],

  "c-ai-01": [
    {
      id: "mod-ai-0",
      course_id: "c-ai-01",
      title: "General & Course Orientation",
      description: "AI engineering lab environment, GPU runtime setup, and vector store overview.",
      order_index: 1,
      completed_lessons_count: 3,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-ai-0-1", "mod-ai-0", 1, "Announcements & Research Sync", "external_resource", 5, {
          description: "Weekly LLM paper reading club schedule and API quota instructions.",
          resourceUrl: "https://python.langchain.com/docs/introduction/",
          defaultCompleted: true,
        }),
        makeLesson("les-ai-0-2", "mod-ai-0", 2, "Calendar of Events & AI Sprints", "text", 10, {
          description: "Schedule for Transformer architecture labs and RAG benchmark evaluations.",
          defaultCompleted: true,
          textContent: `### Semester 1 AI Engineering Roadmap\n\nWelcome to **Enterprise AI Engineering & Large Language Models**. Your key deliverables:\n\n- **Module 1 Checkpoint**: Implement Scaled Dot-Product Attention & prompt guardrails\n- **Module 2 Lab**: Build a FAISS + LangChain RAG service indexing 1,000+ document chunks\n- **Final Exam**: RAG Faithfulness, Latency Tuning & Hallucination Defense`,
        }),
        makeLesson("les-ai-0-3", "mod-ai-0", 3, "LLM Sandbox & Python Notebook Handbook", "text", 15, {
          description: "Environment dependencies: PyTorch, LangChain, FAISS-CPU, and SentenceTransformers.",
          defaultCompleted: true,
          textContent: `### AI Toolkit Dependencies\n\nVerify your local environment packages before running vector indexing scripts:\n\n- \`langchain >= 0.3\`, \`faiss-cpu\`, \`sentence-transformers\`\n- Understanding embedding dimensions (**384** for \`all-MiniLM-L6-v2\`, **1536** for \`text-embedding-3-small\`).\n- Always log retrieval similarity scores and source metadata for grounded verification.`,
        }),
      ],
    },
    {
      id: "mod-ai-1",
      course_id: "c-ai-01",
      title: "Module 1: Transformer Foundations & Self-Attention",
      description: "Mathematical mechanics of attention heads, positional encodings, and reasoning loops.",
      order_index: 2,
      completed_lessons_count: 1,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-ai-1-1", "mod-ai-1", 1, "1.1 Reading on Screen: Scaled Dot-Product & Multi-Head Attention", "text", 25, {
          description: "How Query, Key, and Value matrices capture long-range contextual dependencies.",
          defaultCompleted: true,
          textContent: `### The Revolution of Self-Attention\n\nBefore Transformers (Vaswani et al., 2017), sequential RNNs processed tokens one-by-one, making parallel GPU training slow and causing vanishing gradients over long documents. The Transformer eliminated recurrence entirely using **Multi-Head Self-Attention**.\n\n### 1. Query, Key, and Value Projections\nEach input token embedding vector $x_i$ is projected into three distinct learned subspaces:\n\n- **Query ($Q$)**: What information this token is currently searching for.\n- **Key ($K$)**: What attributes this token offers to match against others.\n- **Value ($V$)**: The actual semantic content transferred when attention focuses on this token.\n\n### 2. The Scaled Dot-Product Formula\nAttention weights are calculated simultaneously across all sequence tokens:\n- Compute dot products $QK^T$ to measure pairwise token similarity.\n- Divide by $\\sqrt{d_k}$ to stabilize gradients and prevent softmax saturation.\n- Apply Softmax to turn raw logits into probability weights summing to 1, then multiply by $V$.\n\n### 3. Why Multi-Head Attention?\nRunning $h$ attention heads in parallel allows the model to jointly attend to different relationship types: syntactic dependencies in Head 1, pronoun resolution in Head 2, and domain terminology in Head 3.`,
        }),
        makeLesson("les-ai-1-2", "mod-ai-1", 2, "1.2 Recorded Session: Chain-of-Thought & Agentic ReAct Loops", "video", 30, {
          description: "Structuring reliable tool-calling agents and deterministic JSON schema outputs.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        }),
        makeLesson("les-ai-1-3", "mod-ai-1", 3, "1.3 Presentation Slides: LLM Inference, KV Caching & Quantization", "pdf", 20, {
          description: "6-slide architectural deck on FlashAttention-2, KV Cache memory, and AWQ/GGUF quantization.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "Transformer Inference Bottlenecks", content: "Prefill (compute-bound) vs Decode (memory-bandwidth bound) execution phases.", key_takeaways: ["Prefill processes entire prompt in parallel", "Autoregressive decode generates 1 token per forward pass", "Memory bandwidth determines tokens-per-second throughput"] },
            { slide_number: 2, title: "KV Cache Optimization", content: "Caching previously computed Key and Value tensors to eliminate redundant O(N^2) work.", key_takeaways: ["KV cache scales linearly with batch size and context length", "Grouped-Query Attention (GQA) shrinks KV footprint by 4x-8x", "PagedAttention prevents GPU VRAM fragmentation"] },
            { slide_number: 3, title: "FlashAttention-2 IO-Aware Tiling", content: "Fusing softmax and matrix multiplication inside fast GPU SRAM instead of HBM.", key_takeaways: ["Reduces HBM memory reads/writes dramatically", "Unlocks 128k+ context windows on single GPUs", "Zero approximation—mathematically exact attention output"] },
            { slide_number: 4, title: "Model Quantization: FP16 to INT4", content: "Compressing weights via GPTQ, AWQ, and bitsandbytes while preserving accuracy.", key_takeaways: ["FP16 requires ~2 bytes per parameter", "INT4 quantization fits 70B models on dual A100 GPUs", "Activation-aware quantization protects salient weight channels"] },
            { slide_number: 5, title: "Sampling Parameters & Determinism", content: "Balancing creativity vs factual consistency using Temperature, Top-P, and Top-K.", key_takeaways: ["Temperature = 0.0–0.2 recommended for RAG & code generation", "Nucleus (Top-P) dynamically truncates low-probability tails", "Structured JSON decoding guarantees valid API tool calls"] },
            { slide_number: 6, title: "Agentic ReAct & Guardrails", content: "Reason + Act loops paired with Pydantic output validators and latency budgets.", key_takeaways: ["Cap maximum agent iterations to prevent infinite tool loops", "Sanitize untrusted context to stop indirect prompt injection", "Stream tokens over Server-Sent Events (SSE) for responsive UX"] },
          ],
        }),
      ],
    },
    {
      id: "mod-ai-2",
      course_id: "c-ai-01",
      title: "Module 2: Production RAG Systems & FAISS Vector Search",
      description: "Recursive chunking, FAISS FlatIP indexing, citation grounding, and RAGAS metrics.",
      order_index: 3,
      completed_lessons_count: 0,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-ai-2-1", "mod-ai-2", 1, "2.1 Reading on Screen: Semantic Chunking & FAISS Retrieval", "text", 30, {
          description: "Designing 1,000+ document chunk indices with overlap boundaries and cosine scoring.",
          defaultCompleted: false,
          textContent: `### Production Retrieval-Augmented Generation (RAG)\n\nFine-tuning injects style and syntax, whereas **RAG injects verifiable, up-to-date facts** with zero hallucinated URLs. When enterprise policies or course slides change, updating the vector store takes seconds.\n\n### 1. Recursive Character & Semantic Chunking\nNaive fixed-character splits break sentences mid-thought. A production chunker respects document hierarchy:\n- Split first at \`###\` Markdown headers, then double newlines \`\\n\\n\`, then sentences.\n- Maintain **512-token chunks** with a **50–100 token sliding overlap** so definitions spanning two paragraphs stay searchable.\n\n### 2. FAISS Vector Indexing\n**Facebook AI Similarity Search (FAISS)** accelerates nearest-neighbor retrieval across thousands or millions of embeddings:\n- Normalize embedding vectors to unit L2 length and index with **IndexFlatIP** (Inner Product) to compute exact Cosine Similarity in milliseconds.\n- Attach rich metadata (\`course_id\`, \`lesson_title\`, \`slide_number\`) to render transparent **Source Citations** alongside every AI answer.`,
        }),
        makeLesson("les-ai-2-2", "mod-ai-2", 2, "2.2 Recorded Session: Hybrid Search Pipelines with LangChain & FAISS", "video", 35, {
          description: "Combining BM25 lexical matching with dense semantic embeddings via Reciprocal Rank Fusion.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        }),
        makeLesson("les-ai-2-3", "mod-ai-2", 3, "2.3 Presentation Slides: Enterprise RAG Evaluation & Citations", "pdf", 25, {
          description: "6-slide blueprint on Faithfulness, Context Recall, and defending against prompt injections.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "Why RAG Beats Pure Prompting", content: "Dynamic grounding in private enterprise knowledge bases with zero weight retraining.", key_takeaways: ["Eliminates stale pre-training knowledge cutoffs", "Delivers auditable source citations and slide numbers", "Enforces document-level RBAC access controls"] },
            { slide_number: 2, title: "Hybrid Search & Cross-Encoder Reranking", content: "Blending sparse BM25 keywords with dense vector embeddings using Reciprocal Rank Fusion.", key_takeaways: ["Dense search handles synonyms; BM25 nails exact error codes", "Cross-encoder rerankers score top-20 -> top-4 candidates accurately", "Boosts precision on technical acronyms"] },
            { slide_number: 3, title: "Chunk Overlap & Metadata Filtering", content: "Preserving context integrity across page boundaries with parent-document retrieval.", key_takeaways: ["Pre-filter by course_id and module_id before vector scoring", "Index small child chunks while returning fuller parent blocks", "Track similarity thresholds to gracefully admit 'I don't know'"] },
            { slide_number: 4, title: "RAGAS Evaluation Triad", content: "Measuring Context Precision, Context Recall, Faithfulness, and Answer Relevance.", key_takeaways: ["Faithfulness verifies zero unsupported claims", "Context Recall ensures gold answers were retrieved in top-K", "Automate regression evals in CI/CD before prompt changes"] },
            { slide_number: 5, title: "Defending Against Indirect Prompt Injection", content: "Isolating retrieved document text inside untrusted XML/delimiter boundaries.", key_takeaways: ["Treat retrieved slides as untrusted data, never instructions", "Strip hidden system overrides from uploaded PDFs", "Validate output schema and citation IDs programmatically"] },
            { slide_number: 6, title: "Scaling to 10,000+ Chunks", content: "Transitioning from IndexFlatIP to IVF-PQ and HNSW graphs for sub-20ms search.", key_takeaways: ["IndexFlatIP gives 100% exact recall up to 50k chunks", "HNSW provides logarithmic lookup latency at million scale", "Cache frequent semantic queries in Redis"] },
          ],
        }),
      ],
    },
  ],

  "c-python-01": [
    {
      id: "mod-py-0",
      course_id: "c-python-01",
      title: "General & Course Orientation",
      description: "Python 3.12 runtime profiling setup, FastAPI concurrency labs, and PySpark syllabus.",
      order_index: 1,
      completed_lessons_count: 3,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-py-0-1", "mod-py-0", 1, "Announcements & Architecture Office Hours", "external_resource", 5, {
          description: "Weekly debugging office hours and benchmark dataset links.",
          resourceUrl: "https://docs.python.org/3/library/asyncio.html",
          defaultCompleted: true,
        }),
        makeLesson("les-py-0-2", "mod-py-0", 2, "Calendar of Events & Benchmarks", "text", 10, {
          description: "Timeline for Asyncio stress tests and Spark cluster optimization labs.",
          defaultCompleted: true,
          textContent: `### Distributed Python Curriculum Overview\n\nWelcome to **Advanced Python & Distributed Data Systems**:\n\n- **Module 1**: CPython GIL internals, memory leaks (\`tracemalloc\`), and high-concurrency \`asyncio\`\n- **Module 2**: Apache Spark Catalyst execution plans, RDD partitions, and Kafka stream processing`,
        }),
        makeLesson("les-py-0-3", "mod-py-0", 3, "Python Performance Profiling Toolkit", "text", 15, {
          description: "Installing py-spy, memory_profiler, and local Spark Docker images.",
          defaultCompleted: true,
          textContent: `### Essential Profiling Tools\n\nUse sampling profilers like \`py-spy\` in staging environments without adding heavy runtime overhead. Pair with \`asyncio.run(..., debug=True)\` during development to spot any coroutine blocking the event loop over 100ms.`,
        }),
      ],
    },
    {
      id: "mod-py-1",
      course_id: "c-python-01",
      title: "Module 1: Concurrency, CPython GIL & Memory Internals",
      description: "Deep dive into reference counting, GIL switching, cooperative multitasking, and FastAPI.",
      order_index: 2,
      completed_lessons_count: 1,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-py-1-1", "mod-py-1", 1, "1.1 Reading on Screen: CPython Memory & Global Interpreter Lock", "text", 25, {
          description: "How CPython manages heap objects, cyclic GC, and cooperative async I/O concurrency.",
          defaultCompleted: true,
          textContent: `### Understanding the Global Interpreter Lock (GIL)\n\nIn CPython, memory allocation relies primarily on **reference counting**. Every object tracks how many variables point to it (\`sys.getrefcount\`). When the count hits zero, its memory is immediately reclaimed.\n\nTo prevent race conditions where two threads increment or decrement reference counts simultaneously without coarse locks on every object, CPython enforces the **GIL**: a mutex ensuring only one thread executes Python bytecode at any instant.\n\n### Choosing the Right Concurrency Primitive\n- **CPU-Bound Work** (matrix math, image compression): Threads contend on the GIL and run no faster than single-threaded code. Use \`multiprocessing.ProcessPoolExecutor\` or C-extensions (NumPy/PyTorch) that release the GIL.\n- **I/O-Bound Work** (PostgreSQL queries, Redis, HTTP APIs): Threads release the GIL while waiting on OS sockets, OR even better—use **\`asyncio\`**, which multiplexes tens of thousands of coroutines onto a single OS thread via OS \`epoll\`/\`kqueue\` selectors.\n\n### Critical Pitfall in FastAPI\nNever call synchronous blocking libraries (like \`time.sleep()\` or \`requests.get()\`) inside an \`async def\` route! Doing so halts the entire event loop for all concurrent users. Always use \`await asyncio.sleep()\` or \`httpx.AsyncClient\`.`,
        }),
        makeLesson("les-py-1-2", "mod-py-1", 2, "1.2 Recorded Session: High-Throughput Async Pipelines with FastAPI", "video", 30, {
          description: "Profiling async PostgreSQL connection pools and non-blocking streaming responses.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        }),
        makeLesson("les-py-1-3", "mod-py-1", 3, "1.3 Presentation Slides: Python Memory & Concurrency Deck", "pdf", 20, {
          description: "6-slide technical deck covering tracemalloc, __slots__, TaskGroups, and uvloop.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "CPython Object Model & PyObject Overhead", content: "Understanding PyObject headers, __dict__ hash tables, and memory fragmentation.", key_takeaways: ["Every int/float carries a 28+ byte PyObject header", "__slots__ replaces per-instance dicts with fixed arrays", "Saves up to 60% RAM across millions of DTO instances"] },
            { slide_number: 2, title: "Garbage Collection & Reference Cycles", content: "Generational cyclic GC (Gen 0, Gen 1, Gen 2) cleaning up circular object references.", key_takeaways: ["Reference counting catches non-cyclic objects instantly", "Cyclic GC handles self-referencing trees and closures", "gc.freeze() speeds up forked gunicorn workers"] },
            { slide_number: 3, title: "Cooperative Event Loops & Coroutines", content: "Non-blocking event loop scheduling via epoll, kqueue, and uvloop.", key_takeaways: ["Coroutines yield explicitly at await boundaries", "Structured concurrency via Python 3.11+ asyncio.TaskGroup", "uvloop replaces Python event loop with Cython/libuv"] },
            { slide_number: 4, title: "Async SQLAlchemy Connection Pooling", content: "Sizing QueuePool limits vs PostgreSQL max_connections cleanly.", key_takeaways: ["Avoid N+1 queries via selectinload & joinedload", "Expire_on_commit=False prevents implicit lazy async I/O errors", "Cap transaction scopes tightly around commits"] },
            { slide_number: 5, title: "Python 3.13+ Free-Threading (No-GIL)", content: "Exploring PEP 703 experimental free-threaded builds and biased reference counting.", key_takeaways: ["PEP 703 introduces per-object locks & QSBR memory reclamation", "Allows true multi-core CPU parallelism across threads", "Ecosystem C-extensions adopting Py_MOD_GIL_NOT_USED"] },
            { slide_number: 6, title: "Production Profiling with py-spy", content: "Generating flamegraphs from running production containers without code edits.", key_takeaways: ["Attach out-of-process to PID with zero runtime slowdown", "Pinpoint synchronous bottlenecks blocking the event loop", "Track heap growth over time using tracemalloc snapshots"] },
          ],
        }),
      ],
    },
    {
      id: "mod-py-2",
      course_id: "c-python-01",
      title: "Module 2: Distributed Data Processing with Apache PySpark",
      description: "Spark Driver/Executor topology, Catalyst query optimization, and Kafka streaming.",
      order_index: 3,
      completed_lessons_count: 0,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-py-2-1", "mod-py-2", 1, "2.1 Reading on Screen: Spark RDDs, DAGs & Catalyst Optimizer", "text", 30, {
          description: "How Apache Spark optimizes distributed SQL plans and eliminates unnecessary shuffles.",
          defaultCompleted: false,
          textContent: `### Distributed Cluster Computing with Apache Spark\n\nApache Spark processes terabyte-scale datasets across hundreds of cluster nodes using an in-memory Directed Acyclic Graph (DAG) execution engine.\n\n### 1. Driver vs Executors\n- **Driver**: Runs your \`main()\` script, creates the \`SparkSession\`, builds logical plans, and schedules Tasks.\n- **Executors**: Distributed JVM worker containers holding cached data partitions and computing tasks in parallel.\n\n### 2. Lazy Evaluation & Narrow vs Wide Transformations\nSpark defers computation on transformations (\`filter()\`, \`select()\`, \`withColumn()\`) until an **Action** (\`count()\`, \`write()\`) triggers execution:\n\n- **Narrow Transformations** (\`map\`, \`filter\`): Compute purely within local node partitions—zero network transfer.\n- **Wide Transformations** (\`groupBy\`, \`join\`, \`repartition\`): Trigger a **Shuffle**, serializing and exchanging records across the network between executors.\n\n### 3. The Catalyst Optimizer\nSpark SQL translates DataFrame pipelines through Unresolved Logical Plan -> Optimized Plan (predicate pushdown, constant folding) -> Physical Plan -> Tungsten whole-stage codegen bytecode.`,
        }),
        makeLesson("les-py-2-2", "mod-py-2", 2, "2.2 Recorded Session: Structured Streaming with Kafka & PySpark", "video", 35, {
          description: "Watermarking late events, stateful window aggregations, and Delta Lake sinks.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        }),
        makeLesson("les-py-2-3", "mod-py-2", 3, "2.3 Presentation Slides: Spark Shuffle Tuning & Skew Mitigation", "pdf", 25, {
          description: "6-slide masterclass on Adaptive Query Execution (AQE), broadcast joins, and salting keys.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "Anatomy of a Spark Shuffle", content: "Disk spills, network serialization, and why shuffles dominate cluster runtime.", key_takeaways: ["Executors write partitioned shuffle files before fetch", "Excessive partitions cause tiny-file scheduling overhead", "Too few partitions cause OOM spills per task"] },
            { slide_number: 2, title: "Broadcast Hash Joins vs Sort-Merge Joins", content: "Replicating small dimension tables to all executors to avoid shuffling large fact tables.", key_takeaways: ["Use F.broadcast(small_df) for tables under ~100 MB", "Completely eliminates network shuffle on the huge table", "Speeds up star-schema joins by 5x–20x"] },
            { slide_number: 3, title: "Mitigating Data Skew with Key Salting", content: "Solving the '99% complete, 1 task stuck for 2 hours' straggler problem.", key_takeaways: ["Skew occurs when millions of nulls/hot keys hit 1 partition", "Salt hot keys with random integers before aggregation", "Run two-phase aggregation to combine partial sums"] },
            { slide_number: 4, title: "Adaptive Query Execution (AQE)", content: "Runtime dynamic optimization in Spark 3.x that coalesces shuffle partitions automatically.", key_takeaways: ["Dynamically switches Sort-Merge to Broadcast Join at runtime", "Merges small post-shuffle partitions to hit target sizes", "Splits skewed partitions cleanly without manual salting"] },
            { slide_number: 5, title: "Apache Arrow & Vectorized Pandas UDFs", content: "Eliminating JVM-to-Python pickle serialization bottlenecks in PySpark.", key_takeaways: ["Standard Python UDFs serialize row-by-row over sockets", "Arrow transfers columnar batches directly to NumPy/Pandas", "Up to 100x faster custom ML scoring pipelines"] },
            { slide_number: 6, title: "Structured Streaming & Watermarks", content: "Guaranteeing exactly-once delivery with Kafka checkpoints and event-time watermarks.", key_takeaways: ["Store micro-batch offsets reliably in S3 checkpoints", "Watermarks drop stale state after grace windows expire", "Write idempotently to Delta Lake / Iceberg ACID tables"] },
          ],
        }),
      ],
    },
  ],

  "c-security-01": [
    {
      id: "mod-sec-0",
      course_id: "c-security-01",
      title: "General & Course Orientation",
      description: "Zero Trust network architecture overview, lab guidelines, and threat modeling.",
      order_index: 1,
      completed_lessons_count: 3,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-sec-0-1", "mod-sec-0", 1, "Announcements & Threat Advisories", "external_resource", 5, {
          description: "Weekly CVE advisories, OWASP updates, and lab discussion board.",
          resourceUrl: "https://owasp.org/API-Security/",
          defaultCompleted: true,
        }),
        makeLesson("les-sec-0-2", "mod-sec-0", 2, "Calendar of Events & Blue-Team Drills", "text", 10, {
          description: "Course pacing and live incident response simulation dates.",
          defaultCompleted: true,
          textContent: `### Enterprise Cybersecurity & Zero Trust Roadmap\n\n- **Module 1**: Perimeterless BeyondCorp architectures, mTLS handshakes & SPIFFE workload identities\n- **Module 2**: OWASP API Top 10 (BOLA/IDOR, CSRF), SIEM rules & cloud incident triage`,
        }),
        makeLesson("les-sec-0-3", "mod-sec-0", 3, "Lab Ethics & Responsible Disclosure Policy", "text", 10, {
          description: "Strict sandbox rules for practicing defensive audits safely.",
          defaultCompleted: true,
          textContent: `### Authorized Testing Boundary\n\nAll vulnerability validation and mTLS capture labs run strictly inside isolated ephemeral containers provided in Learnova sandboxes. Follow defensive hardening blueprints carefully.`,
        }),
      ],
    },
    {
      id: "mod-sec-1",
      course_id: "c-security-01",
      title: "Module 1: Zero Trust Core Tenets & Identity Protection",
      description: "BeyondCorp principles, mutual TLS (mTLS), and SPIFFE/SPIRE workload identity.",
      order_index: 2,
      completed_lessons_count: 0,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-sec-1-1", "mod-sec-1", 1, "1.1 Reading on Screen: Foundational Pillars of Zero Trust", "text", 20, {
          description: "Why 'Never Trust, Always Verify' replaces traditional castle-and-moat VPN perimeters.",
          defaultCompleted: false,
          textContent: `### Transitioning From Castle-and-Moat to Zero Trust\n\nLegacy corporate networks operated like medieval castles: hard firewall perimeters on the outside, implicit trust on the inside. Once an attacker breached a single VPN laptop or phished a credential, lateral movement across databases was effortless.\n\n### Core Zero Trust Principles (NIST SP 800-207 / Google BeyondCorp)\n- **Assume Breach**: Treat internal corporate networks and cloud VPCs as hostile as the public internet.\n- **Verify Explicitly Every Request**: Authorize every API call using identity tokens, device posture checks (disk encryption, OS patch status), and risk telemetry.\n- **Least-Privilege Microsegmentation**: Restrict workloads so an order microservice can speak *only* to the payments microservice—never arbitrary CIDR subnets.\n\n### Cryptographic Workload Identity with SPIFFE / SPIRE\nInstead of distributing static long-lived API keys in environment variables, modern service meshes adopt **SPIFFE** IDs (\`spiffe://learnova.prod/ns/payments/sa/checkout\`). **SPIRE** attests container kernels automatically and mints short-lived X.509 certificates rotated every few minutes.`,
        }),
        makeLesson("les-sec-1-2", "mod-sec-1", 2, "1.2 Recorded Session: Hardening OAuth 2.0 & Mutual TLS Handshakes", "video", 28, {
          description: "Inspecting bi-directional mTLS certificate chains and PKCE OAuth flows.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        }),
        makeLesson("les-sec-1-3", "mod-sec-1", 3, "1.3 Presentation Slides: Zero Trust Identity & Defense Deck", "pdf", 20, {
          description: "6-slide architectural deck on mTLS, short-lived JWTs, and RBAC policy engines.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "BeyondCorp & Perimeterless Access", content: "Moving enforcement from IP VPN firewalls to identity-aware reverse proxies.", key_takeaways: ["Authenticate both device health and user SSO claim", "Eliminate brittle site-to-site VPN concentrators", "Log every authorization decision cleanly"] },
            { slide_number: 2, title: "Mutual TLS (mTLS) Under the Hood", content: "Cryptographic verification where both client and server validate X.509 certificate chains.", key_takeaways: ["Standard TLS only verifies the server", "mTLS prevents unauthorized internal pods from spoofing calls", "Short certificate TTLs eliminate painful CRL revocations"] },
            { slide_number: 3, title: "Short-Lived JWTs & HttpOnly Cookies", content: "Defending browser auth sessions against XSS token theft and CSRF replays.", key_takeaways: ["Never store bearer JWTs in window.localStorage", "Use HttpOnly + Secure + SameSite cookies", "Rotate refresh tokens with replay detection"] },
            { slide_number: 4, title: "Policy as Code with Open Policy Agent", content: "Decoupling RBAC/ABAC rules into verifiable Rego policies across services.", key_takeaways: ["Consistent authorization enforcement across Go/Python/Node", "Unit-test permissions before deploying API updates", "Centralized policy audit logs"] },
            { slide_number: 5, title: "Service Mesh East-West Encryption", content: "Automating mTLS sidecars using Istio Ambient Mesh and Envoy proxies.", key_takeaways: ["Transparent encryption without modifying app sockets", "Granular L7 HTTP path authorization policies", "Zero-downtime certificate rotation"] },
            { slide_number: 6, title: "Zero Trust Maturity Checklist", content: "Phased enterprise migration from network ACLs to continuous adaptive trust.", key_takeaways: ["Inventory identities and service-to-service traffic first", "Enable permissive mTLS logging before strict enforcement", "Continuously audit privileged Super Admin roles"] },
          ],
        }),
      ],
    },
    {
      id: "mod-sec-2",
      course_id: "c-security-01",
      title: "Module 2: OWASP API Defense & Incident Response",
      description: "Mitigating BOLA/IDOR, CSRF, injection threats, and real-time SIEM threat hunting.",
      order_index: 3,
      completed_lessons_count: 0,
      total_lessons_count: 3,
      lessons: [
        makeLesson("les-sec-2-1", "mod-sec-2", 1, "2.1 Reading on Screen: Defending Against BOLA & OWASP API Top 10", "text", 25, {
          description: "Why Broken Object Level Authorization is #1 in API security and how to eliminate it.",
          defaultCompleted: false,
          textContent: `### Broken Object Level Authorization (BOLA / IDOR)\n\nRanked **#1 on the OWASP API Security Top 10**, BOLA occurs whenever an endpoint accepts a client-supplied resource ID (like \`GET /api/invoices/1042\`) and checks *authentication* (is the user logged in?) without checking *object ownership* (does invoice 1042 belong to this user's tenant?).\n\n### Engineering Defenses Against BOLA\n- **Scoped Repository Queries**: Always filter SQL queries with \`WHERE id = :target_id AND organization_id = :current_user_org_id\`.\n- **Opaque UUIDs**: Replace sequential integers (\`1042\`) with UUIDv4 identifiers so attackers cannot enumerate records.\n- **CSRF Hardening**: Combine \`SameSite=Lax/Strict\` cookies with explicit \`Origin\` / custom header validation on state-changing mutations.`,
        }),
        makeLesson("les-sec-2-2", "mod-sec-2", 2, "2.2 Recorded Session: Live SIEM Forensics & Automated Threat Hunting", "video", 35, {
          description: "Investigating cloud control plane anomalies and writing detection rules.",
          defaultCompleted: false,
          resourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
        }),
        makeLesson("les-sec-2-3", "mod-sec-2", 3, "2.3 Presentation Slides: Security Incident Response Playbook", "pdf", 25, {
          description: "6-slide runbook on containment, forensic preservation, and post-mortem blameless reviews.",
          defaultCompleted: false,
          resourceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          slides: [
            { slide_number: 1, title: "Incident Response Lifecycle (NIST)", content: "Preparation, Detection & Analysis, Containment, Eradication, and Post-Incident Lessons.", key_takeaways: ["Automate credential revocation playbooks", "Preserve ephemeral container logs before pod termination", "Communicate cleanly via out-of-band channels"] },
            { slide_number: 2, title: "Detecting Credential Stuffing & Anomalies", content: "Spotting impossible travel, burst 401 failures, and token replay events in SIEM logs.", key_takeaways: ["Rate-limit login endpoints with sliding Redis windows", "Alert on refresh token reuse after rotation", "Correlate CloudTrail + API Gateway audit streams"] },
            { slide_number: 3, title: "Defending LLM & AI Endpoints", content: "Preventing indirect prompt injection, PII leakage, and unbounded token exhaustion.", key_takeaways: ["Validate RAG citations strictly inside source boundaries", "Apply rate limits per tenant token budget", "Redact sensitive credentials before embedding"] },
            { slide_number: 4, title: "Containment Without Destroying Evidence", content: "Snapshotting memory/disks and cordoning compromised Kubernetes pods via NetworkPolicies.", key_takeaways: ["Apply deny-all egress NetworkPolicy before inspecting pod", "Rotate compromised IAM roles and service secrets immediately", "Trace blast radius across sibling workloads"] },
            { slide_number: 5, title: "Supply Chain & Dependency Security", content: "Verifying container digests, Dependabot alerts, and signed SBOM artifacts.", key_takeaways: ["Pin transitive dependencies with cryptographic hashes", "Scan PR diffs for leaked secrets automatically", "Verify provenance with SLSA attestation"] },
            { slide_number: 6, title: "Blameless Post-Mortems & Automated Guardrails", content: "Turning every security incident into automated CI/CD regression tests.", key_takeaways: ["Fix structural root causes, never blame operators", "Add automated BOLA unit tests for every new route", "Schedule quarterly tabletop chaos exercises"] },
          ],
        }),
      ],
    },
  ],
};

function buildQuizSpec(
  id: string,
  courseId: string,
  title: string,
  description: string,
  instructions: string,
  durationMinutes: number,
  passingScore: number,
  questionsSpec: Array<{
    id: string;
    text: string;
    type?: "single_choice" | "true_false";
    explanation: string;
    options: Array<{ text: string; isCorrect: boolean }>;
  }>,
  pastAttempt?: {
    id: string;
    scorePct: number;
    startedAt: string;
    submittedAt: string;
    durationSecs: number;
  }
): RichQuizSpec {
  const ptsPerQ = 10;
  const totalPoints = questionsSpec.length * ptsPerQ;
  const selectedAnswers: Record<string, string[]> = {};

  const questions = questionsSpec.map((q, qIdx) => {
    const options = q.options.map((opt, oIdx) => {
      const optId = `${q.id}-opt-${oIdx + 1}`;
      if (qIdx === 0 && opt.isCorrect) {
        selectedAnswers[q.id] = [optId];
      } else if (opt.isCorrect) {
        selectedAnswers[q.id] = [optId];
      }
      return {
        id: optId,
        question_id: q.id,
        option_text: opt.text,
        order_index: oIdx,
        is_correct: opt.isCorrect,
        created_at: nowIso,
        updated_at: nowIso,
      };
    });

    return {
      id: q.id,
      quiz_id: id,
      question_text: q.text,
      question_type: q.type || "single_choice",
      order_index: qIdx,
      points: ptsPerQ,
      explanation: q.explanation,
      is_required: true,
      options,
      created_at: nowIso,
      updated_at: nowIso,
    };
  });

  const detail: QuizDetail = {
    id,
    organization_id: null,
    course_id: courseId,
    lesson_id: null,
    instructor_id: "usr-instructor-01",
    title,
    description,
    instructions,
    duration_minutes: durationMinutes,
    passing_score_percentage: passingScore,
    max_attempts: 5,
    shuffle_questions: false,
    shuffle_options: false,
    status: "published",
    published_at: nowIso,
    archived_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    questions,
    total_points: totalPoints,
    question_count: questions.length,
  };

  return {
    detail,
    defaultCompletedAttempt: pastAttempt
      ? {
          id: pastAttempt.id,
          attempt_number: 1,
          status: "completed",
          started_at: pastAttempt.startedAt,
          submitted_at: pastAttempt.submittedAt,
          score: Math.round((pastAttempt.scorePct / 100) * totalPoints),
          max_score: totalPoints,
          percentage_score: pastAttempt.scorePct,
          passed: pastAttempt.scorePct >= passingScore,
          time_spent_seconds: pastAttempt.durationSecs,
          selectedAnswers,
        }
      : undefined,
  };
}

export const ALL_QUIZZES_MAP: Record<string, RichQuizSpec> = {
  // DevOps Quizzes
  "quiz-devops-1": buildQuizSpec(
    "quiz-devops-1",
    "c-devops-01",
    "Self-Assessment: Container Fundamentals & Isolation",
    "Evaluate your understanding of Linux kernel namespaces, cgroups v2, and distroless optimization.",
    "Read each question carefully. Select the most accurate answer. Unlimited practice feedback included.",
    15,
    70,
    [
      {
        id: "qd1-1",
        text: "Which Linux kernel feature is responsible for enforcing CPU and memory resource quotas on a container?",
        explanation: "cgroups v2 track and enforce CPU, RAM, and block I/O limits, preventing noisy-neighbor outages.",
        options: [
          { text: "cgroups v2 (Control Groups)", isCorrect: true },
          { text: "PID Namespaces", isCorrect: false },
          { text: "OverlayFS union layers", isCorrect: false },
          { text: "veth network pairs", isCorrect: false },
        ],
      },
      {
        id: "qd1-2",
        text: "Why are multi-stage Docker builds combined with Distroless base images in production?",
        explanation: "Stripping compilers, package managers, and shells slashes image size by 80%+ and removes build-time CVEs.",
        options: [
          { text: "They exclude compilers and shells from the final runtime container to minimize CVE attack surface", isCorrect: true },
          { text: "They grant root SSH access directly inside production pods", isCorrect: false },
          { text: "They disable Kubernetes admission controller checks", isCorrect: false },
          { text: "They bypass Linux kernel namespaces completely", isCorrect: false },
        ],
      },
      {
        id: "qd1-3",
        text: "Inside a container with an isolated PID namespace, what PID is typically assigned to the entrypoint process?",
        explanation: "The PID namespace starts counting from PID 1 inside the container's isolated process tree.",
        options: [
          { text: "PID 1", isCorrect: true },
          { text: "PID 0", isCorrect: false },
          { text: "PID 1000", isCorrect: false },
          { text: "Random PID > 32768", isCorrect: false },
        ],
      },
      {
        id: "qd1-4",
        text: "Distroless images typically ship an interactive /bin/sh shell for live production SSH troubleshooting.",
        type: "true_false",
        explanation: "False! Distroless intentionally omits shells and package managers so attackers cannot spawn interactive reverse shells.",
        options: [
          { text: "True", isCorrect: false },
          { text: "False", isCorrect: true },
        ],
      },
    ],
    {
      id: "att-devops-default-1",
      scorePct: 100,
      startedAt: "2026-11-21T17:21:00Z",
      submittedAt: "2026-11-21T17:24:21Z",
      durationSecs: 201,
    }
  ),
  "quiz-devops-2": buildQuizSpec(
    "quiz-devops-2",
    "c-devops-01",
    "Graded Quiz: Kubernetes Control Plane & GitOps",
    "Assess your mastery of etcd consensus, CNI pod networking, readiness probes, and RollingUpdates.",
    "Timed module evaluation. Passing score required is 75%. Answers auto-save as you progress.",
    20,
    75,
    [
      {
        id: "qd2-1",
        text: "Which Kubernetes control plane component serves as the strongly consistent key-value backing store for all cluster state?",
        explanation: "etcd uses the Raft consensus algorithm to reliably store Pods, Services, and ConfigMaps.",
        options: [
          { text: "etcd", isCorrect: true },
          { text: "CoreDNS", isCorrect: false },
          { text: "kube-proxy", isCorrect: false },
          { text: "kube-scheduler", isCorrect: false },
        ],
      },
      {
        id: "qd2-2",
        text: "What deployment rollout strategy brings up healthy new pods before terminating old pods for zero downtime?",
        explanation: "RollingUpdate respects readiness probes and maxUnavailable constraints for seamless upgrades.",
        options: [
          { text: "RollingUpdate", isCorrect: true },
          { text: "Recreate", isCorrect: false },
          { text: "DaemonEvict", isCorrect: false },
          { text: "ManualScale", isCorrect: false },
        ],
      },
      {
        id: "qd2-3",
        text: "Which Kubernetes probe determines whether a container should start receiving live HTTP Service traffic?",
        explanation: "Readiness probes gate Service Endpoints registration; Liveness probes trigger container restarts.",
        options: [
          { text: "Readiness Probe", isCorrect: true },
          { text: "Liveness Probe", isCorrect: false },
          { text: "Termination Grace Probe", isCorrect: false },
          { text: "Exec Affinity Check", isCorrect: false },
        ],
      },
    ]
  ),

  // AI & LLM Quizzes
  "quiz-ai-1": buildQuizSpec(
    "quiz-ai-1",
    "c-ai-01",
    "Self-Assessment: Transformer Attention & Inference",
    "Verify your understanding of Q/K/V projections, FlashAttention-2, KV caching, and quantization.",
    "Self-paced knowledge check covering Module 1 concepts.",
    15,
    70,
    [
      {
        id: "qai1-1",
        text: "Why do we divide the dot product QK^T by sqrt(d_k) inside Scaled Dot-Product Attention?",
        explanation: "Without scaling by sqrt(d_k), large embedding dimensions push softmax logits into tiny-gradient saturation zones.",
        options: [
          { text: "To prevent extreme dot-product magnitudes from pushing Softmax into vanishing gradient regions", isCorrect: true },
          { text: "To increase GPU HBM memory allocation during decode", isCorrect: false },
          { text: "To convert floating-point tensors into INT4 integers", isCorrect: false },
          { text: "To eliminate the need for positional encodings", isCorrect: false },
        ],
      },
      {
        id: "qai1-2",
        text: "What optimization caches previously computed Key and Value matrices during autoregressive token generation?",
        explanation: "KV Caching eliminates recomputing prior prompt tokens on every newly generated token.",
        options: [
          { text: "KV Cache", isCorrect: true },
          { text: "Dropout Regularization", isCorrect: false },
          { text: "Temperature Sampling", isCorrect: false },
          { text: "LayerNorm Weight Sharing", isCorrect: false },
        ],
      },
      {
        id: "qai1-3",
        text: "FlashAttention-2 produces an approximate attention matrix to speed up training.",
        type: "true_false",
        explanation: "False! FlashAttention-2 computes the mathematically exact attention result by tiling softmax inside fast GPU SRAM.",
        options: [
          { text: "True", isCorrect: false },
          { text: "False", isCorrect: true },
        ],
      },
    ],
    {
      id: "att-ai-default-1",
      scorePct: 100,
      startedAt: "2026-11-20T14:12:00Z",
      submittedAt: "2026-11-20T14:15:10Z",
      durationSecs: 190,
    }
  ),
  "quiz-ai-2": buildQuizSpec(
    "quiz-ai-2",
    "c-ai-01",
    "Graded Quiz: Enterprise RAG & FAISS Retrieval",
    "Test your expertise on semantic chunking, FAISS IndexFlatIP, RAGAS metrics, and prompt security.",
    "Passing score: 80%. Graded against Module 2 vector systems materials.",
    20,
    80,
    [
      {
        id: "qai2-1",
        text: "When unit-normalized dense vectors are indexed in FAISS, which index computes exact Cosine Similarity?",
        explanation: "Inner Product (IndexFlatIP) on L2-normalized vectors equals exact Cosine Similarity.",
        options: [
          { text: "IndexFlatIP (Inner Product)", isCorrect: true },
          { text: "BM25 Sparse Inverted Matrix", isCorrect: false },
          { text: "SQLite LIKE FTS4", isCorrect: false },
          { text: "B-Tree Lexical Hash", isCorrect: false },
        ],
      },
      {
        id: "qai2-2",
        text: "In the RAGAS evaluation framework, which metric measures whether generated facts are strictly supported by retrieved context?",
        explanation: "Faithfulness evaluates hallucination drift by checking every claim against the retrieved source chunks.",
        options: [
          { text: "Faithfulness", isCorrect: true },
          { text: "BLEU Score", isCorrect: false },
          { text: "Perplexity", isCorrect: false },
          { text: "Token Latency", isCorrect: false },
        ],
      },
    ]
  ),

  // Python & PySpark Quizzes
  "quiz-python-1": buildQuizSpec(
    "quiz-python-1",
    "c-python-01",
    "Self-Assessment: CPython GIL & Asyncio Concurrency",
    "Test your grasp of reference counting, GIL trade-offs, and FastAPI event loop safety.",
    "Instant feedback self-assessment for Module 1.",
    15,
    70,
    [
      {
        id: "qpy1-1",
        text: "What happens when synchronous time.sleep(5) is invoked directly inside an async def FastAPI handler?",
        explanation: "Synchronous sleeps stall the single OS event loop thread, freezing all other concurrent user requests.",
        options: [
          { text: "It freezes the entire asyncio event loop, blocking all concurrent requests for 5 seconds", isCorrect: true },
          { text: "CPython automatically offloads it to an async background thread", isCorrect: false },
          { text: "The FastAPI worker restarts automatically", isCorrect: false },
          { text: "It releases the event loop cleanly like await asyncio.sleep(5)", isCorrect: false },
        ],
      },
      {
        id: "qpy1-2",
        text: "Which mechanism prevents per-instance dynamic dictionary memory overhead in large Python DTO classes?",
        explanation: "Defining __slots__ replaces __dict__ with a fixed array of pointers, cutting memory usage up to 60%.",
        options: [
          { text: "__slots__", isCorrect: true },
          { text: "sys.setrecursionlimit", isCorrect: false },
          { text: "functools.wraps", isCorrect: false },
          { text: "gc.disable()", isCorrect: false },
        ],
      },
    ],
    {
      id: "att-py-default-1",
      scorePct: 100,
      startedAt: "2026-11-19T18:00:00Z",
      submittedAt: "2026-11-19T18:02:45Z",
      durationSecs: 165,
    }
  ),
  "quiz-python-2": buildQuizSpec(
    "quiz-python-2",
    "c-python-01",
    "Graded Quiz: Apache PySpark Optimization & Shuffles",
    "Assess your knowledge of DAG lazy evaluation, Catalyst plans, Broadcast Joins, and key salting.",
    "Passing score required: 70%.",
    20,
    70,
    [
      {
        id: "qpy2-1",
        text: "Which PySpark operation triggers a wide dependency shuffle across network executors?",
        explanation: "groupByKey() and joins require redistributing keys across cluster nodes; map() and filter() are narrow.",
        options: [
          { text: "groupByKey() / reduceByKey()", isCorrect: true },
          { text: "filter()", isCorrect: false },
          { text: "select()", isCorrect: false },
          { text: "map()", isCorrect: false },
        ],
      },
      {
        id: "qpy2-2",
        text: "Which technique eliminates shuffling a massive 10 TB table when joining against a 20 MB lookup table?",
        explanation: "Broadcast Hash Join replicates the tiny table to every executor so the huge table stays local.",
        options: [
          { text: "Broadcast Hash Join via F.broadcast()", isCorrect: true },
          { text: "Sort-Merge Join with 1 partition", isCorrect: false },
          { text: "Disabling Adaptive Query Execution", isCorrect: false },
          { text: "Collecting both DataFrames to Driver RAM", isCorrect: false },
        ],
      },
    ]
  ),

  // Cybersecurity Quizzes
  "quiz-security-1": buildQuizSpec(
    "quiz-security-1",
    "c-security-01",
    "Self-Assessment: Zero Trust & Mutual TLS Controls",
    "Assess your understanding of BeyondCorp perimeterless models, SPIFFE/SPIRE, and mTLS.",
    "Check your grasp of Module 1 identity defense tenets.",
    15,
    70,
    [
      {
        id: "qsec1-1",
        text: "What fundamentally distinguishes Mutual TLS (mTLS) from standard HTTPS TLS?",
        explanation: "In mTLS, both the server AND the client present and verify X.509 cryptographic identity certificates.",
        options: [
          { text: "Both the client and server authenticate digital X.509 certificates", isCorrect: true },
          { text: "mTLS skips certificate validation checks", isCorrect: false },
          { text: "mTLS sends payloads in plaintext across VPCs", isCorrect: false },
          { text: "mTLS only works for static FTP transfers", isCorrect: false },
        ],
      },
      {
        id: "qsec1-2",
        text: "What does SPIFFE/SPIRE automate inside cloud-native Kubernetes clusters?",
        explanation: "SPIRE attests workloads dynamically and rotates short-lived cryptographic X.509 SVID certificates.",
        options: [
          { text: "Dynamic workload attestation and short-lived X.509 cryptographic identity rotation", isCorrect: true },
          { text: "Hardcoding static AWS keys into GitHub", isCorrect: false },
          { text: "Opening public SSH port 22 on worker nodes", isCorrect: false },
          { text: "Bypassing RBAC admission webhooks", isCorrect: false },
        ],
      },
    ]
  ),
  "quiz-security-2": buildQuizSpec(
    "quiz-security-2",
    "c-security-01",
    "Graded Quiz: OWASP API Defense & Incident Response",
    "Final cyber defense evaluation on BOLA mitigation, CSRF tokens, and NIST forensics.",
    "Passing threshold: 75%.",
    25,
    75,
    [
      {
        id: "qsec2-1",
        text: "How do backend engineers structurally eliminate Broken Object Level Authorization (BOLA/IDOR)?",
        explanation: "Enforce ownership and tenant organization predicates directly inside database query filters alongside opaque UUIDs.",
        options: [
          { text: "Enforce user/tenant ownership filters inside every database query on resource access", isCorrect: true },
          { text: "Hide resource IDs on the frontend CSS layer", isCorrect: false },
          { text: "Use predictable incrementing integers like /api/orders/1, /2, /3", isCorrect: false },
          { text: "Store session tokens in global URL query parameters", isCorrect: false },
        ],
      },
      {
        id: "qsec2-2",
        text: "What cookie configuration protects authenticated browser sessions against Cross-Site Request Forgery (CSRF)?",
        explanation: "SameSite=Lax/Strict paired with HttpOnly and origin validation stops unauthorized cross-site cookie submission.",
        options: [
          { text: "HttpOnly, Secure, and SameSite=Lax/Strict flags paired with anti-CSRF validation", isCorrect: true },
          { text: "Saving raw user passwords in localStorage", isCorrect: false },
          { text: "Allowing wildcard CORS Access-Control-Allow-Origin: * with credentials", isCorrect: false },
          { text: "Disabling HTTPS transport", isCorrect: false },
        ],
      },
    ]
  ),
};

// LocalStorage persistence keys for demo progress & quiz attempts
const COMPLETED_LESSONS_KEY = "learnova_demo_completed_lessons_v1";
const QUIZ_ATTEMPTS_KEY = "learnova_demo_quiz_attempts_v1";

export function getDemoCompletedLessonsMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COMPLETED_LESSONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function setDemoLessonCompleted(lessonId: string, isCompleted: boolean): void {
  try {
    const map = getDemoCompletedLessonsMap();
    map[lessonId] = isCompleted;
    localStorage.setItem(COMPLETED_LESSONS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getCourseModulesWithProgress(courseIdOrSlug: string): {
  course: Course;
  modules: LearningModule[];
  progress: LearningCourse["progress"];
  quizzes: StudentCourseQuizItem[];
} {
  const courseId = resolveCourseId(courseIdOrSlug);
  const course = SEEDED_COURSES.find((c) => c.id === courseId) || SEEDED_COURSES[0];
  const baseModules = COURSE_MODULES_MAP[courseId] || COURSE_MODULES_MAP["c-devops-01"];
  const completedOverrides = getDemoCompletedLessonsMap();

  const completedIds: string[] = [];
  let totalLessons = 0;

  const modules: LearningModule[] = baseModules.map((mod) => {
    let modCompleted = 0;
    const lessons: LearningLesson[] = mod.lessons.map((les) => {
      totalLessons += 1;
      const effectiveCompleted =
        les.id in completedOverrides ? completedOverrides[les.id] : les.is_completed;
      if (effectiveCompleted) {
        modCompleted += 1;
        completedIds.push(les.id);
      }
      return {
        ...les,
        is_completed: effectiveCompleted,
      };
    });

    return {
      ...mod,
      lessons,
      completed_lessons_count: modCompleted,
      total_lessons_count: lessons.length,
    };
  });

  const progressPercentage =
    totalLessons > 0 ? Math.round((completedIds.length / totalLessons) * 100) : 0;

  // Build course quizzes with any stored attempts
  const storedAttemptsMap = getDemoQuizAttemptsMap();
  const quizzes: StudentCourseQuizItem[] = Object.values(ALL_QUIZZES_MAP)
    .filter((q) => q.detail.course_id === courseId)
    .map((q) => {
      const attList = getAttemptsForQuiz(q.detail.id, storedAttemptsMap);
      const completedAtts = attList.filter((a) => a.status === "completed");
      const bestScore =
        completedAtts.length > 0
          ? Math.max(...completedAtts.map((a) => a.percentage_score))
          : null;
      const inProgress = attList.find((a) => a.status === "in_progress");

      return {
        id: q.detail.id,
        course_id: q.detail.course_id,
        lesson_id: q.detail.lesson_id,
        title: q.detail.title,
        description: q.detail.description,
        duration_minutes: q.detail.duration_minutes,
        passing_score_percentage: q.detail.passing_score_percentage,
        max_attempts: q.detail.max_attempts,
        question_count: q.detail.question_count,
        total_points: q.detail.total_points,
        attempts_count: completedAtts.length,
        best_score_percentage: bestScore,
        is_passed: bestScore !== null && bestScore >= q.detail.passing_score_percentage,
        can_attempt: completedAtts.length < q.detail.max_attempts,
        active_attempt_id: inProgress?.id || null,
      };
    });

  return {
    course,
    modules,
    progress: {
      course_id: courseId,
      total_lessons: totalLessons,
      completed_lessons: completedIds.length,
      progress_percentage: progressPercentage,
      completed_lesson_ids: completedIds,
      is_course_completed: totalLessons > 0 && completedIds.length === totalLessons,
    },
    quizzes,
  };
}

export function toCourseModulesForDetail(learningModules: LearningModule[]): CourseModule[] {
  return learningModules.map((mod) => ({
    id: mod.id,
    course_id: mod.course_id,
    title: mod.title,
    description: mod.description,
    order_index: mod.order_index,
    created_at: nowIso,
    updated_at: nowIso,
    lessons: mod.lessons.map((les) => ({
      id: les.id,
      module_id: les.module_id,
      title: les.title,
      description: les.description,
      content_type: les.content_type,
      text_content: les.text_content,
      resource_url: les.resource_url,
      duration_minutes: les.duration_minutes,
      order_index: les.order_index,
      is_preview: les.is_preview,
      text_extraction_status: "completed",
      content_processing_status: "completed",
      metadata_json: les.metadata_json || {},
      created_at: nowIso,
      updated_at: nowIso,
    })),
  }));
}

export interface StoredAttemptRecord {
  id: string;
  quiz_id: string;
  attempt_number: number;
  status: "in_progress" | "completed";
  started_at: string;
  submitted_at?: string | null;
  time_spent_seconds?: number | null;
  selectedAnswers: Record<string, string[]>;
  score: number;
  max_score: number;
  percentage_score: number;
  passed: boolean;
}

export function getDemoQuizAttemptsMap(): Record<string, StoredAttemptRecord[]> {
  try {
    const raw = localStorage.getItem(QUIZ_ATTEMPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

export function saveDemoQuizAttemptsMap(map: Record<string, StoredAttemptRecord[]>): void {
  try {
    localStorage.setItem(QUIZ_ATTEMPTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getAttemptsForQuiz(
  quizId: string,
  map?: Record<string, StoredAttemptRecord[]>
): StoredAttemptRecord[] {
  const m = map || getDemoQuizAttemptsMap();
  if (m[quizId]) return m[quizId];

  const spec = ALL_QUIZZES_MAP[quizId];
  if (spec?.defaultCompletedAttempt) {
    const def = spec.defaultCompletedAttempt;
    return [
      {
        id: def.id,
        quiz_id: quizId,
        attempt_number: def.attempt_number,
        status: "completed",
        started_at: def.started_at,
        submitted_at: def.submitted_at,
        time_spent_seconds: def.time_spent_seconds,
        selectedAnswers: def.selectedAnswers,
        score: def.score,
        max_score: def.max_score,
        percentage_score: def.percentage_score,
        passed: def.passed,
      },
    ];
  }
  return [];
}

export function buildQuizTakePayload(quizId: string): StudentQuizTakeResponse | null {
  const spec = ALL_QUIZZES_MAP[quizId];
  if (!spec) return null;
  const attempts = getAttemptsForQuiz(quizId);
  const inProgress = attempts.find((a) => a.status === "in_progress");

  return {
    id: spec.detail.id,
    course_id: spec.detail.course_id,
    lesson_id: spec.detail.lesson_id,
    title: spec.detail.title,
    description: spec.detail.description,
    instructions: spec.detail.instructions,
    duration_minutes: spec.detail.duration_minutes,
    passing_score_percentage: spec.detail.passing_score_percentage,
    max_attempts: spec.detail.max_attempts,
    total_points: spec.detail.total_points,
    question_count: spec.detail.question_count,
    active_attempt_id: inProgress?.id || null,
    time_remaining_seconds: spec.detail.duration_minutes * 60,
    questions: spec.detail.questions.map((q) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      question_text: q.question_text,
      question_type: q.question_type,
      order_index: q.order_index,
      points: q.points,
      is_required: q.is_required,
      options: q.options.map((o) => ({
        id: o.id,
        option_text: o.option_text,
        order_index: o.order_index,
      })),
    })),
  };
}
