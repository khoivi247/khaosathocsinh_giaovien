// ====== CẤU HÌNH API (giống script.js) ======
const API_URL = 'https://script.google.com/macros/s/AKfycbw8GxpF4QTucMVmQXq6TK7c3nxSjwZB1gCN7A1aba_eGkdp5fhS_xURhh29j46eQoX8Dw/exec';
const ALL_SCHOOLS = '__all_schools__';

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
  document.getElementById('surveyFilter').addEventListener('change', loadDashboard);
  document.getElementById('exportCharts').addEventListener('click', exportCharts);
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
      updateExportAvailability();
    });
  });
}

function updateExportAvailability() {
  const activeTab = document.querySelector('.tab-btn.active');
  const button = document.getElementById('exportCharts');
  if (button) button.disabled = !activeTab || activeTab.dataset.tab === 'open';
}

function exportCharts() {
  const button = document.getElementById('exportCharts');
  const format = document.getElementById('exportFormat').value;
  const activeTab = document.querySelector('.tab-content.active');
  const tabName = activeTab && activeTab.id.replace('tab-', '');
  const chartIds = tabName === 'student'
    ? ['chart-s1', 'chart-s2', 'chart-s3', 'chart-s4', 'chart-s5', 'chart-s6', 'chart-student-avg']
    : tabName === 'teacher'
      ? Array.from({ length: 12 }, function (_, index) { return 'chart-t' + (index + 1); })
        .concat(['chart-teacher-avg'])
      : [];
  let charts;
  try {
    charts = chartIds.map(function (id) {
      const canvas = document.getElementById(id);
      const chart = canvas && chartInstances[id];
      if (!canvas || !chart || canvas.parentElement.hidden || canvas.parentElement.classList.contains('is-empty')) {
        return null;
      }
      if (canvas.width <= 0 || canvas.height <= 0) {
        throw new Error('Biểu đồ chưa sẵn sàng để xuất. Hãy mở lại mục biểu đồ và thử lại.');
      }
      const title = chart.options.plugins.title.text;
      return {
        title: Array.isArray(title) ? title.join(' ') : String(title || ''),
        type: chart.config.type,
        labels: chart.data.labels.slice(),
        values: chart.data.datasets[0].data.map(Number),
        colors: chart.data.datasets[0].backgroundColor,
        average: title.match(/\(TB:\s*([^)]+)\)/i)?.[1] || '',
        averageChart: chart.config.type === 'bar'
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Không thể chuẩn bị biểu đồ để xuất:', error);
    alert('Không thể chuẩn bị biểu đồ để xuất: ' + error.message);
    return;
  }

  if (!charts.length) {
    alert('Không có biểu đồ để xuất trong mục đang mở.');
    return;
  }

  const oldLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Đang xuất...';
  const school = document.getElementById('schoolFilter').selectedOptions[0].textContent;
  const survey = document.getElementById('surveyFilter').selectedOptions[0].textContent;
  const report = {
    school: school,
    survey: survey,
    section: tabName === 'student' ? 'Học sinh' : 'Giáo viên',
    charts: charts,
    fileName: createExportFileName(school, survey, tabName)
  };
  const exportTask = format === 'docx'
    ? loadExportLibrary(
      'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
      'docx'
    ).then(function () { return downloadDocx(report); })
    : loadExportLibrary(
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
      'jspdf'
    ).then(function () { return downloadPdf(report); });

  exportTask.catch(function (error) {
    console.error('Không thể xuất biểu đồ:', error);
    alert('Không thể xuất biểu đồ: ' + error.message);
  }).finally(function () {
    button.disabled = false;
    button.textContent = oldLabel;
    updateExportAvailability();
  });
}

function loadExportLibrary(url, globalName) {
  if (window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise(function (resolve, reject) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = function () {
      if (!window[globalName]) {
        reject(new Error('Thư viện xuất tệp tải về nhưng không khởi tạo được.'));
        return;
      }
      resolve(window[globalName]);
    };
    script.onerror = function () {
      reject(new Error('Không tải được thư viện xuất tệp. Hãy kiểm tra kết nối mạng và thử lại.'));
    };
    document.head.appendChild(script);
  });
}

function createExportFileName(school, survey, section) {
  return [school, survey, section].join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(function (word) {
    const candidate = line ? line + ' ' + word : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[maxLines - 1];
    while (lastLine && context.measureText(lastLine + '…').width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[maxLines - 1] = lastLine + '…';
  }
  visibleLines.forEach(function (item, index) {
    context.fillText(item, x, y + index * lineHeight);
  });
  return visibleLines.length * lineHeight;
}

function createExportChart(chart, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const values = chart.values;
  const isAverage = chart.averageChart;
  const labelPlugin = {
    id: 'exportNumericLabels',
    afterDatasetsDraw: function (instance) {
      const context = instance.ctx;
      context.save();
      context.fillStyle = isAverage ? '#172b23' : '#fff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '700 ' + (isAverage ? 32 : 26) + 'px "Segoe UI", Arial, sans-serif';
      instance.getDatasetMeta(0).data.forEach(function (element, index) {
        const value = Number(values[index]);
        if (!Number.isFinite(value) || value <= 0) return;
        if (isAverage) {
          const position = element.getProps(['x', 'y'], true);
          context.fillText(value.toFixed(2), position.x, position.y - 25);
          return;
        }
        const position = element.getProps(
          ['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'],
          true
        );
        if (position.endAngle - position.startAngle < 0.16) return;
        const angle = (position.startAngle + position.endAngle) / 2;
        const radius = (position.innerRadius + position.outerRadius) / 2;
        context.fillText(String(value), position.x + Math.cos(angle) * radius, position.y + Math.sin(angle) * radius);
      });
      context.restore();
    }
  };
  const colors = Array.isArray(chart.colors) ? chart.colors : COLORS;
  const dataset = {
    data: values,
    backgroundColor: colors,
    borderColor: '#fff',
    borderWidth: 3
  };
  if (isAverage) dataset.borderRadius = 8;
  const options = {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: isAverage ? { top: 34, left: 20, right: 20 } : 14 },
    plugins: {
      title: { display: false },
      legend: { display: false },
      tooltip: { enabled: false }
    }
  };
  if (isAverage) {
    options.scales = {
      y: { beginAtZero: true, max: 5, ticks: { stepSize: 1, font: { size: 22 } } },
      x: { ticks: { font: { size: 22 } } }
    };
  } else {
    options.cutout = '55%';
  }
  const instance = new Chart(canvas.getContext('2d'), {
    type: chart.type,
    data: { labels: chart.labels, datasets: [dataset] },
    options: options,
    plugins: [labelPlugin]
  });
  instance.update('none');
  instance.render();
  const image = document.createElement('canvas');
  image.width = width;
  image.height = height;
  image.getContext('2d').drawImage(canvas, 0, 0);
  instance.destroy();
  return image;
}

function renderExportPage(report) {
  const page = document.createElement('canvas');
  page.width = 1800;
  page.height = 1273;
  const context = page.getContext('2d');
  if (!context) throw new Error('Không thể tạo trang tổng hợp biểu đồ.');

  const layoutWidth = 2400;
  const layoutHeight = 1697;
  context.scale(page.width / layoutWidth, page.height / layoutHeight);
  const margin = 70;
  const contentWidth = layoutWidth - margin * 2;
  const averageChart = report.charts.find(function (chart) { return chart.averageChart; });
  const questionCharts = report.charts.filter(function (chart) { return !chart.averageChart; });
  const columns = questionCharts.length > 8 ? 4 : questionCharts.length > 3 ? 3 : Math.max(1, questionCharts.length);
  const rows = Math.ceil(questionCharts.length / columns);
  const averageHeight = averageChart ? 320 : 0;
  const gridTop = 300;
  const averageTop = layoutHeight - margin - averageHeight;
  const gridHeight = Math.max(1, averageTop - gridTop);
  const cellWidth = contentWidth / columns;
  const cellHeight = rows ? gridHeight / rows : 0;

  context.fillStyle = '#f5faf7';
  context.fillRect(0, 0, layoutWidth, layoutHeight);
  context.fillStyle = '#14532d';
  context.font = '700 52px "Segoe UI", Arial, sans-serif';
  context.fillText('Biểu đồ khảo sát', margin, 83);
  context.fillStyle = '#33473d';
  context.font = '30px "Segoe UI", Arial, sans-serif';
  context.fillText(report.school + ' · ' + report.section, margin, 132);
  context.font = '26px "Segoe UI", Arial, sans-serif';
  context.fillText(report.survey, margin, 174);

  const legendWidth = contentWidth / LABELS_5.length;
  context.font = '20px "Segoe UI", Arial, sans-serif';
  LABELS_5.forEach(function (label, index) {
    const x = margin + index * legendWidth;
    context.fillStyle = COLORS[index];
    context.fillRect(x, 210, 20, 20);
    context.fillStyle = '#33473d';
    drawWrappedText(context, 'M' + (index + 1) + ': ' + label.replace(/\n/g, ' / '), x + 29, 226, legendWidth - 36, 25, 2);
  });

  questionCharts.forEach(function (chart, index) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = margin + column * cellWidth;
    const y = gridTop + row * cellHeight;
    const inset = 12;
    const cardX = x + inset;
    const cardY = y + inset;
    const cardWidth = cellWidth - inset * 2;
    const cardHeight = cellHeight - inset * 2;

    context.fillStyle = '#fff';
    context.fillRect(cardX, cardY, cardWidth, cardHeight);
    context.strokeStyle = '#dcebe2';
    context.lineWidth = 2;
    context.strokeRect(cardX, cardY, cardWidth, cardHeight);
    context.fillStyle = '#172b23';
    context.font = '700 23px "Segoe UI", Arial, sans-serif';
    const titleHeight = drawWrappedText(context, chart.title, cardX + 18, cardY + 32, cardWidth - 36, 27, 5);

    const infoHeight = 57;
    const plotY = cardY + titleHeight + 10;
    const plotHeight = Math.max(80, cardHeight - titleHeight - infoHeight - 24);
    const renderedChart = createExportChart(
      chart,
      Math.max(1, Math.floor(cardWidth - 34)),
      Math.max(1, Math.floor(plotHeight))
    );
    const chartScale = Math.min((cardWidth - 34) / renderedChart.width, plotHeight / renderedChart.height);
    const chartWidth = renderedChart.width * chartScale;
    const chartHeight = renderedChart.height * chartScale;
    context.drawImage(
      renderedChart,
      cardX + (cardWidth - chartWidth) / 2,
      plotY + (plotHeight - chartHeight) / 2,
      chartWidth,
      chartHeight
    );

    const total = chart.values.reduce(function (sum, value) { return sum + Number(value || 0); }, 0);
    const average = chart.average || (total
      ? (chart.values.reduce(function (sum, value, valueIndex) {
        return sum + Number(value || 0) * (valueIndex + 1);
      }, 0) / total).toFixed(2)
      : '0.00');
    context.fillStyle = '#14532d';
    context.font = '700 22px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('N = ' + total + '   ·   TB = ' + average, cardX + cardWidth / 2, cardY + cardHeight - 35);
    context.font = '22px "Segoe UI", Arial, sans-serif';
    context.fillText(
      'M1–M5: ' + chart.values.map(function (value) { return Number(value || 0); }).join(' · '),
      cardX + cardWidth / 2,
      cardY + cardHeight - 10
    );
    context.textAlign = 'left';
  });

  if (averageChart) {
    context.fillStyle = '#fff';
    context.fillRect(margin, averageTop, contentWidth, averageHeight - 5);
    context.strokeStyle = '#dcebe2';
    context.strokeRect(margin, averageTop, contentWidth, averageHeight - 5);
    context.fillStyle = '#14532d';
    context.font = '700 28px "Segoe UI", Arial, sans-serif';
    context.fillText(averageChart.title, margin + 24, averageTop + 40);
    const renderedAverage = createExportChart(averageChart, contentWidth - 60, averageHeight - 74);
    context.drawImage(renderedAverage, margin + 30, averageTop + 52, contentWidth - 60, averageHeight - 74);
  }

  return page;
}

async function downloadDocx(report) {
  const library = window.docx;
  const { Document, ImageRun, Packer, Paragraph, PageOrientation } = library;
  const image = renderExportPage(report).toDataURL('image/png').split(',')[1];
  const binary = window.atob(image);
  const imageData = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) imageData[i] = binary.charCodeAt(i);
  const documentFile = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 },
          margin: { top: 240, right: 300, bottom: 240, left: 300 }
        }
      },
      children: [new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({
          data: imageData,
          transformation: { width: 1030, height: 728 },
          type: 'png'
        })]
      })]
    }]
  });
  downloadBlob(await Packer.toBlob(documentFile), report.fileName + '.docx');
}

async function downloadPdf(report) {
  const JsPDF = window.jspdf.jsPDF;
  const pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.addImage(renderExportPage(report).toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight);
  downloadBlob(pdf.output('blob'), report.fileName + '.pdf');
}

// ====== LOAD DASHBOARD ======
function loadDashboard() {
  const requestId = ++dashboardRequestId;
  const schoolFilter = document.getElementById('schoolFilter');
  const surveyType = document.getElementById('surveyFilter').value;
  const school = schoolFilter.value;
  const isAllSchools = school === ALL_SCHOOLS;
  const params = new URLSearchParams({
    school: school,
    surveyType: surveyType,
    request: String(Date.now())
  });
  const schoolLabel = document.getElementById('schoolFilter').selectedOptions[0].textContent;
  const loading = document.getElementById('loading');
  document.getElementById('overview').style.display = 'none';
  document.getElementById('tabs').style.display = 'none';
  loading.textContent = 'Đang tải dữ liệu khảo sát...';
  loading.style.display = 'block';

  const aggregatePromise = isAllSchools
    ? fetch(API_URL + '?action=getAllOpinions&surveyType=' + encodeURIComponent(surveyType) +
      '&request=' + Date.now(), { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('Không tải được tổng hợp ý kiến các trường.');
        return res.json();
      })
    : null;
  const statsPromise = isAllSchools
    ? aggregatePromise.then(function (aggregate) {
        if (!aggregate || !aggregate.student || !aggregate.teacher || !Array.isArray(aggregate.openAnswers)) {
          throw new Error('Dữ liệu tổng hợp không đúng định dạng. Hãy cập nhật và triển khai lại Apps Script.');
        }
        return {
          school: school,
          student: aggregate.student,
          teacher: aggregate.teacher
        };
      })
    : fetch(API_URL + '?action=getStats&' + params.toString(), { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('Không tải được thống kê khảo sát.');
        return res.json();
      });
  const openAnswersPromise = isAllSchools
    ? aggregatePromise.then(function (aggregate) { return aggregate.openAnswers; })
    : fetch(API_URL + '?action=getOpenAnswers&' + params.toString(), { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('Không tải được ý kiến mở.');
        return res.json();
      });

  Promise.all([statsPromise, openAnswersPromise])
    .then(function (results) {
      if (requestId !== dashboardRequestId) return;
      const data = results[0];
      if (!data || data.school !== school) {
        throw new Error('API đang chạy phiên bản cũ, chưa trả dữ liệu riêng cho trường đã chọn. Hãy cập nhật và triển khai lại Apps Script.');
      }
      document.getElementById('loading').style.display = 'none';
      document.getElementById('overview').style.display = 'grid';
      document.getElementById('tabs').style.display = 'flex';
      document.getElementById('selectedSchool').textContent = isAllSchools
        ? 'Đang xem dữ liệu ' + (surveyType === 'post' ? 'sau áp dụng' : 'ban đầu') + ' tổng hợp của tất cả các trường'
        : 'Đang xem dữ liệu ' + (surveyType === 'post' ? 'sau áp dụng' : 'ban đầu') + ' của ' + schoolLabel;
      document.querySelector('#totalAll').nextElementSibling.textContent = isAllSchools
        ? 'Tổng phản hồi tất cả các trường'
        : 'Tổng phản hồi tại trường';

      updateSurveyDashboardUI(surveyType);
      renderOverview(data);
      updateExportAvailability();

      if (data.student && data.student.total > 0) {
        renderStudent(data.student);
      } else {
        showEmptyStudent('Chưa có dữ liệu học sinh cho ' + (isAllSchools ? 'tất cả các trường' : schoolLabel));
      }

      if (data.teacher && data.teacher.total > 0) {
        renderTeacher(data.teacher);
      } else {
        showEmptyTeacher(
          data.teacher && data.teacher.questions ? data.teacher.questions.length : 12,
          'Chưa có dữ liệu giáo viên cho ' + (isAllSchools ? 'tất cả các trường' : schoolLabel)
        );
      }

      renderOpenAnswers(results[1], isAllSchools, surveyType);
    })
    .catch(function (err) {
      if (requestId !== dashboardRequestId) return;
      console.error('Lỗi tải dữ liệu:', err);
      document.getElementById('loading').innerHTML =
        'Không thể tải đúng dữ liệu của trường đã chọn. Hãy kiểm tra phiên bản triển khai Apps Script và URL API.<br>' +
        '<small style="color:#b2bec3;">' + err + '</small>';
    });
}

function updateSurveyDashboardUI(surveyType) {
  const isPostSurvey = surveyType === 'post';
  const legacySchoolOption = Array.from(document.getElementById('schoolFilter').options).find(function (option) {
    return option.value === 'PTDTNT THCS&THPT Văn Quan';
  });
  if (legacySchoolOption) {
    legacySchoolOption.textContent = isPostSurvey
      ? 'PTDTNT THCS&THPT Văn Quan'
      : 'PTDTNT THCS&THPT Văn Quan — dữ liệu cũ';
  }
  document.getElementById('student-heading-1').textContent = isPostSurvey
    ? 'Câu hỏi 1–3: Trải nghiệm học sinh sau khi áp dụng mô hình'
    : 'Phần 1: Biểu hiện sự ỷ lại (Câu 1–3)';
  document.getElementById('student-heading-2').textContent = isPostSurvey
    ? 'Câu hỏi 4–6: Tư duy phản biện và kiểm chứng thông tin'
    : 'Phần 2: Biểu hiện học tập chủ động (Câu 4–6)';
  document.getElementById('student-average-heading').textContent =
    'Điểm trung bình 6 câu hỏi (thang 1–5)';

  document.getElementById('teacher-heading-1').textContent = isPostSurvey
    ? 'Đánh giá của giáo viên sau khi áp dụng mô hình (Câu 1–5)'
    : 'Phần 1: Thực trạng hành vi học tập (Câu 1–4)';
  document.getElementById('teacher-heading-2').hidden = isPostSurvey;
  document.getElementById('teacher-heading-3').hidden = isPostSurvey;
  document.getElementById('teacher-heading-2').textContent = 'Phần 2: Yếu tố ảnh hưởng (Câu 5–8)';
  document.getElementById('teacher-heading-3').textContent = 'Phần 3: Tiềm năng giải pháp (Câu 9–12)';
  document.getElementById('teacher-average-heading').textContent = isPostSurvey
    ? 'Điểm trung bình 5 câu hỏi (thang 1–5)'
    : 'Điểm trung bình 12 câu hỏi (thang 1–5)';

  for (let i = 6; i <= 12; i++) {
    document.getElementById('chart-t' + i).parentElement.hidden = isPostSurvey;
  }

  const openTab = document.querySelector('[data-tab="open"]');
  openTab.hidden = isPostSurvey;
  if (isPostSurvey && openTab.classList.contains('active')) {
    document.querySelector('[data-tab="student"]').click();
  }
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
function showEmptyStudent(message) {
  ['s1','s2','s3','s4','s5','s6'].forEach(function (id) {
    const canvas = document.getElementById('chart-' + id);
    setChartEmpty(canvas, message || 'Chưa có dữ liệu học sinh cho trường này');
  });
  const avgCanvas = document.getElementById('chart-student-avg');
  setChartEmpty(avgCanvas, message || 'Chưa có dữ liệu học sinh cho trường này');
}

function showEmptyTeacher(questionCount, message) {
  for (let i = 1; i <= questionCount; i++) {
    const canvas = document.getElementById('chart-t' + i);
    setChartEmpty(canvas, message || 'Chưa có dữ liệu giáo viên cho trường này');
  }
  const avgCanvas = document.getElementById('chart-teacher-avg');
  setChartEmpty(avgCanvas, message || 'Chưa có dữ liệu giáo viên cho trường này');
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
function renderOpenAnswers(data, isAllSchools, surveyType) {
  const list = document.getElementById('openAnswersList');
  if (!data || data.length === 0) {
    list.innerHTML = '<p class="empty">' +
      (surveyType === 'post'
        ? 'Phiếu khảo sát sau áp dụng không có câu hỏi ý kiến mở.'
        : (isAllSchools
          ? 'Chưa có ý kiến mở từ giáo viên ở tất cả các trường.'
          : 'Chưa có ý kiến nào từ giáo viên ở trường này.')) +
    '</p>';
    return;
  }
  list.innerHTML = data.map(function (answer, idx) {
    const isTaggedAnswer = answer && typeof answer === 'object';
    return '<div class="open-item">' +
      '<span class="num">#' + (idx + 1) + '</span>' +
      (isTaggedAnswer
        ? '<span class="opinion-meta">' + escapeHtml(answer.role) + ' · ' + escapeHtml(answer.school) + '</span>' +
          escapeHtml(answer.text)
        : escapeHtml(answer)) +
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
