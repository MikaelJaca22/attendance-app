/**
 * Storage Layer - localStorage wrapper with safe parsing/stringifying
 */
class Storage {
    /**
     * Safely get and parse JSON from localStorage
     */
    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error parsing localStorage key "${key}":`, error);
            return defaultValue;
        }
    }

    /**
     * Safely stringify and set JSON to localStorage
     */
    static setItem(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
            return false;
        }
    }

    /**
     * Generate UUID v4 using crypto API
     */
    static generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Hash password using SHA-256 (async)
     */
    static async hashPassword(password) {
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
            // Fallback simple hash (NOT secure, for demo only)
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(16);
        } catch (error) {
            console.error('Error hashing password:', error);
            throw new Error('Failed to hash password');
        }
    }

    /**
     * Get current user from session
     */
    static getCurrentUser() {
        return this.getItem('attendance_current_user');
    }

    /**
     * Set current user session
     */
    static setCurrentUser(user) {
        return this.setItem('attendance_current_user', user);
    }

    /**
     * Clear current user session
     */
    static clearCurrentUser() {
        localStorage.removeItem('attendance_current_user');
    }

    /**
     * Get all teachers
     */
    static getTeachers() {
        return this.getItem('attendance_teachers', []);
    }

    /**
     * Save all teachers
     */
    static saveTeachers(teachers) {
        return this.setItem('attendance_teachers', teachers);
    }

    /**
     * Get all students
     */
    static getStudents() {
        return this.getItem('attendance_students', []);
    }

    /**
     * Save all students
     */
    static saveStudents(students) {
        return this.setItem('attendance_students', students);
    }

    /**
     * Initialize storage with empty arrays if not exists
     */
    static initialize() {
        if (!localStorage.getItem('attendance_teachers')) {
            this.saveTeachers([]);
        }
        if (!localStorage.getItem('attendance_students')) {
            this.saveStudents([]);
        }
        if (!localStorage.getItem('darkMode')) {
            localStorage.setItem('darkMode', 'false');
        }
    }
}

// Initialize storage on load
Storage.initialize();