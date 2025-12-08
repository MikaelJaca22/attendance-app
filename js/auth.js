/**
 * Authentication Module - Client-side auth simulation
 */
class Auth {
    /**
     * Register a new teacher
     */
    static async register(username, password) {
        try {
            // Validate input
            if (!username || username.trim().length < 3) {
                throw new Error('Username must be at least 3 characters long');
            }

            if (!password || password.length < 4) {
                throw new Error('Password must be at least 4 characters long');
            }

            // Check for existing username
            const teachers = Storage.getTeachers();
            const existing = teachers.find(t => t.username.toLowerCase() === username.toLowerCase());
            
            if (existing) {
                throw new Error('Username already exists. Please choose another one.');
            }

            // Hash password
            const hashedPassword = await Storage.hashPassword(password);

            // Create new teacher
            const newTeacher = {
                id: Storage.generateId(),
                username: username.trim(),
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };

            // Save teacher
            teachers.push(newTeacher);
            Storage.saveTeachers(teachers);

            // Auto-login
            this.login(username, password);

            UI.showMessage('Registration successful! Welcome aboard, ' + username + '!', 'success');
            
            return newTeacher;
        } catch (error) {
            console.error('Registration error:', error);
            UI.showMessage(error.message, 'error');
            throw error;
        }
    }

    /**
     * Login teacher
     */
    static async login(username, password) {
        try {
            // Validate input
            if (!username || !password) {
                throw new Error('Please enter both username and password');
            }

            // Hash password for comparison
            const hashedPassword = await Storage.hashPassword(password);

            // Find teacher
            const teachers = Storage.getTeachers();
            const teacher = teachers.find(t => 
                t.username.toLowerCase() === username.toLowerCase() && 
                t.password === hashedPassword
            );

            if (!teacher) {
                throw new Error('Invalid username or password');
            }

            // Set session (exclude password)
            const sessionUser = {
                id: teacher.id,
                username: teacher.username,
                createdAt: teacher.createdAt
            };

            Storage.setCurrentUser(sessionUser);
            
            UI.showMessage('Welcome back, ' + username + '!', 'success');
            
            return sessionUser;
        } catch (error) {
            console.error('Login error:', error);
            UI.showMessage(error.message, 'error');
            throw error;
        }
    }

    /**
     * Logout current user
     */
    static logout() {
        Storage.clearCurrentUser();
        UI.showMessage('You have been logged out successfully', 'success');
        // Redirect to login
        setTimeout(() => {
            window.location.href = '?action=login';
        }, 1000);
    }

    /**
     * Check if user is authenticated (auth guard)
     */
    static requireAuth() {
        const currentUser = Storage.getCurrentUser();
        
        if (!currentUser) {
            UI.showMessage('Please login to access this page', 'error');
            setTimeout(() => {
                window.location.href = '?action=login';
            }, 1500);
            return false;
        }
        
        return true;
    }

    /**
     * Get current teacher ID
     */
    static getCurrentTeacherId() {
        const currentUser = Storage.getCurrentUser();
        return currentUser ? currentUser.id : null;
    }

    /**
     * Get current teacher object (excluding password)
     */
    static getCurrentTeacher() {
        const currentUser = Storage.getCurrentUser();
        if (!currentUser) return null;
        
        const teachers = Storage.getTeachers();
        const teacher = teachers.find(t => t.id === currentUser.id);
        if (!teacher) return null;
        
        // Return without password
        const { password, ...teacherWithoutPassword } = teacher;
        return teacherWithoutPassword;
    }
}