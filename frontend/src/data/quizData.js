export const QUIZ_CATALOG = [
  {
    id: 'python-basics',
    title: 'Python Basics',
    category: 'Programming',
    categoryBg: '#E6FAF0',
    categoryColor: '#00BA88',
    difficulty: 'Easy',
    diffBg: '#D1FAE5',
    diffColor: '#047857',
    questionsCount: 5,
    questionsLabel: '5 Questions',
    duration: '5 mins',
    description: 'Test your understanding of core Python syntax, variables, lists, and functions.',
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
    id: 'web-security',
    title: 'Web Security Fundamentals',
    category: 'Cyber Security',
    categoryBg: '#F3E8FF',
    categoryColor: '#7E22CE',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    questionsCount: 5,
    questionsLabel: '5 Questions',
    duration: '8 mins',
    description: 'Learn and test key security principles, OWASP Top 10 defenses, and authentication.',
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
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    category: 'DSA',
    categoryBg: '#DBEAFE',
    categoryColor: '#1D4ED8',
    difficulty: 'Hard',
    diffBg: '#FEE2E2',
    diffColor: '#B91C1C',
    questionsCount: 5,
    questionsLabel: '5 Questions',
    duration: '10 mins',
    description: 'Master time complexities, tree traversals, graphs, and optimal searching algorithms.',
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
    id: 'discrete-math',
    title: 'Discrete Mathematics & Logic',
    category: 'Mathematics',
    categoryBg: '#FEF3C7',
    categoryColor: '#B45309',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    questionsCount: 4,
    questionsLabel: '4 Questions',
    duration: '6 mins',
    description: 'Sharpen your boolean algebra, combinatorics, set theory, and graph definitions.',
    questions: [
      {
        id: 1,
        question: 'If statement P is True and statement Q is False, what is the value of P ∧ Q (AND)?',
        options: ['True', 'False', 'Undefined', 'Contradiction'],
        correctIndex: 1,
        explanation: 'Conjunction (P ∧ Q) is only True if both operands are True.'
      },
      {
        id: 2,
        question: 'How many distinct subsets can be formed from a finite set with 4 elements?',
        options: ['8', '12', '16', '32'],
        correctIndex: 2,
        explanation: 'The power set of a set with n elements has 2^n subsets. 2^4 = 16.'
      },
      {
        id: 3,
        question: 'What is the greatest common divisor (GCD) of 48 and 18?',
        options: ['3', '6', '9', '12'],
        correctIndex: 1,
        explanation: 'Factors of 48: 1,2,3,4,6,8,12,16,24,48. Factors of 18: 1,2,3,6,9,18. Common highest is 6.'
      },
      {
        id: 4,
        question: 'In graph theory, a connected acyclic graph is known as a:',
        options: ['Clique', 'Tree', 'Bipartite graph', 'Eulerian circuit'],
        correctIndex: 1,
        explanation: 'By definition, any connected graph without cycles is a Tree.'
      }
    ]
  },
  {
    id: 'javascript-es6',
    title: 'Modern JavaScript (ES6+)',
    category: 'Programming',
    categoryBg: '#E0F2FE',
    categoryColor: '#0369A1',
    difficulty: 'Medium',
    diffBg: '#FFEDD5',
    diffColor: '#C2410C',
    questionsCount: 4,
    questionsLabel: '4 Questions',
    duration: '7 mins',
    description: 'Evaluate your knowledge of Promises, async/await, closures, and modern ES features.',
    questions: [
      {
        id: 1,
        question: 'Which keyword creates a block-scoped variable that cannot be reassigned?',
        options: ['var', 'let', 'const', 'static'],
        correctIndex: 2,
        explanation: 'const creates a read-only reference within block scope.'
      },
      {
        id: 2,
        question: 'What is the output of typeof NaN in JavaScript?',
        options: ['"nan"', '"undefined"', '"number"', '"object"'],
        correctIndex: 2,
        explanation: 'In JavaScript according to IEEE 754, NaN (Not-a-Number) is of numeric type.'
      },
      {
        id: 3,
        question: 'Which Array method produces a new array containing only elements that satisfy a condition?',
        options: ['map()', 'filter()', 'reduce()', 'forEach()'],
        correctIndex: 1,
        explanation: 'Array.prototype.filter() returns matching elements in a new array.'
      },
      {
        id: 4,
        question: 'What does Promise.all() do when at least one input promise rejects?',
        options: [
          'Resolves with the successful promises',
          'Immediately rejects with the first rejection reason',
          'Waits for all promises and returns null',
          'Retries the failed promise'
        ],
        correctIndex: 1,
        explanation: 'Promise.all() implements fail-fast behavior: if any promise rejects, it rejects immediately.'
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Quiz Graded: Python Basics',
    message: 'You scored 84% on your recent attempt. Great progress in variables and syntax!',
    category: 'quiz',
    timestamp: '15 mins ago',
    unread: true
  },
  {
    id: 2,
    title: '🔥 7-Day Learning Streak!',
    message: 'Impressive consistency! Take a quick quiz today to keep your streak alive.',
    category: 'streak',
    timestamp: '2 hours ago',
    unread: true
  },
  {
    id: 3,
    title: 'New Quiz Added: Data Structures',
    message: 'Master Tree Traversals and Binary Search Trees in our newly published quiz module.',
    category: 'content',
    timestamp: 'Yesterday',
    unread: true
  },
  {
    id: 4,
    title: 'Learning Path Milestone Reached',
    message: 'You unlocked Stage 2: Data Structures & Algorithms. Next up: AVL trees!',
    category: 'milestone',
    timestamp: '3 days ago',
    unread: false
  }
];

export const INITIAL_HISTORY = [
  {
    id: 101,
    title: 'Python Basics',
    category: 'Programming',
    score: 84,
    status: 'Passed',
    date: 'Today, 11:20 AM'
  },
  {
    id: 102,
    title: 'Discrete Mathematics',
    category: 'Mathematics',
    score: 90,
    status: 'Mastered',
    date: 'Yesterday'
  },
  {
    id: 103,
    title: 'Data Structures & Algorithms',
    category: 'DSA',
    score: 82,
    status: 'Passed',
    date: 'Sep 27, 2026'
  },
  {
    id: 104,
    title: 'Web Security Fundamentals',
    category: 'Cyber Security',
    score: 68,
    status: 'Review Needed',
    date: 'Sep 25, 2026'
  }
];
