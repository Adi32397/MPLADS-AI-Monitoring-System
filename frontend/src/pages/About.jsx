import React from 'react';
import { 
  Github, 
  Linkedin, 
  GraduationCap, 
  Code2, 
  Cpu, 
  Cloud, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  Terminal, 
  Award,
  BookOpen,
  Briefcase
} from 'lucide-react';

export default function About() {
  const developer = {
    name: 'Aditya Singh Saini',
    role: 'Computer Science Student',
    university: 'University of Petroleum and Energy Studies (UPES)',
    headline: 'Computer Science Student | Full-Stack Development | AI & Cloud Computing | Building Projects, Solving Problems, Learning Continuously',
    githubUrl: 'https://github.com/Adi32397',
    linkedinUrl: 'https://www.linkedin.com/in/aditya-singh-saini-a3654731b/',
  };

  const skills = [
    {
      category: 'Full-Stack Development',
      icon: Code2,
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
      items: ['React.js & Vite', 'Node.js & Express', 'Tailwind CSS', 'RESTful API Architecture', 'State Management', 'Leaflet & GIS Mapping']
    },
    {
      category: 'AI & Data Intelligence',
      icon: Cpu,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      items: ['Fraud Anomaly Detection', 'NLP & Text Similarity', 'Duplicate Project Detection', 'Geographic Risk Modeling', 'Predictive Analysis']
    },
    {
      category: 'Cloud & Infrastructure',
      icon: Cloud,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      items: ['Cloud Computing Principles', 'Database Management', 'Digital Signatures & Cryptography', 'PDF Generation Engines', 'Version Control (Git/GitHub)']
    }
  ];

  const highlights = [
    {
      title: 'Academic Institution',
      value: 'UPES',
      desc: 'Pursuing Computer Science Engineering with a strong focus on applied AI, distributed systems, and real-world software architecture.'
    },
    {
      title: 'Problem Solver Mindset',
      value: 'Innovator',
      desc: 'Passionate about engineering automated solutions for governance, anti-corruption transparency, and data-driven public services.'
    },
    {
      title: 'Continuous Learner',
      value: 'Lifelong Learning',
      desc: 'Constantly exploring cutting-edge AI advancements, cloud paradigms, and full-stack software development best practices.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/20">
              Project Creator & Lead Engineer
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Developer
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            About the Developer & Platform
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Learn more about the creator behind the CivicShield MPLADS AI Monitoring & Anti-Fraud Platform.
          </p>
        </div>
      </div>

      {/* Main Developer Profile Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-primary to-slate-950 text-white shadow-xl border border-slate-800 p-6 sm:p-8">
        {/* Subtle decorative glow circles */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-accent/15 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-8">
          {/* Avatar / Portrait with glow ring */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-[3px] shadow-xl shadow-amber-500/25 group">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950 relative">
                <img 
                  src="/developer.jpg" 
                  alt="Aditya Singh Saini" 
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" 
                />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-slate-950 shadow">
              <Sparkles size={14} />
            </div>
          </div>

          {/* Core Info & Tagline */}
          <div className="flex-1 text-center lg:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-1.5">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                  {developer.name}
                </h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-amber-300 text-xs font-medium shadow-sm">
                  <GraduationCap size={14} className="text-amber-400" />
                  <span>Student of UPES</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 text-slate-300 text-sm font-medium mt-1">
                <BookOpen size={15} className="text-accent-light" />
                <span>{developer.university}</span>
              </div>
            </div>

            {/* User-Requested Tagline / Statement */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm shadow-inner">
              <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                "{developer.headline}"
              </p>
            </div>

            {/* Social & Profile Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a
                href={developer.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all duration-200 border border-slate-600/60 hover:border-slate-500 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5"
              >
                <Github size={18} />
                <span>GitHub Profile</span>
                <ExternalLink size={14} className="text-slate-400" />
              </a>

              <a
                href={developer.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-[#0A66C2]/30 hover:shadow-lg hover:shadow-[#0A66C2]/50 hover:-translate-y-0.5"
              >
                <Linkedin size={18} />
                <span>LinkedIn Profile</span>
                <ExternalLink size={14} className="text-blue-200" />
              </a>

              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
                <Terminal size={14} className="text-accent-light" />
                <span>B.Tech Computer Science</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights Cards (UPES, Problem Solver, Continuous Learner) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {highlights.map((item, idx) => (
          <div 
            key={idx} 
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {item.title}
                </span>
                <CheckCircle2 size={16} className="text-accent" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5">
                {item.value}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Technical Competencies Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-accent" />
          <h2 className="text-xl font-bold text-slate-900">Technical Focus Areas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {skills.map((skillGroup, idx) => {
            const Icon = skillGroup.icon;
            return (
              <div 
                key={idx}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-colors flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${skillGroup.color} border`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {skillGroup.category}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {skillGroup.items.map((item, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* About the Project Platform */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              CivicShield: MPLADS AI Monitoring & Anti-Fraud Platform
            </h2>
            <p className="text-xs text-slate-500">
              Designed for SIH & Transparent Public Governance (MoSPI)
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          CivicShield was conceptualized and developed to address critical monitoring challenges in the 
          Members of Parliament Local Area Development Scheme (MPLADS). By leveraging AI-driven NLP duplicate 
          detection, geographic contractor cluster analysis, fund utilization telemetry, and cryptographic 
          sanction order verification with digital audit trails, the platform ensures accountability and 
          transparency across District, State, and National governance tiers.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Architecture</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">MERN + Python/AI</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Governance Tiers</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">MP, Dist, State, MoSPI</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Verification</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">Cryptographic Hash</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Geo Intelligence</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">GIS Clustered Heatmaps</p>
          </div>
        </div>
      </div>
    </div>
  );
}
