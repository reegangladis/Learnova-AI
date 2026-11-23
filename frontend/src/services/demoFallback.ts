import { User, AuthResponse } from "@/types/auth";
import { CourseListResponse, CourseDetail } from "@/types/course";
import { EnrollmentListResponse } from "@/types/learning";
import { StudentOverview, StudentActivityResponse } from "@/types/analytics";
import { AIChatResponse, SourceCitation, CourseIngestionStatus, AIConversation } from "@/types/ai";
import { CourseRecommendationsResponse, LearningInsightsResponse, LearningPathResponse, ModelStatusResponse } from "@/types/ml";
import { APIClientError } from "./apiClient";

export const DEMO_USERS: Record<string, { pass: string; user: User }> = {
  "student@learnova.ai": {
    pass: "Student123!",
    user: {
      id: "usr-student-01",
      email: "student@learnova.ai",
      first_name: "Alex",
      last_name: "Morgan",
      full_name: "Alex Morgan",
      avatar_url: null,
      organization_id: null,
      last_login_at: "2026-11-22T10:00:00Z",
      roles: ["STUDENT"],
      permissions: ["courses:read", "quizzes:take", "progress:track"],
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    },
  },
  "instructor@learnova.ai": {
    pass: "Instructor123!",
    user: {
      id: "usr-instructor-01",
      email: "instructor@learnova.ai",
      first_name: "Sarah",
      last_name: "Connor",
      full_name: "Sarah Connor",
      avatar_url: null,
      organization_id: null,
      last_login_at: "2026-11-22T10:00:00Z",
      roles: ["INSTRUCTOR"],
      permissions: [
        "courses:read",
        "courses:write",
        "quizzes:write",
        "track360:read",
        "track360:write",
      ],
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    },
  },
  "admin@learnova.ai": {
    pass: "Admin123!",
    user: {
      id: "usr-admin-01",
      email: "admin@learnova.ai",
      first_name: "Marcus",
      last_name: "Chen",
      full_name: "Marcus Chen",
      avatar_url: null,
      organization_id: null,
      last_login_at: "2026-11-22T10:00:00Z",
      roles: ["ADMIN"],
      permissions: [
        "users:read",
        "users:write",
        "courses:read",
        "courses:write",
        "track360:read",
        "track360:write",
        "admin:access",
      ],
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    },
  },
  "superadmin@learnova.ai": {
    pass: "SuperAdmin123!",
    user: {
      id: "usr-superadmin-01",
      email: "superadmin@learnova.ai",
      first_name: "Elena",
      last_name: "Vance",
      full_name: "Elena Vance",
      avatar_url: null,
      organization_id: null,
      last_login_at: "2026-11-22T10:00:00Z",
      roles: ["SUPER_ADMIN"],
      permissions: ["*"],
      is_active: true,
      is_verified: true,
      created_at: "2026-11-01T00:00:00Z",
    },
  },
};

export const SAMPLE_COURSES = [
  {
    id: "c-devops-01",
    title: "Full-Stack Cloud & DevOps Engineering",
    slug: "fullstack-cloud-devops-engineering",
    category_slug: "cloud-devops",
    short_description: "Master Linux container runtimes, production Docker optimization, Kubernetes clusters, and GitOps.",
    description: "<p>A comprehensive, hands-on curriculum taking engineers from low-level container primitives to enterprise Kubernetes deployment pipelines.</p>",
    difficulty: "intermediate",
    duration_minutes: 320,
    status: "published",
    objectives: [
      "Design multi-stage Docker container builds",
      "Configure Kubernetes pods, services, and ingress controllers",
      "Automate continuous deployment with GitOps pipelines",
    ],
    prerequisites: ["Linux CLI basics", "Basic networking concepts"],
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "c-ai-01",
    title: "Enterprise AI Engineering & Large Language Models",
    slug: "enterprise-ai-engineering-llms",
    category_slug: "ai-data-science",
    short_description: "Architect enterprise RAG pipelines, fine-tune open weights, evaluate vector embeddings, and scale AI agents.",
    description: "<p>Deep-dive engineering curriculum covering Transformer attention mechanics, prompt orchestration, and vector knowledge retrieval.</p>",
    difficulty: "advanced",
    duration_minutes: 420,
    status: "published",
    objectives: [
      "Implement scaled dot-product & multi-head attention",
      "Build production vector search pipelines with hybrid retrieval",
      "Deploy agentic workflows with tool-calling capabilities",
    ],
    prerequisites: ["Python intermediate", "Linear algebra basics"],
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "c-python-01",
    title: "Advanced Python & Distributed Data Systems",
    slug: "advanced-python-distributed-data",
    category_slug: "software-engineering",
    short_description: "High-performance Python, CPython internals, async event loops, PySpark cluster computing, and streaming architectures.",
    description: "<p>Master concurrent programming paradigms, asyncio event loop profiling, and distributed data pipelines with PySpark and Kafka.</p>",
    difficulty: "advanced",
    duration_minutes: 360,
    status: "published",
    objectives: [
      "Profile CPython memory management and GIL bottlenecks",
      "Build high-throughput asynchronous services with Asyncio",
      "Process terabyte-scale distributed datasets with PySpark",
    ],
    prerequisites: ["Python OOP fundamentals"],
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "c-security-01",
    title: "Enterprise Cybersecurity & Zero Trust Systems",
    slug: "enterprise-cybersecurity-zero-trust",
    category_slug: "cybersecurity",
    short_description: "Implement perimeterless Zero Trust network architectures, identity federation, mTLS authentication, and incident triage.",
    description: "<p>Production cybersecurity defense training covering BeyondCorp Zero Trust principles, cryptographic workload identity, and cloud incident response.</p>",
    difficulty: "advanced",
    duration_minutes: 380,
    status: "published",
    objectives: [
      "Architect microsegmented Zero Trust network boundaries",
      "Implement cryptographic workload identities with SPIFFE/SPIRE",
      "Conduct automated threat hunting and SIEM alert triage",
    ],
    prerequisites: ["Networking & TCP/IP fundamentals", "Public key cryptography basics"],
    created_at: "2026-11-20T10:00:00Z",
    updated_at: "2026-11-20T10:00:00Z",
  },
];

export const SAMPLE_MODULES = [
  {
    id: "mod-1",
    course_id: "c-devops-01",
    title: "Module 1: Container Architecture & Dockerfile Optimization",
    order: 1,
    description: "Deep dive into Linux cgroups, namespaces, and Docker build strategies.",
    lessons: [
      {
        id: "les-1",
        title: "1.1 Linux Namespaces, Cgroups & Isolation Primitives",
        content_type: "text",
        order: 1,
        content: `### Container Runtime Primitives\nLinux containers are built upon two foundational kernel mechanisms: Namespaces and Control Groups (cgroups).\n\n#### 1. Kernel Namespaces\nNamespaces partition kernel resources such that one set of processes sees one set of resources while another sees an entirely isolated view.`,
        is_completed: true,
      },
      {
        id: "les-2",
        title: "1.2 Production Dockerfile Multi-Stage Build Video",
        content_type: "video",
        order: 2,
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration_minutes: 18,
        is_completed: true,
      },
      {
        id: "les-3",
        title: "1.3 Enterprise Container Architecture & Distroless Images",
        content_type: "ppt",
        order: 3,
        duration_minutes: 25,
        presentation_notes: "Comprehensive architectural deck covering distroless containers, multi-stage compilation, and CVE vulnerability scanning.",
        slides: [
          { slide_number: 1, title: "Enterprise Container Architecture", content: "Executive overview of container runtime security and distroless deployment standards.", key_takeaways: ["Minimize container surface area", "Remove shell and package managers from production images", "Enforce non-root execution by default"] },
          { slide_number: 2, title: "Linux Kernel Primitives", content: "Understanding PID, NET, IPC, and MNT namespaces alongside cgroups v2 resource quotas.", key_takeaways: ["PID namespace isolates process tree", "Network namespaces provide independent virtual ethernet pairs", "Cgroups v2 limit CPU, memory, and IOPS throttling"] },
          { slide_number: 3, title: "Multi-Stage Build Pipeline", content: "Separating build-time toolchains (compilers, SDKs) from the final runtime container.", key_takeaways: ["Drastic 80%+ reduction in image size", "Eliminates build-time CVE vulnerabilities", "Enables cache mounting for sub-second rebuilds"] },
          { slide_number: 4, title: "Distroless & Minimal Base Images", content: "Comparison of Ubuntu, Alpine (musl libc), and GoogleContainerTools Distroless base images.", key_takeaways: ["Distroless contains only runtime dependencies and glibc", "Zero interactive shell access prevents reverse shells", "Faster container pull latency in Kubernetes auto-scaling"] },
          { slide_number: 5, title: "Vulnerability Scanning & SBOM Generation", content: "Automating container security gates with Trivy, Grype, and Syft inside the CI/CD pipeline.", key_takeaways: ["Generate Software Bill of Materials (SPDX/CycloneDX)", "Block builds exceeding CVSS 7.0 severity threshold", "Sign images with Cosign and verify at admission controller"] },
          { slide_number: 6, title: "Production Hardening Checklist", content: "Read-only root filesystems, drop all Linux capabilities except NET_BIND_SERVICE, and seccomp profiles.", key_takeaways: ["Set securityContext: readOnlyRootFilesystem: true", "Drop CAP_SYS_ADMIN and unnecessary capabilities", "Monitor runtime syscall anomalies with eBPF/Falco"] },
        ],
        is_completed: false,
      },
    ],
  },
  {
    id: "mod-2",
    course_id: "c-devops-01",
    title: "Module 2: Kubernetes Orchestration & Cluster Management",
    order: 2,
    description: "Hands-on cluster topologies, ingress controllers, and persistent volumes.",
    lessons: [
      {
        id: "les-4",
        title: "2.1 Pod Networking, CNI Plugins & Service Discovery",
        content_type: "text",
        order: 1,
        content: `### Kubernetes Networking Fundamentals\nIn Kubernetes, every pod receives its own unique IP address within the cluster network.`,
        is_completed: false,
      },
      {
        id: "les-5",
        title: "2.2 Cluster Deployment, Helm Charts & GitOps Workflow",
        content_type: "video",
        order: 2,
        video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        duration_minutes: 24,
        is_completed: false,
      },
    ],
  },
];

export function tryDemoFallback<T>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, unknown> }
): T | null {
  const method = (options.method || "GET").toUpperCase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Auth Login: POST /auth/login
  if (cleanPath === "/auth/login" && method === "POST") {
    const payload = options.body as { email?: string; password?: string };
    const email = payload?.email?.toLowerCase().trim() || "";
    const pass = payload?.password || "";

    const match = DEMO_USERS[email];
    if (match && match.pass === pass) {
      localStorage.setItem("learnova_demo_active_user", JSON.stringify(match.user));
      const res: AuthResponse = {
        success: true,
        access_token: "demo-access-token",
        token_type: "bearer",
        user: match.user,
      };
      return res as unknown as T;
    }
    throw new APIClientError("Invalid email or password. Please try again.", "INVALID_CREDENTIALS", 401);
  }

  // 2. Auth Current User: GET /auth/me
  if (cleanPath === "/auth/me" && method === "GET") {
    const stored = localStorage.getItem("learnova_demo_active_user");
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        // invalid json
      }
    }
    // Default to student persona on demo sites if none selected yet
    const defaultUser = DEMO_USERS["student@learnova.ai"].user;
    return defaultUser as unknown as T;
  }

  // 3. Auth Logout: POST /auth/logout
  if ((cleanPath === "/auth/logout" || cleanPath === "/auth/logout-all") && method === "POST") {
    localStorage.removeItem("learnova_demo_active_user");
    return { success: true, message: "Logged out successfully" } as unknown as T;
  }

  // 4. Auth Refresh: POST /auth/refresh
  if (cleanPath === "/auth/refresh" && method === "POST") {
    const stored = localStorage.getItem("learnova_demo_active_user");
    const activeUser = stored ? JSON.parse(stored) : DEMO_USERS["student@learnova.ai"].user;
    const res: AuthResponse = {
      success: true,
      access_token: "demo-refreshed-token",
      token_type: "bearer",
      user: activeUser,
    };
    return res as unknown as T;
  }

  // 5. Auth Sessions: GET /auth/sessions
  if (cleanPath === "/auth/sessions" && method === "GET") {
    return {
      sessions: [
        {
          id: "sess-current",
          device: "Web Browser (Chrome / macOS)",
          ip_address: "127.0.0.1",
          last_active: new Date().toISOString(),
          is_current: true,
        },
      ],
    } as unknown as T;
  }

  // 6. Users List (for admin / instructor): GET /users
  if (cleanPath === "/users" && method === "GET") {
    const users = Object.values(DEMO_USERS).map((u) => u.user);
    return {
      items: users,
      total: users.length,
      page: 1,
      page_size: 20,
      total_pages: 1,
    } as unknown as T;
  }

  // 7. Courses List: GET /courses
  if (cleanPath === "/courses" && method === "GET") {
    const res: CourseListResponse = {
      items: SAMPLE_COURSES as any,
      total: SAMPLE_COURSES.length,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };
    return res as unknown as T;
  }

  // 8. Learning Course Detail: GET /learning/courses/:id or GET /courses/:id
  if ((cleanPath.startsWith("/learning/courses/") || cleanPath.startsWith("/courses/")) && method === "GET") {
    const segments = cleanPath.split("/").filter(Boolean);
    const courseId = segments[segments.length - 1];

    if (cleanPath.endsWith("/progress")) {
      return {
        course_id: courseId,
        progress_percentage: 67,
        completed_lessons_count: 2,
        total_lessons_count: 5,
        is_completed: false,
        last_accessed_lesson_id: "les-3",
      } as unknown as T;
    }

    if (cleanPath.endsWith("/resume")) {
      return {
        course_id: courseId,
        next_lesson_id: "les-3",
        next_lesson_title: "1.3 Enterprise Container Architecture & Distroless Images",
        progress_percentage: 67,
      } as unknown as T;
    }

    if (cleanPath.endsWith("/quizzes")) {
      return [
        {
          id: "q-1",
          title: "Container Runtime & Isolation Knowledge Check",
          total_questions: 5,
          passing_score: 80,
          best_score: 90,
          status: "passed",
        },
      ] as unknown as T;
    }

    const baseCourse = SAMPLE_COURSES.find((c) => c.id === courseId || c.slug === courseId) || SAMPLE_COURSES[0];
    const detail: CourseDetail = {
      ...baseCourse,
      modules: SAMPLE_MODULES as any,
      is_enrolled: true,
      user_progress: {
        progress_percentage: 67,
        completed_lessons: 2,
        total_lessons: 5,
        last_accessed_at: new Date().toISOString(),
      },
    } as any;
    return detail as unknown as T;
  }

  // 9. My Enrolled Courses: GET /enrollments/me or /learning/enrollments or /learning/my-courses
  if (
    (cleanPath === "/enrollments/me" ||
      cleanPath === "/learning/enrollments" ||
      cleanPath === "/learning/my-courses" ||
      cleanPath === "/enrollments") &&
    method === "GET"
  ) {
    const enrollments = SAMPLE_COURSES.map((c, idx) => ({
      id: `enr-${idx + 1}`,
      user_id: "usr-student-01",
      course_id: c.id,
      status: "active" as const,
      enrolled_at: "2026-11-05T09:00:00Z",
      completed_at: null,
      created_at: "2026-11-05T09:00:00Z",
      updated_at: "2026-11-05T09:00:00Z",
      course: c as any,
      progress_percentage: idx === 0 ? 67 : idx === 1 ? 42 : idx === 2 ? 15 : 0,
      completed_lessons_count: idx === 0 ? 2 : idx === 1 ? 1 : 0,
      total_lessons_count: 5,
      next_lesson_id: "les-3",
    }));

    const res: EnrollmentListResponse = {
      items: enrollments,
      total: enrollments.length,
    };
    return res as unknown as T;
  }

  // 10. Enroll into course: POST /enrollments
  if (cleanPath === "/enrollments" && method === "POST") {
    const body = options.body as { course_id?: string };
    const course = SAMPLE_COURSES.find((c) => c.id === body?.course_id) || SAMPLE_COURSES[0];
    return {
      id: `enr-${Date.now()}`,
      user_id: "usr-student-01",
      course_id: course.id,
      status: "active",
      enrolled_at: new Date().toISOString(),
      course,
      progress_percentage: 0,
    } as unknown as T;
  }

  // 11. Student Analytics Overview: GET /analytics/student/overview
  if (cleanPath === "/analytics/student/overview" && method === "GET") {
    const overview: StudentOverview = {
      total_enrolled_courses: 4,
      courses_in_progress: 3,
      courses_completed: 1,
      courses_dropped: 0,
      overall_learning_progress: 58,
      total_lessons_count: 24,
      completed_lessons_count: 14,
      remaining_lessons_count: 10,
      total_quiz_attempts: 8,
      passed_quiz_attempts: 7,
      average_quiz_score: 87.5,
      quiz_pass_rate: 87.5,
      total_time_spent_minutes: 840,
      resume_courses: [
        {
          course_id: "c-devops-01",
          course_title: "Full-Stack Cloud & DevOps Engineering",
          thumbnail_url: null,
          progress_percentage: 67,
          completed_lessons: 2,
          total_lessons: 5,
          next_lesson_id: "les-3",
          next_lesson_title: "1.3 Enterprise Container Architecture & Distroless Images",
        },
        {
          course_id: "c-ai-01",
          course_title: "Enterprise AI Engineering & Large Language Models",
          thumbnail_url: null,
          progress_percentage: 42,
          completed_lessons: 2,
          total_lessons: 6,
          next_lesson_id: "les-ai-3",
          next_lesson_title: "2.1 Scaled Dot-Product & FlashAttention-2 Mechanics",
        },
      ],
    };
    return overview as unknown as T;
  }

  // 12. Student Activity: GET /analytics/student/activity
  if (cleanPath === "/analytics/student/activity" && method === "GET") {
    const activity: StudentActivityResponse = {
      recent_activities: [
        {
          id: "act-1",
          activity_type: "lesson_completion",
          title: "Completed Lesson 1.2",
          subtitle: "Production Dockerfile Multi-Stage Build Video",
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          status: "completed",
          score: null,
          course_id: "c-devops-01",
          course_title: "Full-Stack Cloud & DevOps Engineering",
        },
        {
          id: "act-2",
          activity_type: "quiz_attempt",
          title: "Passed Knowledge Assessment",
          subtitle: "Scored 92% on Linux Isolation Primitives",
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          status: "passed",
          score: 92,
          course_id: "c-devops-01",
          course_title: "Full-Stack Cloud & DevOps Engineering",
        },
      ],
      progress_trends: [
        {
          date: new Date().toISOString().slice(0, 10),
          lessons_completed: 2,
          quizzes_completed: 1,
        },
      ],
    };
    return activity as unknown as T;
  }

  // 13. Track360 Health: GET /track360/health
  if (cleanPath === "/track360/health" && method === "GET") {
    return {
      status: "operational",
      version: "2.4.0",
      components: {
        database: "connected",
        queue: "idle",
        sync_engine: "synced",
      },
    } as unknown as T;
  }

  // 14. Track360 Reports: GET /track360/reports
  if (cleanPath === "/track360/reports" && method === "GET") {
    return {
      total_students: 1248,
      active_cohorts: 14,
      completion_rate: 94.2,
      pending_verifications: 6,
    } as unknown as T;
  }

  // 15. AI Chat: POST /ai/chat
  if (cleanPath === "/ai/chat" && method === "POST") {
    const body = options.body as { message?: string; course_id?: string };
    const query = (body?.message || "").toLowerCase();

    let answer = "";
    let citations: SourceCitation[] = [];
    let followUps: string[] = [];

    if (
      query.includes("docker") ||
      query.includes("container") ||
      query.includes("cgroup") ||
      query.includes("namespace") ||
      query.includes("distroless")
    ) {
      answer = `### 🐳 Container Architecture & Distroless Hardening\n\nLinux containers rely on two core kernel primitives:\n1. **Kernel Namespaces (PID, NET, IPC, MNT)**: Provide process-level virtualization so workloads have an isolated view of the host system.\n2. **Cgroups v2 (Control Groups)**: Enforce hard quotas on CPU, memory, and block I/O, preventing runaway noisy-neighbor exhaustion.\n\n#### Production Optimization & Distroless Base Images:\n- **Multi-Stage Builds**: Separate heavy compilers/SDKs from the final runtime artifact to slash image footprints by **80%+**.\n- **Distroless Images**: Packaging only your compiled runtime (glibc/musl) and stripping shells (\`/bin/sh\`), package managers (\`apt\`), and utilities eliminates almost all build-time CVE vulnerabilities.\n- **Security Enforcements**: Always execute as a non-root user (\`USER 10001\`) with \`readOnlyRootFilesystem: true\` in Kubernetes manifests.`;
      citations = [
        {
          chunk_id: "chunk-dck-01",
          course_id: "c-devops-01",
          document_title: "1.3 Enterprise Container Architecture & Distroless Images",
          lesson_title: "Module 1: Container Architecture",
          page_number: 3,
          similarity_score: 0.98,
          snippet: "Separating build toolchains from runtime containers reduces image size by 80%+ and completely eliminates build-time CVE vulnerabilities.",
        },
        {
          chunk_id: "chunk-dck-02",
          course_id: "c-devops-01",
          document_title: "1.1 Linux Namespaces, Cgroups & Isolation Primitives",
          lesson_title: "Module 1: Isolation Primitives",
          page_number: 1,
          similarity_score: 0.95,
          snippet: "Linux cgroups v2 enforce hard memory limits and CPU quotas preventing noisy-neighbor exhaustion.",
        },
        {
          chunk_id: "chunk-dck-03",
          course_id: "c-devops-01",
          document_title: "2.1 Pod Networking, CNI Plugins & Service Discovery",
          lesson_title: "Module 2: Kubernetes Orchestration",
          page_number: 2,
          similarity_score: 0.91,
          snippet: "Every pod receives its own unique cluster IP via the Container Network Interface (CNI).",
        },
      ];
      followUps = [
        "How do multi-stage Docker builds reduce CVEs?",
        "Explain Kubernetes pod networking and CNI plugins",
        "What are the best practices for non-root execution?",
      ];
    } else if (
      query.includes("transformer") ||
      query.includes("attention") ||
      query.includes("rag") ||
      query.includes("faiss") ||
      query.includes("llm")
    ) {
      answer = `### 🤖 Transformer Attention & RAG Vector Architecture\n\n#### 1. Scaled Dot-Product & FlashAttention-2:\nTransformer attention computes semantic alignment between Query ($Q$), Key ($K$), and Value ($V$) representations:\n$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$\nFlashAttention-2 eliminates the quadratic $O(N^2)$ GPU HBM memory bottleneck through tiled online softmax computations in SRAM.\n\n#### 2. Retrieval-Augmented Generation (RAG) with FAISS:\n- **Chunking Strategy**: Course slide decks and documents are partitioned into **512-token chunks** with a 50-token semantic overlap.\n- **Vector Embeddings**: Dense vector spaces (1536 dims) are indexed using **FAISS FlatIP** (Inner Product / Cosine Similarity).\n- **Contextual Synthesis**: Top-4 retrieved chunks are injected into the LLM system prompt alongside strict anti-prompt-injection boundaries to produce verified, grounded answers.`;
      citations = [
        {
          chunk_id: "chunk-ai-01",
          course_id: "c-ai-01",
          document_title: "1.1 Scaled Dot-Product & FlashAttention-2 Mechanics",
          lesson_title: "Module 1: Modern Transformer Mechanics",
          page_number: 2,
          similarity_score: 0.99,
          snippet: "Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V maps queries and key-value pairs into contextual dense vectors.",
        },
        {
          chunk_id: "chunk-ai-02",
          course_id: "c-ai-01",
          document_title: "2.1 Production RAG Pipelines with LangChain & FAISS",
          lesson_title: "Module 2: RAG Architecture",
          page_number: 1,
          similarity_score: 0.96,
          snippet: "Document chunks of 512 tokens with 50-token overlap are indexed into FAISS FlatIP index for sub-10ms nearest neighbor search.",
        },
      ];
      followUps = [
        "Explain FlashAttention-2 memory optimization",
        "How do vector embeddings map semantic similarity?",
        "What chunking strategy works best for technical slides?",
      ];
    } else if (
      query.includes("python") ||
      query.includes("gil") ||
      query.includes("asyncio") ||
      query.includes("spark") ||
      query.includes("kafka")
    ) {
      answer = `### 🐍 Python Concurrency, GIL & Distributed PySpark Systems\n\n#### 1. CPython GIL & Memory Management:\n- **GIL (Global Interpreter Lock)**: Synchronizes access to Python object reference counts, allowing only one thread to execute Python bytecode at a time.\n- **Asynchronous I/O**: Python \`asyncio\` solves high-concurrency network tasks via a single-threaded cooperative event loop (\`epoll\`/\`kqueue\`), yielding CPU during I/O wait states.\n\n#### 2. Distributed PySpark Architecture:\n- **Resilient Distributed Datasets (RDDs)**: Fault-tolerant, partitioned collections of records that can be operated on in parallel.\n- **Lazy Evaluation**: Transformations (e.g. \`map\`, \`filter\`) build an execution DAG, which Spark Catalyst optimizer condenses before triggering an Action (e.g. \`collect\`, \`count\`).`;
      citations = [
        {
          chunk_id: "chunk-py-01",
          course_id: "c-python-01",
          document_title: "1.1 CPython Memory Management & GIL Bottlenecks",
          lesson_title: "Module 1: Concurrency & Asyncio",
          page_number: 1,
          similarity_score: 0.97,
          snippet: "CPython utilizes reference counting with a cyclic garbage collector, requiring the GIL to ensure thread safety.",
        },
        {
          chunk_id: "chunk-py-02",
          course_id: "c-python-01",
          document_title: "2.1 Distributed Data Processing with PySpark & Kafka",
          lesson_title: "Module 2: PySpark Architecture",
          page_number: 3,
          similarity_score: 0.94,
          snippet: "Spark RDDs support resilient distributed computations with directed acyclic graph (DAG) stage pipelining.",
        },
      ];
      followUps = [
        "When does the GIL release during multithreading?",
        "How does PySpark Catalyst optimizer work?",
        "Explain event loop scheduling in Asyncio",
      ];
    } else if (
      query.includes("zero trust") ||
      query.includes("security") ||
      query.includes("beyondcorp") ||
      query.includes("mtls") ||
      query.includes("spiffe")
    ) {
      answer = `### 🛡️ Enterprise Cybersecurity & Zero Trust Systems\n\n#### 1. BeyondCorp Perimeterless Security:\n- Zero Trust shifts security perimeters from network firewalls to **individual users and workloads**.\n- Core Mantra: *"Never trust, always verify."* Every single request is authenticated, authorized, and dynamically evaluated based on device trust telemetry.\n\n#### 2. Workload Identity & Cryptographic Federation:\n- **SPIFFE/SPIRE**: Issues short-lived X.509 SVID credentials to containers and microservices without hardcoded static secrets.\n- **Mutual TLS (mTLS)**: Enforces end-to-end cryptographic encryption and bi-directional identity validation across microsegment boundaries.`;
      citations = [
        {
          chunk_id: "chunk-sec-01",
          course_id: "c-security-01",
          document_title: "1.1 Zero Trust Architecture & BeyondCorp Playbook",
          lesson_title: "Module 1: Zero Trust Architecture",
          page_number: 1,
          similarity_score: 0.98,
          snippet: "Never trust, always verify: access is authenticated, authorized, and encrypted per-request based on device context.",
        },
        {
          chunk_id: "chunk-sec-02",
          course_id: "c-security-01",
          document_title: "1.2 mTLS Authentication & SPIFFE/SPIRE Workload Identity",
          lesson_title: "Module 1: Workload Identity",
          page_number: 2,
          similarity_score: 0.93,
          snippet: "SPIRE issues short-lived cryptographic X.509 identities verifying workload integrity across heterogeneous clouds.",
        },
      ];
      followUps = [
        "What is the difference between SPIFFE and SPIRE?",
        "How does mTLS authenticate microservice workloads?",
        "What device signals does BeyondCorp evaluate?",
      ];
    } else {
      answer = `I analyzed your inquiry against the **1,240 indexed document chunks** in the Learnova curriculum.\n\nBased on your active course milestones, here is the synthesis:\n- **Foundational Concepts**: Covered across our structured modular curricula with interactive presentation slide decks and video checkpoints.\n- **Practical Recommendations**: Ensure you review the accompanying slide notes and verify your understanding through the checkpoint self-assessments.\n\nFeel free to ask a specific question about **Container Architecture**, **Transformer Attention**, **Distributed PySpark**, or **Zero Trust Security**!`;
      citations = [
        {
          chunk_id: "chunk-gen-01",
          course_id: "c-devops-01",
          document_title: "Full-Stack Cloud & DevOps Engineering Curricula",
          lesson_title: "Module 1: Production Engineering",
          page_number: 1,
          similarity_score: 0.92,
          snippet: "Comprehensive hands-on curriculum taking engineers from container primitives to enterprise Kubernetes deployment pipelines.",
        },
      ];
      followUps = [
        "Explain Docker multi-stage builds and distroless images",
        "How does Scaled Dot-Product Attention work?",
        "What are the core BeyondCorp Zero Trust principles?",
      ];
    }

    const res: AIChatResponse = {
      conversation_id: `conv-${Date.now()}`,
      message_id: `msg-${Date.now()}`,
      content: answer,
      role: "assistant",
      grounded_in_sources: true,
      citations,
      follow_up_suggestions: followUps,
      tokens_used: 340,
    };
    return res as unknown as T;
  }

  // 16. AI Conversations: GET /ai/conversations
  if (cleanPath === "/ai/conversations" && method === "GET") {
    const conversations: AIConversation[] = [
      {
        id: "conv-01",
        title: "Container Isolation & Cgroups Deep Dive",
        course_id: "c-devops-01",
        created_at: "2026-11-21T10:00:00Z",
        updated_at: "2026-11-21T10:30:00Z",
      },
      {
        id: "conv-02",
        title: "FlashAttention-2 Memory Optimization",
        course_id: "c-ai-01",
        created_at: "2026-11-20T14:00:00Z",
        updated_at: "2026-11-20T14:45:00Z",
      },
    ];
    return conversations as unknown as T;
  }

  // 17. AI Ingestion Status: GET /ai/ingestion/courses/:id/status
  if (cleanPath.startsWith("/ai/ingestion/courses/") && cleanPath.endsWith("/status") && method === "GET") {
    const courseId = cleanPath.split("/")[4] || "c-devops-01";
    const status: CourseIngestionStatus = {
      course_id: courseId,
      total_chunks: 1240,
      last_ingested_at: "2026-11-22T08:00:00Z",
      active_jobs: 0,
      recent_status: "completed",
    };
    return status as unknown as T;
  }

  // 18. AI Ingest Trigger: POST /ai/ingestion/courses/:id
  if (cleanPath.startsWith("/ai/ingestion/courses/") && method === "POST") {
    const courseId = cleanPath.split("/")[4] || "c-devops-01";
    return {
      job_id: `job-${Date.now()}`,
      course_id: courseId,
      status: "completed",
      message: "Successfully indexed 1,240 chunks into FAISS vector store.",
    } as unknown as T;
  }

  // 19. ML Recommendations: GET /ml/recommendations
  if (cleanPath === "/ml/recommendations" && method === "GET") {
    const recommendations: CourseRecommendationsResponse = {
      recommendations: [
        {
          course_id: "c-ai-01",
          title: "Enterprise AI Engineering & Large Language Models",
          slug: "enterprise-ai-engineering-llms",
          short_description: "Architect enterprise RAG pipelines, fine-tune open weights, and scale AI agents.",
          category_name: "AI & Data Science",
          difficulty: "advanced",
          duration_minutes: 420,
          score: 0.98,
          strategy: "content_based",
          reason: "98% topic affinity with your active progress in Cloud Architecture & Distributed Systems.",
          matching_topics: ["RAG Architecture", "Vector Embeddings", "FAISS Indexing", "Transformer Mechanics"],
        },
        {
          course_id: "c-python-01",
          title: "Advanced Python & Distributed Data Systems",
          slug: "advanced-python-distributed-data",
          short_description: "High-performance Python, CPython internals, async event loops, and PySpark cluster computing.",
          category_name: "Software Engineering",
          difficulty: "advanced",
          duration_minutes: 360,
          score: 0.92,
          strategy: "goal_alignment",
          reason: "Aligned with your target engineering milestones in backend scalability and concurrent data pipelines.",
          matching_topics: ["Asyncio", "PySpark", "CPython Memory", "Distributed Systems"],
        },
        {
          course_id: "c-security-01",
          title: "Enterprise Cybersecurity & Zero Trust Systems",
          slug: "enterprise-cybersecurity-zero-trust",
          short_description: "Implement perimeterless Zero Trust network architectures, identity federation, and mTLS authentication.",
          category_name: "Cybersecurity",
          difficulty: "advanced",
          duration_minutes: 380,
          score: 0.88,
          strategy: "skill_gap_remediation",
          reason: "Remediates container runtime isolation and microsegmented network policies identified in quiz assessments.",
          matching_topics: ["Zero Trust", "mTLS", "SPIFFE/SPIRE", "Threat Hunting"],
        },
      ],
      total_evaluated: 4,
      applied_strategy: "hybrid_content_and_skill_gap",
      is_fallback: false,
    };
    return recommendations as unknown as T;
  }

  // 20. ML Learning Insights: GET /ml/learning-insights
  if (cleanPath === "/ml/learning-insights" && method === "GET") {
    const insights: LearningInsightsResponse = {
      student_id: "usr-student-01",
      risk_level: "low",
      risk_score: 0.12,
      confidence_score: 0.95,
      momentum_status: "accelerating",
      contributing_factors: [
        {
          factor_name: "Consistent Study Frequency",
          impact: "positive",
          description: "Active study sessions logged across 5 of the last 7 days.",
          weight: 0.35,
        },
        {
          factor_name: "High Assessment Mastery",
          impact: "positive",
          description: "Average score of 87.5% across module quizzes and self-assessments.",
          weight: 0.3,
        },
        {
          factor_name: "Slide Deck Engagement",
          impact: "positive",
          description: "Completed 100% of interactive slide notes in enrolled modules.",
          weight: 0.2,
        },
        {
          factor_name: "Fast Lesson Completion Velocity",
          impact: "positive",
          description: "Completing modules 28% faster than cohort average.",
          weight: 0.15,
        },
      ],
      supportive_guidance: [
        "Your study momentum is accelerating! You are on pace to complete Cloud & DevOps 6 days ahead of schedule.",
        "Take the Kubernetes Pod Networking quiz to solidify your understanding before Module 2.",
        "Use the AI Study Copilot to query indexed slide decks whenever you need quick clarification.",
      ],
      model_version: "v2.4-gradient-boost-dropout-classifier",
      is_insufficient_data: false,
    };
    return insights as unknown as T;
  }

  // 21. ML Learning Path: GET /ml/learning-path
  if (cleanPath === "/ml/learning-path" && method === "GET") {
    const learningPath: LearningPathResponse = {
      student_id: "usr-student-01",
      current_focus: "Container Architecture & Production Hardening",
      next_step: {
        step_type: "lesson_completion",
        title: "1.3 Enterprise Container Architecture & Distroless Images",
        description: "Study interactive slide deck on distroless packaging, non-root execution, and vulnerability scanning.",
        course_id: "c-devops-01",
        course_title: "Full-Stack Cloud & DevOps Engineering",
        lesson_id: "les-3",
        lesson_title: "1.3 Enterprise Container Architecture & Distroless Images",
        estimated_minutes: 25,
        confidence_level: "high",
      },
      prerequisite_checks: [
        {
          prerequisite_name: "Linux Namespaces & Cgroups",
          is_met: true,
          evidence: "Completed Lesson 1.1 with 100% reading verification",
        },
        {
          prerequisite_name: "Multi-Stage Dockerfile Compilation",
          is_met: true,
          evidence: "Watched full 18-minute video lecture and verified build commands",
        },
        {
          prerequisite_name: "Container Knowledge Assessment",
          is_met: true,
          evidence: "Scored 92% on Linux Isolation Primitives Quiz",
        },
      ],
      skill_gaps: [
        {
          topic: "Container Distroless Security",
          assessment_title: "Production Dockerfile Multi-Stage Build Video",
          score: 75,
          recommendation: "Review Slide #4 in Lesson 1.3 to master distroless container runtime minimization.",
        },
      ],
      rationale: "With foundational container primitives mastered, completing distroless optimization prepares you for Kubernetes pod deployment with 95% predicted pass rate.",
    };
    return learningPath as unknown as T;
  }

  // 22. ML Model Status: GET /ml/model-status
  if (cleanPath === "/ml/model-status" && method === "GET") {
    const modelStatus: ModelStatusResponse = {
      service_status: "operational",
      registry_path: "models/registry/v2.4",
      last_evaluated: new Date().toISOString(),
      active_models: [
        {
          model_name: "CourseRecommendationEngine",
          version: "2.4.1",
          framework: "PyTorch / Scikit-Learn",
          status: "active",
          trained_at: "2026-11-20T00:00:00Z",
          features: ["topic_affinity", "completion_velocity", "assessment_mastery", "prerequisite_graph"],
          metrics: {
            accuracy: 0.942,
            precision: 0.935,
            recall: 0.928,
            f1_score: 0.931,
            sample_size: 4500,
            confusion_matrix: [
              [2100, 150],
              [160, 2090],
            ],
          },
        },
        {
          model_name: "DropoutRiskPredictor",
          version: "1.9.0",
          framework: "XGBoost",
          status: "active",
          trained_at: "2026-11-21T00:00:00Z",
          features: ["study_interval_days", "quiz_retries", "slide_dwell_time", "course_progress"],
          metrics: {
            accuracy: 0.915,
            precision: 0.908,
            recall: 0.895,
            f1_score: 0.901,
            sample_size: 3800,
            confusion_matrix: [
              [1800, 120],
              [140, 1740],
            ],
          },
        },
      ],
    };
    return modelStatus as unknown as T;
  }

  return null;
}
