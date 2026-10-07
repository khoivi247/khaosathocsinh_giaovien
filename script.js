// ====== CẤU HÌNH API ======
const API_URL = 'https://script.google.com/macros/s/AKfycbxcYBm_aP8xn9qGP_2ESS2MRYrfQFedjaWVylnN_YnVtIsIOEydYTTo1qJ-Gn-rIQBz-A/exec';

// Biến lưu vai trò hiện tại
let currentRole = null;

// ====== ĐIỀU HƯỚNG ======
function showRoleSelection() {
  document.getElementById('introPage').style.display = 'none';
  document.getElementById('rolePage').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectRole(role) {
  currentRole = role;
  document.getElementById('rolePage').style.display = 'none';
  document.getElementById('infoPage').style.display = 'block';

  // Đổi tiêu đề theo vai trò
  const title = role === 'student'
    ? '🎓 Thông tin Học sinh'
    : '👩‍🏫 Thông tin Giáo viên';
  document.getElementById('infoTitle').textContent = title;

  // Reset form
  document.getElementById('infoForm').reset();
  clearErrors();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToRole() {
  document.querySelectorAll('.survey').forEach(function (s) {
    s.classList.remove('active');
  });
  document.getElementById('infoPage').style.display = 'none';
  document.getElementById('rolePage').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====== VALIDATE FORM THÔNG TIN ======
function clearErrors() {
  document.getElementById('fullName').classList.remove('error');
  document.getElementById('phone').classList.remove('error');
  document.getElementById('errName').classList.remove('show');
  document.getElementById('errPhone').classList.remove('show');
}

function validateInfo() {
  clearErrors();
  let ok = true;

  const name = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (name.length < 2) {
    document.getElementById('fullName').classList.add('error');
    const errName = document.getElementById('errName');
    errName.textContent = 'Vui lòng nhập họ tên (ít nhất 2 ký tự).';
    errName.classList.add('show');
    ok = false;
  }

  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(phone)) {
    document.getElementById('phone').classList.add('error');
    const errPhone = document.getElementById('errPhone');
    errPhone.textContent = 'SĐT không hợp lệ. Vui lòng nhập 10 số, bắt đầu bằng 0.';
    errPhone.classList.add('show');
    ok = false;
  }

  return ok;
}

function submitInfo(event) {
  event.preventDefault();
  if (!validateInfo()) return;

  document.getElementById('infoPage').style.display = 'none';

  if (currentRole === 'student') {
    document.getElementById('studentSurvey').classList.add('active');
  } else {
    document.getElementById('teacherSurvey').classList.add('active');
  }
  setupOptionHighlight();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====== HIGHLIGHT OPTION ======
function setupOptionHighlight() {
  document.querySelectorAll('.option input').forEach(function (inp) {
    inp.addEventListener('change', function () {
      const name = this.name;
      document.querySelectorAll('input[name="' + name + '"]').forEach(function (i) {
        i.closest('.option').classList.remove('selected');
      });
      this.closest('.option').classList.add('selected');
      updateProgress();
    });
  });
}

// ====== PROGRESS BAR ======
function updateProgress() {
  const sTotal = 6, tTotal = 12;
  let sDone = 0, tDone = 0;

  for (let i = 1; i <= 6; i++) {
    if (document.querySelector('input[name="s' + i + '"]:checked')) sDone++;
  }
  for (let j = 1; j <= 12; j++) {
    if (document.querySelector('input[name="t' + j + '"]:checked')) tDone++;
  }

  const ps = document.getElementById('progressStudent');
  const pt = document.getElementById('progressTeacher');
  if (ps) ps.style.width = (sDone / sTotal * 100) + '%';
  if (pt) pt.style.width = (tDone / tTotal * 100) + '%';
}

// ====== SUBMIT KHẢO SÁT ======
function submitSurvey(role) {
  const total = role === 'student' ? 6 : 12;
  const prefix = role === 'student' ? 's' : 't';
  const answers = [];
  const missing = [];

  for (let i = 1; i <= total; i++) {
    const checked = document.querySelector('input[name="' + prefix + i + '"]:checked');
    if (!checked) {
      missing.push(i);
    } else {
      answers.push(Number(checked.value));
    }
  }

  if (missing.length > 0) {
    alert('⚠️ Vui lòng trả lời đầy đủ các câu hỏi trước khi gửi!\n\nCòn thiếu: Câu ' + missing.join(', '));
    return;
  }

  if (role === 'teacher') {
    const openAns = document.getElementById('teacherOpen').value.trim();
    answers.push(openAns);
  }

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();

  const btn = document.getElementById(role === 'student' ? 'btnStudent' : 'btnTeacher');
  btn.disabled = true;
  btn.textContent = '⏳ Đang gửi...';

  const formData = new URLSearchParams();
  formData.append('role', role);
  formData.append('fullName', fullName);
  formData.append('phone', phone);
  formData.append('answers', JSON.stringify(answers));

  fetch(API_URL, {
    method: 'POST',
    body: formData
  })
  .then(function (res) { return res.json(); })
  .then(function (res) {
    if (res.success) {
      document.getElementById('studentSurvey').classList.remove('active');
      document.getElementById('teacherSurvey').classList.remove('active');
      document.getElementById('resultPage').classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('❌ Lỗi: ' + res.message);
      btn.disabled = false;
      btn.textContent = 'Gửi khảo sát ✓';
    }
  })
  .catch(function (err) {
    alert('❌ Lỗi kết nối: ' + err);
    btn.disabled = false;
    btn.textContent = 'Gửi khảo sát ✓';
  });
}

// ====== KHỞI TẠO ======
document.addEventListener('DOMContentLoaded', setupOptionHighlight);