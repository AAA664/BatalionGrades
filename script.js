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

// Login function
window.login = async () => {
  try {
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
      showNotification("تم تسجيل الدخول بنجاح");
      await init();
    }
  } catch (err) {
    console.error('Login error:', err);
    showNotification("خطأ في تسجيل الدخول", 'error');
  }
};

window.logout = async () => {
  await supabase.auth.signOut();
  location.reload();
};

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  document.getElementById("auth").style.display = "none";
  document.getElementById("main").style.display = "block";

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
        <button onclick="editGrade(${g.course_id}, ${g.grade})">تعديل</button>
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

    const gradeInput = document.createElement("input");
    gradeInput.type = "number";
    gradeInput.id = "new-grade";
    gradeInput.placeholder = "العلامة";
    gradeInput.min = "0";
    gradeInput.max = "100";
    gradeInput.step = "0.01";
    gradeInput.style.width = "80px";
    gradeInput.style.marginRight = "10px";
    gradeInput.style.marginLeft = "10px";

    const addButton = document.createElement("button");
    addButton.textContent = "إضافة العلامة";
    addButton.onclick = () => addNewGrade();

    addGradeDiv.appendChild(select);
    addGradeDiv.appendChild(gradeInput);
    addGradeDiv.appendChild(addButton);
  }

  formDiv.appendChild(addGradeDiv);
}

// Update the editGrade function
window.editGrade = async (courseId, currentGrade) => {
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
};

// Update the addNewGrade function
window.addNewGrade = async () => {
  const courseId = document.getElementById("course-select").value;
  const grade = parseFloat(document.getElementById("new-grade").value);

  if (!courseId) {
    showNotification("الرجاء اختيار المادة", 'error');
    return;
  }

  if (isNaN(grade) || grade < 0 || grade > 20) {
    showNotification("الرجاء إدخال علامة صحيحة بين 0 و 20", 'error');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("grades")
    .insert({
      user_id: user.id,
      course_id: courseId,
      grade: grade
    });

  if (error) {
    console.error('Insert error:', error);
    showNotification("خطأ في حفظ العلامة", 'error');
    return;
  }

  showNotification("تم إضافة العلامة بنجاح");
  await init();
};

init();
