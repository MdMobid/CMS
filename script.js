    // ════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════
    const S = {
      classes: JSON.parse(localStorage.getItem('lms_classes') || '[]'),
      currentClass: localStorage.getItem('lms_current') || '',
      students: {},    // {classId: [{roll,name}]}
      attendance: {},  // {classId: [{roll,date,present}]}
      marks: {},       // {classId: [{roll,quiz_no,marks,max_marks}]}
      sortStudents: 'roll', sortMarks: 'roll', sortProgress: 'roll', sortReport: 'rank',
    };

    function getStudents(cid) { return S.students[cid] || [] }
    function getAttendance(cid) { return S.attendance[cid] || [] }
    function getMarks(cid) { return S.marks[cid] || [] }
    function formatDate(date) {
      if (!date) return '';
      const d = date.split('-');
      return d.length === 3 ? `${d[2]}-${d[1]}-${d[0]}` : date;
    }

    function persist() {
      localStorage.setItem('lms_classes', JSON.stringify(S.classes));
      localStorage.setItem('lms_current', S.currentClass);
      localStorage.setItem('lms_students', JSON.stringify(S.students));
      localStorage.setItem('lms_attendance', JSON.stringify(S.attendance));
      localStorage.setItem('lms_marks', JSON.stringify(S.marks));
    }

    // Load persisted data
    (() => {
      try { S.students = JSON.parse(localStorage.getItem('lms_students') || '{}') } catch (e) { }
      try { S.attendance = JSON.parse(localStorage.getItem('lms_attendance') || '{}') } catch (e) { }
      try { S.marks = JSON.parse(localStorage.getItem('lms_marks') || '{}') } catch (e) { }
    })();

    // ════════════════════════════════════════════
    // NAVIGATION
    // ════════════════════════════════════════════
    let curPage = 'dashboard';
    function nav(id) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('page-' + id).classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(b => { if (b.textContent.trim().toLowerCase().startsWith(id.slice(0, 4))) b.classList.add('active') });
      curPage = id;
      if (id === 'dashboard') refreshDashboard();
      if (id === 'classes') renderClasses();
      if (id === 'students') renderStudents();
      if (id === 'attendance') { setDefaultDate(); renderAttGrid(); renderAttRecords(); }
      if (id === 'marks') renderMarksTable();
      if (id === 'progress') renderProgress();
      if (id === 'report') renderReport();
    }

    // ════════════════════════════════════════════
    // TOAST
    // ════════════════════════════════════════════
    function toast(msg, type = 'ok') {
      const el = document.createElement('div');
      el.className = `toast-item toast-${type}`;
      el.textContent = (type === 'ok' ? '✓ ' : type === 'err' ? '✕ ' : 'ℹ ') + msg;
      document.getElementById('toast').appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }

    // ════════════════════════════════════════════
    // CLASSES
    // ════════════════════════════════════════════
    function generateSectionId() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let id = 'SEC-';
      for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
      return id;
    }

    function addClass() {
      const section = document.getElementById('new-section-name').value.trim();
      const subject = document.getElementById('new-subject-name').value.trim();
      if (!section || !subject) { toast('Fill in both fields', 'err'); return }
      let id;
      do { id = generateSectionId(); } while (S.classes.find(c => c.id === id));
      S.classes.push({ id, section, subject });
      S.students[id] = S.students[id] || [];
      S.attendance[id] = S.attendance[id] || [];
      S.marks[id] = S.marks[id] || [];
      persist(); renderClasses(); refreshClassSelect(); refreshDashboard();
      document.getElementById('new-section-name').value = '';
      document.getElementById('new-subject-name').value = '';
      toast(`Section added`);
    }

    function deleteClass(id) {
      const cls = S.classes.find(c => c.id === id);
      const displayName = cls && cls.section && cls.subject ? `${cls.section} - ${cls.subject}` : (cls ? cls.name : id);
      if (!confirm(`Delete "${displayName}" and ALL its data?`)) return;
      S.classes = S.classes.filter(c => c.id !== id);
      delete S.students[id]; delete S.attendance[id]; delete S.marks[id];
      if (S.currentClass === id) { S.currentClass = ''; localStorage.setItem('lms_current', ''); }
      persist(); renderClasses(); refreshClassSelect(); refreshDashboard();
      toast(`Section deleted`, 'info');
    }

    function renderClasses() {
      const el = document.getElementById('class-cards-list');
      if (!S.classes.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🏫</div>No sections yet. Add one above.</div>'; return }
      el.innerHTML = S.classes.map(c => {
        const displayName = c.section && c.subject ? `${c.section} - ${c.subject}` : (c.name || c.section || 'Unnamed');
        return `
    <div class="class-card ${S.currentClass === c.id ? 'selected' : ''}" onclick="switchClass('${c.id}')">
      <button class="class-del" onclick="event.stopPropagation();deleteClass('${c.id}')">✕</button>
      <div class="class-card-id">Section</div>
      <div class="class-card-name">${displayName}</div>
      <div class="class-card-meta">${getStudents(c.id).length} students · ${[...new Set(getAttendance(c.id).map(a => a.date))].length} days</div>
    </div>`;
      }).join('');
    }

    function refreshClassSelect() {
      const sel = document.getElementById('class-select');
      const cur = sel.value;
      sel.innerHTML = '<option value="">— select section —</option>' +
        S.classes.map(c => {
          const displayName = c.section && c.subject ? `${c.section} - ${c.subject}` : (c.name || c.section || 'Unnamed');
          return `<option value="${c.id}" ${S.currentClass === c.id ? 'selected' : ''}>${displayName}</option>`;
        }).join('');
    }

    function switchClass(id) {
      S.currentClass = id;
      localStorage.setItem('lms_current', id);
      refreshClassSelect();
      const cls = S.classes.find(c => c.id === id);
      const displayName = cls && cls.section && cls.subject ? `${cls.section} - ${cls.subject}` : (cls ? cls.name : 'No section selected');
      document.getElementById('top-class-name').textContent = displayName;
      renderClasses();
      refreshDashboard();
      if (curPage === 'students') renderStudents();
      if (curPage === 'attendance') { renderAttGrid(); renderAttRecords(); }
      if (curPage === 'marks') renderMarksTable();
      if (curPage === 'progress') renderProgress();
      if (curPage === 'report') renderReport();
      toast(`Switched to ${displayName}`, 'info');
    }

    // ════════════════════════════════════════════
    // DASHBOARD
    // ════════════════════════════════════════════
    function refreshDashboard() {
      document.getElementById('d-classes').textContent = S.classes.length;
      const cid = S.currentClass;
      document.getElementById('d-students').textContent = cid ? getStudents(cid).length : '—';
      const days = cid ? [...new Set(getAttendance(cid).map(a => a.date))].length : '—';
      document.getElementById('d-days').textContent = days;
      const quizzes = cid ? [...new Set(getMarks(cid).map(m => m.quiz_no))].length : '—';
      document.getElementById('d-quizzes').textContent = quizzes;
    }

    // ════════════════════════════════════════════
    // STUDENTS
    // ════════════════════════════════════════════
    let _stuSearch = '';
    function addStudent() {
      if (!S.currentClass) { toast('Select a class first', 'err'); return }
      const roll = parseInt(document.getElementById('new-stu-roll').value);
      const name = document.getElementById('new-stu-name').value.trim();
      if (!roll || !name) { toast('Fill roll & name', 'err'); return }
      const list = getStudents(S.currentClass);
      if (list.find(s => s.roll === roll)) { toast('Roll already exists in this class', 'err'); return }
      list.push({ roll, name });
      S.students[S.currentClass] = list;
      persist(); renderStudents(); refreshDashboard();
      document.getElementById('new-stu-roll').value = '';
      document.getElementById('new-stu-name').value = '';
      toast(`${name} added`);
    }

    function addBulkStudents() {
      if (!S.currentClass) { toast('Select a class first', 'err'); return; }
      const text = document.getElementById('bulk-stu-data').value.trim();
      if (!text) { toast('Paste some data first', 'err'); return; }

      const lines = text.split('\n');
      const list = getStudents(S.currentClass);
      let added = 0;
      let skipped = 0;

      lines.forEach(line => {
        // Handle tab separation or space separation (fallback)
        let parts = line.split('\t');
        if (parts.length < 2) {
          parts = line.trim().split(/\s+(.*)/);
        }

        if (parts.length >= 2) {
          const roll = parseInt(parts[0]);
          const name = parts[1] ? parts[1].trim() : '';

          if (!isNaN(roll) && name) {
            if (!list.find(s => s.roll === roll)) {
              list.push({ roll, name });
              added++;
            } else {
              skipped++;
            }
          } else {
            skipped++; // Invalid number or empty name
          }
        } else if (line.trim().length > 0) {
          skipped++; // Not enough parts but line wasn't empty
        }
      });

      if (added > 0) {
        S.students[S.currentClass] = list;
        persist(); renderStudents(); refreshDashboard();
        document.getElementById('bulk-stu-data').value = '';
        toast(`Added ${added} students${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
      } else {
        toast('No valid students found or all already exist', 'err');
      }
    }

    function delStudent(roll) {
      if (!confirm('Remove this student?')) return;
      S.students[S.currentClass] = (S.students[S.currentClass] || []).filter(s => s.roll !== roll);
      persist(); renderStudents(); refreshDashboard();
      toast('Student removed', 'info');
    }

    function sortStudents(by) {
      S.sortStudents = by;
      renderStudents();
    }
    function filterStudents(v) { _stuSearch = v.toLowerCase(); renderStudents(); }

    function renderStudents() {
      let list = [...getStudents(S.currentClass || '')];
      if (_stuSearch) list = list.filter(s => s.name.toLowerCase().includes(_stuSearch) || String(s.roll).includes(_stuSearch));
      if (S.sortStudents === 'roll') list.sort((a, b) => a.roll - b.roll);
      else list.sort((a, b) => a.name.localeCompare(b.name));
      const tb = document.getElementById('students-tbody');
      if (!list.length) { tb.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:30px">No students found</td></tr>'; return }
      tb.innerHTML = list.map(s => `<tr>
    <td class="mono">${s.roll}</td>
    <td>${s.name}</td>
    <td><button class="btn btn-red btn-sm" onclick="delStudent(${s.roll})">Remove</button></td>
  </tr>`).join('');
    }

    // ════════════════════════════════════════════
    // ATTENDANCE
    // ════════════════════════════════════════════
    function setDefaultDate() {
      const d = document.getElementById('att-date');
      if (!d.value) d.value = new Date().toISOString().split('T')[0];
    }

    // attendance state per student in current session {roll: 0|1|null}
    const attState = {};

    function renderAttGrid() {
      const cid = S.currentClass; if (!cid) { document.getElementById('att-grid').innerHTML = '<div class="empty">Select a class first</div>'; return }
      const stus = getStudents(cid);
      if (!stus.length) { document.getElementById('att-grid').innerHTML = '<div class="empty">No students in this class</div>'; return }
      // Load existing for selected date
      const date = document.getElementById('att-date').value;
      const existing = getAttendance(cid).filter(a => a.date === date);
      stus.forEach(s => {
        const rec = existing.find(a => a.roll === s.roll);
        attState[s.roll] = rec ? rec.present : 0;
      });
      document.getElementById('att-grid').innerHTML = stus.map(s => {
        const v = attState[s.roll];
        return `<div class="att-row">
      <span class="att-roll">${s.roll}</span>
      <span class="att-name">${s.name}</span>
      <div class="att-btns">
        <label class="custom-check-lbl">
          <input type="checkbox" id="att-cb-${s.roll}" class="custom-checkbox"
            ${v === 1 ? 'checked' : ''} 
            onchange="setAtt(${s.roll}, this.checked ? 1 : 0)"
            onkeydown="if(event.key==='Enter') { event.preventDefault(); this.click(); }" />
          <div class="custom-box"></div>
        </label>
      </div>
    </div>`;
      }).join('');
    }

    document.getElementById('att-date').addEventListener('change', () => { if (S.currentClass) { renderAttGrid(); } });

    function setAtt(roll, val) {
      if (attState[roll] === val) return;
      attState[roll] = val;
      const cb = document.getElementById('att-cb-' + roll);
      if (cb) cb.checked = (val === 1);
      saveAttendance(true);
    }

    function markAll(val) {
      const stus = getStudents(S.currentClass || '');
      stus.forEach(s => {
        attState[s.roll] = val;
        const cb = document.getElementById('att-cb-' + s.roll);
        if (cb) cb.checked = (val === 1);
      });
      saveAttendance(true);
    }

    function saveAttendance(silent = false) {
      const cid = S.currentClass; if (!cid) { if (!silent) toast('Select a class', 'err'); return }
      const date = document.getElementById('att-date').value;
      if (!date) { if (!silent) toast('Select a date', 'err'); return }
      // Remove existing for this date
      S.attendance[cid] = (S.attendance[cid] || []).filter(a => a.date !== date);
      const stus = getStudents(cid);
      stus.forEach(s => { if (attState[s.roll] !== null && attState[s.roll] !== undefined) S.attendance[cid].push({ roll: s.roll, date, present: attState[s.roll] }); });
      persist(); renderAttRecords(); refreshDashboard();
      if (!silent) toast('Attendance saved for ' + formatDate(date));
    }

    function finishAttendance() {
      saveAttendance(false);
      document.getElementById('att-grid').innerHTML = '';
      setDefaultDate();
    }

    function renderAttRecords() {
      const cid = S.currentClass; if (!cid) { document.getElementById('att-records-tbody').innerHTML = ''; return }
      const date = document.getElementById('att-date').value;
      const recs = getAttendance(cid).filter(r => r.date === date).sort((a, b) => a.roll - b.roll);
      const stus = getStudents(cid);
      const getName = r => { const s = stus.find(x => x.roll === r); return s ? s.name : `Roll ${r}`; };
      const tb = document.getElementById('att-records-tbody');
      if (!recs.length) { tb.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">No records for ${formatDate(date)}</td></tr>`; return }
      tb.innerHTML = recs.map(r => `<tr>
    <td class="mono">${r.roll}</td>
    <td>${getName(r.roll)}</td>
    <td class="mono">${formatDate(r.date)}</td>
    <td><span class="badge ${r.present ? 'badge-green' : 'badge-red'}">${r.present ? 'Present' : 'Absent'}</span></td>
  </tr>`).join('');
    }

    // ════════════════════════════════════════════
    // QUIZ MARKS
    // ════════════════════════════════════════════
    let quizEntryData = {}; // {roll: marks}
    let quizEntryNo = 1, quizEntryMax = 20;

    function loadQuizEntryGrid() {
      const cid = S.currentClass; if (!cid) { toast('Select a class', 'err'); return }
      quizEntryNo = parseInt(document.getElementById('quiz-no').value) || 1;
      quizEntryMax = parseFloat(document.getElementById('quiz-max').value) || 20;
      const stus = getStudents(cid);
      if (!stus.length) { toast('No students in class', 'err'); return }
      // Pre-fill existing
      const existing = getMarks(cid).filter(m => m.quiz_no === quizEntryNo);
      quizEntryData = {};
      existing.forEach(m => quizEntryData[m.roll] = m.marks);
      document.getElementById('quiz-entry-grid').innerHTML = `
    <div class="att-row-hd" style="margin-top:14px"><span>Roll</span><span>Name</span><span>Marks (/${quizEntryMax})</span></div>` +
        stus.map(s => `
    <div class="att-row">
      <span class="att-roll">${s.roll}</span>
      <span class="att-name">${s.name}</span>
      <input class="quiz-input" type="number" min="0" max="${quizEntryMax}" step="0.5"
        value="${quizEntryData[s.roll] !== undefined ? quizEntryData[s.roll] : ''}"
        id="qi-${s.roll}" placeholder="—" oninput="saveAllMarks(true)"/>
    </div>`).join('');
    }

    function saveAllMarks(silent = false) {
      const cid = S.currentClass; if (!cid) { if (!silent) toast('Select a class', 'err'); return }
      const stus = getStudents(cid);
      let saved = 0;
      let hasError = false;
      stus.forEach(s => {
        const inp = document.getElementById('qi-' + s.roll);
        if (!inp || inp.value === '') {
          // If empty, remove the old marks if previously set
          S.marks[cid] = (S.marks[cid] || []).filter(m => !(m.roll === s.roll && m.quiz_no === quizEntryNo));
          return;
        }
        const marks = parseFloat(inp.value);
        if (isNaN(marks) || marks < 0 || marks > quizEntryMax) {
          hasError = true;
          return;
        }
        // remove old and save new
        S.marks[cid] = (S.marks[cid] || []).filter(m => !(m.roll === s.roll && m.quiz_no === quizEntryNo));
        S.marks[cid].push({ roll: s.roll, quiz_no: quizEntryNo, marks, max_marks: quizEntryMax });
        saved++;
      });
      persist(); renderMarksTable(); refreshDashboard();
      if (!silent) {
        if (hasError) toast(`Saved valid marks, some errors skipped`, 'err');
        else toast(`Saved marks for Quiz ${quizEntryNo} (${saved} students)`);
      }
    }

    function finishMarks() {
      saveAllMarks(false);
      document.getElementById('quiz-no').value = '';
      document.getElementById('quiz-max').value = '';
      document.getElementById('quiz-entry-grid').innerHTML = '';
    }

    let _marksSort = 'roll';
    function sortMarks(by) {
      _marksSort = by;
      renderMarksTable();
    }

    function renderMarksTable() {
      const cid = S.currentClass;
      const wrap = document.getElementById('marks-table-wrap');
      if (!cid || !getMarks(cid).length) { wrap.innerHTML = '<div class="empty"><div class="empty-icon">📝</div>No marks recorded yet</div>'; return }
      const stus = getStudents(cid);
      const mrks = getMarks(cid);
      const quizNos = [...new Set(mrks.map(m => m.quiz_no))].sort((a, b) => a - b);
      // Build per-student summary
      let rows = stus.map(s => {
        const sm = mrks.filter(m => m.roll === s.roll);
        let total = 0, maxTotal = 0;
        const qScores = quizNos.map(q => {
          const r = sm.find(m => m.quiz_no === q);
          if (r) { total += r.marks; maxTotal += r.max_marks; return r.marks + '/' + r.max_marks; }
          return '—';
        });
        const pct = maxTotal ? ((total / maxTotal) * 100).toFixed(1) + '%' : '—';
        return { roll: s.roll, name: s.name, qScores, total, maxTotal, pct };
      });
      if (_marksSort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name));
      else if (_marksSort === 'total') rows.sort((a, b) => b.total - a.total);
      else rows.sort((a, b) => a.roll - b.roll);
      wrap.innerHTML = `<div class="tbl-wrap"><table>
    <thead><tr><th>Roll</th><th>Name</th>${quizNos.map(q => `<th>Quiz ${q}</th>`).join('')}<th>Total</th><th>%</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="mono">${r.roll}</td>
      <td>${r.name}</td>
      ${r.qScores.map(s => `<td class="mono">${s}</td>`).join('')}
      <td class="mono">${r.total}/${r.maxTotal || '—'}</td>
      <td><span class="badge ${gradeColor(r.pct)}">${r.pct}</span></td>
    </tr>`).join('')}
    </tbody>
  </table></div>`;
    }

    function gradeColor(pct) {
      if (pct === '—') return 'badge-cyan';
      const v = parseFloat(pct);
      if (v >= 75) return 'badge-green';
      if (v >= 50) return 'badge-amber';
      return 'badge-red';
    }

    // ════════════════════════════════════════════
    // PROGRESS PIE CHARTS
    // ════════════════════════════════════════════
    let _progSort = 'roll', _progFilter = '';
    function sortProgress(by) { _progSort = by; renderProgress(); }
    function filterProgress(v) { _progFilter = v.toLowerCase(); renderProgress(); }

    function renderProgress() {
      const cid = S.currentClass;
      const grid = document.getElementById('progress-grid');
      if (!cid) { grid.innerHTML = '<div class="empty"><div class="empty-icon">📊</div>Select a class first</div>'; return }
      let stus = [...getStudents(cid)];
      if (_progFilter) stus = stus.filter(s => s.name.toLowerCase().includes(_progFilter) || String(s.roll).includes(_progFilter));
      const mrks = getMarks(cid);
      const atts = getAttendance(cid);
      const allDates = [...new Set(atts.map(a => a.date))];

      let data = stus.map(s => {
        const sm = mrks.filter(m => m.roll === s.roll);
        const total = sm.reduce((a, m) => a + m.marks, 0);
        const maxTotal = sm.reduce((a, m) => a + m.max_marks, 0);
        const markPct = maxTotal ? (total / maxTotal * 100) : 0;
        const pres = atts.filter(a => a.roll === s.roll && a.present).length;
        const attDays = atts.filter(a => a.roll === s.roll).length;
        const attPct = attDays ? (pres / attDays * 100) : 0;
        return { roll: s.roll, name: s.name, total, maxTotal, markPct, pres, attDays, attPct, score: (markPct + attPct) / 2 };
      });
      if (_progSort === 'name') data.sort((a, b) => a.name.localeCompare(b.name));
      else if (_progSort === 'score') data.sort((a, b) => b.score - a.score);
      else data.sort((a, b) => a.roll - b.roll);

      if (!data.length) { grid.innerHTML = '<div class="empty"><div class="empty-icon">🎓</div>No students found</div>'; return }
      grid.innerHTML = data.map((s, i) => ` 
    <div class="prog-card" style="animation-delay:${i * 0.04}s">
      <div class="prog-header">
        <span class="prog-roll">${s.roll}</span>
        <span class="prog-name">${s.name}</span>
      </div>
      <div class="pie-wrap">
        <canvas id="pie-${s.roll}" width="120" height="120"></canvas>
      </div>
      <div class="prog-stats">
        <div class="prog-stat"><div class="prog-stat-val">${s.markPct.toFixed(0)}%</div><div class="prog-stat-lbl">Marks</div></div>
        <div class="prog-stat"><div class="prog-stat-val">${s.attPct.toFixed(0)}%</div><div class="prog-stat-lbl">Attend.</div></div>
        <div class="prog-stat"><div class="prog-stat-val">${s.score.toFixed(0)}%</div><div class="prog-stat-lbl">Overall</div></div>
      </div>
    </div>`).join('');
      // Draw pies after DOM update
      requestAnimationFrame(() => {
        data.forEach(s => drawPie('pie-' + s.roll, s.markPct, s.attPct, s.score));
      });
    }

    function drawPie(id, markPct, attPct, overall) {
      const canvas = document.getElementById(id); if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const cx = 60, cy = 60, r = 50, lw = 14;
      ctx.clearRect(0, 0, 120, 120);

      function arc(start, end, color) {
        ctx.beginPath(); ctx.arc(cx, cy, r, start, end);
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      }

      // Background ring
      arc(0, Math.PI * 2, 'rgba(255,255,255,0.06)');

      // Marks arc (outer) - cyan
      const markEnd = -Math.PI / 2 + (Math.PI * 2) * (markPct / 100);
      arc(-Math.PI / 2, markEnd, '#22d3ee');

      // Attendance arc (inner)
      const r2 = r - lw - 4;
      ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 10; ctx.stroke();
      const attEnd = -Math.PI / 2 + (Math.PI * 2) * (attPct / 100);
      ctx.beginPath(); ctx.arc(cx, cy, r2, -Math.PI / 2, attEnd);
      ctx.strokeStyle = '#10b981'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke();

      // Center text
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 14px Syne,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(overall.toFixed(0) + '%', cx, cy);
    }

    // ════════════════════════════════════════════
    // FULL REPORT
    // ════════════════════════════════════════════
    let _reportSort = 'rank';
    function sortReport(by) { _reportSort = by; renderReport(); }

    function renderReport() {
      const cid = S.currentClass;
      const sum = document.getElementById('report-summary');
      const tb = document.getElementById('report-tbody');
      if (!cid) { sum.innerHTML = ''; tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px">Select a class first</td></tr>'; return }
      const stus = getStudents(cid);
      const mrks = getMarks(cid);
      const atts = getAttendance(cid);
      const allDates = [...new Set(atts.map(a => a.date))];

      let rows = stus.map(s => {
        const sm = mrks.filter(m => m.roll === s.roll);
        const total = sm.reduce((a, m) => a + m.marks, 0);
        const maxT = sm.reduce((a, m) => a + m.max_marks, 0);
        const markPct = maxT ? (total / maxT * 100) : 0;
        const pres = atts.filter(a => a.roll === s.roll && a.present).length;
        const attDays = atts.filter(a => a.roll === s.roll).length;
        const attPct = attDays ? (pres / attDays * 100) : 0;
        const overall = (markPct + attPct) / 2;
        return { roll: s.roll, name: s.name, total, maxT, markPct, pres, attDays, attPct, overall };
      });

      const avgAtt = rows.length ? rows.reduce((a, r) => a + r.attPct, 0) / rows.length : 0;
      const avgMrk = rows.length ? rows.reduce((a, r) => a + r.markPct, 0) / rows.length : 0;
      const top = rows.reduce((a, r) => r.overall > a.overall ? r : a, { overall: -1 });

      sum.innerHTML = `
    <div class="report-card"><div class="report-card-title">Avg Attendance</div>
      <div class="big-num">${avgAtt.toFixed(1)}%</div>
      <div class="bar-wrap"><div class="bar-bg"><div class="bar-fill" style="width:${avgAtt}%;background:var(--green)"></div></div></div>
    </div>
    <div class="report-card"><div class="report-card-title">Avg Marks</div>
      <div class="big-num">${avgMrk.toFixed(1)}%</div>
      <div class="bar-wrap"><div class="bar-bg"><div class="bar-fill" style="width:${avgMrk}%;background:var(--cyan)"></div></div></div>
    </div>
    <div class="report-card"><div class="report-card-title">Top Performer</div>
      <div style="font-size:15px;font-weight:500;color:var(--amber);margin:8px 0">${top.name || '—'}</div>
      <div style="font-size:12px;color:var(--muted)">Overall: ${top.overall ? top.overall.toFixed(1) + '%' : '—'}</div>
    </div>`;

      // Sort
      rows.sort((a, b) => b.overall - a.overall);
      const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
      if (_reportSort === 'name') ranked.sort((a, b) => a.name.localeCompare(b.name));
      else if (_reportSort === 'att') ranked.sort((a, b) => b.attPct - a.attPct);
      else if (_reportSort === 'marks') ranked.sort((a, b) => b.markPct - a.markPct);
      // else by rank

      function grade(p) { if (p >= 90) return 'O'; if (p >= 75) return 'A+'; if (p >= 60) return 'A'; if (p >= 50) return 'B'; if (p >= 40) return 'C'; return 'F'; }
      function gradeClr(g) { return { O: 'badge-cyan', 'A+': 'badge-green', A: 'badge-green', B: 'badge-amber', C: 'badge-amber', F: 'badge-red' }[g] || 'badge-cyan'; }

      tb.innerHTML = ranked.map(r => `<tr>
    <!-- <td class="mono">${r.rank}</td> -->
    <td class="mono">${r.roll}</td>
    <td>${r.name}</td>
    <td><span class="badge ${r.attPct >= 75 ? 'badge-green' : 'badge-red'}">${r.attPct.toFixed(1)}%</span></td>
    <td class="mono">${r.total}/${r.maxT || '—'}</td>
    <td class="mono">${r.overall.toFixed(1)}%</td>
    <td><span class="badge ${gradeClr(grade(r.overall))}">${grade(r.overall)}</span></td>
  </tr>`).join('');
    }

    // ════════════════════════════════════════════
    // EXPORT
    // ════════════════════════════════════════════
    function exportCSV(type) {
      const cid = S.currentClass; if (!cid) { toast('Select a class', 'err'); return }
      const cls = S.classes.find(c => c.id === cid);
      const baseName = cls && cls.section && cls.subject ? `${cls.section}-${cls.subject}` : cid;
      let csv = '', filename = '';
      if (type === 'attendance') {
        const stus = getStudents(cid);
        const getName = r => { const s = stus.find(x => x.roll === r); return s ? s.name : `Roll ${r}`; };
        csv = 'Roll,Name,Date,Status\n';
        getAttendance(cid).forEach(a => { csv += `${a.roll},"${getName(a.roll)}",${formatDate(a.date)},${a.present ? 'Present' : 'Absent'}\n`; });
        filename = `${baseName}_attendance.csv`;
      } else {
        const stus = getStudents(cid);
        const getName = r => { const s = stus.find(x => x.roll === r); return s ? s.name : `Roll ${r}`; };
        csv = 'Roll,Name,Quiz No,Marks,Max Marks\n';
        getMarks(cid).forEach(m => { csv += `${m.roll},"${getName(m.roll)}",${m.quiz_no},${m.marks},${m.max_marks}\n`; });
        filename = `${baseName}_marks.csv`;
      }
      dlBlob(csv, 'text/csv', filename);
      toast('CSV exported');
    }

    function exportXLSX(type) {
      // Since we're running in browser, generate a styled XLSX using SheetJS (CDN)
      const cid = S.currentClass; if (!cid) { toast('Select a class', 'err'); return }
      // Load SheetJS dynamically
      if (!window.XLSX) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = () => doExportXLSX(type, cid);
        s.onerror = () => toast('SheetJS not available, exporting CSV instead', 'info') || exportCSV(type);
        document.head.appendChild(s);
      } else doExportXLSX(type, cid);
    }

    function doExportXLSX(type, cid) {
      const XLSX = window.XLSX;
      const cls = S.classes.find(c => c.id === cid);
      const baseName = cls && cls.section && cls.subject ? `${cls.section}-${cls.subject}` : cid;
      const stus = getStudents(cid);
      const getName = r => { const s = stus.find(x => x.roll === r); return s ? s.name : `Roll ${r}`; };
      let ws_data = []; let filename = '';

      if (type === 'attendance') {
        const atts = getAttendance(cid);
        const dates = [...new Set(atts.map(a => a.date))].sort();
        const datesFormatted = dates.map(d => formatDate(d));
        ws_data.push(['Roll', 'Name', ...datesFormatted, 'Total Present', 'Total Days', 'Attendance %']);
        stus.forEach(s => {
          const row = [s.roll, s.name];
          let pres = 0, days = 0;
          dates.forEach(d => {
            const rec = atts.find(a => a.roll === s.roll && a.date === d);
            if (rec) { row.push(rec.present ? 'P' : 'A'); if (rec.present) pres++; days++; } else row.push('');
          });
          row.push(pres, days, days ? ((pres / days) * 100).toFixed(1) + '%' : 'N/A');
          ws_data.push(row);
        });
        filename = `${baseName}_attendance.xlsx`;
      } else {
        const mrks = getMarks(cid);
        const quizNos = [...new Set(mrks.map(m => m.quiz_no))].sort((a, b) => a - b);
        const hdr = ['Roll', 'Name'];
        quizNos.forEach(q => { hdr.push(`Quiz ${q} Marks`, `Quiz ${q} Max`); });
        hdr.push('Total Marks', 'Max Marks', 'Overall %');
        ws_data.push(hdr);
        stus.forEach(s => {
          const row = [s.roll, s.name];
          let tot = 0, maxTot = 0;
          quizNos.forEach(q => {
            const rec = mrks.find(m => m.roll === s.roll && m.quiz_no === q);
            if (rec) { row.push(rec.marks, rec.max_marks); tot += rec.marks; maxTot += rec.max_marks; }
            else row.push('', '');
          });
          row.push(tot, maxTot || '', maxTot ? ((tot / maxTot) * 100).toFixed(1) + '%' : '—');
          ws_data.push(row);
        });
        filename = `${baseName}_marks.xlsx`;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      // Column widths
      ws['!cols'] = [{ wch: 8 }, { wch: 22 }, ...Array(ws_data[0].length - 2).fill({ wch: 14 })];
      XLSX.utils.book_append_sheet(wb, ws, type === 'attendance' ? 'Attendance' : 'Marks');
      XLSX.writeFile(wb, filename);
      toast('XLSX exported successfully');
    }

    function dlBlob(content, mime, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: mime }));
      a.download = filename; a.click();
    }

    // ════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════
    refreshClassSelect();
    if (S.currentClass) {
      const cls = S.classes.find(c => c.id === S.currentClass);
      if (cls) {
        const displayName = cls.section && cls.subject ? `${cls.section} - ${cls.subject}` : (cls.name || cls.section || 'Unnamed');
        document.getElementById('top-class-name').textContent = displayName;
      }
    }
    refreshDashboard();
    // Set today's date in attendance
    document.getElementById('att-date').value = new Date().toISOString().split('T')[0];
