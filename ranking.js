// Initialize Supabase client
const supabaseUrl = 'https://hnithcvhemzsicwabhtq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXRoY3ZoZW16c2ljd2FiaHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5OTE2NDksImV4cCI6MjA2MjU2NzY0OX0.FVkMWLqm6hzzd-7znR3iTo0XU1fjj4EJpQrD3ElzFoQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

window.loadRankings = async () => {
  const table = document.getElementById("ranking-table");
  table.innerHTML = '<tr><td colspan="3">جاري التحميل...</td></tr>';

  try {
    const { data: rankings, error } = await supabase
      .from('user_rankings')
      .select('*')
      .order('average', { ascending: false });

    if (error) throw error;

    table.innerHTML = `
      <tr>
        <th>الترتيب</th>
        <th>الاسم</th>
        <th>المعدل</th>
      </tr>
    `;

    if (rankings.length === 0) {
      table.innerHTML += '<tr><td colspan="3">لا توجد نتائج</td></tr>';
      return;
    }

    rankings.forEach((r, i) => {
      const username = r.email.split('@')[0];
      table.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${username}</td>
          <td>${r.average.toFixed(2)}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading rankings:', err);
    table.innerHTML = '<tr><td colspan="3">حدث خطأ في تحميل النتائج</td></tr>';
  }
};

// Set up real-time subscription
const subscription = supabase
  .channel('public:grades')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'grades' },
    () => loadRankings()
  )
  .subscribe();

// Initial load
loadRankings();