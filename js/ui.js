/**
 * UI Module - Rendering functions and DOM manipulation
 */
class UI {
    /**
     * Show/hide sections based on route
     */
    static showSection(sectionId) {
        const sections = ['loginSection', 'registerSection', 'dashboardSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === sectionId ? 'flex' : 'none';
            }
        });
    }

    /**
     * Show message banner
     */
    static showMessage(message, type = 'info', duration = 5000) {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const alertId = 'alert-' + Date.now();
        const alertDiv = document.createElement('div');
        alertDiv.id = alertId;
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${this.escapeHtml(message)}</span>
            <button class="alert-close" onclick="UI.closeMessage('${alertId}')">&times;</button>
        `;

        container.appendChild(alertDiv);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.closeMessage(alertId);
            }, duration);
        }
    }

    /**
     * Close message banner
     */
    static closeMessage(alertId) {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show modal
     */
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Render login section
     */
    static renderLogin() {
        this.showSection('loginSection');
        document.title = 'Login - Student Attendance System';
    }

    /**
     * Render register section
     */
    static renderRegister() {
        this.showSection('registerSection');
        document.title = 'Register - Student Attendance System';
    }

    /**
     * Render dashboard
     */
    static renderDashboard() {
        this.showSection('dashboardSection');
        document.title = 'Dashboard - Student Attendance System';
        
        // Update current user display
        const currentUser = Auth.getCurrentTeacher();
        const userDisplay = document.getElementById('currentUserDisplay');
        if (userDisplay && currentUser) {
            userDisplay.textContent = `👤 ${currentUser.username}`;
        }
        
        // Load and render students
        this.renderStudentsTable();
    }

    /**
     * Render students table with optional filtering
     */
    static renderStudentsTable(searchQuery = '', courseFilter = '') {
        const teacherId = Auth.getCurrentTeacherId();
        if (!teacherId) return;

        let students = Storage.getStudents().filter(s => s.teacherId === teacherId);

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            students = students.filter(s => 
                s.name.toLowerCase().includes(query) || 
                s.studentId.toLowerCase().includes(query)
            );
        }

        // Apply course filter
        if (courseFilter) {
            students = students.filter(s => s.course === courseFilter);
        }

        // Update stats
        this.updateStats(students);

        const tbody = document.getElementById('studentsTableBody');
        const table = document.getElementById('studentsTable');
        const emptyState = document.getElementById('emptyState');

        if (!tbody) return;

        if (students.length === 0) {
            tbody.innerHTML = '';
            table.style.display = 'none';
            emptyState.style.display = 'block';
            this.renderEmptyState(searchQuery, courseFilter);
            return;
        }

        table.style.display = 'table';
        emptyState.style.display = 'none';

        tbody.innerHTML = students.map(student => `
            <tr>
                <td>${this.escapeHtml(student.studentId)}</td>
                <td>${this.escapeHtml(student.name)}</td>
                <td>${this.escapeHtml(student.course)}</td>
                <td>${student.year}</td>
                <td>
                    <span class="status-badge status-${student.status.toLowerCase()}">
                        ${student.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn toggle" 
                                data-action="toggle" 
                                data-id="${student.id}"
                                title="Toggle Attendance">
                            📊
                        </button>
                        <button class="action-btn edit" 
                                data-action="edit" 
                                data-id="${student.id}"
                                title="Edit Student">
                            ✏️
                        </button>
                        <button class="action-btn delete" 
                                data-action="delete" 
                                data-id="${student.id}"
                                title="Delete Student">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render empty state
     */
    static renderEmptyState(searchQuery = '', courseFilter = '') {
        const emptyState = document.getElementById('emptyState');
        if (!emptyState) return;

        let message = 'No students found. Add your first student to get started!';
        
        if (searchQuery || courseFilter) {
            message = 'No students match your search criteria. Try adjusting your filters.';
        }

        emptyState.innerHTML = `<p>${this.escapeHtml(message)}</p>`;
    }

    /**
     * Update statistics cards
     */
    static updateStats(students) {
        const total = students.length;
        const present = students.filter(s => s.status === 'Present').length;
        const absent = students.filter(s => s.status === 'Absent').length;
        const unmarked = students.filter(s => s.status === 'Unmarked').length;

        const totalEl = document.getElementById('totalStudents');
        const presentEl = document.getElementById('presentCount');
        const absentEl = document.getElementById('absentCount');
        const unmarkedEl = document.getElementById('unmarkedCount');

        if (totalEl) totalEl.textContent = total;
        if (presentEl) presentEl.textContent = present;
        if (absentEl) absentEl.textContent = absent;
        if (unmarkedEl) unmarkedEl.textContent = unmarked;
    }

    /**
     * Pre-fill edit form
     */
    static prefillEditForm(student) {
        document.getElementById('editStudentId').value = student.id;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentIdInput').value = student.studentId;
        document.getElementById('editStudentCourse').value = student.course;
        document.getElementById('editStudentYear').value = student.year;
    }

    /**
     * Toggle dark mode
     */
    static toggleDarkMode() {
        const body = document.body;
        const icon = document.getElementById('darkModeIcon');
        const isDark = body.classList.toggle('dark-mode');
        
        localStorage.setItem('darkMode', isDark.toString());
        
        if (icon) {
            icon.textContent = isDark ? '☀️' : '🌙';
        }
    }

    /**
     * Load dark mode preference
     */
    static loadDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        const body = document.body;
        const icon = document.getElementById('darkModeIcon');
        
        if (isDark) {
            body.classList.add('dark-mode');
            if (icon) icon.textContent = '☀️';
        }
    }
}