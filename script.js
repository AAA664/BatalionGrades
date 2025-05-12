// Initialize Supabase client
const supabaseUrl = 'https://hnithcvhemzsicwabhtq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXRoY3ZoZW16c2ljd2FiaHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5OTE2NDksImV4cCI6MjA2MjU2NzY0OX0.FVkMWLqm6hzzd-7znR3iTo0XU1fjj4EJpQrD3ElzFoQ';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Login function
window.login = async () => {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
      alert("الرجاء إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    if (data.user) {
      await init();
    }
  } catch (err) {
    console.error('Login error:', err);
    alert("حدث خطأ في تسجيل الدخول");
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
  const { data: grades } = await supabase.from("grades").select("*").eq("user_id", user.id);

  // Map grades by course_id for quick lookup
  const gradeMap = {};
  grades.forEach(g => {
    gradeMap[g.course_id] = g.grade;
  });

  const formDiv = document.getElementById("grade-form");
  formDiv.innerHTML = "";

  courses.forEach(c => {
    const container = document.createElement("div");
    container.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.textContent = c.name + ": ";
    label.style.fontWeight = "bold";
    container.appendChild(label);

    if (gradeMap.hasOwnProperty(c.id)) {
      // Show grade in a non-editable label
      const gradeLabel = document.createElement("span");
      gradeLabel.textContent = gradeMap[c.id].toFixed(2);
      gradeLabel.style.marginRight = "10px";
      container.appendChild(gradeLabel);
    } else {
      // Show input for entering grade
      const input = document.createElement("input");
      input.type = "number";
      input.id = `course-${c.id}`;
      input.placeholder = "لا يوجد درجة";
      input.step = "0.01";
      input.min = "0";
      input.max = "100";
      input.style.width = "60px";
      container.appendChild(input);
    }

    formDiv.appendChild(container);
  });
}

window.submitGrades = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: courses } = await supabase.from("courses").select("*");

  const entries = [];
  for (const course of courses) {
    const inputElem = document.getElementById(`course-${course.id}`);
    if (!inputElem) continue; // skip courses with existing grades

    const valStr = inputElem.value.trim();
    if (valStr === "") {
      alert(`الرجاء إدخال درجة للمادة ${course.name}.`);
      inputElem.focus();
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 100) {
      alert(`الرجاء إدخال درجة صحيحة بين 0 و 100 للمادة ${course.name}.`);
      inputElem.focus();
      return;
    }
    entries.push({
      user_id: user.id,
      course_id: course.id,
      grade: val
    });
  }

  for (const e of entries) {
    await supabase.from("grades")
      .upsert(e, { onConflict: ["user_id", "course_id"] });
  }

  alert("تم حفظ الدرجات.");
  init(); // refresh form to show updated grades
};

window.loadRankings = async () => {
  const { data: grades } = await supabase.from("grades").select("*");
  const { data: courses } = await supabase.from("courses").select("id, credit");
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c.credit]));

  const userScores = {};
  for (const g of grades) {
    const credit = courseMap[g.course_id] || 1;
    if (!userScores[g.user_id]) userScores[g.user_id] = { total: 0, credits: 0 };
    userScores[g.user_id].total += g.grade * credit;
    userScores[g.user_id].credits += credit;
  }

  const result = Object.entries(userScores).map(([uid, v]) => ({
    uid,
    average: v.total / v.credits
  })).sort((a, b) => b.average - a.average);

  const table = document.getElementById("ranking-table");
  table.innerHTML = "<tr><th>الترتيب</th><th>معرف المستخدم</th><th>المعدل</th></tr>";
  result.forEach((r, i) => {
    table.innerHTML += `<tr><td>${i + 1}</td><td>${r.uid.slice(0, 6)}...</td><td>${r.average.toFixed(2)}</td></tr>`;
  });
}

init();
