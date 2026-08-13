import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.AMEER_SUPABASE || {};
if (!cfg.url || !cfg.publishableKey) {
  console.warn('Ameer portfolio: Supabase config missing.');
} else {
  const supabase = createClient(cfg.url, cfg.publishableKey);

  function esc(value='') {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }


  function resolveMedia(value='') {
    const v=String(value||'');
    if(!v.startsWith('storage:')) return v;
    const path=v.slice('storage:'.length);
    const {data}=supabase.storage.from('portfolio-media').getPublicUrl(path);
    return data?.publicUrl || '';
  }

  /* ---------------- SERVICES ---------------- */
  const iconMap = {
    'brand marketing':'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>',
    'digital marketing':'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h5M8 16h3"/></svg>',
    'event marketing':'<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4z"/><path d="M8 4v4M16 4v4M4 10h16"/></svg>',
    'market research':'<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></svg>',
    'marketing consulting':'<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="5"/><path d="m14 14 5 5M10 8v4M8 10h4"/></svg>',
    'marketing strategy':'<svg viewBox="0 0 24 24"><path d="M4 18V6M4 18h16"/><path d="m7 14 4-5 3 3 5-7"/></svg>',
    'online research':'<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 4.5 4.5M7 10h6M10 7v6"/></svg>',
    'project management':'<svg viewBox="0 0 24 24"><path d="M7 4h10v4H7z"/><path d="M5 8h14v12H5z"/></svg>',
    'brand design':'<svg viewBox="0 0 24 24"><path d="M5 19 19 5"/><path d="m7 5 12 12"/></svg>',
    'presentation design':'<svg viewBox="0 0 24 24"><path d="M4 5h16v12H4z"/><path d="M8 9h8M8 13h5"/></svg>'
  };

  function serviceCard(row) {
    const key = String(row.name || '').toLowerCase();
    const icon = iconMap[key] || '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>';
    return `<a class="service-card-final" href="#contact" aria-label="Discuss ${esc(row.name)}">
      <span class="service-icon-final" aria-hidden="true">${icon}</span>
      <h3>${esc(row.name)}</h3>
      <p>${esc(row.description || '')}</p>
      <span class="service-link-final">Discuss this service
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
      </span>
    </a>`;
  }

  async function hydrateServices() {
    const grid = document.querySelector('.services-grid-final');
    if (!grid) return;
    const { data, error } = await supabase.from('services')
      .select('id,name,description,icon,sort_order,published')
      .eq('published', true).order('sort_order', { ascending:true });
    if (error || !data?.length) {
      if (error) console.warn('Services fallback:', error.message);
      return;
    }
    grid.innerHTML = data.map(serviceCard).join('');
    grid.dataset.source = 'supabase';
  }

  /* ---------------- PROJECTS ---------------- */
  function norm(s='') {
    return String(s).toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]+/g,' ').trim();
  }

  function projectKeyFromText(text='') {
    const t = norm(text);
    if (t.includes('tipu foods') || t.includes('tipu burger') || t.includes('tipu')) return 'tipu';
    if (t.includes('gibtek')) return 'gibtek';
    if (t.includes('desire by amal')) return 'desire';
    if (t.includes('sap business') || t.includes('sap')) return 'sap';
    return '';
  }

  function projectRowKey(row) {
    return projectKeyFromText([row.title,row.client,row.role,row.category].filter(Boolean).join(' '));
  }

  function findRichProjectCards() {
    const root = document.querySelector('#projects') || document;
    const selectors = ['.project-card','.featured-project-card','.project-showcase-card','.project-feature-card'];
    const seen = new Set(), cards = [];
    selectors.forEach(sel => root.querySelectorAll(sel).forEach(el => {
      if (!seen.has(el)) { seen.add(el); cards.push(el); }
    }));
    return cards;
  }

  function setTextIfFound(card, selectors, value) {
    if (!value) return;
    for (const sel of selectors) {
      const el = card.querySelector(sel);
      if (el) { el.textContent = value; return; }
    }
  }

  function setParagraphIfFound(card, value) {
    if (!value) return;
    const candidates = ['.project-body p','.project-description','.project-copy p','.featured-project-description','p'];
    for (const sel of candidates) {
      const el = card.querySelector(sel);
      if (el) { el.textContent = value; return; }
    }
  }

  function updateTipuButtons(card, row) {
    const links = [...card.querySelectorAll('a')];
    if (row.case_study_url) {
      const strategy = links.find(a => /6[-\s]?month strategy/i.test(a.textContent));
      if (strategy) strategy.href = row.case_study_url;
    }
    if (row.project_url) {
      const landing = links.find(a => /tipu landing page|landing page/i.test(a.textContent));
      if (landing) landing.href = row.project_url;
    }
  }

  function updateProjectCard(card, row) {
    if (!row) return;
    setTextIfFound(card, ['.project-title','.featured-project-title','h3','h2'], row.title);
    setTextIfFound(card, ['.project-meta','.featured-project-meta'], [row.client,row.role].filter(Boolean).join(' · '));
    setParagraphIfFound(card, row.description);
    if (projectRowKey(row)==='tipu') updateTipuButtons(card,row);
    else if (row.project_url) {
      const generic = card.querySelector('a.project-link');
      if (generic) generic.href = row.project_url;
    }
    card.dataset.source='supabase';
    card.dataset.projectId=row.id||'';
  }

  async function hydrateProjects() {
    const { data, error } = await supabase.from('projects')
      .select('id,title,description,category,client,role,image_url,project_url,case_study_url,featured,published,sort_order')
      .eq('published',true).order('sort_order',{ascending:true});
    if (error || !data?.length) {
      if (error) console.warn('Projects fallback:',error.message);
      return;
    }
    const rowMap = new Map();
    data.forEach(row => {
      const key = projectRowKey(row);
      if (key) rowMap.set(key,row);
    });
    findRichProjectCards().forEach(card => {
      const row = rowMap.get(projectKeyFromText(card.textContent));
      if (row) updateProjectCard(card,row);
    });
  }

  /* ---------------- EXPERIENCE ----------------
     Preserves timeline card HTML, logos, layout and motion.
     Updates only content fields in place.
  */

  function experienceKey(text='') {
    const t = norm(text);
    if (t.includes('agrico') || t.includes('millat tractor')) return 'agrico';
    if (t.includes('desire by amal')) return 'desire';
    if (t.includes('gibtek')) return 'gibtek';
    if (t.includes('astrekk')) return 'astrekk';
    if (t.includes('ibex') || t.includes('daraz') || t.includes('alibaba')) return 'ibex';
    return '';
  }

  function fmtMonth(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US',{month:'short',year:'numeric'});
  }

  function linesFromDescription(value='') {
    return String(value).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  }

  function tagsFromValue(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).split(',').map(x=>x.trim()).filter(Boolean);
  }

  function updateExperienceCard(card,row) {
    const h3 = card.querySelector('.company-info h3');
    if (h3 && row.position) h3.textContent = row.position;

    const companyLink = card.querySelector('.company-info a');
    const companySpan = card.querySelector('.company-info span');
    const companyNode = companyLink || companySpan;
    if (companyNode && row.company) companyNode.textContent = row.company;
    if (companyLink && row.company_url) companyLink.href = row.company_url;

    const meta = card.querySelector('.company-meta');
    if (meta) {
      const start = fmtMonth(row.start_date);
      const end = row.end_date ? fmtMonth(row.end_date) : 'Present';
      const dates = start ? `${start} · ${end}` : end;
      meta.innerHTML = `${esc(dates)}${row.location ? `<br>${esc(row.location)}` : ''}`;
    }

    const ul = card.querySelector('.timeline-body ul');
    const bullets = linesFromDescription(row.description);
    if (ul && bullets.length) {
      ul.innerHTML = bullets.map(line=>`<li>${esc(line)}</li>`).join('');
    }

    const tagsWrap = card.querySelector('.timeline-tags');
    const tags = tagsFromValue(row.tags);
    if (tagsWrap && tags.length) {
      tagsWrap.innerHTML = tags.map(tag=>`<span class="timeline-tag">${esc(tag)}</span>`).join('');
    }

    if (row.logo_url) {
      const img = card.querySelector('.company-logo img');
      if (img) img.src = resolveMedia(row.logo_url);
    }

    card.dataset.source='supabase';
    card.dataset.experienceId=row.id||'';
  }

  async function hydrateExperience() {
    const section = document.querySelector('#exp');
    if (!section) return;

    const {data,error} = await supabase.from('experience')
      .select('id,company,position,description,start_date,end_date,location,company_url,tags,logo_url,published,sort_order')
      .eq('published',true).order('sort_order',{ascending:true});

    if (error || !data?.length) {
      if (error) console.warn('Experience fallback:',error.message);
      return;
    }

    const rows = new Map();
    data.forEach(row=>{
      const key = experienceKey([row.company,row.position].filter(Boolean).join(' '));
      if (key) rows.set(key,row);
    });

    section.querySelectorAll('.timeline-card').forEach(card=>{
      const key = experienceKey(card.textContent);
      const row = rows.get(key);
      if (row) updateExperienceCard(card,row);
    });

    section.querySelector('.timeline')?.setAttribute('data-source','supabase');
  }


  /* ---------------- EDUCATION ----------------
     Preserves the current cards, institutional logos, badges, spacing and layout.
     Only editable content is hydrated from Supabase.
  */

  function educationKey(text='') {
    const t = norm(text);
    if (t.includes('dha suffa') || t.includes('dsu')) return 'dsu';
    if (t.includes('university of the people') || t.includes('uopeople')) return 'uopeople';
    if (t.includes('cadet college sanghar') || t.includes('cadet')) return 'cadet';
    return '';
  }

  function updateEducationCard(card,row) {
    const title = card.querySelector('.edu-info h3');
    if (title && row.degree) title.textContent = row.degree;

    const infoLink = card.querySelector('.edu-info a');
    const infoSpan = card.querySelector('.edu-info span');
    const institutionNode = infoLink || infoSpan;
    if (institutionNode && row.institution) institutionNode.textContent = row.institution;

    const meta = card.querySelector('.edu-meta');
    if (meta && row.year) meta.textContent = row.year;

    const bodyList = card.querySelector('.edu-body ul');
    if (bodyList && row.description) {
      const lines = String(row.description).split(/\n+/).map(v=>v.trim()).filter(Boolean);
      if (lines.length) {
        bodyList.innerHTML = lines.map(line=>`<li>${esc(line)}</li>`).join('');
      }
    }

    if (row.logo_url) {
      const img = card.querySelector('.edu-logo img');
      if (img) img.src = resolveMedia(row.logo_url);
    }

    card.dataset.source = 'supabase';
    card.dataset.educationId = row.id || '';
  }

  async function hydrateEducation() {
    const section = document.querySelector('#edu');
    if (!section) return;

    const {data,error} = await supabase.from('education')
      .select('id,institution,degree,description,year,logo_url,published,sort_order')
      .eq('published',true)
      .order('sort_order',{ascending:true});

    if (error || !data?.length) {
      if (error) console.warn('Education fallback:',error.message);
      return;
    }

    const rows = new Map();
    data.forEach(row=>{
      const key = educationKey([row.institution,row.degree].filter(Boolean).join(' '));
      if (key) rows.set(key,row);
    });

    section.querySelectorAll('.edu-card').forEach(card=>{
      const key = educationKey(card.textContent);
      const row = rows.get(key);
      if (row) updateEducationCard(card,row);
    });

    section.querySelector('.edu-grid')?.setAttribute('data-source','supabase');
  }


  /* ---------------- RESEARCH ----------------
     Uses the EXISTING research table schema:
     title, abstract, methodology, key_findings,
     theoretical_contribution, practical_impact, pdf_url,
     published, sort_order.

     The rich research visual, live PLS-SEM map, KPI counters,
     PKM/S-O-R formatting, and layout are preserved.
  */

  async function hydrateResearch() {
    const section = document.querySelector('#research');
    if (!section) return;

    const {data,error} = await supabase.from('research')
      .select('id,title,abstract,methodology,key_findings,theoretical_contribution,practical_impact,pdf_url,published,sort_order')
      .eq('published',true)
      .order('sort_order',{ascending:true});

    if (error || !data?.length) {
      if (error) console.warn('Research fallback:', error.message);
      return;
    }

    const row = data[0];
    const card = section.querySelector('.research-card');
    if (!card) return;

    const title = card.querySelector('.research-title');
    if (title && row.title) title.textContent = row.title;

    const sectionDesc = section.querySelector('.sec-desc');
    if (sectionDesc && row.abstract) sectionDesc.textContent = row.abstract;

    const body = card.querySelector('.research-body');
    if (body) {
      const paras = body.querySelectorAll(':scope > p');

      if (paras[0] && row.methodology) {
        paras[0].innerHTML =
          `<strong>Methodology:</strong> ${esc(row.methodology)}`;
      }

      if (paras[1] && (row.key_findings || row.theoretical_contribution)) {
        let findings = row.key_findings ? esc(row.key_findings) : '';
        let theory = row.theoretical_contribution
          ? ` ${esc(row.theoretical_contribution)}`
          : '';

        // Re-apply the requested emphasis to PKM and S-O-R text after escaping.
        let combined = findings + theory;
        combined = combined
          .replace(/Persuasion Knowledge Model \(PKM\)/gi,
            '<strong style="color:#000;font-weight:800;">Persuasion Knowledge Model (PKM)</strong>')
          .replace(/Stimulus-Organism-Response \(S-O-R\) Model/gi,
            '<strong style="color:#000;font-weight:800;">Stimulus-Organism-Response (S-O-R) Model</strong>');

        paras[1].innerHTML =
          `<strong>Key Findings:</strong> ${combined}`;
      }

      if (paras[2] && row.practical_impact) {
        paras[2].innerHTML =
          `<strong>Practical Impact:</strong> ${esc(row.practical_impact)}`;
      }
    }

    if (row.pdf_url) {
      const existing = card.querySelector('a.research-pdf-link');
      if (existing) {
        existing.href = resolveMedia(row.pdf_url);
      } else {
        const a = document.createElement('a');
        a.className = 'research-pdf-link';
        a.href = resolveMedia(row.pdf_url);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'View Research';
        a.style.cssText =
          'display:inline-flex;margin-top:18px;padding:10px 14px;border:1px solid var(--border);border-radius:10px;text-decoration:none;color:inherit;font-weight:700;';
        card.appendChild(a);
      }
    }

    card.dataset.source = 'supabase';
    card.dataset.researchId = row.id || '';
    section.dataset.source = 'supabase';
  }


  /* ---------------- SKILLS ----------------
     Preserve the existing analytics stack, workflow visual, card layout and icons.
     Only the individual skill tags inside each skill-card become database-driven.
  */

  function normalizeCategory(value='') {
    return norm(value);
  }

  async function hydrateSkills() {
    const section = document.querySelector('#skills');
    if (!section) return;

    const {data,error} = await supabase.from('skills')
      .select('id,name,category,icon,published,sort_order')
      .eq('published',true)
      .order('sort_order',{ascending:true});

    if (error || !data?.length) {
      if (error) console.warn('Skills fallback:', error.message);
      return;
    }

    const grouped = new Map();
    data.forEach(row => {
      const key = normalizeCategory(row.category);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    section.querySelectorAll('.skill-card').forEach(card => {
      const titleNode = card.querySelector('.skill-card-title');
      const tagsWrap = card.querySelector('.skill-tags');
      if (!titleNode || !tagsWrap) return;

      const key = normalizeCategory(titleNode.textContent);
      const rows = grouped.get(key);
      if (!rows?.length) return;

      tagsWrap.innerHTML = rows
        .map(row => `<span class="skill-tag" data-skill-id="${esc(row.id)}">${esc(row.name)}</span>`)
        .join('');

      card.dataset.source = 'supabase';
    });

    section.dataset.source = 'supabase';
  }


  /* ---------------- CREDENTIALS ----------------
     Preserves the existing McKinsey/UNSW showcase designs, badge images,
     issuer panels, standard certificate cards, spacing and responsive layout.
  */

  function credentialKey(value='') {
    const t = norm(value);
    if (t.includes('mckinsey')) return 'mckinsey';
    if (t.includes('unsw') || t.includes('learn to lead')) return 'unsw';
    if (t.includes('certificate in marketing')) return 'uopeople-marketing';
    if (t.includes('certificate in finance')) return 'uopeople-finance';
    if (t.includes('cefr') || t.includes('english certification')) return 'uopeople-english';
    if (t.includes('sap requirements')) return 'sap-requirements';
    if (t.includes('sap foundations')) return 'sap-foundations';
    if (t.includes('linkedin marketing')) return 'linkedin-marketing';
    if (t.includes('google generative ai')) return 'google-ai';
    if (t.includes('project management')) return 'alison-pm';
    if (t.includes('html5') || t.includes('html css')) return 'aptech-html';
    return '';
  }

  function updateFeaturedCredential(card,row) {
    const title = card.querySelector('.credential-title');
    if (title && row.name) title.textContent = row.name;

    const org = card.querySelector('.credential-org');
    if (org && row.issuer) org.textContent = row.issuer;

    const desc = card.querySelector('.credential-desc');
    if (desc && row.description) desc.textContent = row.description;

    if (row.image_url) {
      const badgeImg = card.querySelector('.real-credential-badge');
      if (badgeImg) badgeImg.src = resolveMedia(row.image_url);
    }

    const badgeVisualLink = card.querySelector('.badge-visual-link');
    if (badgeVisualLink && row.credential_url) badgeVisualLink.href = row.credential_url;

    const actions = [...card.querySelectorAll('.credential-actions a')];
    if (row.credential_url && actions[0]) actions[0].href = row.credential_url;
    if (row.official_url && actions[1]) actions[1].href = row.official_url;
    if (row.details_url && actions[2]) actions[2].href = row.details_url;

    card.dataset.source='supabase';
    card.dataset.credentialId=row.id||'';
  }

  function updateStandardCredential(card,row) {
    const name = card.querySelector('.cert-name');
    if (name && row.name) name.textContent = row.name;

    const issuer = card.querySelector('.cert-issuer');
    if (issuer && row.issuer) issuer.textContent = row.issuer;

    const date = card.querySelector('.cert-date');
    if (date && row.display_date) date.textContent = row.display_date;

    if (row.image_url) {
      const img = card.querySelector('.cert-badge-img img');
      if (img) img.src = resolveMedia(row.image_url);
    }

    if (row.credential_url) card.href = row.credential_url;

    card.dataset.source='supabase';
    card.dataset.credentialId=row.id||'';
  }

  async function hydrateCredentials() {
    const section = document.querySelector('#certs');
    if (!section) return;

    const {data,error} = await supabase.from('credentials')
      .select('id,name,issuer,description,display_date,credential_type,image_url,credential_url,official_url,details_url,published,sort_order')
      .eq('published',true)
      .order('sort_order',{ascending:true});

    if (error || !data?.length) {
      if (error) console.warn('Credentials fallback:', error.message);
      return;
    }

    const rows = new Map();
    data.forEach(row=>{
      const key=credentialKey([row.name,row.issuer].filter(Boolean).join(' '));
      if(key) rows.set(key,row);
    });

    section.querySelectorAll('.credential-card').forEach(card=>{
      const row=rows.get(credentialKey(card.textContent));
      if(row) updateFeaturedCredential(card,row);
    });

    section.querySelectorAll('.cert-card').forEach(card=>{
      const row=rows.get(credentialKey(card.textContent));
      if(row) updateStandardCredential(card,row);
    });

    section.dataset.source='supabase';
  }


  /* ---------------- PROFILE / HERO ----------------
     Keeps the existing hero analytics visual, badges, intro, header and bot design.
     Only owner-editable profile/contact data is hydrated from Supabase.
  */

  function applyNameToHero(name='') {
    const h1 = document.querySelector('#home .hero-content h1');
    if (!h1 || !name) return;
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) {
      h1.textContent = parts[0];
      return;
    }
    const last = parts.pop();
    h1.innerHTML = `${esc(parts.join(' '))} <span>${esc(last)}</span>`;
  }

  function setAllHref(selector, href) {
    if (!href) return;
    document.querySelectorAll(selector).forEach(a => a.href = href);
  }

  async function hydrateProfile() {
    const {data,error} = await supabase.from('profile')
      .select('id,name,headline,bio,avatar_url,linkedin_url,whatsapp,email,resume_url,updated_at')
      .limit(1);

    if (error || !data?.length) {
      if (error) console.warn('Profile fallback:', error.message);
      return;
    }

    const row = data[0];

    if (row.name) {
      applyNameToHero(row.name);
      const loaderName = document.querySelector('#ameer-cinematic-loader .loader-name');
      if (loaderName) loaderName.textContent = row.name;
      document.title = `${row.name} | Marketing Analyst & Digital Strategist`;
    }

    if (row.headline) {
      const tagline = document.querySelector('#home .hero-tagline');
      if (tagline) tagline.textContent = row.headline;

      const aboutDesc = document.querySelector('#about .sec-desc');
      if (aboutDesc) aboutDesc.textContent = row.headline;
    }

    if (row.bio) {
      const aboutText = document.querySelector('#about .about-text');
      if (aboutText) {
        let first = aboutText.querySelector('p');
        if (!first) {
          first = document.createElement('p');
          aboutText.prepend(first);
        }
        first.textContent = row.bio;
      }

      const contactDesc = document.querySelector('#contact .sec-desc');
      if (contactDesc) contactDesc.textContent = row.bio;
    }

    if (row.linkedin_url) {
      document.querySelectorAll('a[href*="linkedin.com/in/ameerinsha110"]').forEach(a => {
        a.href = row.linkedin_url;
      });
    }

    if (row.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        a.href = `mailto:${row.email}`;
        if (a.closest('.contact-email')) a.textContent = row.email;
      });

      const contactEmail = document.querySelector('#contact .contact-email');
      if (contactEmail) {
        const emailLink = contactEmail.querySelector('a[href^="mailto:"]');
        if (emailLink) emailLink.textContent = row.email;
      }
    }

    if (row.whatsapp) {
      const digits = String(row.whatsapp).replace(/\D/g,'');
      if (digits) {
        document.querySelectorAll('a.whatsapp-btn, a[href*="wa.me/"]').forEach(a => {
          a.href = `https://wa.me/${digits}?text=${encodeURIComponent("Hi Ameer, I'd like to connect.")}`;
        });
      }

      const contactEmail = document.querySelector('#contact .contact-email');
      if (contactEmail) {
        const emailLink = contactEmail.querySelector('a[href^="mailto:"]');
        const emailHtml = emailLink ? emailLink.outerHTML : esc(row.email || '');
        contactEmail.innerHTML = `${emailHtml} · ${esc(row.whatsapp)}`;
      }
    }

    if (row.resume_url) {
      document.querySelectorAll('a[href*="resume"], a[data-profile-resume]').forEach(a => {
        a.href = resolveMedia(row.resume_url);
      });
    }

    if (row.avatar_url) {
      const avatarSelectors = [
        '.nav-avatar img',
        '#ameer-cinematic-loader .loader-avatar',
        '.guide-bot .face-head img',
        '.bot-head.face-head img'
      ];
      document.querySelectorAll(avatarSelectors.join(',')).forEach(img => {
        img.src = resolveMedia(row.avatar_url);
      });
    }

    document.documentElement.dataset.profileSource = 'supabase';
  }

  async function boot() {
    await Promise.allSettled([
      hydrateServices(),
      hydrateProjects(),
      hydrateExperience(),
      hydrateEducation(),
      hydrateResearch(),
      hydrateSkills(),
      hydrateCredentials(),
      hydrateProfile()
    ]);
    document.documentElement.dataset.supabaseHydrated='true';
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  } else {
    boot();
  }
}
