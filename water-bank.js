(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const adminView = new URLSearchParams(location.search).get('admin') === '1';
  document.body.classList.toggle('admin-view', adminView);
  const labels = { pending: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ', scheduled: 'มีตารางจัดสรร', partially_delivered: 'ส่งน้ำบางส่วน', completed: 'ส่งน้ำครบตามอนุมัติ', active: 'ใช้งาน', maintenance: 'บำรุงรักษา', inactive: 'หยุดใช้งาน' };
  const sourceLabels = { recharge_well: 'บ่อเติมน้ำใต้ดิน · เติมน้ำ', irrigation_well: 'บ่อสูบใช้งาน · สูบน้ำจัดสรร' };
  const fmt = (value) => Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 });
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const say = (message, error = false) => { $('alert').textContent = message; $('alert').classList.toggle('error', error); $('alert').style.display = message ? 'block' : 'none'; };
  let client, session, communities = [], sources = [], requests = [], allocations = [], deliveries = [], staff = [], currentRequest;

  function ensureClient() {
    if (client) return client;
    const config = window.RICE_DOCTOR_SUPABASE_DEFAULT;
    if (!window.supabase?.createClient || !config?.url || !config?.key) throw new Error('เชื่อมต่อระบบฐานข้อมูลไม่สำเร็จ');
    client = window.supabase.createClient(config.url, config.key);
    return client;
  }
  function requireRealUser() {
    if (!session?.user || session.user.is_anonymous || !session.user.email_confirmed_at) throw new Error('เข้าสู่ระบบด้วยบัญชีอีเมลที่ยืนยันแล้วของ RICE DOCTOR ก่อนใช้งานธนาคารน้ำ');
  }
  function setAdminSections(allowed) {
    $('adminDenied').hidden = !adminView || allowed;
    $('adminStats').hidden = !adminView || !allowed;
    $('managerPanel').hidden = !adminView || !allowed;
    $('sourceRegister').hidden = !adminView || !allowed;
    $('deliverySection').hidden = !adminView || !allowed;
    $('farmerPanel').hidden = adminView;
    $('reviewSection').hidden = adminView && !allowed;
    $('adminDashboardLink').hidden = !allowed;
    if (adminView && allowed) {
      $('pageTitle').textContent = 'Admin dashboard · ธนาคารน้ำชุมชน';
      $('requestTableTitle').textContent = 'คำขอและตารางจัดสรร';
      $('roleHint').textContent = `คณะกรรมการ/ผู้ดูแล · ${staff.length} ชุมชน`;
    }
  }
  async function loadAll() {
    const db = ensureClient();
    const auth = await db.auth.getSession();
    if (auth.error) throw auth.error;
    session = auth.data.session;
    const user = session?.user;
    $('identity').textContent = user && !user.is_anonymous ? (user.email || 'บัญชีเกษตรกร') : user ? 'บัญชีชั่วคราว · ต้องเข้าสู่ระบบด้วยอีเมล' : 'ยังไม่ได้เข้าสู่ระบบ';
    $('roleHint').textContent = 'ใช้บัญชี RICE DOCTOR เดิม · ผู้ขอเห็นเฉพาะคำขอของตน';
    if (!user || user.is_anonymous) {
      setAdminSections(false);
      $('communitySelect').innerHTML = '<option value="">เข้าสู่ระบบก่อนเลือกชุมชน</option>';
      $('sourceList').textContent = 'เข้าสู่ระบบด้วยบัญชีอีเมลเพื่อดูแหล่งน้ำที่ชุมชนบันทึก';
      $('requestRows').innerHTML = '<tr><td colspan="6" class="empty">เข้าสู่ระบบเพื่อส่งคำขอและดูข้อมูลที่มีสิทธิ์เข้าถึง</td></tr>';
      $('deliveryRows').innerHTML = '<tr><td colspan="6" class="empty">เข้าสู่ระบบเพื่อดูประวัติการส่งน้ำ</td></tr>';
      $('managerPanel').hidden = true;
      ['sourceCount', 'pendingCount', 'allocatedVolume', 'deliveredVolume'].forEach((id) => { $(id).textContent = '—'; });
      return;
    }
    const [communityRes, staffRes, sourceRes, requestRes, allocationRes, deliveryRes] = await Promise.all([
      db.from('water_communities').select('id,name,region,status').eq('status', 'active').order('name'),
      db.from('water_community_staff').select('community_id,role').eq('user_id', user.id),
      db.from('water_sources').select('*').order('created_at', { ascending: false }),
      db.from('water_requests').select('*').order('created_at', { ascending: false }),
      db.from('water_allocations').select('*').order('scheduled_start'),
      db.from('water_deliveries').select('*').order('delivered_at', { ascending: false })
    ]);
    for (const result of [communityRes, staffRes, sourceRes, requestRes, allocationRes, deliveryRes]) if (result.error) throw result.error;
    communities = communityRes.data || []; staff = staffRes.data || []; sources = sourceRes.data || []; requests = requestRes.data || []; allocations = allocationRes.data || []; deliveries = deliveryRes.data || [];
    const committee = staff.length > 0 && !!user.email_confirmed_at;
    setAdminSections(committee);
    if (!adminView) $('roleHint').textContent = committee ? `บัญชีคณะกรรมการ/ผู้ดูแล · ${staff.length} ชุมชน` : 'บัญชีเกษตรกร · เห็นเฉพาะคำขอของตน';
    const options = '<option value="">เลือกชุมชน</option>' + communities.map((c) => `<option value="${c.id}">${esc(c.name)}${c.region ? ` · ${esc(c.region)}` : ''}</option>`).join('');
    $('communitySelect').innerHTML = options;
    $('sourceCommunity').innerHTML = '<option value="">เลือกชุมชน</option>' + communities.filter((c) => staff.some((s) => s.community_id === c.id)).map((c) => `<option value="${c.id}">${esc(c.name)}${c.region ? ` · ${esc(c.region)}` : ''}</option>`).join('');
    render();
  }
  function sourceCard(s) {
    const edit = adminView && staff.some((x) => x.community_id === s.community_id) ? `<button class="button secondary" data-edit-source="${s.id}">แก้ไข/ปรับสถานะ</button>` : '';
    const community = communities.find((c) => c.id === s.community_id)?.name || 'ชุมชน';
    return `<article class="source-item"><div><strong>${esc(s.name)}</strong><small>${esc(community)} · ${esc(sourceLabels[s.source_type])}</small><small>${esc(s.location_note || 'ไม่ได้ระบุจุดสังเกต')} · ${esc(s.note || '')}</small></div><div><span class="status ${s.status}">${esc(labels[s.status] || s.status)}</span><small>${s.source_type === 'irrigation_well' ? `พร้อมจัดสรร ${fmt(s.available_volume_m3)} ลบ.ม.` : 'แหล่งเติมน้ำ · ไม่นำไปจัดสรรสูบจ่าย'}</small>${edit}</div></article>`;
  }
  function render() {
    const communityMap = new Map(communities.map((c) => [c.id, c.name]));
    const sourceMap = new Map(sources.map((s) => [s.id, s]));
    const requestMap = new Map(requests.map((r) => [r.id, r]));
    $('sourceCount').textContent = sources.filter((s) => s.status === 'active').length;
    $('pendingCount').textContent = requests.filter((r) => r.status === 'pending').length;
    $('allocatedVolume').textContent = fmt(allocations.reduce((sum, a) => sum + Number(a.allocated_volume_m3), 0));
    $('deliveredVolume').textContent = fmt(deliveries.reduce((sum, d) => sum + Number(d.delivered_volume_m3), 0));
    $('sourceList').innerHTML = sources.length ? `<div class="source-list">${sources.map(sourceCard).join('')}</div>` : '<div class="empty">ยังไม่มีข้อมูลแหล่งน้ำที่บันทึกโดยชุมชน</div>';
    $('requestRows').innerHTML = requests.length ? requests.map((r) => {
      const own = r.user_id === session.user.id;
      const manager = adminView && staff.some((x) => x.community_id === r.community_id);
      const planned = allocations.filter((a) => a.request_id === r.id);
      const allocationSummary = planned.length ? planned.map((a) => `<div class="allocation-item"><strong>${esc(sourceMap.get(a.source_id)?.name || 'แหล่งน้ำ')}</strong><small>${fmt(a.allocated_volume_m3)} ลบ.ม. · ${esc(new Date(a.scheduled_start).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }))}–${esc(new Date(a.scheduled_end).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }))}</small>${manager ? `<button class="button secondary" data-delivery="${a.id}">บันทึกส่งจริง</button>` : ''}</div>`).join('') : '<small>ยังไม่มีแผนจัดสรร</small>';
      const actions = manager ? (r.status === 'pending' ? `<button class="button primary" data-review="${r.id}">ตรวจคำขอ</button>` : ['approved', 'scheduled', 'partially_delivered'].includes(r.status) ? `<button class="button secondary" data-schedule="${r.id}">เพิ่มแผนจัดสรร</button>` : '') : '';
      return `<tr><td><strong>${own ? 'คำขอของคุณ' : `ผู้ขอ ${esc(r.user_id.slice(0, 8))}…`}</strong><small>${esc(communityMap.get(r.community_id) || 'ชุมชน')} · ${esc(r.plot_label || 'ไม่ได้ระบุชื่อแปลง')}</small><small>${esc(r.note || '')}</small></td><td>${fmt(r.requested_volume_m3)} ลบ.ม.<small>อนุมัติ ${r.approved_volume_m3 == null ? '—' : fmt(r.approved_volume_m3) + ' ลบ.ม.'}</small></td><td>${esc(r.preferred_start)}<small>ถึง ${esc(r.preferred_end)}</small></td><td><span class="status ${esc(r.status)}">${esc(labels[r.status] || r.status)}</span>${r.review_note ? `<small>${esc(r.review_note)}</small>` : ''}</td><td>${allocationSummary}</td><td><div class="row-actions">${actions}</div></td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">ยังไม่มีคำขอใช้น้ำ</td></tr>';
    $('deliveryRows').innerHTML = deliveries.length ? deliveries.map((d) => {
      const a = allocations.find((x) => x.id === d.allocation_id), r = a && requestMap.get(a.request_id), s = a && sourceMap.get(a.source_id);
      return `<tr><td>${esc(new Date(d.delivered_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }))}</td><td>${r ? esc(r.plot_label || `คำขอ ${r.id.slice(0, 8)}`) : 'คำขอ'}</td><td>${esc(s?.name || 'แหล่งสูบ')}</td><td><strong>${fmt(d.delivered_volume_m3)} ลบ.ม.</strong></td><td>${d.recorded_by === session.user.id ? 'คุณ' : esc(d.recorded_by.slice(0, 8) + '…')}</td><td>${esc(d.note || '—')}</td></tr>`;
    }).join('') : '<tr><td colspan="6" class="empty">ยังไม่มีรายการส่งน้ำที่บันทึกจริง</td></tr>';
    document.querySelectorAll('[data-edit-source]').forEach((button) => button.addEventListener('click', () => beginEditSource(button.dataset.editSource)));
    document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => openReview(button.dataset.review)));
    document.querySelectorAll('[data-schedule]').forEach((button) => button.addEventListener('click', () => openSchedule(button.dataset.schedule)));
    document.querySelectorAll('[data-delivery]').forEach((button) => button.addEventListener('click', () => openDelivery(button.dataset.delivery)));
  }
  function resetSourceForm() { $('sourceForm').reset(); $('sourceEditId').value = ''; $('sourceCapacity').value = '0'; $('sourceSubmit').textContent = 'บันทึกแหล่งน้ำ'; $('sourceCancel').hidden = true; }
  function beginEditSource(id) { const s = sources.find((x) => x.id === id); if (!s) return; $('sourceEditId').value = s.id; $('sourceCommunity').value = s.community_id; $('sourceName').value = s.name; $('sourceType').value = s.source_type; $('sourceStatus').value = s.status; $('sourceLocation').value = s.location_note || ''; $('sourceCapacity').value = s.available_volume_m3; $('sourceNote').value = s.note || ''; $('sourceSubmit').textContent = 'บันทึกการเปลี่ยนแปลง'; $('sourceCancel').hidden = false; $('sourceForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  function setBusy(button, busy, label) { button.disabled = busy; if (busy) { button.dataset.label = button.textContent; button.textContent = label || 'กำลังบันทึก…'; } else if (button.dataset.label) { button.textContent = button.dataset.label; delete button.dataset.label; } }
  $('requestForm').addEventListener('submit', async (event) => { event.preventDefault(); const button = event.submitter; setBusy(button, true); try { requireRealUser(); const start = $('preferredStart').value, end = $('preferredEnd').value; if (end < start) throw new Error('วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่ม'); const { error } = await ensureClient().from('water_requests').insert({ community_id: $('communitySelect').value, plot_label: $('plotName').value.trim() || null, requested_volume_m3: Number($('requestedVolume').value), preferred_start: start, preferred_end: end, note: $('requestNote').value.trim() || null, user_id: session.user.id, status: 'pending' }); if (error) throw error; $('requestForm').reset(); say('ส่งคำขอแล้ว รอคณะกรรมการตรวจสอบ'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } });
  $('sourceForm').addEventListener('submit', async (event) => { event.preventDefault(); const button = $('sourceSubmit'); setBusy(button, true); try { requireRealUser(); const id = $('sourceEditId').value, sourceType = $('sourceType').value, volume = Number($('sourceCapacity').value); if (sourceType === 'recharge_well' && volume !== 0) throw new Error('บ่อเติมน้ำใต้ดินไม่มีปริมาณสูบจัดสรร ให้ตั้งค่าเป็น 0'); const values = { community_id: $('sourceCommunity').value, name: $('sourceName').value.trim(), source_type: sourceType, status: $('sourceStatus').value, location_note: $('sourceLocation').value.trim() || null, available_volume_m3: volume, note: $('sourceNote').value.trim() || null }; const result = id ? await ensureClient().from('water_sources').update(values).eq('id', id) : await ensureClient().from('water_sources').insert({ ...values, created_by: session.user.id }); if (result.error) throw result.error; resetSourceForm(); say(id ? 'ปรับปรุงทะเบียนแหล่งน้ำแล้ว' : 'บันทึกแหล่งน้ำแล้ว'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } });
  $('sourceCancel').addEventListener('click', resetSourceForm);
  function setupSources(communityId) { const available = sources.filter((s) => s.community_id === communityId && s.source_type === 'irrigation_well' && s.status === 'active'); $('allocationSource').innerHTML = available.length ? available.map((s) => `<option value="${s.id}">${esc(s.name)} · พร้อม ${fmt(s.available_volume_m3)} ลบ.ม.</option>`).join('') : '<option value="">ไม่มีบ่อสูบใช้งานที่พร้อมจัดสรร</option>'; }
  function openReview(id) { currentRequest = requests.find((r) => r.id === id); if (!currentRequest) return; $('decisionRequestId').value = id; $('dialogTitle').textContent = `ตรวจคำขอ ${currentRequest.plot_label ? '· ' + currentRequest.plot_label : ''}`; $('decisionNote').value = ''; $('approvedVolumeInput').value = currentRequest.requested_volume_m3; $('approvedVolumeLabel').hidden = false; $('allocationFields').hidden = true; $('approveBtn').hidden = false; $('rejectBtn').hidden = false; $('approveBtn').onclick = approveRequest; $('rejectBtn').onclick = rejectRequest; $('decisionDialog').showModal(); }
  function openSchedule(id) { currentRequest = requests.find((r) => r.id === id); if (!currentRequest) return; $('decisionRequestId').value = id; $('dialogTitle').textContent = 'กำหนดตารางจัดสรรน้ำ'; $('decisionNote').value = ''; $('approvedVolumeLabel').hidden = true; $('approveBtn').hidden = true; $('rejectBtn').hidden = true; $('allocationFields').hidden = false; $('allocationVolume').value = ''; $('scheduledStart').value = ''; $('scheduledEnd').value = ''; setupSources(currentRequest.community_id); $('decisionDialog').showModal(); }
  async function approveRequest() { const button = $('approveBtn'); setBusy(button, true, 'กำลังอนุมัติ…'); try { const approvedVolume = Number($('approvedVolumeInput').value); if (!Number.isFinite(approvedVolume) || approvedVolume <= 0 || approvedVolume > Number(currentRequest.requested_volume_m3)) throw new Error('ปริมาณอนุมัติต้องมากกว่า 0 และไม่เกินปริมาณที่ขอ'); const { error } = await ensureClient().rpc('water_review_request', { p_request_id: $('decisionRequestId').value, p_decision: 'approve', p_approved_volume_m3: approvedVolume, p_note: $('decisionNote').value.trim() || null }); if (error) throw error; $('allocationFields').hidden = false; $('approveBtn').hidden = true; $('rejectBtn').hidden = true; $('allocationVolume').value = approvedVolume; setupSources(currentRequest.community_id); say('คำขออนุมัติแล้ว กำหนดแผนจัดสรรด้วยตนเอง'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } }
  async function rejectRequest() { const button = $('rejectBtn'); setBusy(button, true, 'กำลังบันทึก…'); try { const { error } = await ensureClient().rpc('water_review_request', { p_request_id: $('decisionRequestId').value, p_decision: 'reject', p_approved_volume_m3: null, p_note: $('decisionNote').value.trim() || null }); if (error) throw error; $('decisionDialog').close(); say('บันทึกผลการพิจารณาแล้ว'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } }
  $('scheduleBtn').addEventListener('click', async () => { const button = $('scheduleBtn'); setBusy(button, true); try { const start = new Date($('scheduledStart').value), end = new Date($('scheduledEnd').value); if (!Number.isFinite(+start) || !Number.isFinite(+end)) throw new Error('ระบุเวลาเริ่มและสิ้นสุดแผนจัดสรร'); const { error } = await ensureClient().rpc('water_schedule_allocation', { p_request_id: $('decisionRequestId').value, p_source_id: $('allocationSource').value, p_volume_m3: Number($('allocationVolume').value), p_start: start.toISOString(), p_end: end.toISOString() }); if (error) throw error; $('decisionDialog').close(); say('บันทึกตารางจัดสรรแล้ว'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } });
  function openDelivery(id) { $('deliveryAllocationId').value = id; $('deliveredVolumeInput').value = ''; $('deliveryNote').value = ''; $('deliveryDialog').showModal(); }
  $('saveDeliveryBtn').addEventListener('click', async () => { const button = $('saveDeliveryBtn'); setBusy(button, true); try { const { error } = await ensureClient().rpc('water_record_delivery', { p_allocation_id: $('deliveryAllocationId').value, p_volume_m3: Number($('deliveredVolumeInput').value), p_note: $('deliveryNote').value.trim() || null }); if (error) throw error; $('deliveryDialog').close(); say('บันทึกปริมาณส่งน้ำจริงแล้ว'); await loadAll(); } catch (e) { say(e.message, true); } finally { setBusy(button, false); } });
  $('closeDialog').addEventListener('click', () => $('decisionDialog').close()); $('closeDelivery').addEventListener('click', () => $('deliveryDialog').close());
  $('refreshBtn').addEventListener('click', () => loadAll().then(() => say('อัปเดตข้อมูลแล้ว')).catch((e) => say(e.message, true)));
  const db = ensureClient();
  db.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; window.setTimeout(() => loadAll().catch((e) => say(e.message, true)), 0); });
  loadAll().catch((e) => say(`${e.message} · ตรวจว่ารันไฟล์ supabase/water-bank.sql แล้ว`, true));
})();

