import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  'https://your-project.supabase.co', // replace with your URL
  'your-anon-key'                     // replace with your anon key
)

window.login = async () => {
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return alert(error.message)
  init()
}

window.signup = async () => {
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return alert(error.message)
  alert("Signup successful. Please check your email.")
}

window.logout = async () => {
  await supabase.auth.signOut()
  location.reload()
}

async function init() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  document.getElementById("auth").style.display = "none"
  document.getElementById("main").style.display = "block"

  const { data: courses } = await supabase.from("courses").select("*")
  const formDiv = document.getElementById("grade-form")
  formDiv.innerHTML = ""
  courses.forEach(c => {
    const input = document.createElement("input")
    input.type = "number"
    input.id = `course-${c.id}`
    input.placeholder = `${c.name} (credit: ${c.credit})`
    input.step = "0.01"
    formDiv.appendChild(input)
    formDiv.appendChild(document.createElement("br"))
  })
}

window.submitGrades = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: courses } = await supabase.from("courses").select("*")

  const entries = []
  for (const course of courses) {
    const inputElem = document.getElementById(`course-${course.id}`)
    const val = parseFloat(inputElem.value)
    if (inputElem.value.trim() === "") {
      alert(`Please enter a grade for ${course.name}.`)
      inputElem.focus()
      return
    }
    if (isNaN(val) || val < 0 || val > 100) {
      alert(`Please enter a valid grade (0-100) for ${course.name}.`)
      inputElem.focus()
      return
    }
    entries.push({
      user_id: user.id,
      course_id: course.id,
      grade: val
    })
  }

  for (const e of entries) {
    await supabase.from("grades")
      .upsert(e, { onConflict: ["user_id", "course_id"] })
  }

  alert("Grades submitted.")
}

window.loadRankings = async () => {
  const { data: grades } = await supabase.from("grades").select("*")
  const { data: courses } = await supabase.from("courses").select("id, credit")
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c.credit]))

  const userScores = {}
  for (const g of grades) {
    const credit = courseMap[g.course_id] || 1
    if (!userScores[g.user_id]) userScores[g.user_id] = { total: 0, credits: 0 }
    userScores[g.user_id].total += g.grade * credit
    userScores[g.user_id].credits += credit
  }

  const result = Object.entries(userScores).map(([uid, v]) => ({
    uid,
    average: v.total / v.credits
  })).sort((a, b) => b.average - a.average)

  const table = document.getElementById("ranking-table")
  table.innerHTML = "<tr><th>Rank</th><th>User ID</th><th>Avg</th></tr>"
  result.forEach((r, i) => {
    table.innerHTML += `<tr><td>${i + 1}</td><td>${r.uid.slice(0, 6)}...</td><td>${r.average.toFixed(2)}</td></tr>`
  })
}

init()
