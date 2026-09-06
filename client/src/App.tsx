import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  Cloud,
  Code2,
  Command,
  FileCheck2,
  FileText,
  Fingerprint,
  GraduationCap,
  Headphones,
  HeartPulse,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Menu,
  MousePointer2,
  Network,
  Play,
  Plus,
  Quote,
  Route as RouteIcon,
  Scale,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  TimerReset,
  UserRound,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import InjiAI from "./components/InjiAI";

const iconMap = {
  company: Building2,
  product: Workflow,
  solutions: Layers3,
  resources: BookOpen,
};

type IconName = keyof typeof iconMap;

type MenuItem = {
  label: string;
  href: string;
  eyebrow: string;
  description: string;
  icon: keyof typeof iconMap | "users" | "briefcase" | "mail" | "file" | "spark" | "book" | "shield" | "headset" | "heart" | "school" | "scale" | "code2";
};

const menuGroups: Record<IconName, { label: string; intro: string; items: MenuItem[] }> = {
  company: {
    label: "Company",
    intro: "The team and point of view behind a calmer way to run operations.",
    items: [
      { label: "Who we are", href: "/company/who-we-are", eyebrow: "01 / Perspective", description: "Meet Vishyx Techie and the operating philosophy behind Formiva.", icon: "company" },
      { label: "What we do", href: "/company/what-we-do", eyebrow: "02 / Mission", description: "We turn intake, evidence and approvals into a reliable operating layer.", icon: "spark" },
      { label: "Careers", href: "/company/careers", eyebrow: "03 / Join us", description: "Build systems that remove friction from the work people actually do.", icon: "briefcase" },
      { label: "Talk to us", href: "/company/contact", eyebrow: "04 / Contact", description: "Bring us the workflow that is slowing your team down.", icon: "mail" },
    ],
  },
  product: {
    label: "Product",
    intro: "The product boundary is deliberately narrow: a case, a safe decision and a provable outcome.",
    items: [
      { label: "CaseFlow Platform", href: "/product/caseflow", eyebrow: "01 / Core product", description: "Every submission becomes a durable case with context, evidence and history.", icon: "product" },
      { label: "Launch Workflow", href: "/product/launch-workflow", eyebrow: "02 / First pack", description: "The opinionated employee-onboarding flow Formiva launches with.", icon: "file" },
      { label: "Technical Foundations", href: "/resources/product-docs", eyebrow: "03 / Architecture", description: "AI Engine, review queues, codeless workflows and integration safety.", icon: "code2" },
      { label: "Features", href: "/features", eyebrow: "04 / Capabilities", description: "The bounded capabilities that make intake-to-outcome work.", icon: "spark" },
    ],
  },
  solutions: {
    label: "Solutions",
    intro: "A focused launch wedge, then evidence-led expansion into adjacent workflows.",
    items: [
      { label: "Employee Onboarding", href: "/solutions/employee-onboarding", eyebrow: "01 / Launch wedge", description: "Collect documents, review exceptions and move new hires to ready.", icon: "users" },
      { label: "Internal Requests", href: "/solutions/internal-requests", eyebrow: "02 / Expansion", description: "Leave, expense and IT access flows for the same customers.", icon: "solutions" },
      { label: "Vendor Intake", href: "/solutions/vendor-intake", eyebrow: "03 / Gated pack", description: "Supplier evidence and procurement decisions with a durable case.", icon: "briefcase" },
      { label: "Education Admissions", href: "/solutions/education-admissions", eyebrow: "04 / Pilot pack", description: "A time-boxed expansion for schools and coaching centres.", icon: "school" },
    ],
  },
  resources: {
    label: "Resources",
    intro: "The practical material behind a trustworthy intake-to-outcome product.",
    items: [
      { label: "Launch Playbooks", href: "/resources/playbooks", eyebrow: "01 / Go live", description: "Map the workflow, baseline the manual work and design the pilot.", icon: "book" },
      { label: "Product Docs", href: "/resources/product-docs", eyebrow: "02 / System", description: "CaseFlow, AI routing, codeless workflows and integration behavior.", icon: "file" },
      { label: "Pilot Briefs", href: "/resources/pilot-briefs", eyebrow: "03 / Share", description: "A concise, honest way to explain the first customer engagement.", icon: "spark" },
      { label: "Trust & Security", href: "/resources/trust-security", eyebrow: "04 / Control", description: "AI boundaries, auditability, privacy gates and operational safeguards.", icon: "shield" },
    ],
  },
};

const standaloneNav = [
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Features", href: "/features" },
];

const iconFor = (name: MenuItem["icon"]) => {
  const icons: Record<string, ElementType> = {
    company: Building2,
    product: Workflow,
    solutions: Layers3,
    resources: BookOpen,
    users: UsersRound,
    briefcase: BriefcaseBusiness,
    mail: Mail,
    file: FileText,
    spark: Sparkles,
    book: BookOpen,
    shield: ShieldCheck,
    headset: Headphones,
    heart: HeartPulse,
    school: GraduationCap,
    scale: Scale,
    code2: Code2,
    quote: Quote,
  };
  return icons[name] || Sparkles;
};

function useSeo(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);
  }, [title, description]);
}

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Formiva home">
      <span className="logo-mark"><span /><span /><span /></span>
      <span>formiva<span className="logo-dot">.</span></span>
    </Link>
  );
}

function ButtonLink({ href, children, variant = "primary", icon = true }: { href: string; children: ReactNode; variant?: "primary" | "ghost" | "dark"; icon?: boolean }) {
  return <Link href={href} className={`button button-${variant}`}>{children}{icon && <ArrowUpRight size={16} strokeWidth={2.2} />}</Link>;
}

function routeIsActive(current: string, href: string) {
  if (href === "/") return current === "/";
  return current === href || current.startsWith(`${href}/`);
}

function MegaMenu({ group, open, onToggle }: { group: IconName; open: boolean; onToggle: () => void }) {
  const data = menuGroups[group];
  const Icon = iconMap[group];
  const [location] = useLocation();
  const groupActive = data.items.some((item) => routeIsActive(location, item.href));
  return (
    <div className="nav-menu-wrap" onMouseEnter={() => { if (!open) onToggle(); }}>
      <button className={`nav-trigger ${open ? "active" : ""} ${groupActive ? "current" : ""}`} onClick={onToggle} aria-expanded={open}>
        <Icon size={15} /> {data.label} <ChevronDown size={14} className={open ? "rotate" : ""} />
      </button>
      {open && (
        <div className={`mega-menu mega-${group}`}>
          <div className="mega-aside">
            <span className="menu-kicker"><span className="live-dot" /> Formiva / {group}</span>
            <h3>{data.label}<br /><em>in motion.</em></h3>
            <p>{data.intro}</p>
            <Link href={`/${group}`} className="menu-aside-link">Explore {data.label} <ArrowRight size={15} /></Link>
          </div>
          <div className="mega-grid">
            {data.items.map((item) => {
              const ItemIcon = iconFor(item.icon);
              return <Link href={item.href} className={`mega-item ${routeIsActive(location, item.href) ? "current" : ""}`} key={item.label} onClick={onToggle}>
                <span className="mega-icon"><ItemIcon size={18} /></span>
                <span className="mega-copy"><small>{item.eyebrow}</small><strong>{item.label}</strong><span>{item.description}</span></span>
                <ArrowUpRight className="mega-arrow" size={15} />
              </Link>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState<IconName | null>(null);
  const [mobile, setMobile] = useState(false);
  const [location] = useLocation();
  useEffect(() => {
    setOpen(null);
    setMobile(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return <header className="site-header">
    <div className="nav-shell">
      <Logo />
      <nav className="desktop-nav" onMouseLeave={() => setOpen(null)}>
        {(Object.keys(menuGroups) as IconName[]).map((key) => <MegaMenu key={key} group={key} open={open === key} onToggle={() => setOpen(open === key ? null : key)} />)}
        <span className="nav-divider" />
        {standaloneNav.map((item) => <Link key={item.href} href={item.href} className={`nav-link ${routeIsActive(location, item.href) ? "current" : ""}`}>{item.label}</Link>)}
      </nav>
      <div className="nav-actions">
        <Link href="/login" className="login-link">Log in</Link>
        <ButtonLink href="/signup" icon={false}>Start free <ArrowUpRight size={16} /></ButtonLink>
      </div>
      <button className="mobile-toggle" onClick={() => setMobile(!mobile)} aria-label="Toggle menu">{mobile ? <X /> : <Menu />}</button>
    </div>
    {mobile && <div className="mobile-menu">
      {(Object.keys(menuGroups) as IconName[]).map((key) => <div key={key} className={`mobile-group ${menuGroups[key].items.some((item) => routeIsActive(location, item.href)) ? "current" : ""}`}><div className="mobile-group-label">{menuGroups[key].label}</div>{menuGroups[key].items.map((item) => <Link href={item.href} className={routeIsActive(location, item.href) ? "current" : ""} key={item.href}>{item.label}<ArrowUpRight size={15} /></Link>)}</div>)}
      {standaloneNav.map((item) => <Link href={item.href} className={`mobile-standalone ${routeIsActive(location, item.href) ? "current" : ""}`} key={item.href}>{item.label}<ArrowUpRight size={15} /></Link>)}
      <ButtonLink href="/signup">Start free</ButtonLink>
    </div>}
  </header>;
}

function Footer() {
  const [location] = useLocation();
  return <footer className="site-footer">
    <div className="footer-cta reveal"><div><span className="eyebrow">Ready when your process is</span><h2>Make the hard work<br /><em>move itself.</em></h2></div><ButtonLink href="/signup">Start building free</ButtonLink></div>
    <div className="footer-main">
      <div className="footer-brand"><Logo /><p>Intake-to-outcome automation for teams who need work to move—with proof.</p><span className="footer-company">A Vishyx Techie product</span></div>
      <div className="footer-columns">
        {(Object.keys(menuGroups) as IconName[]).map((key) => <div key={key}><h4>{menuGroups[key].label}</h4>{menuGroups[key].items.map((item) => <Link className={routeIsActive(location, item.href) ? "current" : ""} key={item.href} href={item.href}>{item.label}</Link>)}</div>)}
      </div>
    </div>
    <div className="footer-bottom"><span>© 2026 Vishyx Techie. Formiva is a product of Vishyx Techie.</span><div><Link href="/legal/privacy">Privacy Policy</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/security">Quality & Security</Link><button>Manage cookies</button></div></div>
  </footer>;
}

function SiteShell({ children }: { children: ReactNode }) {
  useReveal();
  return <><Header /><main>{children}</main><Footer /><InjiAI /></>;
}

function SectionLabel({ children }: { children: ReactNode }) { return <span className="eyebrow"><span className="eyebrow-line" />{children}</span>; }

function WorkflowVisual() {
  return <div className="workflow-visual reveal">
    <div className="visual-top"><span className="window-dots"><i /><i /><i /></span><span className="visual-label">CASEFLOW / LIVE RUN</span><span className="visual-status"><span />All systems clear</span></div>
    <div className="visual-body">
      <div className="visual-rail"><span className="rail-active"><Workflow size={15} /></span><span><Layers3 size={15} /></span><span><BarChart3 size={15} /></span><span><Settings2 size={15} /></span></div>
      <div className="workflow-canvas">
        <div className="canvas-title"><div><small>Employee onboarding / #1048</small><strong>Case flow</strong></div><span className="pill-live">● Running</span></div>
        <div className="flow-line line-one" /><div className="flow-line line-two" /><div className="flow-line line-three" />
        <div className="flow-node node-trigger"><span className="node-icon node-lime"><MousePointer2 size={14} /></span><div><small>TRIGGER</small><b>New submission</b></div><Check size={15} className="node-check" /></div>
        <div className="flow-node node-ai"><span className="node-icon node-violet"><Bot size={14} /></span><div><small>AI ENGINE</small><b>Classify documents</b></div><span className="confidence">98.4%</span></div>
        <div className="flow-node node-review"><span className="node-icon node-amber"><ClipboardCheck size={14} /></span><div><small>POLICY CHECK</small><b>Route to HR review</b></div><span className="node-time">2m ago</span></div>
        <div className="flow-node node-done"><span className="node-icon node-blue"><Send size={14} /></span><div><small>ACTION</small><b>Notify + update record</b></div><Check size={15} className="node-check" /></div>
        <span className="canvas-cursor cursor-a">+</span><span className="canvas-cursor cursor-b">+</span>
      </div>
      <div className="visual-insight"><small>FLOW HEALTH</small><strong>94.8%</strong><span className="spark-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/></span><small>successful outcomes</small><div className="insight-divider" /><small>TIME SAVED</small><strong>18.6 hrs</strong><small>this week</small></div>
    </div>
    <div className="visual-bottom"><span><span className="tiny-dot" /> 4 steps active</span><span>Last run 00:02:14</span><span>v1.8.2 <ArrowUpRight size={13} /></span></div>
  </div>;
}

function Home() {
  useSeo(
    "Formiva — Intake-to-Outcome Automation",
    "Formiva turns intake, evidence, decisions and integrations into one accountable case flow. AI classifies first, your team keeps the final word.",
  );
  return <SiteShell>
    <section className="hero section-pad">
      <div className="hero-grid" />
      <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
      <div className="hero-content container-wide">
        <div className="hero-copy reveal"><div className="status-chip"><span /> AI-assisted intake, built for real work</div><h1>Turn every<br /><span>request</span> into<br />an outcome.</h1><p>Formiva is the intake-to-outcome operating layer for teams that are done chasing documents, approvals, and updates across five different tools.</p><div className="hero-actions"><ButtonLink href="/signup">Start building free</ButtonLink><Link href="/product/formiva" className="text-link"><span className="play-circle"><Play size={12} fill="currentColor" /></span> See how CaseFlow works</Link></div><div className="hero-proof"><div className="proof-stack"><span>H</span><span>R</span><span>O</span><span>+</span></div><span>Built for the people<br /><b>who keep work moving.</b></span></div></div>
        <WorkflowVisual />
      </div>
      <div className="hero-ticker"><span>FORMIVA / SYSTEMS THAT FLOW</span><span>AI-ASSISTED</span><span>HUMAN-APPROVED</span><span>FULLY AUDITABLE</span><span>FORMIVA / SYSTEMS THAT FLOW</span></div>
    </section>
    <section className="problem-section section-pad container-wide"><div className="split-heading reveal"><SectionLabel>The real bottleneck</SectionLabel><h2>Your tools are<br /><em>connected.</em><br />Your work isn't.</h2><div><p>Forms collect. Spreadsheets track. Email reminds. But the moment a request becomes a real case—with documents, decisions, people and deadlines—everything fragments.</p><Link href="/product/formiva" className="arrow-link">See the CaseFlow difference <ArrowRight size={16} /></Link></div></div><div className="problem-grid reveal"><ProblemCard icon={<FileText />} title="The intake gap" copy="Information arrives incomplete, in the wrong format, or in the wrong place." number="01" /><ProblemCard icon={<TimerReset />} title="The handoff tax" copy="Teams spend the day forwarding, reminding, reconciling and asking for status." number="02" /><ProblemCard icon={<Fingerprint />} title="The proof problem" copy="When the work is done, nobody can answer exactly what happened—or why." number="03" /></div></section>
    <section className="platform-section section-pad"><div className="container-wide"><div className="section-heading centered reveal"><SectionLabel>One operating layer</SectionLabel><h2>From <em>intake</em> to outcome,<br />without the black box.</h2><p>Formiva brings structured intake, AI evidence, human judgment and downstream action into one visible flow.</p></div><div className="platform-grid reveal"><PlatformCard num="01" icon={<FileCheck2 />} title="Collect cleanly" copy="Guided forms, save-and-resume, file checks and the right context from the first click." /><PlatformCard num="02" icon={<Bot />} title="Classify first" copy="AI reads the signal, shows its evidence, and sends uncertainty to a human—not a dead end." accent="violet" /><PlatformCard num="03" icon={<RouteIcon />} title="Route with intent" copy="Rules, approvals, timers and team queues keep every case moving toward its outcome." accent="amber" /><PlatformCard num="04" icon={<Network />} title="Prove the result" copy="Integrations, confirmations and an audit trail make every action visible and accountable." accent="blue" /></div></div></section>
    <section className="ai-section section-pad container-wide"><div className="ai-copy reveal"><SectionLabel>The intelligent layer</SectionLabel><h2>AI handles the<br /><span>first read.</span><br />Your team keeps<br />the final word.</h2><p>Formiva's self-hosted AI Engine classifies documents and text, extracts evidence and scores confidence. High-confidence, low-risk cases flow forward. Everything uncertain becomes a clear, reviewable decision—not a silent automation.</p><ButtonLink href="/features">Explore the system</ButtonLink></div><div className="ai-panel reveal"><div className="ai-panel-head"><span className="ai-signal"><span /><span /><span /></span><span>AI ENGINE / PRIVATE RUNTIME</span><span className="panel-code">MODEL 1.8.2</span></div><div className="ai-document"><div className="doc-paper"><div className="doc-bar" /><div className="doc-line short" /><div className="doc-line" /><div className="doc-line medium" /><div className="doc-photo" /><div className="doc-line" /><div className="doc-line short" /></div><div className="scan-line" /><div className="evidence e-one"><span>01</span><b>Document type</b><strong>Identity proof</strong><i>98.4% confidence</i></div><div className="evidence e-two"><span>02</span><b>Evidence found</b><strong>3 verified fields</strong><i>Source: page 1</i></div><div className="evidence e-three"><span>03</span><b>Decision</b><strong className="text-lime">Auto-proceed</strong><i>Low risk / policy pass</i></div></div><div className="ai-footer"><span><Check size={14} /> Human override always available</span><span>Confidence is a signal, not a verdict.</span></div></div></section>
    <section className="solutions-section section-pad"><div className="container-wide"><div className="section-heading reveal"><SectionLabel>Focused launch, evidence-led expansion</SectionLabel><h2>Start with one workflow.<br /><em>Grow when the proof is there.</em></h2></div><div className="solution-list reveal"><SolutionRow index="01" title="Employee onboarding" copy="The launch workflow: documents, review, approvals and a ready-to-start hire." href="/solutions/employee-onboarding" icon={<UsersRound />} /><SolutionRow index="02" title="Internal requests" copy="Leave, expense and IT access flows for the same customer base." href="/solutions/internal-requests" icon={<Settings2 />} /><SolutionRow index="03" title="Vendor intake" copy="A gated expansion for supplier evidence and procurement decisions." href="/solutions/vendor-intake" icon={<BriefcaseBusiness />} /><SolutionRow index="04" title="Education admissions" copy="A time-boxed pilot pack for schools and coaching centres." href="/solutions/education-admissions" icon={<GraduationCap />} /></div></div></section>
    <section className="quote-section section-pad container-wide reveal"><div className="quote-mark">“</div><blockquote>Formiva is not another form builder. It is the moment the request stops being a message—and starts being a process.</blockquote><div className="quote-source"><span className="source-line" /> <span>Vishyx Techie / Product principle 01</span></div></section>
    <section className="final-cta section-pad"><div className="container-wide final-cta-inner reveal"><div><SectionLabel>Make work visible</SectionLabel><h2>Your next great<br /><em>workflow</em> starts here.</h2></div><div className="final-cta-side"><p>Build the first version free. Bring your hardest intake process. We’ll help you make it move.</p><ButtonLink href="/signup">Start with Formiva</ButtonLink><span>No credit card. No lock-in. Just a better first flow.</span></div></div></section>
  </SiteShell>;
}

function ProblemCard({ icon, title, copy, number }: { icon: ReactNode; title: string; copy: string; number: string }) { return <div className="problem-card"><span className="card-number">{number}</span><span className="problem-icon">{icon}</span><h3>{title}</h3><p>{copy}</p><ArrowDownRight className="problem-arrow" size={18} /></div>; }
function PlatformCard({ num, icon, title, copy, accent = "lime" }: { num: string; icon: ReactNode; title: string; copy: string; accent?: string }) { return <div className={`platform-card accent-${accent}`}><div className="platform-card-top"><span>{num}</span><span className="platform-icon">{icon}</span></div><h3>{title}</h3><p>{copy}</p><ArrowUpRight className="platform-arrow" size={17} /></div>; }
function SolutionRow({ index, title, copy, href, icon }: { index: string; title: string; copy: string; href: string; icon: ReactNode }) { return <Link href={href} className="solution-row"><span className="solution-index">{index}</span><span className="solution-icon">{icon}</span><span className="solution-copy"><strong>{title}</strong><span>{copy}</span></span><ArrowUpRight className="solution-arrow" size={20} /></Link>; }

const pageData: Record<string, { kicker: string; title: ReactNode; intro: string; icon: ReactNode; stats?: { label: string; value: string }[]; cards: { title: string; copy: string; icon: ReactNode }[]; cta: string }> = {
  "/company": { kicker: "Vishyx Techie / Company", title: <>We build the<br /><em>missing layer</em><br />between intent and action.</>, intro: "Formiva is the product expression of Vishyx Techie's belief that software should remove coordination tax—not add another screen to manage.", icon: <Building2 />, stats: [{ label: "Built from", value: "India → everywhere" }, { label: "Product focus", value: "Operational clarity" }, { label: "Default mode", value: "Human-approved" }], cards: [{ title: "Who we are", copy: "A product-minded team building calm, accountable systems for busy operators.", icon: <UsersRound /> }, { title: "What we do", copy: "We turn fragmented intake and follow-up into a visible path to done.", icon: <Workflow /> }, { title: "Why now", copy: "Teams have more tools than ever—and less shared context between them.", icon: <Zap /> }], cta: "Meet the thinking behind Formiva" },
  "/company/who-we-are": { kicker: "Company / Perspective", title: <>Software should make<br />the <em>next step</em> obvious.</>, intro: "Vishyx Techie is a product studio focused on useful, trustworthy automation. Formiva is our operating thesis made tangible.", icon: <UsersRound />, cards: [{ title: "Clarity over complexity", copy: "A workflow should feel easier after automation—not like a new system to babysit.", icon: <Sparkles /> }, { title: "Proof over promises", copy: "Every action should be explainable, reviewable and easy to trace.", icon: <ShieldCheck /> }, { title: "People stay in control", copy: "AI accelerates the first read. Humans own the decisions that matter.", icon: <Fingerprint /> }], cta: "See what we are building" },
  "/company/what-we-do": { kicker: "Company / Mission", title: <>We make the<br /><em>hard work</em><br />move.</>, intro: "From a first document to a final confirmation, we design the connective tissue that makes operations feel intentional.", icon: <Command />, cards: [{ title: "Research the friction", copy: "We begin with the workflow as it really exists: email, spreadsheets, reminders, exceptions.", icon: <MousePointer2 /> }, { title: "Model the case", copy: "We turn a request into a structured object with owners, evidence, decisions and history.", icon: <Layers3 /> }, { title: "Ship the outcome", copy: "We connect the approved result to the systems your team already trusts.", icon: <ArrowUpRight /> }], cta: "Explore the Formiva product" },
  "/company/careers": { kicker: "Company / Careers", title: <>Build software that<br /><em>respects attention.</em></>, intro: "We are looking for builders who care about the details between the buttons—the edge cases, the trust, and the outcome.", icon: <BriefcaseBusiness />, cards: [{ title: "Product engineers", copy: "Make a complicated workflow feel like a clear next step.", icon: <Code2 /> }, { title: "Systems thinkers", copy: "See the handoffs, constraints and incentives behind every process.", icon: <Network /> }, { title: "Customer voices", copy: "Stay close to operators and turn their friction into product clarity.", icon: <Headphones /> }], cta: "Talk to us about joining" },
  "/company/contact": { kicker: "Company / Talk to us", title: <>Bring us the workflow<br />that keeps saying <em>“follow up.”</em></>, intro: "Tell us what your team is collecting, checking, routing or chasing. We’ll help you see the first Formiva workflow.", icon: <Mail />, cards: [{ title: "For product questions", copy: "Understand the CaseFlow model and where it fits.", icon: <CircleHelp /> }, { title: "For a pilot", copy: "Bring one recurring, document-heavy process and a real team.", icon: <Play /> }, { title: "For partnerships", copy: "Connect Formiva to the ecosystems your customers already use.", icon: <Network /> }], cta: "Start a conversation" },
  "/product": { kicker: "Product / Formiva", title: <>The operating layer<br />for work that starts<br />with a <em>request.</em></>, intro: "Formiva turns forms, documents, decisions and integrations into one accountable case flow—without asking your team to become workflow engineers.", icon: <Workflow />, stats: [{ label: "Core object", value: "The case" }, { label: "AI mode", value: "Evidence-first" }, { label: "Outcome", value: "Visible + auditable" }], cards: [{ title: "Intake", copy: "Collect complete, structured information with a guided experience.", icon: <FileText /> }, { title: "Intelligence", copy: "Let the private AI Engine classify first and explain what it found.", icon: <Bot /> }, { title: "Orchestration", copy: "Route, approve, notify and update records through a codeless flow.", icon: <RouteIcon /> }, { title: "Proof", copy: "Know what happened, who decided and where the work stands.", icon: <BadgeCheck /> }], cta: "See the product in motion" },
  "/product/formiva": { kicker: "Product / CaseFlow", title: <>One case. Every<br /><em>next step.</em></>, intro: "A Formiva case carries the schema, documents, validation, human review, approvals, SLA, integrations and history needed to get from intake to outcome.", icon: <Workflow />, cards: [{ title: "Collect", copy: "Guided forms, save/resume and file-safe intake.", icon: <FileCheck2 /> }, { title: "Classify", copy: "Self-hosted AI reads the first signal and routes uncertainty to review.", icon: <Bot /> }, { title: "Coordinate", copy: "Codeless nodes turn policy into a repeatable team process.", icon: <Network /> }, { title: "Confirm", copy: "Every completed action leaves a clear, exportable trail.", icon: <Check /> }], cta: "Build your first case flow" },
  "/product/templates": { kicker: "Product / Templates", title: <>Start with a workflow<br />that already knows<br />the <em>shape of done.</em></>, intro: "Templates are not blank forms. They are opinionated starting points with roles, document classes, checks, approvals and outcomes already mapped.", icon: <FileText />, cards: [{ title: "Employee onboarding", copy: "Collect the right documents, check completeness and route to HR.", icon: <UsersRound /> }, { title: "Vendor intake", copy: "Capture supplier evidence and move procurement toward approval.", icon: <BriefcaseBusiness /> }, { title: "Service requests", copy: "Give internal and external requests an owner, priority and SLA.", icon: <Headphones /> }, { title: "Custom CaseFlow", copy: "Bring your process. We’ll help model the first version.", icon: <Plus /> }], cta: "Explore templates" },
  "/product/caseflow": { kicker: "Product / CaseFlow", title: <>Every submission<br />becomes a <em>case.</em></>, intro: "CaseFlow is the durable object at the centre of Formiva. It carries the form version, documents, validation, AI evidence, ownership, approvals, integrations, confirmation and audit history from first intake to close.", icon: <Workflow />, stats: [{ label: "Core object", value: "Case + timeline" }, { label: "Decision model", value: "AI + policy + human" }, { label: "Proof", value: "Immutable history" }], cards: [{ title: "Structured intake", copy: "Versioned forms, save/resume, conditional logic and mobile-ready public links.", icon: <FileText /> }, { title: "Evidence-first AI", copy: "Classification, extraction, confidence and source evidence without treating model output as a command.", icon: <Bot /> }, { title: "Policy-aware routing", copy: "High-confidence, low-risk paths can proceed; sensitive, conflicting or uncertain paths go to review.", icon: <RouteIcon /> }, { title: "Outcome record", copy: "Authorised actions, notifications, record updates and confirmation remain connected to the case.", icon: <BadgeCheck /> }], cta: "See the launch workflow" },
  "/product/launch-workflow": { kicker: "Product / Launch workflow", title: <>The first workflow<br />is <em>employee onboarding.</em></>, intro: "Formiva starts with Indian IT and professional-services firms with 10–100 employees, recurring hiring and a named HR or operations owner. This is the product, not just a template.", icon: <UsersRound />, stats: [{ label: "Beachhead", value: "India-first SMB" }, { label: "Primary buyer", value: "HR / Ops owner" }, { label: "First outcome", value: "Ready-to-start hire" }], cards: [{ title: "New hire link", copy: "The respondent completes a guided intake, saves progress and uploads the required evidence.", icon: <Send /> }, { title: "Document completeness", copy: "File safety, required-document checks and AI classification surface the missing pieces.", icon: <FileCheck2 /> }, { title: "Human review queue", copy: "HR sees evidence, reason codes, confidence and the exact next decision—not a black box.", icon: <ClipboardCheck /> }, { title: "Ready confirmation", copy: "After approval, Formiva notifies the right team, updates authorised records and produces a confirmation.", icon: <Check /> }], cta: "Start a design-partner pilot" },
  "/solutions/employee-onboarding": { kicker: "Solutions / Employee onboarding", title: <>Onboard people,<br />not <em>paperwork.</em></>, intro: "The Formiva launch workflow for Indian IT and professional-services firms: one guided intake, one accountable case and a clear path to ready.", icon: <UsersRound />, cards: [{ title: "Collect once", copy: "Give a new hire a clear, mobile-friendly link for forms and required documents.", icon: <FileCheck2 /> }, { title: "Classify first", copy: "The private AI Engine identifies document classes, extracts evidence and records confidence.", icon: <Bot /> }, { title: "Review exceptions", copy: "Low confidence, sensitive documents and policy conflicts go to a human review queue.", icon: <ClipboardCheck /> }, { title: "Route to ready", copy: "Approval triggers the allowed notifications, team routes, record updates and confirmation.", icon: <ArrowRight /> }], cta: "Build the onboarding pilot" },
  "/solutions/internal-requests": { kicker: "Solutions / Same-customer expansion", title: <>Make the next<br /><em>internal request</em><br />easy to finish.</>, intro: "After onboarding proves repeatable, Formiva can expand into leave, expense and IT access requests for the same customers—reusing the same CaseFlow primitives.", icon: <Settings2 />, cards: [{ title: "Leave requests", copy: "Collect context, apply policy checks and route to the right approver.", icon: <TimerReset /> }, { title: "Expense review", copy: "Capture evidence, classify receipts and keep the approval decision visible.", icon: <Scale /> }, { title: "IT access", copy: "Make access requests explicit, time-bound and safe to authorize.", icon: <LockKeyhole /> }], cta: "Discuss a second workflow" },
  "/solutions/vendor-intake": { kicker: "Solutions / Gated expansion", title: <>Supplier onboarding<br />with <em>evidence attached.</em></>, intro: "Vendor and procurement intake is a later expansion pack, opened only after document controls and accounting-connector demand are proven in the launch customer base.", icon: <BriefcaseBusiness />, cards: [{ title: "Evidence collection", copy: "Collect supplier documents and structured details through a guided request.", icon: <FileText /> }, { title: "Controlled review", copy: "Use AI classification as a review aid while policy and authorised people control the decision.", icon: <ShieldCheck /> }, { title: "Accounting handoff", copy: "Connect approved records only after field mapping, idempotency and status checks are ready.", icon: <Network /> }], cta: "Explore the expansion gate" },
  "/solutions/education-admissions": { kicker: "Solutions / Pilot pack", title: <>Admissions that feel<br />like a <em>welcome.</em></>, intro: "Education is a gated expansion pack for schools and coaching centres—not a launch promise. Formiva brings the same intake, evidence, review and approval primitives to a carefully scoped pilot.", icon: <GraduationCap />, cards: [{ title: "Family-friendly intake", copy: "Clear instructions, save/resume and mobile-ready forms for applicants and families.", icon: <UsersRound /> }, { title: "Review queues", copy: "Keep missing evidence and exceptions visible to the right reviewer.", icon: <ClipboardCheck /> }, { title: "Decision trail", copy: "Keep approvals, communications and the final outcome connected in one case.", icon: <BadgeCheck /> }], cta: "Discuss a time-boxed pilot" },
  "/resources/playbooks": { kicker: "Resources / Launch playbooks", title: <>Start with the<br /><em>workflow</em>, not the logo.</>, intro: "Formiva launches through a specific operational diagnosis, implementation-assisted pilot and workflow-specific proof—not a generic form-builder pitch.", icon: <BookOpen />, cards: [{ title: "Interview the owner", copy: "Map the current email, spreadsheet, reminder and exception path with the HR or operations owner.", icon: <UsersRound /> }, { title: "Baseline the work", copy: "Measure completion time, first-pass completeness, rework and support effort before automation.", icon: <BarChart3 /> }, { title: "Pilot one case flow", copy: "Use synthetic or redacted documents first, then move to sensitive data only after the trust gate passes.", icon: <Play /> }, { title: "Prove the change", copy: "Document time-to-completion and the next workflow demand before expanding.", icon: <BadgeCheck /> }], cta: "Plan the first pilot" },
  "/resources/product-docs": { kicker: "Resources / Product docs", title: <>See the system<br />behind the <em>surface.</em></>, intro: "The technical foundation behind Formiva CaseFlow: Vercel frontend, protected API, durable jobs, private AI Engine, codeless workflow execution and safe integrations.", icon: <Code2 />, cards: [{ title: "AI Engine on OCI VM2", copy: "CPU-only OCR, classification, extraction, confidence components and versioned evidence.", icon: <Bot /> }, { title: "AI-first routing", copy: "High confidence alone is never enough. Deterministic low-risk checks and safe-mode policy decide whether automation proceeds.", icon: <RouteIcon /> }, { title: "Codeless workflows", copy: "Triggers, checks, AI results, review, approval, timer, notification, integration, record update and confirmation nodes.", icon: <Workflow /> }, { title: "Integration safety", copy: "Idempotency, retries, dead letters, provider status lookup, redaction and auditable replay.", icon: <ShieldCheck /> }], cta: "Read the technical baseline" },
  "/resources/pilot-briefs": { kicker: "Resources / Pilot briefs", title: <>A practical way to<br />start with <em>one process.</em></>, intro: "A Formiva pilot is time-boxed, measured and narrow. Bring one recurring workflow, one owner, representative redacted documents and a clear definition of done.", icon: <FileText />, cards: [{ title: "Who it is for", copy: "Indian IT or professional-services firms with 10–100 employees and recurring hiring.", icon: <Building2 /> }, { title: "What ships first", copy: "Onboarding intake, files, validation, review queue, approvals, email/webhook, audit and a small dashboard.", icon: <Workflow /> }, { title: "What we measure", copy: "Activation, first-pass completeness, cycle time, rework, support time and repeat workflow demand.", icon: <BarChart3 /> }], cta: "Request the pilot brief" },
  "/resources/trust-security": { kicker: "Resources / Trust & security", title: <>Trust is not a claim.<br />It is a <em>control path.</em></>, intro: "Formiva is designed around bounded AI, human review, tenant isolation, durable jobs, private services, auditability, retention and safe recovery. Architecture alone is not a compliance certification.", icon: <ShieldCheck />, cards: [{ title: "Sensitive by policy", copy: "Identity, payroll, bank, employment, health and other sensitive actions default to human or deterministic authorization.", icon: <LockKeyhole /> }, { title: "Evidence and versions", copy: "Store model/runtime versions, source evidence, policy versions, corrections and routing reasons.", icon: <Fingerprint /> }, { title: "Safe operations", copy: "Durable job rows, leases, retries, dead letters, idempotency and safe replay prevent silent loss.", icon: <Settings2 /> }, { title: "Launch gate", copy: "Before sensitive pilots: tenant isolation, restore, secret rotation, retention, incident and resource tests must pass.", icon: <BadgeCheck /> }], cta: "Talk through a controlled pilot" },
  "/solutions": { kicker: "Solutions / Use cases", title: <>Your work is<br /><em>specific.</em><br />Your operating layer can be too.</>, intro: "Choose the pressure point. Start narrow. Expand when the evidence says the next workflow is ready.", icon: <Layers3 />, cards: [{ title: "Operations", copy: "Move internal requests, procurement and vendor workflows.", icon: <Settings2 /> }, { title: "Customer support", copy: "Turn conversations into owned, measurable cases.", icon: <Headphones /> }, { title: "Human resources", copy: "Start with onboarding, documents and access requests.", icon: <UsersRound /> }, { title: "Hospitals & schools", copy: "Handle sensitive intake with human review and auditability.", icon: <HeartPulse /> }], cta: "Find your starting point" },
  "/solutions/operations": { kicker: "Solutions / Operations", title: <>Make every internal<br /><em>request</em> easier to finish.</>, intro: "Formiva gives operations teams a shared intake layer for the work that currently arrives through inboxes, chats and spreadsheets.", icon: <Settings2 />, cards: [{ title: "Vendor onboarding", copy: "Collect supplier evidence, validate it and route the decision.", icon: <BriefcaseBusiness /> }, { title: "Procurement approvals", copy: "Make spend requests visible from first submission to final sign-off.", icon: <Scale /> }, { title: "Facilities & IT", copy: "Give recurring internal requests a clear owner and timer.", icon: <Cloud /> }], cta: "Design an operations flow" },
  "/solutions/customer-support": { kicker: "Solutions / Customer Support", title: <>Every request deserves<br />a visible <em>owner.</em></>, intro: "Capture the context, classify the request, route it to the right team and keep the customer informed without manual status theatre.", icon: <Headphones />, cards: [{ title: "Structured intake", copy: "Ask the right questions before a ticket becomes a loop of clarification.", icon: <FileText /> }, { title: "Intelligent routing", copy: "Classify intent and urgency, then send the case where it can move.", icon: <RouteIcon /> }, { title: "Outcome visibility", copy: "Close the loop with confirmation and a complete history.", icon: <BadgeCheck /> }], cta: "See support workflows" },
  "/solutions/human-resources": { kicker: "Solutions / Human Resources", title: <>Onboard people,<br />not <em>paperwork.</em></>, intro: "Give new hires a calmer first experience and your HR team a complete, reviewable case from day one.", icon: <UsersRound />, cards: [{ title: "Collect once", copy: "A guided link gathers forms and documents without the follow-up spiral.", icon: <FileCheck2 /> }, { title: "Classify first", copy: "AI identifies document types and confidence before HR reviews exceptions.", icon: <Bot /> }, { title: "Route forward", copy: "Approval triggers the right updates, notifications and access steps.", icon: <ArrowRight /> }], cta: "Explore HR onboarding" },
  "/solutions/hospital-management": { kicker: "Solutions / Hospital Management", title: <>Care is human.<br />The coordination<br />can be <em>clearer.</em></>, intro: "For operational workflows around care, Formiva provides bounded automation, clear human review and strong audit visibility.", icon: <HeartPulse />, cards: [{ title: "Sensitive by design", copy: "Default to human review for sensitive documents and uncertain actions.", icon: <LockKeyhole /> }, { title: "Clear handoffs", copy: "Route requests between teams with explicit ownership and timers.", icon: <RouteIcon /> }, { title: "Proof of action", copy: "Keep the history of decisions, evidence and confirmations together.", icon: <ShieldCheck /> }], cta: "Discuss a controlled pilot" },
  "/solutions/school-management": { kicker: "Solutions / School Management", title: <>Admissions that feel<br />like a <em>welcome.</em></>, intro: "Make document collection, review and approvals easier for families and easier to manage for school teams.", icon: <GraduationCap />, cards: [{ title: "Family-friendly intake", copy: "Clear instructions, save/resume and mobile-ready forms.", icon: <UsersRound /> }, { title: "Review queues", copy: "Keep exceptions and missing evidence visible to the right reviewer.", icon: <ClipboardCheck /> }, { title: "Decision trails", copy: "Keep approvals and communication aligned from application to outcome.", icon: <BadgeCheck /> }], cta: "Explore admissions workflows" },
  "/solutions/approvals-management": { kicker: "Solutions / Approvals", title: <>Replace the<br />approval <em>black hole.</em></>, intro: "Design approval paths people can actually understand, complete and audit.", icon: <ShieldCheck />, cards: [{ title: "Policy-aware", copy: "Conditions, thresholds and required approvers are visible in the flow.", icon: <Scale /> }, { title: "Time-aware", copy: "Timers and escalations keep work moving without noisy reminders.", icon: <TimerReset /> }, { title: "Safe to change", copy: "Version, dry-run and roll back without rewriting history.", icon: <Command /> }], cta: "Build an approval flow" },
  "/resources": { kicker: "Resources / Library", title: <>Better workflows<br />start with better<br /><em>questions.</em></>, intro: "Read the thinking, see the product model and bring a sharper problem to your first Formiva conversation.", icon: <BookOpen />, cards: [{ title: "Guidelines", copy: "Patterns for trustworthy intake and outcome-driven automation.", icon: <BookOpen /> }, { title: "Docs", copy: "A clear path through the CaseFlow product model.", icon: <FileText /> }, { title: "Brochures", copy: "A shareable view of Formiva for your team.", icon: <Send /> }, { title: "Client testimonials", copy: "The language teams use when work starts moving.", icon: <Quote /> }], cta: "Explore the library" },
  "/resources/guidelines": { kicker: "Resources / Guidelines", title: <>Design workflows<br />that know when<br />to ask for <em>help.</em></>, intro: "Automation is not the absence of people. It is the clarity of the moments that need them.", icon: <BookOpen />, cards: [{ title: "Collect the context", copy: "Good routing begins with a complete, thoughtful intake.", icon: <FileText /> }, { title: "Show the evidence", copy: "AI should explain what it found and how confident it is.", icon: <Bot /> }, { title: "Keep the escape hatch", copy: "Human review is a product feature, not a failure state.", icon: <MousePointer2 /> }], cta: "Read the workflow guidelines" },
  "/resources/docs": { kicker: "Resources / Documentation", title: <>See the system<br />behind the <em>surface.</em></>, intro: "Understand cases, AI classification, codeless flows, integrations and the infrastructure that keeps it all accountable.", icon: <FileText />, cards: [{ title: "CaseFlow model", copy: "The case is the durable object that carries a process from start to close.", icon: <Workflow /> }, { title: "AI Engine", copy: "Private classification, evidence, confidence and human escalation.", icon: <Bot /> }, { title: "Connectors", copy: "Idempotent actions, safe retries and visible outcomes.", icon: <Network /> }], cta: "Open product documentation" },
  "/resources/brochures": { kicker: "Resources / Brochures", title: <>A clearer way to<br />explain what Formiva<br /><em>actually does.</em></>, intro: "Share the product story with the people who own the process, the system and the outcome.", icon: <FileText />, cards: [{ title: "Founder overview", copy: "Why Formiva, why now and where to begin.", icon: <Building2 /> }, { title: "Product snapshot", copy: "The platform in one useful page.", icon: <Workflow /> }, { title: "Pilot brief", copy: "A practical shape for the first customer workflow.", icon: <Play /> }], cta: "Request the pilot brief" },
  "/resources/testimonials": { kicker: "Resources / Client testimonials", title: <>The best proof is<br />work that <em>moves.</em></>, intro: "Formiva is being designed around measurable outcomes: fewer follow-ups, clearer ownership and faster completion.", icon: <Quote />, cards: [{ title: "“We finally saw the whole case.”", copy: "A future customer story about replacing scattered updates with one visible timeline.", icon: <Quote /> }, { title: "“The exceptions were obvious.”", copy: "A future customer story about AI that knows when to stop and ask for a person.", icon: <Quote /> }, { title: "“We shipped the second flow.”", copy: "A future customer story about expansion from onboarding into operations.", icon: <Quote /> }], cta: "Become a design partner" },
  "/blog": { kicker: "Formiva / Journal", title: <>Notes on the<br /><em>work between</em><br />the tools.</>, intro: "Ideas, field notes and practical patterns for people building calmer operations.", icon: <BookOpen />, cards: [{ title: "The intake-to-outcome thesis", copy: "Why forms are only the beginning of the product.", icon: <Workflow /> }, { title: "AI should classify first", copy: "The difference between evidence-first automation and black-box magic.", icon: <Bot /> }, { title: "The cost of the follow-up", copy: "How coordination tax hides in plain sight.", icon: <TimerReset /> }], cta: "Read the latest notes" },
  "/features": { kicker: "Product / Features", title: <>The parts that make<br />work feel <em>inevitable.</em></>, intro: "Every Formiva capability is designed around one outcome: getting a real case to a real, provable next step.", icon: <Sparkles />, cards: [{ title: "AI classification", copy: "Private, evidence-first document and text intelligence.", icon: <Bot /> }, { title: "Human review", copy: "Low confidence becomes a clear queue, not a silent failure.", icon: <ClipboardCheck /> }, { title: "Codeless workflows", copy: "Build policy-aware paths with visual nodes and safe versioning.", icon: <Workflow /> }, { title: "Integrations", copy: "Connect actions to the tools your teams already use.", icon: <Network /> }, { title: "Auditability", copy: "Every result, correction and external action stays visible.", icon: <ShieldCheck /> }, { title: "Outcome analytics", copy: "Measure completion, rework, time and bottlenecks.", icon: <BarChart3 /> }], cta: "See every feature" },
  "/pricing": { kicker: "Formiva / Pricing", title: <>Simple to start.<br /><em>Serious when ready.</em></>, intro: "Start with a focused workflow, prove the result and expand when the process earns it. Pricing is built around access to outcomes—not vanity volume.", icon: <Scale />, cards: [{ title: "Sandbox", copy: "Explore the CaseFlow model with sample data and one workflow.", icon: <Sparkles /> }, { title: "Starter", copy: "For small teams launching their first live onboarding flow.", icon: <Zap /> }, { title: "Vertical Pro", copy: "Multiple workflows, AI review, analytics and implementation support.", icon: <Workflow /> }, { title: "Governance", copy: "Controls, retention and support for growing operations.", icon: <ShieldCheck /> }], cta: "Talk through your workflow" },
};

type PricingTier = {
  name: string;
  price: string;
  period?: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  accent: "neutral" | "lime" | "violet";
};

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "For individuals and small teams exploring the CaseFlow model before going live.",
    features: ["1 active workflow", "Sandbox with sample data", "Community support"],
    cta: "Get started",
    href: "/signup",
    accent: "neutral",
  },
  {
    name: "Vertical Pro",
    price: "$299",
    period: "/month",
    badge: "Most popular",
    description: "For growing teams running live onboarding with AI review and analytics switched on.",
    features: ["Unlimited workflows", "AI classification & review queue", "Outcome analytics", "Priority implementation support"],
    cta: "Start free",
    href: "/signup",
    accent: "lime",
  },
  {
    name: "Governance",
    price: "Custom",
    description: "Tailored controls, retention and dedicated support for larger or regulated operations.",
    features: ["SSO & tenant isolation", "Custom retention & audit controls", "Dedicated implementation partner"],
    cta: "Contact sales",
    href: "/company/contact",
    accent: "violet",
  },
];

function PricingCards() {
  return (
    <div className="pricing-grid">
      {pricingTiers.map((tier) => (
        <div key={tier.name} className={`pricing-card accent-${tier.accent}`}>
          {tier.badge && <span className="pricing-badge">{tier.badge}</span>}
          <span className="pricing-name">{tier.name}</span>
          <div className="pricing-price">
            <strong>{tier.price}</strong>
            {tier.period && <small>{tier.period}</small>}
          </div>
          <p className="pricing-desc">{tier.description}</p>
          <ul className="pricing-features">
            {tier.features.map((feature) => (
              <li key={feature}><Check size={14} /> {feature}</li>
            ))}
          </ul>
          <ButtonLink href={tier.href} variant={tier.accent === "lime" ? "primary" : "ghost"} icon={false}>
            {tier.cta} <ArrowUpRight size={15} />
          </ButtonLink>
        </div>
      ))}
    </div>
  );
}

function PricingPage() {
  const data = pageData["/pricing"];
  useSeo(
    "Pricing | Formiva",
    "Simple to start, serious when ready. Formiva pricing is built around access to outcomes, not vanity volume.",
  );
  return (
    <SiteShell>
      <section className="inner-hero section-pad">
        <div className="hero-grid" />
        <div className="container-wide inner-hero-grid">
          <div className="inner-copy reveal">
            <SectionLabel>{data.kicker}</SectionLabel>
            <h1>{data.title}</h1>
            <p>{data.intro}</p>
          </div>
          <div className="inner-symbol reveal">
            <div className="symbol-orbit orbit-a" /><div className="symbol-orbit orbit-b" />
            <span className="symbol-core">{data.icon}</span>
            <span className="symbol-code">01 / CASEFLOW<br />SYSTEM READY</span>
            <span className="symbol-corner corner-t">FORMIVA<br />VISHYX TECHIE</span>
            <span className="symbol-corner corner-b">{data.kicker.split("/")[0]}</span>
          </div>
        </div>
      </section>
      <section className="pricing-section section-pad">
        <div className="container-wide">
          <PricingCards />
          <p className="pricing-footnote">No credit card required for Starter. Vertical Pro can be billed monthly or annually — talk to us for annual terms.</p>
        </div>
      </section>
      <section className="page-cta section-pad">
        <div className="container-wide page-cta-inner reveal">
          <div><SectionLabel>Next step</SectionLabel><h2>{data.cta}</h2></div>
          <ButtonLink href="/company/contact">Talk to the team</ButtonLink>
        </div>
      </section>
    </SiteShell>
  );
}

function ContentPage({ data }: { data: NonNullable<typeof pageData[string]> }) {
  const pageName = data.kicker.split("/").pop()?.trim() || data.kicker;
  useSeo(`${pageName} | Formiva`, data.intro);
  return <SiteShell><section className="inner-hero section-pad"><div className="hero-grid" /><div className="container-wide inner-hero-grid"><div className="inner-copy reveal"><SectionLabel>{data.kicker}</SectionLabel><h1>{data.title}</h1><p>{data.intro}</p><ButtonLink href="/signup">Start with Formiva</ButtonLink></div><div className="inner-symbol reveal"><div className="symbol-orbit orbit-a" /><div className="symbol-orbit orbit-b" /><span className="symbol-core">{data.icon}</span><span className="symbol-code">01 / CASEFLOW<br />SYSTEM READY</span><span className="symbol-corner corner-t">FORMIVA<br />VISHYX TECHIE</span><span className="symbol-corner corner-b">{data.kicker.split("/")[0]}</span></div></div></section>{data.stats && <section className="stats-bar"><div className="container-wide">{data.stats.map((stat) => <div key={stat.label}><small>{stat.label}</small><strong>{stat.value}</strong></div>)}</div></section>}<section className="content-cards section-pad container-wide"><div className="content-cards-head reveal"><SectionLabel>How it comes together</SectionLabel><p>A focused product with enough depth to handle the work after the form.</p></div><div className="content-card-grid">{data.cards.map((card, index) => <div className="content-card reveal" key={card.title}><span className="content-card-num">0{index + 1}</span><span className="content-card-icon">{card.icon}</span><h3>{card.title}</h3><p>{card.copy}</p><ArrowUpRight className="content-card-arrow" size={18} /></div>)}</div></section><section className="page-cta section-pad"><div className="container-wide page-cta-inner reveal"><div><SectionLabel>Next step</SectionLabel><h2>{data.cta}</h2></div><ButtonLink href="/company/contact">Talk to the team</ButtonLink></div></section></SiteShell>;
}

function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const [submitted, setSubmitted] = useState(false);
  useSeo(
    mode === "login" ? "Log in | Formiva" : "Start free | Formiva",
    "Formiva product preview: sign in or create a workspace for intake-to-outcome case flows.",
  );
  return <div className="auth-page"><div className="auth-art"><div className="auth-art-grid" /><Logo /><div className="auth-art-copy"><SectionLabel>FORMIVA / VISHYX TECHIE</SectionLabel><h1>Make the hard work<br /><em>move itself.</em></h1><p>One calm surface for intake, evidence, decisions and the next action.</p><div className="auth-mini-flow"><span>INTAKE</span><ArrowRight size={14} /><span>AI READ</span><ArrowRight size={14} /><span>OUTCOME</span></div></div><span className="auth-art-foot">CASEFLOW SYSTEM / 2026</span></div><div className="auth-form-wrap"><Link href="/" className="auth-back"><ChevronRight size={15} className="back-icon" /> Back to formiva</Link><div className="auth-form"><span className="auth-kicker">{mode === "login" ? "Welcome back" : "Start your first flow"}</span><h2>{mode === "login" ? "Sign in to your workspace." : "Build a better first process."}</h2><p>{mode === "login" ? "Access your cases, flows and operating signals." : "Create a free Formiva account. No credit card required."}</p>{submitted ? <div className="auth-success"><span><Check /></span><h3>{mode === "login" ? "You’re on the list." : "Your workspace is ready to begin."}</h3><p>This public website is a product preview. Account activation will connect when the Formiva application backend is live.</p><Link href="/" className="button button-primary">Back to homepage <ArrowUpRight size={16} /></Link></div> : <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}><label>Work email<input type="email" placeholder="you@company.com" required /></label>{mode === "signup" && <label>Company name<input type="text" placeholder="Your company" required /></label>}<label>Password<div className="password-wrap"><input type="password" placeholder="••••••••••••" required /><span>Show</span></div></label><button className="button button-primary auth-submit">{mode === "login" ? "Continue to workspace" : "Create free workspace"}<ArrowUpRight size={16} /></button><div className="auth-separator"><span>or continue with</span></div><button type="button" className="social-button"><span className="google-mark">G</span> Continue with Google</button><small className="auth-legal">By continuing, you agree to Formiva’s <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</small></form>}{!submitted && <div className="auth-switch">{mode === "login" ? <>New to Formiva? <Link href="/signup">Create an account <ArrowRight size={14} /></Link></> : <>Already have an account? <Link href="/login">Sign in <ArrowRight size={14} /></Link></>}</div>}</div></div></div>;
}

function LegalPage({ title, copy }: { title: string; copy: string }) {
  useSeo(`${title} | Formiva`, copy);
  return <SiteShell><section className="legal-page section-pad container-narrow"><SectionLabel>Formiva / Legal</SectionLabel><h1>{title}</h1><p className="legal-lead">{copy}</p><div className="legal-body"><h3>Our approach</h3><p>Formiva is designed to make operational work more visible, controlled and accountable. We collect and process information to provide the product, improve reliability and support the workflows our customers choose to run.</p><h3>Read before launch</h3><p>This public marketing site is a product introduction. Account creation, integrations, billing and production data handling will be governed by the final Formiva application terms, privacy notices and customer agreements before the product handles sensitive data.</p><h3>Questions?</h3><p>Talk to the team at <a href="mailto:hello@vishyxtechie.in">hello@vishyxtechie.in</a>.</p></div></section></SiteShell>; }

function NotFoundPage() {
  useSeo("Page not found | Formiva", "This page doesn't exist. Head back to the Formiva homepage.");
  return (
    <SiteShell>
      <section className="legal-page section-pad container-narrow">
        <SectionLabel>Formiva / 404</SectionLabel>
        <h1>This page took a wrong turn.</h1>
        <p className="legal-lead">The page you're looking for doesn't exist or has moved.</p>
        <div className="legal-body">
          <ButtonLink href="/">Back to homepage</ButtonLink>
        </div>
      </section>
    </SiteShell>
  );
}


function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 420);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" title="Back to top"><ChevronUp size={18} /></button>;
}
function App() {
  const [location] = useLocation();

  return <><BackToTop /><div className="route-transition" key={location}><Switch><Route path="/" component={Home} /><Route path="/pricing" component={PricingPage} /><Route path="/login"><AuthPage mode="login" /></Route><Route path="/signup"><AuthPage mode="signup" /></Route><Route path="/legal/privacy"><LegalPage title="Privacy, with intent." copy="A clear view of the information Formiva collects, why it exists and how we design around responsible handling." /></Route><Route path="/legal/terms"><LegalPage title="Terms that stay readable." copy="The simple version of how Formiva, Vishyx Techie and our customers work together." /></Route><Route path="/legal/security"><LegalPage title="Quality & security are product features." copy="Trust is not a footer claim. It is designed into the flow, the data model and the human review path." /></Route>{Object.entries(pageData).filter(([path]) => path !== "/pricing").map(([path, data]) => <Route key={path} path={path}><ContentPage data={data} /></Route>)}<Route component={NotFoundPage} /></Switch></div></>;
}

export default App;
