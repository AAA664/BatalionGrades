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

// Login function
window.login = async () => {
  try {
    showLoader();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
      showNotification("الرجاء إدخال البريد الإلكتروني وكلمة المرور", 'error');
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

// Chart.js: Render grades line chart
function renderGradesChart(grades) {
  const chartSection = document.getElementById('grades-chart-section');
  if (!grades || grades.length === 0) {
    if (chartSection) chartSection.style.display = 'none';
    if (window.gradesChart) { window.gradesChart.destroy(); window.gradesChart = null; }
    return;
  }
  if (chartSection) chartSection.style.display = 'block';
  const ctx = document.getElementById('grades-chart').getContext('2d');
  if (window.gradesChart) { window.gradesChart.destroy(); window.gradesChart = null; }
  const labels = grades.map(g => g.courses && g.courses.code ? g.courses.code : '');
  const data = grades.map(g => g.grade);
  window.gradesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'العلامة',
        data: data,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: 'rgba(46, 125, 50, 1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgba(46, 125, 50, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 20,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          displayColors: false
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      }
    }
  });
}

// Modify init() to use session check and call renderGradesChart
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

    // Fetch courses and grades for the user
    const { data: courses } = await supabase.from("courses").select("*");
    const { data: grades } = await supabase.from("grades")
      .select("*, courses(*)")
      .eq("user_id", user.id);

    // Sort grades by course code instead of name
    grades.sort((a, b) => a.courses.code.localeCompare(b.courses.code));

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

    const wrapper = document.createElement("div");
    wrapper.className = "grades-table-wrapper";
    wrapper.appendChild(gradesTable);
    formDiv.appendChild(wrapper);

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

    await renderGradesChart(grades);
  } finally {
    hideLoader();
  }
}

// Update the editGrade function
window.editGrade = async (courseId, currentGrade) => {
  try {
    showLoader();
    const newGrade = prompt(`أدخل العلامة الجديدة (${currentGrade}):`, currentGrade);
    if (newGrade === null) return;

    const grade = parseFloat(newGrade);
    if (isNaN(grade) || grade < 0 || grade > 20) {
      showNotification("الرجاء إدخال علامة صحيحة بين 0 و 20", 'error');
      return;
    }

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

    if (isNaN(grade) || grade < 0 || grade > 100) {
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

    if (newPassword.length < 6) {
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
      console.error('Password change error:', err);
      showNotification('حدث خطأ في تغيير كلمة المرور', 'error');
    }
  } finally {
    hideLoader();
  }
};

// Add delete grade function after other window functions
window.deleteGrade = async (courseId) => {
    if (!confirm('هل أنت متأكد من حذف هذه العلامة؟')) return;
    
    try {
        showLoader();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
            .from('grades')
            .delete()
            .match({ user_id: user.id, course_id: courseId });

        if (error) {
            console.error('Delete error:', error);
            showNotification("خطأ في حذف العلامة", 'error');
            return;
        }

        showNotification("تم حذف العلامة بنجاح");
        await init();
    } finally {
        hideLoader();
    }
}

init();
