// Initialize Supabase client
const supabaseUrl = 'https://hnithcvhemzsicwabhtq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXRoY3ZoZW16c2ljd2FiaHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5OTE2NDksImV4cCI6MjA2MjU2NzY0OX0.FVkMWLqm6hzzd-7znR3iTo0XU1fjj4EJpQrD3ElzFoQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Add this function at the top after Supabase initialization
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add these functions at the top after showNotification
function showLoader() {
  const loader = document.querySelector('.loader');
  loader.classList.add('show');
}

function hideLoader() {
  const loader = document.querySelector('.loader');
  loader.classList.remove('show');
}

// Add this at the start of the file after Supabase initialization
async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    document.getElementById("auth").style.display = "block";
    document.getElementById("main").style.display = "none";
    return false;
  }
  return true;
}

// --- Input Validation Helpers ---
function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}
function isValidPassword(password) {
  return password.length >= 6;
}
function isValidGrade(grade) {
  const n = Number(grade);
  return !isNaN(n) && n >= 0 && n <= 100;
}

// --- Session Timeout ---
let sessionTimeout, warningTimeout;
function resetSessionTimer() {
  clearTimeout(sessionTimeout);
  clearTimeout(warningTimeout);
  warningTimeout = setTimeout(() => {
    showNotification('ستنتهي الجلسة خلال دقيقة بسبب عدم النشاط', 'error');
  }, 29 * 60 * 1000); // 29 min
  sessionTimeout = setTimeout(() => {
    showNotification('تم تسجيل الخروج تلقائياً بسبب عدم النشاط', 'error');
    supabase.auth.signOut();
    location.reload();
  }, 30 * 60 * 1000); // 30 min
}
document.addEventListener('mousemove', resetSessionTimer);
document.addEventListener('keydown', resetSessionTimer);
resetSessionTimer();

// --- Profile/Account Menu ---
function createProfileMenu(user) {
  let menu = document.getElementById('profile-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'profile-menu';
    menu.style.position = 'fixed';
    menu.style.top = '20px';
    menu.style.left = '20px';
    menu.style.background = '#fff';
    menu.style.border = '1px solid #e0e0e0';
    menu.style.borderRadius = '8px';
    menu.style.padding = '10px 20px';
    menu.style.zIndex = '1001';
    menu.style.boxShadow = 'var(--shadow)';
    menu.innerHTML = `<b>${user.email}</b><br><button onclick="showChangePasswordForm()">تغيير كلمة المرور</button><br><button onclick="logout()">تسجيل الخروج</button>`;
    document.body.appendChild(menu);
  }
}

// --- Chart.js for Grades ---
function renderGradesChart(grades) {
  if (!window.Chart) return;
  let chartDiv = document.getElementById('grades-chart');
  if (!chartDiv) {
    chartDiv = document.createElement('div');
    chartDiv.id = 'grades-chart';
    chartDiv.style.margin = '30px 0';
    document.getElementById('main').prepend(chartDiv);
  }
  chartDiv.innerHTML = '<canvas id="gradesChartCanvas"></canvas>';
  const ctx = document.getElementById('gradesChartCanvas').getContext('2d');
  const labels = grades.map(g => g.courses.code);
  const data = grades.map(g => g.grade);
  if (window._gradesChart) window._gradesChart.destroy();
  window._gradesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'العلامة',
        data,
        backgroundColor: 'rgba(76,175,80,0.7)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

// --- Custom Confirmation Modal ---
function showConfirmModal(message, onConfirm) {
  let modal = document.getElementById('confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'confirm-modal';
    modal.innerHTML = `<div class="modal-content"><div id="confirm-message"></div><div class="button-group"><button id="confirm-yes">نعم</button><button id="confirm-no" class="secondary">إلغاء</button></div></div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('confirm-message').textContent = message;
  modal.classList.add('show');
  document.getElementById('confirm-yes').onclick = () => {
    modal.classList.remove('show');
    onConfirm();
  };
  document.getElementById('confirm-no').onclick = () => {
    modal.classList.remove('show');
  };
}

// Login function
window.login = async () => {
  try {
    showLoader();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    if (!isValidEmail(email)) {
      showNotification('البريد الإلكتروني غير صالح', 'error');
      return;
    }
    if (!isValidPassword(password)) {
      showNotification('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showNotification(error.message, 'error');
      return;
    }

    if (data.user) {
      // Check if admin user
      if (data.user.email.endsWith('@admin.com')) {
        location.href = 'admin.html';
        return;
      }
      showNotification("تم تسجيل الدخول بنجاح");
      await init();
    }
  } catch (err) {
    console.error('Login error:', err);
    showNotification("خطأ في تسجيل الدخول", 'error');
  } finally {
    hideLoader();
  }
};

window.logout = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// Modify init() to use validation, feedback, chart, and profile menu
async function init() {
  try {
    showLoader();
    if (!await checkSession()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    document.getElementById("auth").style.display = "none";
    document.getElementById("main").style.display = "block";

    // Add user name to title
    const username = user.email.split('@')[0];
    document.querySelector('h1').textContent = `د ق ك 62 - ${username}`;

    createProfileMenu(user);

    // Fetch courses and grades for the user
    const { data: courses } = await supabase.from("courses").select("*");
    const { data: grades } = await supabase.from("grades")
      .select("*, courses(*)")
      .eq("user_id", user.id);

    // Sort grades by course code instead of name
    grades.sort((a, b) => a.courses.code.localeCompare(b.courses.code));

    renderGradesChart(grades);

    const formDiv = document.getElementById("grade-form");
    formDiv.innerHTML = "";

    // Display existing grades in a table
    const gradesTable = document.createElement("table");
    gradesTable.innerHTML = `
      <tr>
        <th>رمز المادة</th>
        <th>العلامة</th>
        <th>تعديل</th>
      </tr>
    `;

    grades.forEach(g => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${g.courses.code}</td>
            <td>${g.grade}</td>
            <td>
                <button onclick="editGrade(${g.course_id}, ${g.grade})" class="action-btn">تعديل</button>
                <button onclick="deleteGrade(${g.course_id})" class="delete-btn">حذف</button>
            </td>
        `;
        gradesTable.appendChild(row);
    });

    formDiv.appendChild(gradesTable);

    // Create "Add Grade" button and course selection
    const addGradeDiv = document.createElement("div");
    addGradeDiv.style.marginTop = "20px";

    // Filter out courses that already have grades
    const existingCourseIds = new Set(grades.map(g => g.course_id));
    const availableCourses = courses.filter(c => !existingCourseIds.has(c.id));

    if (availableCourses.length > 0) {
      const select = document.createElement("select");
      select.id = "course-select";
      select.innerHTML = "<option value=''>اختر المادة</option>";
      availableCourses.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.code}</option>`;
      });
      // Add styling to make the select bigger
      select.style.width = "200px";  // Increased width
      select.style.padding = "8px";  // More padding
      select.style.fontSize = "16px"; // Bigger font
      select.style.marginRight = "10px";

      const gradeInput = document.createElement("input");
      gradeInput.type = "number";
      gradeInput.id = "new-grade";
      gradeInput.placeholder = "العلامة";
      gradeInput.min = "0";
      gradeInput.max = "100";
      gradeInput.step = "0.01";
      gradeInput.style.width = "120px"; // Also increased input width
      gradeInput.style.marginRight = "10px";
      gradeInput.style.marginLeft = "10px";
      gradeInput.style.padding = "8px"; // Match padding
      gradeInput.style.fontSize = "16px"; // Match font size

      const addButton = document.createElement("button");
      addButton.textContent = "إضافة العلامة";
      addButton.onclick = () => addNewGrade();

      addGradeDiv.appendChild(select);
      addGradeDiv.appendChild(gradeInput);
      addGradeDiv.appendChild(addButton); // Add button here instead of in button group
    }

    formDiv.appendChild(addGradeDiv);

    // Add button group for navigation and actions
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";
    buttonGroup.style.marginTop = "20px";

    // Only add the navigation buttons
    const rankingButton = document.createElement("button");
    rankingButton.textContent = "عرض التصنيف";
    rankingButton.onclick = () => location.href = 'ranking.html';
    buttonGroup.appendChild(rankingButton);

    const changePasswordButton = document.createElement("button");
    changePasswordButton.textContent = "تغيير كلمة المرور";
    changePasswordButton.onclick = () => showChangePasswordForm();
    buttonGroup.appendChild(changePasswordButton);

    const logoutButton = document.createElement("button");
    logoutButton.textContent = "تسجيل الخروج";
    logoutButton.onclick = () => logout();
    buttonGroup.appendChild(logoutButton);

    formDiv.appendChild(buttonGroup);
  } finally {
    hideLoader();
  }
}

// Update the editGrade function
window.editGrade = async (courseId, currentGrade) => {
  try {
    showLoader();
    const newGrade = prompt('أدخل العلامة الجديدة (0-100):', currentGrade);
    if (!isValidGrade(newGrade)) {
      showNotification('الرجاء إدخال علامة صحيحة بين 0 و 100', 'error');
      return;
    }

    const grade = parseFloat(newGrade);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showNotification("يرجى تسجيل الدخول أولاً", 'error');
      return;
    }

    // First try to update existing grade
    const { error: updateError } = await supabase
      .from("grades")
      .update({ grade: grade })
      .match({ user_id: user.id, course_id: courseId });

    if (updateError) {
      console.error('Update error:', updateError);
      showNotification("خطأ في تحديث العلامة", 'error');
      return;
    }

    showNotification("تم تحديث العلامة بنجاح");
    await init();
  } finally {
    hideLoader();
  }
};

// Update the addNewGrade function
window.addNewGrade = async () => {
  try {
    showLoader();
    const courseId = document.getElementById("course-select").value;
    const grade = parseFloat(document.getElementById("new-grade").value);

    if (!courseId) {
      showNotification("الرجاء اختيار المادة", 'error');
      return;
    }

    if (!isValidGrade(grade)) {
      showNotification("الرجاء إدخال درجة صحيحة بين 0 و 100", 'error');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("grades")
      .upsert({
        user_id: user.id,
        course_id: courseId,
        grade: grade
      }, {
        onConflict: 'user_id,course_id',
        update: { grade: grade }
      });

    if (error) {
      console.error('Insert error:', error);
      showNotification("خطأ في حفظ العلامة", 'error');
      return;
    }

    showNotification("تم حفظ العلامة بنجاح");
    await init();
  } finally {
    hideLoader();
  }
};

// Add these functions after the existing code
window.showChangePasswordForm = () => {
  const modal = document.getElementById('change-password-form');
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('show'), 10);
  
  // Clear previous inputs
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
};

window.hideChangePasswordForm = () => {
  const modal = document.getElementById('change-password-form');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
};

window.changePassword = async () => {
  try {
    showLoader();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('الرجاء تعبئة جميع الحقول', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('كلمة المرور الجديدة غير متطابقة', 'error');
      return;
    }

    if (!isValidPassword(newPassword)) {
      showNotification('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification('يرجى تسجيل الدخول مرة أخرى', 'error');
        return;
      }

      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        showNotification('كلمة المرور الحالية غير صحيحة', 'error');
        return;
      }

      // Update password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        showNotification('حدث خطأ في تحديث كلمة المرور', 'error');
        console.error('Password update error:', updateError);
        return;
      }

      if (data?.user) {
        showNotification('تم تغيير كلمة المرور بنجاح');
        hideChangePasswordForm();
        
        // Force re-login with new password
        await supabase.auth.signOut();
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: newPassword
        });

        if (loginError) {
          showNotification('تم تغيير كلمة المرور، يرجى تسجيل الدخول مرة أخرى', 'error');
          location.reload();
          return;
        }

        await init();
      } else {
        showNotification('حدث خطأ في تحديث كلمة المرور', 'error');
      }
    } catch (err) {
      console.error('Change password error:', err);
      showNotification('حدث خطأ غير متوقع', 'error');
    }
  } finally {
    hideLoader();
  }
};

// --- Add Chart.js CDN if not present ---
if (!window.Chart) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(script);
}