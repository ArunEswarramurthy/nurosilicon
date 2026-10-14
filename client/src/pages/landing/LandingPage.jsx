import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu, Code2, ClipboardList, Trophy,
  BookOpen, Layers, BarChart2, Users,
  CheckCircle, Zap, Shield, ArrowRight,
} from 'lucide-react';
import nuroLogo from '/SilicpnLogo.jpeg';
import './LandingPage.css';
import { CircuitDeco, IDEMockup } from './LandingComponents';

const NAV_LINKS = [
  { label: 'Platform',     href: '#features'    },
  { label: 'Courses',      href: '#courses'      },
  { label: 'How it works', href: '#how'          },
  { label: 'Testimonials', href: '#testimonials' },
];

const FEATURES = [
  { Icon: Cpu,           cls: 'blue',   title: 'VLSI and HDL Practice',      desc: 'Write Verilog and SystemVerilog in the browser. Simulate waveforms, run testbenches, and debug RTL without any local setup.' },
  { Icon: Code2,         cls: 'purple', title: 'Programming Labs',            desc: 'C, C++, Python, Java, Embedded C. Auto-graded problems with instant feedback and detailed test case results.' },
  { Icon: ClipboardList, cls: 'cyan',   title: 'Objective Assessments',       desc: 'MCQ, True/False, and fill-in-the-blank question banks. Timed tests with analytics for faculty and students.' },
  { Icon: Trophy,        cls: 'violet', title: 'Contests and Leaderboards',   desc: 'Competitive programming rounds with real-time scoring. Track your rank and compare with peers across institutions.' },
];

const HOW_STEPS = [
  { num: '01', Icon: Users,       title: 'Create your account',     desc: 'Register with your college email. Your admin sets up your department, batch, and access in under a minute.' },
  { num: '02', Icon: Layers,      title: 'Pick your track',         desc: 'Choose from VLSI, Embedded Systems, Programming, or Core Engineering. Each track has structured courses and labs.' },
  { num: '03', Icon: Code2,       title: 'Practice in the browser', desc: 'Write real code, simulate HDL, and solve problems without installing anything. Everything runs in the platform.' },
  { num: '04', Icon: CheckCircle, title: 'Track and get certified', desc: 'Complete courses, pass quizzes, and earn certificates. Your progress is visible to you and your faculty.' },
];

const COURSES = [
  { tag: 'VLSI',        tagColor: '#00A6FF', tagBg: 'rgba(0,166,255,0.12)',   accent: '#00A6FF', title: 'Verilog Fundamentals',      desc: 'Digital design from basic gates to FSMs and testbenches. Includes waveform simulation for every exercise.',   diff: 'Beginner',     diffColor: '#10B981', lessons: '24 lessons', icon: '🔬' },
  { tag: 'Embedded',    tagColor: '#A855F7', tagBg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', title: 'Embedded C Programming',    desc: 'Microcontroller programming, GPIO, timers, UART, and real-time systems on ARM Cortex-M.',                     diff: 'Intermediate', diffColor: '#F59E0B', lessons: '32 lessons', icon: '⚡' },
  { tag: 'Programming', tagColor: '#10B981', tagBg: 'rgba(16,185,129,0.12)',  accent: '#10B981', title: 'Python for Engineers',      desc: 'Data analysis, automation, and signal processing with Python, NumPy, and Matplotlib.',                        diff: 'Beginner',     diffColor: '#10B981', lessons: '28 lessons', icon: '🐍' },
  { tag: 'VLSI',        tagColor: '#00A6FF', tagBg: 'rgba(0,166,255,0.12)',   accent: '#00A6FF', title: 'SystemVerilog and UVM',     desc: 'Advanced verification methodology. Write constrained-random testbenches and functional coverage.',             diff: 'Advanced',     diffColor: '#EF4444', lessons: '40 lessons', icon: '🧪' },
  { tag: 'Core',        tagColor: '#F59E0B', tagBg: 'rgba(245,158,11,0.12)',  accent: '#F59E0B', title: 'Digital Electronics',       desc: 'Boolean algebra, combinational and sequential circuits, flip-flops, counters, and decoders.',                  diff: 'Beginner',     diffColor: '#10B981', lessons: '20 lessons', icon: '💡' },
  { tag: 'Embedded',    tagColor: '#A855F7', tagBg: 'rgba(168,85,247,0.12)',  accent: '#A855F7', title: 'ARM Cortex-M Programming',  desc: 'Bare-metal programming with CMSIS and HAL. Covers interrupts, DMA, and peripheral drivers.',                   diff: 'Advanced',     diffColor: '#EF4444', lessons: '36 lessons', icon: '🔧' },
];

const PATHS = [
  { Icon: Cpu,   accentColor: '#00A6FF', gradient: 'linear-gradient(135deg,rgba(0,166,255,0.15),rgba(0,166,255,0.03))', title: 'VLSI and Chip Design',    desc: 'From digital logic to RTL design, synthesis, and physical design. Covers the complete ASIC flow used in industry.',         tags: ['Verilog', 'SystemVerilog', 'VHDL', 'UVM', 'Synthesis', 'STA'],            count: '6 courses' },
  { Icon: Zap,   accentColor: '#A855F7', gradient: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(168,85,247,0.03))', title: 'Embedded Systems',        desc: 'Microcontrollers, RTOS, device drivers, and IoT protocols. Build firmware that runs on real hardware.',                     tags: ['C', 'ARM', 'STM32', 'FreeRTOS', 'UART', 'SPI', 'I2C'],                    count: '5 courses' },
  { Icon: Code2, accentColor: '#10B981', gradient: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.03))', title: 'Software Engineering',    desc: 'Data structures, algorithms, system design, and competitive programming. Structured for placement preparation.',            tags: ['C++', 'Python', 'Java', 'DSA', 'OOP', 'SQL', 'OS'],                       count: '7 courses' },
];

const TESTIMONIALS = [
  { rating: 5, quote: 'The Verilog labs are the best I have found anywhere. The waveform viewer and instant simulation feedback helped me crack my VLSI internship interview at a semiconductor company.', name: 'Arjun Sharma',    role: 'ECE Final Year, NIT Trichy',    initials: 'AS', grad: 'linear-gradient(135deg,#00A6FF,#0090e0)' },
  { rating: 5, quote: 'The contest platform is well-built and the problems are genuinely challenging. I improved my problem-solving speed significantly in two months of regular practice.',               name: 'Priya Nair',      role: 'CSE Student, VIT Vellore',      initials: 'PN', grad: 'linear-gradient(135deg,#A855F7,#7c18cc)' },
  { rating: 5, quote: 'As a faculty member, I use NuroSilicon to assign HDL labs to my students. The progress tracking and auto-grading save me several hours every week.',                               name: 'Dr. Ramesh Kumar', role: 'Professor, Anna University',    initials: 'RK', grad: 'linear-gradient(135deg,#10B981,#059669)' },
];

const WHY_ITEMS = [
  { Icon: BookOpen,  bg: 'rgba(0,166,255,0.10)',  title: 'Structured Courses',       desc: 'Step-by-step learning paths with examples and projects. Each course maps to a real engineering domain.' },
  { Icon: Code2,     bg: 'rgba(168,85,247,0.10)', title: 'Browser-based Labs',       desc: 'Write, simulate, and debug code directly in the browser. No local installation required for any lab.' },
  { Icon: BarChart2, bg: 'rgba(0,229,255,0.10)',  title: 'Progress Analytics',       desc: 'Detailed dashboards for students and faculty. Track quiz scores, lab completion, and contest rankings.' },
  { Icon: Trophy,    bg: 'rgba(245,158,11,0.10)', title: 'Contests and Leaderboard', desc: 'Compete with peers across India. Timed rounds, real scoring, and a persistent leaderboard.' },
];

function CourseIcon({ tag }) {
  const map = {
    VLSI:        <Cpu size={36} color="#00A6FF" strokeWidth={1.4} />,
    Embedded:    <Zap size={36} color="#A855F7" strokeWidth={1.4} />,
    Programming: <Code2 size={36} color="#10B981" strokeWidth={1.4} />,
    Core:        <Shield size={36} color="#F59E0B" strokeWidth={1.4} />,
  };
  return map[tag] || <BookOpen size={36} color="#94A3B8" strokeWidth={1.4} />;
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="lp">

      {/* ── NAV ── */}
      <nav className="lp-nav" role="navigation" aria-label="Main navigation">
        <Link to="/" className="lp-nav-logo">
          <img src={nuroLogo} alt="NuroSilicon" />
          <span className="lp-nav-logo-text">Nuro<span>Silicon</span></span>
        </Link>
        <ul className="lp-nav-links" role="list">
          {NAV_LINKS.map(l => (
            <li key={l.label}><a href={l.href}>{l.label}</a></li>
          ))}
        </ul>
        <div className="lp-nav-actions">
          <Link to="/login" className="lp-btn-login">Sign in</Link>
          <Link to="/register" className="lp-btn-start">Get started</Link>
          <button className="lp-hamburger" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="lp-mobile-menu">
          {NAV_LINKS.map(l => (
            <div key={l.label} className="lp-mobile-link">
              <a href={l.href} onClick={() => setMobileOpen(false)}>{l.label}</a>
            </div>
          ))}
          <div className="lp-mobile-actions">
            <Link to="/login" onClick={() => setMobileOpen(false)} className="lp-mobile-btn-secondary">Sign in</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="lp-mobile-btn-primary">Get started</Link>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section id="hero" className="lp-hero" aria-label="Hero">
        <CircuitDeco style={{ top: 80, left: -20, opacity: 0.5 }} />
        <CircuitDeco style={{ bottom: 60, right: 20, opacity: 0.3, transform: 'scaleX(-1)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="lp-hero-eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A855F7', display: 'inline-block' }} />
            Learn · Practice · Build · Excel
          </p>
          <h1 className="lp-hero-h1">
            Engineering Skills<br />
            for a <span className="grad">Smarter Tomorrow</span>
          </h1>
          <p className="lp-hero-sub">
            NuroSilicon is an all-in-one learning and practice platform for VLSI, Embedded,
            Programming, and Core Engineering. Learn, practice, take challenges and build
            real skills that industry values.
          </p>
          <div className="lp-hero-actions">
            <Link to="/register" className="lp-btn-hero-primary">
              Get started for free <ArrowRight size={16} />
            </Link>
            <a href="#features" className="lp-btn-hero-secondary">Explore features</a>
          </div>
          <div className="lp-hero-metrics">
            {[
              { num: '10K+', label: 'Active Learners'     },
              { num: '2K+',  label: 'Practice Problems'   },
              { num: '150+', label: 'HDL and Coding Labs'  },
              { num: '50+',  label: 'Contests Conducted'  },
            ].map(m => (
              <div key={m.label}>
                <div className="lp-metric-num">{m.num}</div>
                <div className="lp-metric-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <IDEMockup />
          <div className="lp-hero-deco-text">Write · Simulate · Visualize · Learn</div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="lp-stats-banner">
        <div className="lp-stats-inner">
          {[
            { big: '10,000+', desc: 'Students enrolled across India' },
            { big: '2,500+',  desc: 'Practice problems and labs'     },
            { big: '98%',     desc: 'Student satisfaction rate'      },
            { big: '150+',    desc: 'HDL and coding simulations'     },
          ].map(s => (
            <div key={s.desc} className="lp-stat-item">
              <div className="lp-stat-big">{s.big}</div>
              <div className="lp-stat-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-features-strip" aria-label="Platform features">
        <div className="lp-features-strip-header">
          <p className="lp-section-eyebrow">Platform</p>
          <h2 className="lp-section-h2">Everything You Need to <span className="grad">Excel in Engineering</span></h2>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <Link key={f.title} to="/register" className="lp-feature-card">
              <div className={`lp-feature-icon ${f.cls}`}>
                <f.Icon size={22} strokeWidth={1.6} />
              </div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
              <span className="lp-feature-arrow">
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-how" aria-label="How it works">
        <div className="lp-how-inner">
          <div className="lp-how-header">
            <p className="lp-section-eyebrow">How it works</p>
            <h2 className="lp-how-h2">From Zero to <span className="grad">Job-Ready</span> in 4 Steps</h2>
            <p className="lp-how-sub">A structured path that takes you from fundamentals to industry-ready skills through practice and real challenges.</p>
          </div>
          <div className="lp-how-steps">
            {HOW_STEPS.map(s => (
              <div key={s.num} className="lp-how-step">
                <div className="lp-how-step-num">
                  <s.Icon size={22} strokeWidth={1.6} color="#A855F7" />
                </div>
                <div className="lp-how-step-badge">{s.num}</div>
                <div className="lp-how-step-title">{s.title}</div>
                <div className="lp-how-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUSTED ── */}
      <div className="lp-trusted">
        <div className="lp-trusted-label">Trusted by learners from top institutions</div>
        <div className="lp-trusted-logos">
          {['NIT Trichy', 'IIT Madras', 'VIT', 'Anna University', 'BITS Pilani', 'SRM', 'Amrita', 'SASTRA'].map(n => (
            <span key={n} className="lp-trusted-logo">{n}</span>
          ))}
        </div>
      </div>

      {/* ── COURSES ── */}
      <section id="courses" className="lp-courses" aria-label="Featured courses">
        <div className="lp-courses-header">
          <div>
            <p className="lp-courses-eyebrow">Featured Courses</p>
            <h2 className="lp-courses-h2">Learn from <span className="grad">Expert-Crafted</span> Content</h2>
          </div>
          <Link to="/register" className="lp-courses-viewall">View all courses <ArrowRight size={13} /></Link>
        </div>
        <div className="lp-courses-grid">
          {COURSES.map(c => (
            <Link key={c.title} to="/register" className="lp-course-card" style={{'--accent': c.accent}}>
              <div className="lp-course-thumb-new" style={{ background: `linear-gradient(135deg, ${c.accent}22, ${c.accent}08)`, borderBottom: `1px solid ${c.accent}22` }}>
                <span className="lp-course-emoji">{c.icon}</span>
                <div className="lp-course-glow" style={{ background: c.accent }} />
              </div>
              <div className="lp-course-body">
                <div className="lp-course-top-row">
                  <span className="lp-course-tag" style={{ color: c.tagColor, background: c.tagBg }}>{c.tag}</span>
                  <span className="lp-course-diff" style={{ color: c.diffColor, background: `${c.diffColor}15`, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{c.diff}</span>
                </div>
                <div className="lp-course-title">{c.title}</div>
                <div className="lp-course-desc">{c.desc}</div>
                <div className="lp-course-meta">
                  <span className="lp-course-lessons">📚 {c.lessons}</span>
                  <span className="lp-course-cta">Enroll <ArrowRight size={11} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── LEARNING PATHS ── */}
      <section className="lp-path" aria-label="Learning paths">
        <div className="lp-path-inner">
          <div className="lp-path-header">
            <p className="lp-section-eyebrow">Learning Paths</p>
            <h2 className="lp-path-h2">Choose Your <span className="grad">Engineering Track</span></h2>
            <p className="lp-path-sub">Structured roadmaps designed by industry experts to take you from fundamentals to advanced topics.</p>
          </div>
          <div className="lp-path-grid">
            {PATHS.map(p => (
              <div key={p.title} className="lp-path-card-new" style={{ background: p.gradient, borderColor: `${p.accentColor}25` }}>
                <div className="lp-path-card-top">
                  <div className="lp-path-card-icon" style={{ background: `${p.accentColor}18`, border: `1.5px solid ${p.accentColor}33` }}>
                    <p.Icon size={22} color={p.accentColor} strokeWidth={1.6} />
                  </div>
                  <span className="lp-path-count" style={{ color: p.accentColor, background: `${p.accentColor}15` }}>{p.count}</span>
                </div>
                <div className="lp-path-card-title">{p.title}</div>
                <div className="lp-path-card-desc">{p.desc}</div>
                <div className="lp-path-card-tags">
                  {p.tags.map(t => <span key={t} className="lp-path-tag" style={{ borderColor: `${p.accentColor}25`, color: `${p.accentColor}cc` }}>{t}</span>)}
                </div>
                <div className="lp-path-card-footer" style={{ borderTopColor: `${p.accentColor}15` }}>
                  <Link to="/register" className="lp-path-cta" style={{ color: p.accentColor }}>Start Learning <ArrowRight size={13} /></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY NUROSILICON ── */}
      <section id="why" className="lp-why" aria-label="Why NuroSilicon">
        <div>
          <p className="lp-why-label">Why NuroSilicon</p>
          <h2 className="lp-why-h2">A Complete Platform<br />for <span className="grad">Engineering Learners</span></h2>
          <p className="lp-why-sub">From structured courses to hands-on labs and real competitions, NuroSilicon helps you learn, practice and grow — all in one place.</p>
          <Link to="/register" className="lp-btn-explore">Explore all features <ArrowRight size={15} /></Link>
        </div>
        <div className="lp-why-features">
          {WHY_ITEMS.map(w => (
            <div key={w.title} className="lp-why-item">
              <div className="lp-why-item-icon" style={{ background: w.bg }}>
                <w.Icon size={18} strokeWidth={1.6} color="#E2E8F0" />
              </div>
              <div>
                <div className="lp-why-item-title">{w.title}</div>
                <div className="lp-why-item-desc">{w.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="lp-testimonials" aria-label="Student testimonials">
        <div className="lp-test-header">
          <p className="lp-test-label">Testimonials</p>
          <h2 className="lp-test-h2">What Our <span className="grad">Students Say</span></h2>
        </div>
        <div className="lp-test-grid">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="lp-test-card">
              <div className="lp-test-stars">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ))}
              </div>
              <p className="lp-test-quote">"{t.quote}"</p>
              <div className="lp-test-author">
                <div className="lp-test-avatar" style={{ background: t.grad }}>{t.initials}</div>
                <div>
                  <div className="lp-test-name">{t.name}</div>
                  <div className="lp-test-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta" aria-label="Call to action">
        <h2 className="lp-cta-h2">Start Your <span className="grad">Engineering Journey</span><br />Today — It's Free</h2>
        <p className="lp-cta-sub">Join 10,000+ students mastering VLSI, embedded systems, and programming on NuroSilicon.</p>
        <div className="lp-cta-actions">
          <Link to="/register" className="lp-btn-cta-primary">Get started for free</Link>
          <Link to="/login" className="lp-btn-cta-secondary">Sign in</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-top">
          <div>
            <div className="lp-footer-brand-name">Nuro<span>Silicon</span></div>
            <p className="lp-footer-brand-desc">An all-in-one engineering learning platform for VLSI, embedded systems, programming, and core engineering subjects.</p>
          </div>
          <div>
            <div className="lp-footer-col-title">Platform</div>
            <ul className="lp-footer-links">
              <li><Link to="/register">Courses</Link></li>
              <li><Link to="/register">Lab Practice</Link></li>
              <li><Link to="/register">Contests</Link></li>
              <li><Link to="/register">Assessments</Link></li>
              <li><Link to="/register">Leaderboard</Link></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">Learning</div>
            <ul className="lp-footer-links">
              <li><Link to="/register">Verilog / HDL</Link></li>
              <li><Link to="/register">Embedded C</Link></li>
              <li><Link to="/register">Python</Link></li>
              <li><Link to="/register">Digital Design</Link></li>
              <li><Link to="/register">ARM Cortex-M</Link></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">Account</div>
            <ul className="lp-footer-links">
              <li><Link to="/login">Sign in</Link></li>
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/login">Student Portal</Link></li>
              <li><Link to="/login">Admin Portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span className="lp-footer-copy">© {new Date().getFullYear()} NuroSilicon. All rights reserved.</span>
          <span className="lp-footer-copy">Built for engineering excellence.</span>
        </div>
      </footer>
    </div>
  );
}
