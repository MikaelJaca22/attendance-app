/**
 * Main Application Controller - Single Page App Router & Event Handlers
 */
class App {
    constructor() {
        this.searchTimeout = null;
        this.currentDeleteId = null;
        this.debounceDelay = 300;
    }

    /**
     * Initialize application
     */
    async initialize() {
        try {
            UI.loadDarkMode();
            this.setupEventListeners();
            this.handleRouting();
            
            // Hide loading spinner
            setTimeout(() => {
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) spinner.style.display = 'none';
            }, 500);
        } catch (error) {
            console.error('App initialization error:', error);
            UI.showMessage('Failed to initialize application', 'error');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => UI.toggleDarkMode());
        }

        // Auth forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }

        // Dashboard controls
        const addStudentBtn = document.getElementById('addStudentBtn');
        const searchInput = document.getElementById('searchInput');
        const courseFilter = document.getElementById('courseFilter');

        if (addStudentBtn) {
            addStudentBtn.addEventListener('click', () => UI.showModal('addStudentModal'));
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
        }

        if (courseFilter) {
            courseFilter.addEventListener('change', () => this.handleFilter());
        }

        // Student forms
        const addStudentForm = document.getElementById('addStudentForm');
        const editStudentForm = document.getElementById('editStudentForm');

        if (addStudentForm) {
            addStudentForm.addEventListener('submit', (e) => this.handleAddStudent(e));
        }

        if (editStudentForm) {
            editStudentForm.addEventListener('submit', (e) => this.handleEditStudent(e));
        }

        // Modal controls (event delegation)
        document.addEventListener('click', (e) => {
            // Close modal buttons
            if (e.target.classList.contains('modal-close') || e.target.dataset.modal) {
                const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
                if (modalId) {
                    UI.closeModal(modalId);
                }
            }

            // Table action buttons
            if (e.target.dataset.action) {
                this.handleTableAction(e);
            }
        });

        // Confirm delete
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.handleDeleteConfirm());
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => this.handleRouting());
    }

    /**
     * Handle URL routing based on query parameters
     */
    handleRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action') || 'login';

        switch (action) {
            case 'register':
                UI.renderRegister();
                break;
            case 'dashboard':
                if (Auth.requireAuth()) {
                    UI.renderDashboard();
                }
                break;
            case 'login':
            default:
                UI.renderLogin();
                break;
        }
    }

    /**
     * Update URL without refreshing
     */
    updateURL(action) {
        const newUrl = `${window.location.pathname}?action=${action}`;
        window.history.pushState({}, '', newUrl);
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await Auth.login(username, password);
            this.updateURL('dashboard');
            this.handleRouting();
            
            // Reset form
            e.target.reset();
        } catch (error) {
            console.error('Login failed:', error);
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate password match
        if (password !== confirmPassword) {
            UI.showMessage('Passwords do not match', 'error');
            return;
        }

        try {
            await Auth.register(username, password);
            this.updateURL('dashboard');
            this.handleRouting();
            
            // Reset form
            e.target.reset();
        } catch (error) {
            console.error('Registration failed:', error);
        }
    }

    /**
     * Handle search with debouncing
     */
    handleSearch(e) {
        clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(() => {
            const searchQuery = e.target.value.trim();
            const courseFilter = document.getElementById('courseFilter')?.value || '';
            UI.renderStudentsTable(searchQuery, courseFilter);
        }, this.debounceDelay);
    }

    /**
     * Handle course filter
     */
    handleFilter() {
        const searchQuery = document.getElementById('searchInput')?.value.trim() || '';
        const courseFilter = document.getElementById('courseFilter')?.value || '';
        UI.renderStudentsTable(searchQuery, courseFilter);
    }

    /**
     * Handle add student form
     */
    async handleAddStudent(e) {
        e.preventDefault();

        const teacherId = Auth.getCurrentTeacherId();
        if (!teacherId) {
            UI.showMessage('Session expired. Please login again.', 'error');
            return;
        }

        const name = document.getElementById('studentName').value.trim();
        const studentId = document.getElementById('studentIdInput').value.trim();
        const course = document.getElementById('studentCourse').value;
        const year = parseInt(document.getElementById('studentYear').value);

        try {
            // Validate
            if (!name || !studentId || !course || !year) {
                throw new Error('Please fill in all fields');
            }

            // Check duplicate student ID for this teacher
            const students = Storage.getStudents();
            const duplicate = students.find(s => 
                s.teacherId === teacherId && s.studentId.toLowerCase() === studentId.toLowerCase()
            );

            if (duplicate) {
                throw new Error('A student with this ID already exists');
            }

            // Create new student
            const newStudent = {
                id: Storage.generateId(),
                teacherId: teacherId,
                name: name,
                studentId: studentId,
                course: course,
                year: year,
                status: 'Unmarked',
                createdAt: new Date().toISOString()
            };

            // Save
            students.push(newStudent);
            Storage.saveStudents(students);

            UI.showMessage(`Student ${name} added successfully!`, 'success');
            UI.closeModal('addStudentModal');
            
            // Reset form and refresh table
            e.target.reset();
            UI.renderStudentsTable();
            
        } catch (error) {
            console.error('Add student error:', error);
            UI.showMessage(error.message, 'error');
        }
    }

    /**
     * Handle edit student form
     */
    async handleEditStudent(e) {
        e.preventDefault();

        const studentId = document.getElementById('editStudentId').value;
        const name = document.getElementById('editStudentName').value.trim();
        const studentIdInput = document.getElementById('editStudentIdInput').value.trim();
        const course = document.getElementById('editStudentCourse').value;
        const year = parseInt(document.getElementById('editStudentYear').value);

        try {
            // Validate
            if (!name || !studentIdInput || !course || !year) {
                throw new Error('Please fill in all fields');
            }

            const teacherId = Auth.getCurrentTeacherId();
            const students = Storage.getStudents();
            const studentIndex = students.findIndex(s => s.id === studentId);

            if (studentIndex === -1) {
                throw new Error('Student not found');
            }

            // Check duplicate student ID (excluding current student)
            const duplicate = students.find(s => 
                s.id !== studentId &&
                s.teacherId === teacherId && 
                s.studentId.toLowerCase() === studentIdInput.toLowerCase()
            );

            if (duplicate) {
                throw new Error('A student with this ID already exists');
            }

            // Update student
            students[studentIndex] = {
                ...students[studentIndex],
                name: name,
                studentId: studentIdInput,
                course: course,
                year: year
            };

            Storage.saveStudents(students);

            UI.showMessage('Student updated successfully!', 'success');
            UI.closeModal('editStudentModal');
            
            UI.renderStudentsTable();
            
        } catch (error) {
            console.error('Edit student error:', error);
            UI.showMessage(error.message, 'error');
        }
    }

    /**
     * Handle table action buttons
     */
    handleTableAction(e) {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (!action || !id) return;

        switch (action) {
            case 'toggle':
                this.handleToggleAttendance(id);
                break;
            case 'edit':
                this.handleEditStudentModal(id);
                break;
            case 'delete':
                this.handleDeleteStudent(id);
                break;
        }
    }

    /**
     * Handle attendance toggle
     */
    handleToggleAttendance(studentId) {
        try {
            const teacherId = Auth.getCurrentTeacherId();
            const students = Storage.getStudents();
            const studentIndex = students.findIndex(s => s.id === studentId);

            if (studentIndex === -1) {
                throw new Error('Student not found');
            }

            // Toggle between Present and Absent
            const currentStatus = students[studentIndex].status;
            const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';

            students[studentIndex].status = newStatus;
            Storage.saveStudents(students);

            UI.showMessage('Attendance updated successfully!', 'success');
            UI.renderStudentsTable();
            
        } catch (error) {
            console.error('Toggle attendance error:', error);
            UI.showMessage(error.message, 'error');
        }
    }

    /**
     * Show edit student modal
     */
    handleEditStudentModal(studentId) {
        const teacherId = Auth.getCurrentTeacherId();
        const students = Storage.getStudents();
        const student = students.find(s => s.id === studentId);

        if (!student) {
            UI.showMessage('Student not found', 'error');
            return;
        }

        // Pre-fill form
        UI.prefillEditForm(student);
        UI.showModal('editStudentModal');
    }

    /**
     * Show delete confirmation modal
     */
    handleDeleteStudent(studentId) {
        this.currentDeleteId = studentId;
        UI.showModal('deleteModal');
    }

    /**
     * Confirm delete student
     */
    handleDeleteConfirm() {
        if (!this.currentDeleteId) return;

        try {
            const teacherId = Auth.getCurrentTeacherId();
            let students = Storage.getStudents();
            
            const studentIndex = students.findIndex(s => s.id === this.currentDeleteId);
            if (studentIndex === -1) {
                throw new Error('Student not found');
            }

            const studentName = students[studentIndex].name;
            
            // Remove student
            students = students.filter(s => s.id !== this.currentDeleteId);
            Storage.saveStudents(students);

            UI.showMessage(`Student ${studentName} deleted successfully!`, 'success');
            UI.closeModal('deleteModal');
            
            this.currentDeleteId = null;
            UI.renderStudentsTable();
            
        } catch (error) {
            console.error('Delete student error:', error);
            UI.showMessage(error.message, 'error');
        }
    }

    /**
     * Load sample demo data
     */
    static loadSampleData() {
        const teachers = Storage.getTeachers();
        const students = Storage.getStudents();

        // Only load if empty
        if (teachers.length > 0 || students.length > 0) return;

        UI.showMessage('Loading demo data for first-time setup...', 'info', 3000);

        // Sample teachers (password for all: 123456)
        const sampleTeachers = [
            {
                id: 'teacher-1',
                username: 'Teacher1',
                password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // SHA-256 of "123456"
                createdAt: new Date().toISOString()
            },
            {
                id: 'teacher-2',
                username: 'Teacher2',
                password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
                createdAt: new Date().toISOString()
            },
            {
                id: 'teacher-3',
                username: 'Teacher3',
                password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
                createdAt: new Date().toISOString()
            }
        ];

        // Sample students
        const sampleStudents = [
            {
                id: 'student-1',
                teacherId: 'teacher-1',
                name: 'John Smith',
                studentId: '2024-001',
                course: 'WAD',
                year: 3,
                status: 'Present',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-2',
                teacherId: 'teacher-1',
                name: 'Emma Johnson',
                studentId: '2024-002',
                course: 'OMT',
                year: 2,
                status: 'Present',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-3',
                teacherId: 'teacher-1',
                name: 'Michael Brown',
                studentId: '2024-003',
                course: 'WAD',
                year: 3,
                status: 'Absent',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-4',
                teacherId: 'teacher-2',
                name: 'Sarah Davis',
                studentId: '2024-004',
                course: 'HM',
                year: 1,
                status: 'Present',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-5',
                teacherId: 'teacher-2',
                name: 'James Wilson',
                studentId: '2024-005',
                course: 'HRT',
                year: 4,
                status: 'Unmarked',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-6',
                teacherId: 'teacher-2',
                name: 'Lisa Anderson',
                studentId: '2024-006',
                course: 'BSIT',
                year: 2,
                status: 'Absent',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-7',
                teacherId: 'teacher-3',
                name: 'Robert Taylor',
                studentId: '2024-007',
                course: 'BSHM',
                year: 1,
                status: 'Present',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-8',
                teacherId: 'teacher-3',
                name: 'Jennifer Lee',
                studentId: '2024-008',
                course: 'OAT',
                year: 3,
                status: 'Present',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-9',
                teacherId: 'teacher-3',
                name: 'David Martinez',
                studentId: '2024-009',
                course: 'WAD',
                year: 2,
                status: 'Unmarked',
                createdAt: new Date().toISOString()
            },
            {
                id: 'student-10',
                teacherId: 'teacher-1',
                name: 'Maria Garcia',
                studentId: '2024-010',
                course: 'OMT',
                year: 4,
                status: 'Absent',
                createdAt: new Date().toISOString()
            }
        ];

        Storage.saveTeachers(sampleTeachers);
        Storage.saveStudents(sampleStudents);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        app.initialize();
        
        // Load sample data on first run
        App.loadSampleData();
    });
} else {
    const app = new App();
    app.initialize();
    App.loadSampleData();
}

// Global function for inline onclick handlers
window.UI = UI;