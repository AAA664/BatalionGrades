// Initialize Supabase client
const supabaseUrl = 'https://hnithcvhemzsicwabhtq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuaXRoY3ZoZW16c2ljd2FiaHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5OTE2NDksImV4cCI6MjA2MjU2NzY0OX0.FVkMWLqm6hzzd-7znR3iTo0XU1fjj4EJpQrD3ElzFoQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Check if user is admin
async function checkAdminSession() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (!user || !user.email.endsWith('@admin.com')) {
            showNotification('غير مصرح لك بالدخول', 'error');
            location.href = 'index.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Admin check error:', error);
        location.href = 'index.html';
        return false;
    }
}

// Show/Hide sections
function showSection(sectionName) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionName}-section`).classList.add('active');
    loadSectionData(sectionName);
}

// Load data for each section
async function loadSectionData(section) {
    switch(section) {
        case 'users':
            await loadUsers();
            break;
        case 'courses':
            await loadCourses();
            break;
        case 'grades':
            await loadGrades();
            break;
    }
}

// Users Management
async function loadUsers() {
    const table = document.getElementById('users-table');
    
    try {
        showLoader();
        // Get users from our secure view
        const { data: users, error } = await supabase
            .from('user_list')
            .select('*')
            .order('email');

        if (error) {
            console.error('Users fetch error:', error);
            throw error;
        }

        table.innerHTML = `
            <tr>
                <th>البريد الإلكتروني</th>
                <th>تاريخ الإنشاء</th>
                <th>الإجراءات</th>
            </tr>
        `;

        if (!users || users.length === 0) {
            table.innerHTML += '<tr><td colspan="3">لا يوجد مستخدمين</td></tr>';
            return;
        }

        users.forEach(user => {
            const isAdmin = user.email.endsWith('@admin.com');
            table.innerHTML += `
                <tr>
                    <td>${user.email}</td>
                    <td>${new Date(user.created_at).toLocaleDateString('ar')}</td>
                    <td>
                        ${!isAdmin ? `
                            <button onclick="resetUserPassword('${user.id}')" class="edit-btn">إعادة تعيين كلمة المرور</button>
                            <button onclick="deleteUser('${user.id}')" class="delete-btn">حذف</button>
                        ` : 'مدير النظام'}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('خطأ في تحميل المستخدمين', 'error');
    } finally {
        hideLoader();
    }
}

// Add user function
async function addUser() {
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;

    if (!email || !password) {
        showNotification('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) throw error;

        showNotification('تم إضافة المستخدم بنجاح');
        hideModal('add-user-modal');
        await loadUsers();
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification('خطأ في إضافة المستخدم', 'error');
    }
}

// Add delete user function
window.deleteUser = async (userId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع علاماته')) return;

    try {
        showLoader();
        
        // First delete all user's grades
        const { error: gradesError } = await supabase
            .from('grades')
            .delete()
            .eq('user_id', userId);

        if (gradesError) throw gradesError;

        // Then delete the user from auth
        const { error: userError } = await supabase.auth.admin.deleteUser(userId);

        if (userError) throw userError;

        showNotification('تم حذف المستخدم بنجاح');
        await loadUsers(); // Reload users list
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('خطأ في حذف المستخدم', 'error');
    } finally {
        hideLoader();
    }
};

// Courses Management
async function loadCourses() {
    const table = document.getElementById('courses-table');
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('code');

    if (error) {
        showNotification('خطأ في تحميل المواد', 'error');
        return;
    }

    table.innerHTML = `
        <tr>
            <th>الرمز</th>
            <th>الاسم</th>
            <th>الساعات</th>
            <th>الإجراءات</th>
        </tr>
    `;

    courses.forEach(course => {
        table.innerHTML += `
            <tr>
                <td>${course.code}</td>
                <td>${course.name}</td>
                <td>${course.credit}</td>
                <td>
                    <button onclick="editCourse(${course.id})" class="edit-btn">تعديل</button>
                    <button onclick="deleteCourse(${course.id})" class="delete-btn">حذف</button>
                </td>
            </tr>
        `;
    });
}

// Grades Management
async function loadGrades() {
    const table = document.getElementById('grades-table');
    try {
        showLoader();

        // Get users using the same method that works in loadUsers
        const { data: users, error: usersError } = await supabase
            .from('user_list')  // Use the same view we're using for users list
            .select('id, email')
            .order('email');

        if (usersError) {
            console.error('Users fetch error:', usersError);
            throw usersError;
        }

        if (!users || users.length === 0) {
            table.innerHTML = '<tr><td colspan="3">لا يوجد مستخدمين</td></tr>';
            return;
        }

        // Create user selector with proper container
        const container = document.createElement('div');
        container.className = 'user-selector-container';
        container.style.marginBottom = '20px';

        const userSelector = document.createElement('select');
        userSelector.id = 'user-selector';
        userSelector.style.width = '200px';
        userSelector.style.padding = '8px';
        userSelector.innerHTML = '<option value="">اختر المستخدم</option>';
        
        // Filter and add users to selector
        users
            .filter(user => !user.email.endsWith('@admin.com'))
            .forEach(user => {
                const username = user.email.split('@')[0];
                userSelector.innerHTML += `
                    <option value="${user.id}">${username}</option>
                `;
            });

        container.appendChild(userSelector);

        // Clear and initialize table
        table.innerHTML = '';
        table.parentNode.insertBefore(container, table);

        // Add change event to user selector
        userSelector.onchange = async (e) => {
            const userId = e.target.value;
            if (!userId) {
                table.innerHTML = '';
                return;
            }

            try {
                const { data: grades, error: gradesError } = await supabase
                    .from('grades')
                    .select(`
                        id,
                        grade,
                        courses (
                            id,
                            code,
                            name,
                            credit
                        )
                    `)
                    .eq('user_id', userId);

                if (gradesError) {
                    console.error('Grades fetch error:', gradesError);
                    throw gradesError;
                }

                table.innerHTML = `
                    <tr>
                        <th>المادة</th>
                        <th>العلامة</th>
                        <th>الإجراءات</th>
                    </tr>
                `;

                if (!grades || grades.length === 0) {
                    table.innerHTML += '<tr><td colspan="3">لا توجد علامات</td></tr>';
                    return;
                }

                grades.forEach(grade => {
                    table.innerHTML += `
                        <tr>
                            <td>${grade.courses.code} - ${grade.courses.name}</td>
                            <td>
                                <input type="number" 
                                    value="${grade.grade}" 
                                    min="0" 
                                    max="100" 
                                    onchange="updateGrade('${grade.id}', this.value)"
                                >
                            </td>
                            <td>
                                <button onclick="deleteGrade('${grade.id}')" class="delete-btn">حذف</button>
                            </td>
                        </tr>
                    `;
                });
            } catch (error) {
                console.error('Error loading user grades:', error);
                showNotification('خطأ في تحميل علامات المستخدم', 'error');
            }
        };

    } catch (error) {
        console.error('Error in loadGrades:', error);
        showNotification('خطأ في تحميل الدرجات', 'error');
    } finally {
        hideLoader();
    }
}

// Add delete grade function
window.deleteGrade = async (gradeId) => {
    if (!confirm('هل أنت متأكد من حذف هذه العلامة؟')) return;

    try {
        showLoader();
        
        // Delete the grade
        const { error } = await supabase
            .from('grades')
            .delete()
            .eq('id', gradeId);

        if (error) throw error;

        // Show success message
        showNotification('تم حذف العلامة بنجاح');
        
        // Get the current selected user
        const userSelector = document.getElementById('user-selector');
        if (!userSelector) return;
        
        // Trigger the change event to reload grades
        userSelector.dispatchEvent(new Event('change'));
        
    } catch (error) {
        console.error('Error deleting grade:', error);
        showNotification('خطأ في حذف العلامة', 'error');
    } finally {
        hideLoader();
    }
};

// Add function to update grade
window.updateGrade = async (gradeId, newValue) => {
    try {
        const { error } = await supabase
            .from('grades')
            .update({ grade: parseFloat(newValue) })
            .eq('id', gradeId);

        if (error) throw error;
        showNotification('تم تحديث الدرجة بنجاح');
    } catch (error) {
        console.error('Error updating grade:', error);
        showNotification('خطأ في تحديث الدرجة', 'error');
    }
};

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Initialize admin panel
async function init() {
    if (!await checkAdminSession()) return;
    showSection('users');
}

// Add notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add loader functions
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'block';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);