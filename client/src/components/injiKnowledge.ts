export type InjiKnowledgeItem = {
  id: string;
  questions: string[];
  answer: string;
  priority: number;
  action?: {
    label: string;
    href: string;
  };
};

export const INJI_FALLBACK_ANSWER = "I'm focused on the Formiva website, so I don't have verified information about that. I can help with Formiva, CaseFlow, workflows, features, onboarding, pricing, trust and security, or getting in touch with the team.";

export const injiKnowledge: InjiKnowledgeItem[] = [
  {
    id: "greeting",
    priority: 20,
    questions: ["hi", "hello", "hey", "hey inji", "hi inji", "hello inji", "good morning", "good afternoon", "good evening", "nice to meet you", "are you inji"],
    answer: "Hi! I'm Inji, Formiva's website assistant. I can help you understand Formiva, CaseFlow, onboarding, features, pricing and how to get started.",
  },
  {
    id: "how-are-you",
    priority: 20,
    questions: ["how are you", "how are you doing", "what's up"],
    answer: "I'm doing great and ready to help. What would you like to know about Formiva?",
  },
  {
    id: "who-are-you",
    priority: 20,
    questions: ["who are you", "what is your name", "what should I call you"],
    answer: "I'm Inji, the Formiva website assistant. I can help you explore Formiva, CaseFlow, workflows, features, pricing and the best next step.",
  },
  {
    id: "thanks",
    priority: 19,
    questions: ["thanks", "thank you", "thanks inji", "great thanks", "that's helpful", "that is helpful", "perfect", "nice", "awesome", "good"],
    answer: "You're welcome! If you want to explore Formiva further, I can point you to the relevant page.",
  },
  {
    id: "goodbye",
    priority: 19,
    questions: ["bye", "goodbye", "see you", "talk later"],
    answer: "You're welcome! If you need anything about Formiva later, I'm here.",
  },
  {
    id: "capabilities",
    priority: 18,
    questions: ["what can you do", "what can I ask you", "help", "how can you help me", "what do you know", "what can I ask"],
    answer: "I can answer questions about Formiva, the problem it addresses, how CaseFlow works, employee onboarding, features, solutions, AI and human review, pricing, trust and security, and how to contact the team.",
  },
  {
    id: "formiva-overview",
    priority: 5,
    questions: ["what is formiva", "what does formiva do", "tell me about formiva", "explain formiva", "what is the formiva platform", "what is formiva software", "why formiva", "what is formiva used for", "why would I use formiva"],
    answer: "Formiva is an operating layer for moving work from intake to outcome. It brings structured intake, evidence, AI-assisted review, human judgment, routing, approvals, integrations and an audit trail into one visible flow.",
  },
  {
    id: "formiva-form-builder",
    priority: 12,
    questions: ["is formiva a form builder", "is formiva just a form builder", "does formiva only collect forms"],
    answer: "Formiva goes beyond collecting forms. Its CaseFlow model carries a request through intake, evidence, decisions, approvals, actions and confirmation.",
  },
  {
    id: "problem",
    priority: 13,
    questions: ["what problem does formiva solve", "what is the intake gap", "what is the handoff tax", "what is the proof problem", "why are normal forms not enough", "why not use forms and spreadsheets", "why do teams need formiva", "what happens after someone submits a form"],
    answer: "The site describes an intake gap when information arrives incomplete, in the wrong format or in the wrong place; a handoff tax from forwarding, reminders and status checks; and a proof problem when nobody can explain exactly what happened or why. Formiva is designed to make that work visible and accountable.",
  },
  {
    id: "how-formiva-works",
    priority: 14,
    questions: ["how does formiva work", "how does formiva work end to end", "what is the formiva workflow", "explain the formiva process", "how does intake become an outcome", "what are the steps in formiva"],
    answer: "Formiva's flow is built around four steps: collect cleanly with structured intake, classify first with evidence-first AI, route with intent using rules and approvals, and prove the result with confirmations and an audit trail.",
  },
  {
    id: "caseflow",
    priority: 16,
    questions: ["what is caseflow", "what is formiva caseflow", "tell me about caseflow", "how does caseflow work", "what happens to a submission in caseflow", "what is a case in formiva", "what does a case contain", "why is caseflow important", "caseflow platform", "what does caseflow track"],
    answer: "CaseFlow is the durable object at the centre of Formiva. Each submission becomes a case carrying context such as the form version, documents, validation, AI evidence, ownership, approvals, integrations, confirmation and audit history from intake to close.",
    action: { label: "Explore CaseFlow", href: "/product/caseflow" },
  },
  {
    id: "ai",
    priority: 15,
    questions: ["does formiva use ai", "how does ai work", "how does ai work in formiva", "what does the ai do", "what does formiva ai do", "does ai make decisions", "does ai approve cases", "is formiva fully automated", "what happens when ai is uncertain", "what is evidence-first ai", "what is the ai engine"],
    answer: "Formiva's AI Engine handles the first read: it can classify documents and text, extract evidence and score confidence. High-confidence, low-risk cases can move forward, while uncertain, sensitive or conflicting cases are sent to human review. Confidence is a signal, not a verdict.",
  },
  {
    id: "human-review",
    priority: 15,
    questions: ["does a human review cases", "can humans override ai", "who makes the final decision", "what happens to uncertain cases", "what happens when ai is wrong", "is there human approval"],
    answer: "Yes. Formiva is designed so people remain in control. Uncertain, sensitive or policy-conflicting cases can move to a human review queue, and human override remains available.",
  },
  {
    id: "employee-onboarding",
    priority: 16,
    questions: ["what is employee onboarding", "how does formiva help onboarding", "can formiva automate employee onboarding", "what happens during onboarding", "how does new hire onboarding work", "what does a new hire receive", "how are onboarding documents handled", "employee onboarding workflow"],
    answer: "Employee onboarding is Formiva's launch workflow. It uses a guided intake where a new hire can save progress and upload required evidence, followed by completeness checks, AI classification, human review, approval, authorised notifications, record updates and a ready-to-start confirmation.",
    action: { label: "Explore Employee Onboarding", href: "/solutions/employee-onboarding" },
  },
  {
    id: "audience",
    priority: 14,
    questions: ["who is formiva for", "who should use formiva", "what companies is formiva for", "is formiva for small businesses", "is formiva for hr teams", "is formiva for operations", "what is the target customer"],
    answer: "Formiva's launch focus is Indian IT and professional-services firms with 10–100 employees, recurring hiring and a named HR or operations owner.",
  },
  {
    id: "solutions",
    priority: 13,
    questions: ["what solutions does formiva have", "what are formiva use cases", "what workflows does formiva support", "what can formiva help with", "what about internal requests", "what about vendor intake", "what about education admissions", "what industries does formiva cover"],
    answer: "The site presents employee onboarding as the launch workflow. It describes internal requests such as leave, expense and IT access, vendor intake for supplier evidence and procurement decisions, and education admissions for schools and coaching centres as expansion or controlled-pilot areas.",
  },
  {
    id: "features",
    priority: 15,
    questions: ["features", "what features does formiva have", "formiva features", "what can formiva do", "what capabilities does formiva have", "what tools does formiva include", "what is included in formiva", "what does the product include", "list formiva features"],
    answer: "Formiva's capabilities include guided forms, save/resume, conditional logic, file checks, structured intake, AI classification, evidence extraction, confidence signals, human review queues, rules, approvals, timers, team queues, integrations, notifications, record updates, confirmation and an audit trail.",
    action: { label: "Explore Features", href: "/features" },
  },
  {
    id: "technical-foundations",
    priority: 14,
    questions: ["how is formiva built", "what is the technical architecture", "what are formiva technical foundations", "what are product docs", "how do integrations work", "what technology does formiva use", "how does the formiva system work technically"],
    answer: "The product docs describe a Vercel frontend, protected API, durable jobs, a private AI Engine, codeless workflow execution and safe integrations. They also mention CPU-only OCR, classification, extraction, confidence components, versioned evidence, idempotency, retries, dead letters, provider status lookup, redaction and auditable replay.",
    action: { label: "Read Product Docs", href: "/resources/product-docs" },
  },
  {
    id: "trust-security",
    priority: 15,
    questions: ["is formiva secure", "how does formiva handle security", "what about privacy", "does formiva have audit logs", "does formiva have human controls", "how does formiva handle sensitive information", "does formiva have tenant isolation", "what is formiva trust and security"],
    answer: "The site describes bounded AI, human review, tenant isolation, durable jobs, private services, auditability, retention and safe recovery. Sensitive actions default to human or deterministic authorization. The site also states that architecture alone is not a compliance certification.",
    action: { label: "Trust & Security", href: "/resources/trust-security" },
  },
  {
    id: "pricing",
    priority: 15,
    questions: ["pricing", "how much does formiva cost", "what is formiva pricing", "does formiva have a free plan", "is formiva free", "what is starter", "what is vertical pro", "what is governance", "how much is vertical pro", "do I need a credit card", "can I pay annually"],
    answer: "Starter is $0 forever with 1 active workflow, sandbox sample data and community support. Vertical Pro is $299/month with unlimited workflows, AI classification and review, outcome analytics and priority implementation support; annual terms require contacting the team. Governance is custom-priced with SSO and tenant isolation, custom retention and audit controls, and a dedicated implementation partner. No credit card is required for Starter.",
    action: { label: "View Pricing", href: "/pricing" },
  },
  {
    id: "contact",
    priority: 15,
    questions: ["talk to the team", "can I get a demo", "how do I contact formiva", "how do I start", "can I run a pilot", "how do I start a pilot", "how do I talk to the team", "can formiva help with my workflow", "how do I get started"],
    answer: "Yes. The Formiva team invites you to bring a recurring, document-heavy workflow and discuss the first version or pilot.",
    action: { label: "Talk to Formiva", href: "/company/contact" },
  },
  {
    id: "navigation-caseflow",
    priority: 17,
    questions: ["where can I learn about caseflow"],
    answer: "CaseFlow is the durable object at the centre of Formiva. The product page explains how each submission becomes a case.",
    action: { label: "Explore CaseFlow", href: "/product/caseflow" },
  },
  {
    id: "navigation-features",
    priority: 17,
    questions: ["where are the features"],
    answer: "The Features page explains the capabilities Formiva uses to move a case from intake to a provable next step.",
    action: { label: "Explore Features", href: "/features" },
  },
  {
    id: "navigation-pricing",
    priority: 17,
    questions: ["where is pricing"],
    answer: "The Pricing page lists the current Starter, Vertical Pro and Governance options.",
    action: { label: "View Pricing", href: "/pricing" },
  },
  {
    id: "navigation-docs",
    priority: 17,
    questions: ["where can I read product docs"],
    answer: "The Product Docs page covers the technical foundation behind Formiva CaseFlow.",
    action: { label: "Read Product Docs", href: "/resources/product-docs" },
  },
  {
    id: "navigation-trust",
    priority: 17,
    questions: ["where can I find trust and security"],
    answer: "The Trust & Security page explains Formiva's bounded AI, human review and operational control concepts.",
    action: { label: "Trust & Security", href: "/resources/trust-security" },
  },
  {
    id: "navigation-onboarding",
    priority: 17,
    questions: ["where can I learn about onboarding"],
    answer: "The Employee Onboarding page describes Formiva's launch workflow for collecting, reviewing and approving new-hire evidence.",
    action: { label: "Explore Employee Onboarding", href: "/solutions/employee-onboarding" },
  },
  {
    id: "navigation-contact",
    priority: 17,
    questions: ["where can I contact you"],
    answer: "The Talk to us page is the place to discuss a product question, pilot or partnership conversation.",
    action: { label: "Talk to Formiva", href: "/company/contact" },
  },
  {
    id: "company",
    priority: 13,
    questions: ["who is behind formiva", "who built formiva", "what is vishyx techie", "who are you backed by", "tell me about the company"],
    answer: "Formiva is the product expression of Vishyx Techie's belief that software should remove coordination tax rather than add another screen to manage.",
  },
  {
    id: "comparison",
    priority: 18,
    questions: ["is formiva better than", "formiva vs zapier", "formiva vs google forms", "formiva vs airtable", "formiva vs jira", "who are formiva competitors"],
    answer: "I can explain what Formiva does, but I don't have enough verified information on competitors or comparative benchmarks to make a fair comparison.",
  },
  {
    id: "personal",
    priority: 18,
    questions: ["are you human", "are you real", "do you have feelings", "where do you live", "what is your favorite food"],
    answer: "I'm Inji, a website assistant for Formiva. I'm here to help you explore the product and website.",
  },
];

function normalizeQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bhow's\b/g, "how is")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bdon't\b/g, "do not")
    .replace(/case\s+flow/g, "caseflow")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreQuestion(input: string, candidate: string, priority: number) {
  if (input === candidate) return 100000 + priority * 1000 + candidate.length;
  if (candidate.length >= 4 && input.includes(candidate)) return 70000 + priority * 1000 + candidate.length;

  const inputTokens = new Set(input.split(" "));
  const candidateTokens = candidate.split(" ");
  const matchedTokens = candidateTokens.filter((token) => inputTokens.has(token)).length;
  if (matchedTokens === candidateTokens.length) return 50000 + priority * 1000 + candidate.length;

  const overlap = matchedTokens / candidateTokens.length;
  if (candidateTokens.length > 1 && overlap >= .75) return 30000 + priority * 1000 + Math.round(overlap * 1000);
  return 0;
}

export function getInjiResponse(question: string): InjiKnowledgeItem {
  const normalized = normalizeQuestion(question);
  let bestMatch: InjiKnowledgeItem | undefined;
  let bestScore = 0;

  for (const item of injiKnowledge) {
    for (const candidate of item.questions) {
      const score = scoreQuestion(normalized, normalizeQuestion(candidate), item.priority);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }
  }

  return bestMatch ?? { id: "fallback", questions: [], answer: INJI_FALLBACK_ANSWER, priority: 0 };
}
