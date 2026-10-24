// ====== CẤU HÌNH API ======
const API_URL = 'https://script.google.com/macros/s/AKfycbw04U1HZhuHgP8xWhTXc0J-j6N6CiXE3xUVgReb2oHpROdMELAjwj6BKkilerGC46KMPA/exec';

// Biến lưu vai trò hiện tại
let currentRole = null;
let activeSurvey = 'initial';

const POST_SURVEY_QUESTIONS = {
  student: [
    'Từ ngày dùng cách học này, em không còn thói quen cứ thấy bài khó là mở điện thoại chép AI ngay nữa, mà đã biết dừng lại để tự suy nghĩ thêm.',
    'Cuốn Sổ tay tự vấn thực sự giúp em biết cách sắp xếp các bước giải để em tự tìm ra đáp án, trước khi đặt bút làm bài.',
    'Tôi cảm thấy hứng thú và hào hứng khi tương tác với Chatbot AI Question Focus 24/7 bởi chỉ gợi mở chứ không đưa ra đáp án sẵn.',
    'Việc kết hợp Sổ tay và Chatbot giúp em biết cách lật lại vấn đề và biết cách tự đặt câu hỏi (tư duy phản biện).',
    'Bây giờ em đã hình thành được thói quen mở sách giáo khoa ra để đối chiếu lại kiến thức xem có chuẩn không.',
    'Mô hình giúp tôi rèn luyện được thói quen và kỹ năng kiểm chứng thông tin từ sách giáo khoa.'
  ],
  teacher: [
    'Thầy/cô thấy mô hình này đã chỉ ra và giải quyết đúng thói quen lạm dụng công nghệ và chép bài chống đối của học sinh hiện nay.',
    'Mô hình Sổ tay tự vấn kết hợp Chatbot AI Question Focus 24/7 hỗ trợ giáo viên rất nhiều trong việc đổi mới hiệu quả phương pháp dạy học.',
    'Mô hình này rất gần gũi, dễ thực hiện và hoàn toàn có thể triển khai rộng rãi cho các lớp, các trường khác.',
    'Nhờ việc rèn luyện cách tự đặt câu hỏi, học sinh trên lớp dạn dĩ hơn, tự tin đưa ra thắc mắc với giáo viên thay vì ngồi im thụ động.',
    'Khi chấm bài hoặc gọi lên bảng, tôi thấy học sinh hiểu bản chất vấn đề sâu hơn, tự diễn đạt bằng lời của mình chứ không học vẹt.'
  ]
};

const POST_SURVEY_SCALE = [
  'Hoàn toàn không đồng ý',
  'Không đồng ý',
  'Phân vân',
  'Đồng ý',
  'Hoàn toàn đồng ý'
];

// ====== ĐIỀU HƯỚNG ======
function showRoleSelection(surveyType) {
  activeSurvey = surveyType || 'initial';
  document.getElementById('introPage').style.display = 'none';
  document.getElementById('rolePage').style.display = 'block';
  document.getElementById('rolePageTitle').textContent = activeSurvey === 'post'
    ? '👋 Chọn đối tượng khảo sát sau áp dụng'
    : '👋 Bạn là ai?';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectRole(role) {
  currentRole = role;
  document.getElementById('rolePage').style.display = 'none';
  document.getElementById('infoPage').style.display = 'block';
  const classGroup = document.getElementById('classGroup');
  const className = document.getElementById('className');
  classGroup.hidden = role !== 'student';
  className.required = role === 'student';

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
  document.getElementById('school').classList.remove('error');
  document.getElementById('className').classList.remove('error');
  document.getElementById('errName').classList.remove('show');
  document.getElementById('errSchool').classList.remove('show');
  document.getElementById('errClass').classList.remove('show');
}

function validateInfo() {
  clearErrors();
  let ok = true;

  const school = document.getElementById('school').value;
  const name = document.getElementById('fullName').value.trim();

  if (!school) {
    document.getElementById('school').classList.add('error');
    const errSchool = document.getElementById('errSchool');
    errSchool.textContent = 'Vui lòng chọn trường.';
    errSchool.classList.add('show');
    ok = false;
  }

  if (name.length < 2) {
    document.getElementById('fullName').classList.add('error');
    const errName = document.getElementById('errName');
    errName.textContent = 'Vui lòng nhập họ tên (ít nhất 2 ký tự).';
    errName.classList.add('show');
    ok = false;
  }

  const className = document.getElementById('className').value.trim();
  if (currentRole === 'student' && !className) {
    document.getElementById('className').classList.add('error');
    const errClass = document.getElementById('errClass');
    errClass.textContent = 'Vui lòng nhập lớp.';
    errClass.classList.add('show');
    ok = false;
  }

  return ok;
}

function submitInfo(event) {
  event.preventDefault();
  if (!validateInfo()) return;

  document.getElementById('infoPage').style.display = 'none';

  if (activeSurvey === 'post') {
    document.getElementById(currentRole === 'student' ? 'postStudentSurvey' : 'postTeacherSurvey').classList.add('active');
  } else if (currentRole === 'student') {
    document.getElementById('studentSurvey').classList.add('active');
  } else {
    document.getElementById('teacherSurvey').classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPostSurveyQuestions(role) {
  const prefix = role === 'student' ? 'ps' : 'pt';
  const container = document.getElementById(role === 'student' ? 'postStudentQuestions' : 'postTeacherQuestions');
  container.innerHTML = POST_SURVEY_QUESTIONS[role].map(function (question, index) {
    return '<div class="question">' +
      '<p>Câu ' + (index + 1) + ': ' + escapeHtml(question) + '</p>' +
      '<div class="options">' +
      POST_SURVEY_SCALE.map(function (label, valueIndex) {
        return '<label class="option"><input type="radio" name="' + prefix + (index + 1) +
          '" value="' + (valueIndex + 1) + '"> ' + escapeHtml(label) + '</label>';
      }).join('') +
      '</div></div>';
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const sTotal = 6, tTotal = 12, postTeacherTotal = 5;
  let sDone = 0, tDone = 0;
  let psDone = 0, ptDone = 0;

  for (let i = 1; i <= 6; i++) {
    if (document.querySelector('input[name="s' + i + '"]:checked')) sDone++;
  }
  for (let j = 1; j <= 12; j++) {
    if (document.querySelector('input[name="t' + j + '"]:checked')) tDone++;
  }
  for (let i = 1; i <= 6; i++) {
    if (document.querySelector('input[name="ps' + i + '"]:checked')) psDone++;
  }
  for (let i = 1; i <= postTeacherTotal; i++) {
    if (document.querySelector('input[name="pt' + i + '"]:checked')) ptDone++;
  }

  const ps = document.getElementById('progressStudent');
  const pt = document.getElementById('progressTeacher');
  const postPs = document.getElementById('progressPostStudent');
  const postPt = document.getElementById('progressPostTeacher');
  if (ps) ps.style.width = (sDone / sTotal * 100) + '%';
  if (pt) pt.style.width = (tDone / tTotal * 100) + '%';
  if (postPs) postPs.style.width = (psDone / sTotal * 100) + '%';
  if (postPt) postPt.style.width = (ptDone / postTeacherTotal * 100) + '%';
}

// ====== SUBMIT KHẢO SÁT ======
function submitSurvey(role, surveyType) {
  const type = surveyType || activeSurvey;
  const total = type === 'post'
    ? (role === 'student' ? POST_SURVEY_QUESTIONS.student.length : POST_SURVEY_QUESTIONS.teacher.length)
    : (role === 'student' ? 6 : 12);
  const prefix = type === 'post'
    ? (role === 'student' ? 'ps' : 'pt')
    : (role === 'student' ? 's' : 't');
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

  if (role === 'teacher' && type === 'initial') {
    const openAns = document.getElementById('teacherOpen').value.trim();
    answers.push(openAns);
  }

  const fullName = document.getElementById('fullName').value.trim();
  const school = document.getElementById('school').value;
  const className = role === 'student'
    ? document.getElementById('className').value.trim()
    : '';

  const buttonId = type === 'post'
    ? (role === 'student' ? 'btnPostStudent' : 'btnPostTeacher')
    : (role === 'student' ? 'btnStudent' : 'btnTeacher');
  const btn = document.getElementById(buttonId);
  btn.disabled = true;
  btn.textContent = '⏳ Đang gửi...';

  const formData = new URLSearchParams();
  formData.append('role', role);
  formData.append('school', school);
  formData.append('surveyType', type);
  formData.append('fullName', fullName);
  formData.append('className', className);
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
      document.getElementById('postStudentSurvey').classList.remove('active');
      document.getElementById('postTeacherSurvey').classList.remove('active');
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
document.addEventListener('DOMContentLoaded', function () {
  renderPostSurveyQuestions('student');
  renderPostSurveyQuestions('teacher');
  setupOptionHighlight();
});
