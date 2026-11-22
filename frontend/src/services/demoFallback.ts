import { User, AuthResponse } from "@/types/auth";
import { CourseListResponse, CourseDetail } from "@/types/course";
import { EnrollmentListResponse } from "@/types/learning";
import { StudentOverview, StudentActivityResponse } from "@/types/analytics";
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

  return null;
}
