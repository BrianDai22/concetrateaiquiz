declare global {
    var testUtils: {
        createMockUser: (role?: 'admin' | 'teacher' | 'student') => any;
        createMockClass: (teacherId: string) => any;
        createMockAssignment: (classId: string) => any;
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map