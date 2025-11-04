import './setup';
export declare const createAuthenticatedRequest: (_role: "admin" | "teacher" | "student") => {
    headers: {
        Authorization: string;
        'Content-Type': string;
    };
};
export declare const seedTestData: () => Promise<void>;
//# sourceMappingURL=setup.integration.d.ts.map