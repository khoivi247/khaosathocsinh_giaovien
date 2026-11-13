// ====== CẤU HÌNH API ======
const API_URL = 'https://script.google.com/macros/s/AKfycbwpaFeCoB2U6rkGRHk_8hMymmRwPL1VKimogRrWORdzbhAXo9-LGiSsjwA9kgCxpC0ALQ/exec';

// Biến lưu vai trò hiện tại
let currentRole = null;
let activeSurvey = 'initial';

const POST_SURVEY_QUESTIONS = {
  student: [
    'Trong các giờ tự học buổi tối, em tự suy nghĩ và tìm hướng giải trước thay vì lập tức mở điện thoại chép đáp án từ AI.',
    'Khi tương tác với AI, em ưu tiên dùng câu lệnh xin gợi ý từng bước (ví dụ: "Gợi ý cho em bước đầu tiên") thay vì xin đáp án.',
    'Khi gặp bài khó, em kiên nhẫn dành thời gian suy nghĩ, tự vấn và xem lại sách vở trước khi tìm sự trợ giúp.',
    'Trong giờ học và tự học, em chủ động đặt các câu hỏi "Vì sao?", "Tại sao?" để tự hiểu sâu bản chất vấn đề.',
    'Khi giáo viên gọi lên bảng hoặc kiểm tra, em tự tin giải thích rõ ràng, mạch lạc cách làm bài tập của mình.',
    'Sau khi tương tác với Chatbot/AI, em mở sách giáo khoa để đối chiếu, kiểm chứng lại kiến thức xem đã chuẩn chưa.'
  ],
  teacher: [
    'Mô hình đã giúp giảm thiểu rõ rệt tình trạng học sinh lạm dụng công nghệ để copy - paste đáp án, chống đối bài tập.',
    'Khi lên bảng hoặc chấm bài, tôi thấy học sinh hiểu bản chất vấn đề sâu hơn, tự diễn đạt được cách làm bằng lời của mình.',
    'Học sinh trở nên tự tin chủ động đưa ra thắc mắc với giáo viên trên lớp thay vì ngồi im thụ động.',
    'Học sinh đã hình thành được thói quen chủ động tra cứu sách giáo khoa, tự kiểm chứng thông tin thay vì chờ đáp án.',
    'Mô hình Sổ tay tự vấn và Chatbot AI 24/7 thực sự hỗ trợ đắc lực cho giáo viên trong việc đổi mới, quản lý giờ tự học buổi tối.'
  ]
};

const POST_SURVEY_STUDENT_SCALE = [
  'Rất hiếm khi',
  'Hiếm khi',
  'Thỉnh thoảng',
  'Thường xuyên',
  'Rất thường xuyên'
];

const POST_SURVEY_TEACHER_SCALE = [
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
  const scale = role === 'student' ? POST_SURVEY_STUDENT_SCALE : POST_SURVEY_TEACHER_SCALE;
  container.innerHTML = POST_SURVEY_QUESTIONS[role].map(function (question, index) {
    return '<div class="question">' +
      '<p>Câu ' + (index + 1) + ': ' + escapeHtml(question) + '</p>' +
      '<div class="options">' +
      scale.map(function (label, valueIndex) {
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
  const sTotal = 6, tTotal = 12, postTeacherTotal = POST_SURVEY_QUESTIONS.teacher.length;
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
