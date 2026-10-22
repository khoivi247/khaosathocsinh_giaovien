// ====== CẤU HÌNH API (giống script.js) ======
const API_URL = 'https://script.google.com/macros/s/AKfycbyNAKohteCw5XyAWwkwLKfE5E6BFfU5l7EfdaAbb8UIAiebUZaCiTjLo0Keg180bzPsmw/exec';

// Nhãn 5 mức độ (HS + GV gộp)
const LABELS_5 = [
  'Rất hiếm khi /\nHoàn toàn KĐ',
  'Hiếm khi /\nKhông ĐY',
  'Thỉnh thoảng /\nPhân vân',
  'Thường xuyên /\nĐồng ý',
  'Rất TX /\nHoàn toàn ĐY'
];

const COLORS = ['#a84d45', '#c47c45', '#d4aa58', '#5d8a78', '#315b62'];

// Lưu chart instance để hủy khi vẽ lại
const chartInstances = {};
let dashboardRequestId = 0;

// ====== KHỞI ĐỘNG ======
document.addEventListener('DOMContentLoaded', function () {
  setupTabs();
  document.getElementById('schoolFilter').addEventListener('change', loadDashboard);
  loadDashboard();
});

// ====== TABS ======
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab).classList.add('active');
    });
  });
}

// ====== LOAD DASHBOARD ======
function loadDashboard() {
  const requestId = ++dashboardRequestId;
  const school = document.getElementById('schoolFilter').value;
  const params = new URLSearchParams({
    school: school,
    request: String(Date.now())
  });
  const schoolLabel = document.getElementById('schoolFilter').selectedOptions[0].textContent;
  const loading = document.getElementById('loading');
  document.getElementById('overview').style.display = 'none';
  document.getElementById('tabs').style.display = 'none';
  loading.textContent = 'Đang tải dữ liệu khảo sát...';
  loading.style.display = 'block';

  Promise.all([
    fetch(API_URL + '?action=getStats&' + params.toString(), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Không tải được thống kê khảo sát.');
      return res.json();
    }),
    fetch(API_URL + '?action=getOpenAnswers&' + params.toString(), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Không tải được ý kiến mở.');
      return res.json();
    }),
    fetch(API_URL + '?action=getAllOpenAnswers&request=' + Date.now(), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Không tải được tổng hợp ý kiến các trường.');
      return res.json();
    }).catch(function (err) {
      return { error: err.message };
    })
  ])
    .then(function (results) {
      if (requestId !== dashboardRequestId) return;
      const data = results[0];
      if (!data || data.school !== school) {
        throw new Error('API đang chạy phiên bản cũ, chưa trả dữ liệu riêng cho trường đã chọn. Hãy cập nhật và triển khai lại Apps Script.');
      }
      document.getElementById('loading').style.display = 'none';
      document.getElementById('overview').style.display = 'grid';
      document.getElementById('tabs').style.display = 'flex';
      document.getElementById('selectedSchool').textContent = 'Đang xem dữ liệu riêng của ' + schoolLabel;

      renderOverview(data);

      if (data.student && data.student.total > 0) {
        renderStudent(data.student);
      } else {
        showEmptyStudent();
      }

      if (data.teacher && data.teacher.total > 0) {
        renderTeacher(data.teacher);
      } else {
        showEmptyTeacher();
      }

      renderOpenAnswers(results[1]);
      renderAllOpenAnswers(results[2]);
    })
    .catch(function (err) {
      if (requestId !== dashboardRequestId) return;
      console.error('Lỗi tải dữ liệu:', err);
      document.getElementById('loading').innerHTML =
        'Không thể tải đúng dữ liệu của trường đã chọn. Hãy kiểm tra phiên bản triển khai Apps Script và URL API.<br>' +
        '<small style="color:#b2bec3;">' + err + '</small>';
    });
}

// ====== OVERVIEW ======
function renderOverview(data) {
  const sTotal = data.student ? data.student.total : 0;
  const tTotal = data.teacher ? data.teacher.total : 0;

  document.getElementById('totalStudent').textContent = sTotal;
  document.getElementById('totalTeacher').textContent = tTotal;
  document.getElementById('totalAll').textContent = sTotal + tTotal;

  const now = new Date();
  document.getElementById('lastUpdate').textContent =
    now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0');
}

// ====== RENDER HỌC SINH ======
function renderStudent(stats) {
  stats.questions.forEach(function (q, idx) {
    createDonutChart(
      'chart-s' + (idx + 1),
      'Câu ' + (idx + 1) + ': ' + cleanLabel(q.label),
      q.counts,
      q.avg
    );
  });

  createAvgBarChart(
    'chart-student-avg',
    stats.questions.map((q, i) => 'Câu ' + (i + 1)),
    stats.questions.map(q => Number(q.avg)),
    'Điểm trung bình — Học sinh (1–5)'
  );
}

// ====== RENDER GIÁO VIÊN ======
function renderTeacher(stats) {
  stats.questions.forEach(function (q, idx) {
    createDonutChart(
      'chart-t' + (idx + 1),
      'Câu ' + (idx + 1) + ': ' + cleanLabel(q.label),
      q.counts,
      q.avg
    );
  });

  createAvgBarChart(
    'chart-teacher-avg',
    stats.questions.map((q, i) => 'Câu ' + (i + 1)),
    stats.questions.map(q => Number(q.avg)),
    'Điểm trung bình — Giáo viên (1–5)'
  );
}

// Bỏ tiền tố "HS1: ", "GV1: " khỏi label
function cleanLabel(label) {
  return String(label).replace(/^(HS|GV)\d+:\s*/, '');
}

// ====== EMPTY STATE ======
function showEmptyStudent() {
  ['s1','s2','s3','s4','s5','s6'].forEach(function (id) {
    const canvas = document.getElementById('chart-' + id);
    setChartEmpty(canvas, 'Chưa có dữ liệu học sinh cho trường này');
  });
  const avgCanvas = document.getElementById('chart-student-avg');
  setChartEmpty(avgCanvas, 'Chưa có dữ liệu học sinh cho trường này');
}

function showEmptyTeacher() {
  for (let i = 1; i <= 12; i++) {
    const canvas = document.getElementById('chart-t' + i);
    setChartEmpty(canvas, 'Chưa có dữ liệu giáo viên cho trường này');
  }
  const avgCanvas = document.getElementById('chart-teacher-avg');
  setChartEmpty(avgCanvas, 'Chưa có dữ liệu giáo viên cho trường này');
}

function setChartEmpty(canvas, message) {
  if (!canvas) return;
  const chart = chartInstances[canvas.id];
  if (chart) {
    chart.destroy();
    delete chartInstances[canvas.id];
  }
  canvas.parentElement.classList.add('is-empty');
  canvas.parentElement.dataset.emptyMessage = message;
}

// ====== DONUT CHART ======
function createDonutChart(canvasId, title, counts, avg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.parentElement.classList.remove('is-empty');
  delete canvas.parentElement.dataset.emptyMessage;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const total = counts.reduce((a, b) => a + b, 0);
  const hasData = total > 0;

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: LABELS_5.map(l => l.replace('\n', ' ')),
      datasets: [{
        data: hasData ? counts : [0, 0, 0, 0, 0],
        backgroundColor: COLORS,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title + (hasData ? '  (TB: ' + avg + ')' : '  (Chưa có dữ liệu)'),
          font: { size: 13, weight: '600' },
          color: '#2d3436',
          padding: { bottom: 10 }
        },
        legend: {
          position: 'bottom',
          labels: { font: { size: 10 }, boxWidth: 12, padding: 6 }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const val = ctx.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ctx.label + ': ' + val + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}

// ====== BAR CHART TRUNG BÌNH ======
function createAvgBarChart(canvasId, labels, values, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.parentElement.classList.remove('is-empty');
  delete canvas.parentElement.dataset.emptyMessage;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Điểm trung bình',
        data: values,
        backgroundColor: values.map(function (v) {
          if (v >= 4) return '#27ae60';
          if (v >= 3) return '#f39c12';
          return '#e74c3c';
        }),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 14, weight: '600' },
          color: '#2d3436'
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const v = ctx.parsed.y;
              let level = v >= 4 ? 'Cao' : (v >= 3 ? 'Trung bình' : 'Thấp');
              return 'TB: ' + v.toFixed(2) + ' — Mức: ' + level;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// ====== Ý KIẾN MỞ ======
function renderOpenAnswers(data) {
  const list = document.getElementById('openAnswersList');
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="empty">Chưa có ý kiến nào từ giáo viên ở trường này.</p>';
    return;
  }
  list.innerHTML = data.map(function (text, idx) {
    return '<div class="open-item">' +
      '<span class="num">#' + (idx + 1) + '</span>' +
      escapeHtml(text) +
    '</div>';
  }).join('');
}

function renderAllOpenAnswers(data) {
  const list = document.getElementById('allOpenAnswersList');
  if (data && data.error) {
    list.innerHTML = '<p class="empty">Không thể tải tổng hợp ý kiến. Hãy cập nhật và triển khai lại Apps Script. ' +
      escapeHtml(data.error) + '</p>';
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    list.innerHTML = '<p class="empty">Chưa có ý kiến mở từ giáo viên ở các trường.</p>';
    return;
  }
  list.innerHTML = data.map(function (answer, idx) {
    return '<div class="open-item">' +
      '<span class="num">#' + (idx + 1) + '</span>' +
      '<span class="opinion-meta">' + escapeHtml(answer.role) + ' · ' + escapeHtml(answer.school) + '</span>' +
      escapeHtml(answer.text) +
    '</div>';
  }).join('');
}

// ====== ESCAPE HTML ======
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
