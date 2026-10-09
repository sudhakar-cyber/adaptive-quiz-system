export const INITIAL_EDUCATOR_QUIZZES = [
  {
    id: 'quiz-py-101',
    title: 'Python Basics & OOP',
    category: 'Programming',
    categoryBg: '#E6FAF0',
    categoryColor: '#00BA88',
    difficulty: 'Easy',
    diffBg: '#D1FAE5',
    diffColor: '#047857',
    status: 'Active',
    questionsCount: 5,
    duration: '10 mins',
    submissionsCount: 42,
    avgScore: 92.4,
    passRate: 95.2,
    lastUpdated: '28 Sep 2025',
    description: 'Core concepts including data types, syntax, control flows, and introductory object-oriented programming in Python 3.',
    questions: [
      {
        id: 1,
        question: 'Which of the following is the correct file extension for Python source files?',
        options: ['.pt', '.py', '.python', '.pyt'],
        correctIndex: 1,
        explanation: 'Python files use the .py extension by convention.'
      },
      {
        id: 2,
        question: 'How do you insert single-line comments in Python code?',
        options: ['// This is a comment', '/* This is a comment */', '# This is a comment', '<!-- This is a comment -->'],
        correctIndex: 2,
        explanation: 'In Python, the hash symbol (#) is used to create single-line comments.'
      },
      {
        id: 3,
        question: 'What is the output data type of 4 / 2 in Python 3?',
        options: ['int', 'float', 'double', 'None'],
        correctIndex: 1,
        explanation: 'In Python 3, the standard division operator (/) always returns a float (2.0).'
      },
      {
        id: 4,
        question: 'Which built-in function returns the number of items in a list or string?',
        options: ['count()', 'size()', 'len()', 'length()'],
        correctIndex: 2,
        explanation: 'len() is the standard Python built-in to return collection length.'
      },
      {
        id: 5,
        question: 'Which keyword is used to declare a function in Python?',
        options: ['function', 'def', 'func', 'define'],
        correctIndex: 1,
        explanation: 'Python uses the def keyword to define reusable functions.'
      }
    ]
  },
  {
    id: 'quiz-sec-201',
    title: 'Web Security & OWASP Top 10',
    category: 'Cyber Security',
    categoryBg: '#F3E8FF',
    categoryColor: '#7E22CE',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    status: 'Active',
    questionsCount: 5,
    duration: '15 mins',
    submissionsCount: 38,
    avgScore: 71.0,
    passRate: 78.9,
    lastUpdated: '26 Sep 2025',
    description: 'Evaluation of web vulnerabilities, injection defenses, Content Security Policy, and modern cryptographic hygiene.',
    questions: [
      {
        id: 1,
        question: 'What is the primary mitigation against SQL Injection attacks?',
        options: [
          'Using client-side input validation only',
          'Parameterized queries and Prepared Statements',
          'Encoding all strings in Base64',
          'Disabling all database indexes'
        ],
        correctIndex: 1,
        explanation: 'Parameterized queries separate SQL code from user-supplied data, preventing injection.'
      },
      {
        id: 2,
        question: 'Which HTTP response header is specifically designed to mitigate Cross-Site Scripting (XSS)?',
        options: [
          'Content-Security-Policy (CSP)',
          'Strict-Transport-Security (HSTS)',
          'X-Frame-Options',
          'Access-Control-Allow-Origin'
        ],
        correctIndex: 0,
        explanation: 'Content-Security-Policy restricts trusted domains for scripts, styles, and other resources.'
      },
      {
        id: 3,
        question: 'What does HTTPS use to provide encrypted transit between client and server?',
        options: ['SSH tunnels', 'TLS / SSL encryption', 'IPSec only', 'MD5 checksums'],
        correctIndex: 1,
        explanation: 'HTTPS operates over Transport Layer Security (TLS) to encrypt payload data.'
      },
      {
        id: 4,
        question: 'Which attack tricks an authenticated user into executing unwanted actions on a trusted site?',
        options: [
          'Denial of Service (DoS)',
          'Cross-Site Request Forgery (CSRF)',
          'Man-in-the-Middle (MITM)',
          'Directory Traversal'
        ],
        correctIndex: 1,
        explanation: 'CSRF forces a victim’s browser to send unauthorized HTTP requests with their cookies.'
      },
      {
        id: 5,
        question: 'Which hashing algorithm with salt and work factor is standard for secure password storage?',
        options: ['MD5', 'SHA-1', 'bcrypt / Argon2', 'ROT13'],
        correctIndex: 2,
        explanation: 'bcrypt, Argon2, and PBKDF2 are key-stretching functions designed to resist brute force.'
      }
    ]
  },
  {
    id: 'quiz-dsa-301',
    title: 'Data Structures & Algorithms Mastery',
    category: 'DSA',
    categoryBg: '#DBEAFE',
    categoryColor: '#1D4ED8',
    difficulty: 'Hard',
    diffBg: '#FEE2E2',
    diffColor: '#B91C1C',
    status: 'Active',
    questionsCount: 5,
    duration: '20 mins',
    submissionsCount: 45,
    avgScore: 85.0,
    passRate: 86.6,
    lastUpdated: '27 Sep 2025',
    description: 'Rigorous assessment of dynamic trees, graph traversal algorithms, asymptotic bounds, and amortized hash structures.',
    questions: [
      {
        id: 1,
        question: 'What is the worst-case time complexity of standard QuickSort?',
        options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
        correctIndex: 2,
        explanation: 'When the chosen pivot is always the extreme (smallest or largest), QuickSort degrades to O(n²).'
      },
      {
        id: 2,
        question: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
        options: ['Queue', 'Stack', 'Linked List', 'Binary Heap'],
        correctIndex: 1,
        explanation: 'A Stack pushes and pops items from the same top end in LIFO order.'
      },
      {
        id: 3,
        question: 'In a balanced Binary Search Tree (AVL or Red-Black), what is the search time complexity?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'Balanced BST height is guaranteed to be O(log n), making search, insert, and delete O(log n).'
      },
      {
        id: 4,
        question: 'Which graph traversal algorithm typically uses a First-In, First-Out (FIFO) Queue?',
        options: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Dijkstra with Priority Queue', 'Prim’s Algorithm'],
        correctIndex: 1,
        explanation: 'BFS explores nodes level by level using a FIFO Queue.'
      },
      {
        id: 5,
        question: 'What is the average time complexity to lookup a key in a well-distributed Hash Table?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correctIndex: 0,
        explanation: 'Hash tables offer O(1) amortized lookup when collisions are minimized.'
      }
    ]
  },
  {
    id: 'quiz-ml-401',
    title: 'Machine Learning Foundations',
    category: 'Machine Learning',
    categoryBg: '#FEF3C7',
    categoryColor: '#B45309',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    status: 'Active',
    questionsCount: 4,
    duration: '15 mins',
    submissionsCount: 31,
    avgScore: 88.5,
    passRate: 93.5,
    lastUpdated: '24 Sep 2025',
    description: 'Supervised vs unsupervised paradigms, gradient descent, bias-variance tradeoff, and evaluation metrics.',
    questions: [
      {
        id: 1,
        question: 'What problem occurs when a model performs exceptionally on training data but poorly on test data?',
        options: ['Underfitting', 'Overfitting', 'High bias', 'Feature leakage'],
        correctIndex: 1,
        explanation: 'Overfitting occurs when high complexity models memorize noise in the training set.'
      },
      {
        id: 2,
        question: 'Which evaluation metric represents the ratio of True Positives to all Actual Positives?',
        options: ['Precision', 'Recall', 'Specificity', 'F1-Score'],
        correctIndex: 1,
        explanation: 'Recall (Sensitivity) = TP / (TP + FN).'
      },
      {
        id: 3,
        question: 'Which algorithm is primarily used for classification rather than regression despite its name?',
        options: ['Linear Regression', 'Logistic Regression', 'Ridge Regression', 'Lasso Regression'],
        correctIndex: 1,
        explanation: 'Logistic Regression uses the sigmoid activation to output probabilistic class predictions.'
      },
      {
        id: 4,
        question: 'Which method reduces the dimensionality of high-dimensional feature spaces while retaining maximum variance?',
        options: ['K-Means', 'PCA (Principal Component Analysis)', 'DBSCAN', 'Random Forest'],
        correctIndex: 1,
        explanation: 'PCA projects features onto orthogonal eigenvectors with the highest eigenvalue variances.'
      }
    ]
  },
  {
    id: 'quiz-cloud-501',
    title: 'Cloud Computing & DevOps CI/CD',
    category: 'Cloud Computing',
    categoryBg: '#E0F2FE',
    categoryColor: '#0369A1',
    difficulty: 'Hard',
    diffBg: '#FEE2E2',
    diffColor: '#B91C1C',
    status: 'Active',
    questionsCount: 4,
    duration: '12 mins',
    submissionsCount: 29,
    avgScore: 81.2,
    passRate: 82.7,
    lastUpdated: '22 Sep 2025',
    description: 'Virtualization, containerization using Docker & Kubernetes, pipeline automation, and high-availability architecture.',
    questions: [
      {
        id: 1,
        question: 'What is the primary difference between a Container and a Virtual Machine (VM)?',
        options: [
          'Containers bundle a guest OS kernel; VMs do not',
          'Containers share the host OS kernel; VMs run separate guest OSs',
          'VMs are lighter and boot in milliseconds',
          'Containers cannot run Linux binaries'
        ],
        correctIndex: 1,
        explanation: 'Containers virtualize at the OS user space level sharing the host kernel, making them lightweight.'
      },
      {
        id: 2,
        question: 'Which Kubernetes component schedules pods onto worker nodes based on resource constraints?',
        options: ['kube-proxy', 'kube-scheduler', 'etcd', 'kubelet'],
        correctIndex: 1,
        explanation: 'kube-scheduler watches for newly created pods without assigned nodes and assigns them.'
      },
      {
        id: 3,
        question: 'What does "Infrastructure as Code" (IaC) primarily enable for engineering teams?',
        options: [
          'Manual configuration of server racks',
          'Version-controlled, repeatable, and automated environment provisioning',
          'Eliminating all cloud hosting costs',
          'Direct kernel level hardware debugging'
        ],
        correctIndex: 1,
        explanation: 'Tools like Terraform allow declarative, versioned, and auditable cloud topology.'
      },
      {
        id: 4,
        question: 'Which deployment strategy routes a small percentage of user traffic to a new version before full rollout?',
        options: ['Blue/Green', 'Canary', 'Recreate', 'Shadow'],
        correctIndex: 1,
        explanation: 'Canary deployment minimizes risk by testing production traffic on a canary subset first.'
      }
    ]
  },
  {
    id: 'quiz-db-601',
    title: 'Relational Database Systems & SQL',
    category: 'Database Systems',
    categoryBg: '#F1F5F9',
    categoryColor: '#475569',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    status: 'Draft',
    questionsCount: 4,
    duration: '15 mins',
    submissionsCount: 0,
    avgScore: 0,
    passRate: 0,
    lastUpdated: '01 Oct 2025',
    description: 'Relational algebra, normal forms (1NF through BCNF), indexing mechanisms (B+ Trees), and ACID transaction properties.',
    questions: [
      {
        id: 1,
        question: 'Which normal form eliminates transitive functional dependencies on the primary key?',
        options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'BCNF'],
        correctIndex: 2,
        explanation: '3NF requires 2NF compliance and ensures no non-prime attribute is transitively dependent on any candidate key.'
      },
      {
        id: 2,
        question: 'What does the "I" stand for in the ACID properties of database transactions?',
        options: ['Integrity', 'Isolation', 'Indexability', 'Immutability'],
        correctIndex: 1,
        explanation: 'Isolation ensures concurrent transactions execute without interference as if executed serially.'
      },
      {
        id: 3,
        question: 'Which indexing data structure is most standard for range queries in relational databases?',
        options: ['Hash Map', 'B+ Tree', 'Binary Heap', 'Trie'],
        correctIndex: 1,
        explanation: 'B+ trees store keys in linked leaf nodes, making sequential range scans fast and efficient.'
      },
      {
        id: 4,
        question: 'Which SQL clause is used to filter aggregated group results rather than individual rows?',
        options: ['WHERE', 'HAVING', 'GROUP BY', 'FILTER'],
        correctIndex: 1,
        explanation: 'HAVING filters aggregated grouped records produced after GROUP BY.'
      }
    ]
  }
];

export const INITIAL_EDUCATOR_STUDENTS = [];

export const INITIAL_EDUCATOR_NOTIFICATIONS = [];

export const INITIAL_EDUCATOR_REPORTS = [
  {
    id: 'rep-1',
    title: 'Student_Performance_Q3_2025.pdf',
    type: 'Performance Summary',
    category: 'Cohort Analytics',
    generatedDate: '28 Sep 2025, 14:30',
    fileSize: '2.4 MB',
    format: 'PDF',
    downloads: 14,
    summary: 'Comprehensive aggregated performance metrics across 24 quizzes and 156 enrolled students for Quarter 3 2025.'
  },
  {
    id: 'rep-2',
    title: 'DSA_Cohort_Assessment_Audit.csv',
    type: 'Assessment Audit',
    category: 'Curriculum Diagnostic',
    generatedDate: '27 Sep 2025, 11:15',
    fileSize: '640 KB',
    format: 'CSV',
    downloads: 8,
    summary: 'Itemized student-by-student scores, question difficulty index, and runtime complexities for CS-301 Data Structures.'
  },
  {
    id: 'rep-3',
    title: 'Web_Security_Intervention_List.pdf',
    type: 'At-Risk Diagnostic',
    category: 'Student Support',
    generatedDate: '25 Sep 2025, 09:40',
    fileSize: '1.1 MB',
    format: 'PDF',
    downloads: 5,
    summary: 'Targeted identification of 8 students requiring remedial office hours in cryptography & secure coding standards.'
  },
  {
    id: 'rep-4',
    title: 'Midterm_Passing_Rates_Summary.xlsx',
    type: 'Institutional Report',
    category: 'Accreditation Audit',
    generatedDate: '22 Sep 2025, 16:50',
    fileSize: '1.8 MB',
    format: 'XLSX',
    downloads: 21,
    summary: 'Accreditation board ready grade distributions, standard deviation curves, and median completion times.'
  }
];

export const EDUCATOR_ANALYTICS_DATA = {
  kpis: {
    avgScore: '82.7%',
    completionRate: '89.4%',
    avgTimeSpent: '16.5 mins',
    passRate: '89.2%',
    activeStudents: 0,
    totalQuizzes: 24,
    questionsAnalyzed: 118
  },
  subjectBreakdown: [
    { subject: 'Python Basics', avgScore: 92, completion: 96, passRate: 98, color: '#10B981', attempts: 184 },
    { subject: 'Data Structures', avgScore: 85, completion: 91, passRate: 88, color: '#2563EB', attempts: 162 },
    { subject: 'Machine Learning', avgScore: 88, completion: 94, passRate: 92, color: '#F59E0B', attempts: 120 },
    { subject: 'Cloud Computing', avgScore: 81, completion: 86, passRate: 83, color: '#06B6D4', attempts: 98 },
    { subject: 'Web Security', avgScore: 71, completion: 80, passRate: 79, color: '#8B5CF6', attempts: 145 },
    { subject: 'Database Systems', avgScore: 68, completion: 74, passRate: 75, color: '#EC4899', attempts: 88 }
  ],
  weeklyTrends: [
    { week: 'Week 1', submissions: 68, avgScore: 76 },
    { week: 'Week 2', submissions: 92, avgScore: 79 },
    { week: 'Week 3', submissions: 114, avgScore: 82 },
    { week: 'Week 4', submissions: 142, avgScore: 85 }
  ],
  hardestQuestions: [
    {
      id: 'q-hard-1',
      question: 'Which HTTP response header is specifically designed to mitigate Cross-Site Scripting (XSS)?',
      quiz: 'Web Security & OWASP Top 10',
      failureRate: '42%',
      misconception: 'Often confused with X-Frame-Options or HSTS.',
      recommendation: 'Emphasize Content-Security-Policy directives in upcoming lab.'
    },
    {
      id: 'q-hard-2',
      question: 'What is the worst-case time complexity of standard QuickSort with poor pivot?',
      quiz: 'Data Structures & Algorithms',
      failureRate: '38%',
      misconception: 'Frequently assumed to remain O(n log n) unconditionally.',
      recommendation: 'Demonstrate unbalanced partitioning trees with sorted inputs.'
    },
    {
      id: 'q-hard-3',
      question: 'Which normal form eliminates transitive functional dependencies?',
      quiz: 'Relational Database Systems',
      failureRate: '35%',
      misconception: 'Confused with 2NF partial dependency removal.',
      recommendation: 'Provide step-by-step table decomposition exercises.'
    }
  ]
};

export const INITIAL_EDUCATOR_PROFILE = {
  fullName: 'Dr. Sarah Jenkins',
  academicTitle: 'Faculty Member',
  department: 'Computer Science',
  institution: 'LearnSmart University',
  facultyId: 'FAC-CS-2025-101',
  email: 'educator@learnsmart.com',
  phone: '',
  officeLocation: '',
  officeHours: '',
  bio: '',
  teachingPhilosophy: '',
  assignedCourses: [],
  stats: {
    coursesInstructed: 0,
    totalStudents: 0,
    quizzesAuthored: 0,
    educatorRating: '5.0 / 5.0'
  }
};

